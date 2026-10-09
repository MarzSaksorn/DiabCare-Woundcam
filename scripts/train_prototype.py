#!/usr/bin/env python3
"""Train small research prototypes on the uploaded native wound datasets.

This file is deliberately separate from the leakage-safe production gate. The
prototype flag is explicit because the uploaded sources do not contain patient
or wound grouping keys. Metrics must not be presented as patient-independent
clinical evidence.
"""
from __future__ import annotations

import argparse
import csv
import json
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import torch
from PIL import Image
from torch import Tensor, nn
from torch.utils.data import DataLoader, Dataset


IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


@dataclass(frozen=True)
class PrototypeConfig:
    task: str
    source_root: str
    output_dir: str
    image_size: int
    epochs: int
    batch_size: int
    learning_rate: float
    seed: int
    device: str
    source_split_mode: str = "native_source_split_not_patient_safe"
    patient_group_id_available: bool = False


class PrototypeError(RuntimeError):
    """Raised for invalid prototype inputs."""


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.set_num_threads(max(1, min(6, torch.get_num_threads())))


def resolve_image(root: Path, relative_stem: str) -> Path:
    candidate = root / relative_stem
    if candidate.suffix.lower() in IMAGE_EXTENSIONS and candidate.exists():
        return candidate
    for extension in IMAGE_EXTENSIONS:
        candidate = root / f"{relative_stem}{extension}"
        if candidate.exists():
            return candidate
    raise PrototypeError(f"cannot resolve image {relative_stem!r} below {root}")


def load_rgb(path: Path, size: int) -> Tensor:
    with Image.open(path) as image:
        image = image.convert("RGB").resize((size, size), Image.Resampling.BILINEAR)
        array = np.asarray(image, dtype=np.float32) / 255.0
    return torch.from_numpy(array.transpose(2, 0, 1)).contiguous()


def load_mask(path: Path, size: int, multiclass: bool) -> Tensor:
    with Image.open(path) as mask:
        mask = mask.convert("L").resize((size, size), Image.Resampling.NEAREST)
        array = np.asarray(mask)
    if multiclass:
        return torch.from_numpy(array.astype(np.int64)).contiguous()
    return torch.from_numpy((array > 0).astype(np.float32)).contiguous()


class SegmentationDataset(Dataset[tuple[Tensor, Tensor]]):
    def __init__(
        self,
        pairs: list[tuple[Path, Path]],
        image_size: int,
        multiclass: bool,
        augment: bool,
    ) -> None:
        if not pairs:
            raise PrototypeError("segmentation dataset is empty")
        self.pairs = pairs
        self.image_size = image_size
        self.multiclass = multiclass
        self.augment = augment

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, index: int) -> tuple[Tensor, Tensor]:
        image_path, mask_path = self.pairs[index]
        image = load_rgb(image_path, self.image_size)
        mask = load_mask(mask_path, self.image_size, self.multiclass)
        if self.augment and random.random() < 0.5:
            image = torch.flip(image, dims=(2,))
            mask = torch.flip(mask, dims=(1,))
        return image, mask


class ClassificationDataset(Dataset[tuple[Tensor, Tensor]]):
    def __init__(
        self,
        records: list[tuple[Path, int]],
        image_size: int,
        augment: bool,
    ) -> None:
        if not records:
            raise PrototypeError("classification dataset is empty")
        self.records = records
        self.image_size = image_size
        self.augment = augment

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> tuple[Tensor, Tensor]:
        image_path, label = self.records[index]
        image = load_rgb(image_path, self.image_size)
        if self.augment and random.random() < 0.5:
            image = torch.flip(image, dims=(2,))
        return image, torch.tensor(label, dtype=torch.long)


class ConvBlock(nn.Module):
    def __init__(self, channels_in: int, channels_out: int) -> None:
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(channels_in, channels_out, 3, padding=1, bias=False),
            nn.BatchNorm2d(channels_out),
            nn.ReLU(inplace=True),
            nn.Conv2d(channels_out, channels_out, 3, padding=1, bias=False),
            nn.BatchNorm2d(channels_out),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: Tensor) -> Tensor:
        return self.block(x)


class SmallUNet(nn.Module):
    def __init__(self, classes: int) -> None:
        super().__init__()
        self.enc1 = ConvBlock(3, 16)
        self.enc2 = ConvBlock(16, 32)
        self.enc3 = ConvBlock(32, 64)
        self.pool = nn.MaxPool2d(2)
        self.bottleneck = ConvBlock(64, 128)
        self.up3 = nn.ConvTranspose2d(128, 64, 2, stride=2)
        self.dec3 = ConvBlock(128, 64)
        self.up2 = nn.ConvTranspose2d(64, 32, 2, stride=2)
        self.dec2 = ConvBlock(64, 32)
        self.up1 = nn.ConvTranspose2d(32, 16, 2, stride=2)
        self.dec1 = ConvBlock(32, 16)
        self.head = nn.Conv2d(16, classes, 1)

    def forward(self, x: Tensor) -> Tensor:
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        b = self.bottleneck(self.pool(e3))
        d3 = self.dec3(torch.cat([self.up3(b), e3], dim=1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))
        return self.head(d1)


class SmallClassifier(nn.Module):
    def __init__(self, classes: int) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 16, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((1, 1)),
        )
        self.head = nn.Linear(64, classes)

    def forward(self, x: Tensor) -> Tensor:
        return self.head(self.features(x).flatten(1))


def dice_binary(prediction: Tensor, target: Tensor, epsilon: float = 1e-6) -> float:
    prediction = prediction.float().flatten(1)
    target = target.float().flatten(1)
    intersection = (prediction * target).sum(1)
    score = (2 * intersection + epsilon) / (prediction.sum(1) + target.sum(1) + epsilon)
    return float(score.mean().item())


def dice_multiclass(prediction: Tensor, target: Tensor, classes: int) -> float:
    scores: list[float] = []
    for class_id in range(1, classes):
        scores.append(
            dice_binary(prediction == class_id, target == class_id)
        )
    return float(np.mean(scores)) if scores else 0.0


def split_train_validation(items: list, seed: int, validation_fraction: float = 0.1) -> tuple[list, list]:
    if len(items) < 3:
        raise PrototypeError("not enough source-train items for a validation holdout")
    shuffled = list(items)
    random.Random(seed).shuffle(shuffled)
    validation_count = max(1, round(len(shuffled) * validation_fraction))
    return shuffled[validation_count:], shuffled[:validation_count]


def restore_checkpoint(
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    resume_path: Path | None,
    device: torch.device,
) -> tuple[int, float, list[dict]]:
    """Restore a prototype checkpoint, tolerating older model-only checkpoints."""
    if resume_path is None:
        return 1, float("inf"), []
    if not resume_path.exists():
        raise PrototypeError(f"resume checkpoint does not exist: {resume_path}")
    checkpoint = torch.load(resume_path, map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    if checkpoint.get("optimizer_state_dict"):
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
    next_epoch = int(checkpoint.get("epoch", 0)) + 1
    best_validation_loss = float(checkpoint.get("best_validation_loss", float("inf")))
    history = list(checkpoint.get("history", []))
    return next_epoch, best_validation_loss, history


def wound_pairs(root: Path, split: str) -> list[tuple[Path, Path]]:
    image_root = root / split / "images"
    label_root = root / split / "labels"
    pairs = []
    for image in sorted(image_root.glob("*.png")):
        label = label_root / image.name
        if not label.exists():
            raise PrototypeError(f"missing wound mask for {image}")
        pairs.append((image, label))
    return pairs


def names_from_file(path: Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def tissue_pairs(root: Path, split: str) -> list[tuple[Path, Path]]:
    data_root = root / "DFUTissue" if (root / "DFUTissue").exists() else root
    image_base = data_root / "Labeled" / "Original" / "Images"
    mask_base = data_root / "Labeled" / "Original" / "Annotations"
    if split == "train":
        names = names_from_file(data_root / "Labeled" / "labeled_train_names.txt")
        subdir = "TrainVal"
    elif split == "validation":
        names = names_from_file(data_root / "Labeled" / "labeled_val_names.txt")
        subdir = "TrainVal"
    elif split == "test":
        names = names_from_file(data_root / "Labeled" / "test_names.txt")
        subdir = "Test"
    else:
        raise PrototypeError(f"unsupported tissue split {split}")
    pairs = []
    for name in names:
        filename = name if Path(name).suffix else f"{name}.png"
        image = image_base / subdir / filename
        mask = mask_base / subdir / filename
        if not image.exists() or not mask.exists():
            raise PrototypeError(f"missing tissue image or mask for {filename}")
        pairs.append((image, mask))
    return pairs


def azh_classification_records(root: Path, split: str, class_names: list[str]) -> list[tuple[Path, int]]:
    split_root = root / split
    csv_path = split_root / f"wound_locations_Labels_AZH_{split}.csv"
    if not csv_path.exists():
        raise PrototypeError(f"missing AZH classification CSV: {csv_path}")
    class_to_id = {name: index for index, name in enumerate(class_names)}
    rows: list[tuple[Path, int]] = []
    with csv_path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            index = (row.get("index") or "").strip().replace("\\", "/")
            class_name = Path(index).parts[0] if Path(index).parts else ""
            if class_name not in class_to_id:
                raise PrototypeError(f"unexpected AZH folder label {class_name!r}")
            image = resolve_image(split_root, index)
            rows.append((image, class_to_id[class_name]))
    return rows


def segmentation_loss(logits: Tensor, target: Tensor, multiclass: bool, classes: int) -> Tensor:
    if multiclass:
        cross_entropy = nn.functional.cross_entropy(logits, target)
        probabilities = torch.softmax(logits, dim=1)
        one_hot = nn.functional.one_hot(target, num_classes=classes).permute(0, 3, 1, 2).float()
        intersection = (probabilities[:, 1:] * one_hot[:, 1:]).sum(dim=(2, 3))
        denominator = probabilities[:, 1:].sum(dim=(2, 3)) + one_hot[:, 1:].sum(dim=(2, 3))
        dice = ((2.0 * intersection + 1e-6) / (denominator + 1e-6)).mean()
        return cross_entropy + (1.0 - dice)
    target_float = target.unsqueeze(1)
    binary_cross_entropy = nn.functional.binary_cross_entropy_with_logits(logits, target_float)
    probabilities = torch.sigmoid(logits)
    intersection = (probabilities * target_float).sum(dim=(1, 2, 3))
    denominator = probabilities.sum(dim=(1, 2, 3)) + target_float.sum(dim=(1, 2, 3))
    dice = ((2.0 * intersection + 1e-6) / (denominator + 1e-6)).mean()
    return binary_cross_entropy + (1.0 - dice)


def evaluate_segmentation(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
    multiclass: bool,
    classes: int,
) -> dict[str, float]:
    model.eval()
    losses: list[float] = []
    dices: list[float] = []
    with torch.no_grad():
        for images, masks in loader:
            images, masks = images.to(device), masks.to(device)
            logits = model(images)
            losses.append(float(segmentation_loss(logits, masks, multiclass, classes).item()))
            if multiclass:
                dices.append(dice_multiclass(logits.argmax(dim=1), masks, classes))
            else:
                dices.append(dice_binary(torch.sigmoid(logits) > 0.5, masks.unsqueeze(1)))
    return {"loss": float(np.mean(losses)), "dice": float(np.mean(dices))}


def train_segmentation(args: argparse.Namespace) -> dict:
    seed_everything(args.seed)
    source_root = Path(args.source_root).resolve()
    if args.task == "wound-segmentation":
        train_pairs, test_pairs = wound_pairs(source_root, "train"), wound_pairs(source_root, "test")
        multiclass, classes, class_names = False, 1, ["background", "wound"]
    else:
        train_pairs = tissue_pairs(source_root, "train")
        test_pairs = tissue_pairs(source_root, "test")
        multiclass, classes = True, 4
        class_names = ["background", "fibrin", "granulation", "callus"]
    train_pairs, validation_pairs = split_train_validation(train_pairs, args.seed)
    if args.max_train:
        train_pairs = train_pairs[: args.max_train]
        validation_pairs = validation_pairs[: max(1, args.max_train // 10)]
    train_dataset = SegmentationDataset(train_pairs, args.image_size, multiclass, augment=True)
    validation_dataset = SegmentationDataset(validation_pairs, args.image_size, multiclass, augment=False)
    test_dataset = SegmentationDataset(test_pairs, args.image_size, multiclass, augment=False)
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)
    validation_loader = DataLoader(validation_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)
    device = torch.device(args.device if args.device != "auto" else "cuda" if torch.cuda.is_available() else "cpu")
    model = SmallUNet(classes).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.learning_rate)
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    resume_path = Path(args.resume).resolve() if args.resume else None
    start_epoch, best, history = restore_checkpoint(model, optimizer, resume_path, device)
    for epoch in range(start_epoch, start_epoch + args.epochs):
        model.train()
        losses = []
        for images, masks in train_loader:
            images, masks = images.to(device), masks.to(device)
            optimizer.zero_grad(set_to_none=True)
            loss = segmentation_loss(model(images), masks, multiclass, classes)
            loss.backward()
            optimizer.step()
            losses.append(float(loss.item()))
        validation = evaluate_segmentation(model, validation_loader, device, multiclass, classes)
        row = {"epoch": epoch, "train_loss": float(np.mean(losses)), "validation": validation}
        history.append(row)
        print(json.dumps(row), flush=True)
        is_best = validation["loss"] < best
        if is_best:
            best = validation["loss"]
        checkpoint = {
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "classes": classes,
            "class_names": class_names,
            "epoch": epoch,
            "best_validation_loss": best,
            "history": history,
        }
        torch.save(checkpoint, output_dir / "last.pt")
        if is_best:
            torch.save(checkpoint, output_dir / "best.pt")
    checkpoint = torch.load(output_dir / "best.pt", map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    test = evaluate_segmentation(model, test_loader, device, multiclass, classes)
    result = {
        "config": asdict(PrototypeConfig(args.task, str(source_root), str(output_dir), args.image_size, args.epochs, args.batch_size, args.learning_rate, args.seed, str(device))),
        "train_records": len(train_pairs),
        "validation_records": len(validation_pairs),
        "test_records": len(test_pairs),
        "classes": class_names,
        "history": history,
        "test_metrics": test,
        "resumed_from": str(resume_path) if resume_path else None,
        "prototype_warning": "Uses source-provided splits and is not patient-leakage-safe; not for clinical decisions.",
    }
    (output_dir / "metrics.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


def classification_metrics(predictions: list[int], targets: list[int], classes: int) -> dict[str, float]:
    pred = np.asarray(predictions)
    truth = np.asarray(targets)
    accuracy = float((pred == truth).mean())
    f1_values = []
    for class_id in range(classes):
        tp = int(((pred == class_id) & (truth == class_id)).sum())
        fp = int(((pred == class_id) & (truth != class_id)).sum())
        fn = int(((pred != class_id) & (truth == class_id)).sum())
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1_values.append(2 * precision * recall / (precision + recall) if precision + recall else 0.0)
    return {"accuracy": accuracy, "macro_f1": float(np.mean(f1_values))}


def evaluate_classification(model: nn.Module, loader: DataLoader, device: torch.device, classes: int) -> dict[str, float]:
    model.eval()
    losses, predictions, targets = [], [], []
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            logits = model(images)
            losses.append(float(nn.functional.cross_entropy(logits, labels).item()))
            predictions.extend(logits.argmax(dim=1).cpu().tolist())
            targets.extend(labels.cpu().tolist())
    return {"loss": float(np.mean(losses)), **classification_metrics(predictions, targets, classes)}


def train_classification(args: argparse.Namespace) -> dict:
    seed_everything(args.seed)
    source_root = Path(args.source_root).resolve()
    class_names = ["BG", "D", "N", "P", "S", "V"]
    train_records = azh_classification_records(source_root, "Train", class_names)
    test_records = azh_classification_records(source_root, "Test", class_names)
    train_records, validation_records = split_train_validation(train_records, args.seed)
    if args.max_train:
        train_records = train_records[: args.max_train]
        validation_records = validation_records[: max(1, args.max_train // 10)]
    train_dataset = ClassificationDataset(train_records, args.image_size, augment=True)
    validation_dataset = ClassificationDataset(validation_records, args.image_size, augment=False)
    test_dataset = ClassificationDataset(test_records, args.image_size, augment=False)
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)
    validation_loader = DataLoader(validation_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)
    device = torch.device(args.device if args.device != "auto" else "cuda" if torch.cuda.is_available() else "cpu")
    model = SmallClassifier(len(class_names)).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.learning_rate)
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    resume_path = Path(args.resume).resolve() if args.resume else None
    start_epoch, best, history = restore_checkpoint(model, optimizer, resume_path, device)
    for epoch in range(start_epoch, start_epoch + args.epochs):
        model.train()
        losses = []
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad(set_to_none=True)
            loss = nn.functional.cross_entropy(model(images), labels)
            loss.backward()
            optimizer.step()
            losses.append(float(loss.item()))
        validation = evaluate_classification(model, validation_loader, device, len(class_names))
        row = {"epoch": epoch, "train_loss": float(np.mean(losses)), "validation": validation}
        history.append(row)
        print(json.dumps(row), flush=True)
        is_best = validation["loss"] < best
        if is_best:
            best = validation["loss"]
        checkpoint = {
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "class_names": class_names,
            "epoch": epoch,
            "best_validation_loss": best,
            "history": history,
        }
        torch.save(checkpoint, output_dir / "last.pt")
        if is_best:
            torch.save(checkpoint, output_dir / "best.pt")
    checkpoint = torch.load(output_dir / "best.pt", map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    test = evaluate_classification(model, test_loader, device, len(class_names))
    result = {
        "config": asdict(PrototypeConfig("classification", str(source_root), str(output_dir), args.image_size, args.epochs, args.batch_size, args.learning_rate, args.seed, str(device))),
        "train_records": len(train_records),
        "validation_records": len(validation_records),
        "test_records": len(test_records),
        "classes": class_names,
        "history": history,
        "test_metrics": test,
        "resumed_from": str(resume_path) if resume_path else None,
        "prototype_warning": "Uses source-provided splits and is not patient-leakage-safe; labels are source-native and not a medical diagnosis.",
    }
    (output_dir / "metrics.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command, task in [("wound-segmentation", "wound-segmentation"), ("tissue-segmentation", "tissue-segmentation")]:
        sub = subparsers.add_parser(command)
        sub.set_defaults(task=task, handler=train_segmentation)
        sub.add_argument("--source-root", required=True, type=Path)
        sub.add_argument("--output-dir", required=True, type=Path)
        sub.add_argument("--allow-source-split", action="store_true", help="explicitly allow the non-patient-safe source split")
        sub.add_argument("--image-size", type=int, default=128)
        sub.add_argument("--epochs", type=int, default=3)
        sub.add_argument("--batch-size", type=int, default=8)
        sub.add_argument("--learning-rate", type=float, default=1e-3)
        sub.add_argument("--seed", type=int, default=42)
        sub.add_argument("--device", default="auto")
        sub.add_argument("--max-train", type=int, default=0)
        sub.add_argument("--resume", type=Path, default=None, help="resume from a prior best.pt or last.pt checkpoint")
    sub = subparsers.add_parser("classification")
    sub.set_defaults(task="classification", handler=train_classification)
    sub.add_argument("--source-root", required=True, type=Path)
    sub.add_argument("--output-dir", required=True, type=Path)
    sub.add_argument("--allow-source-split", action="store_true", help="explicitly allow the non-patient-safe source split")
    sub.add_argument("--image-size", type=int, default=128)
    sub.add_argument("--epochs", type=int, default=3)
    sub.add_argument("--batch-size", type=int, default=32)
    sub.add_argument("--learning-rate", type=float, default=1e-3)
    sub.add_argument("--seed", type=int, default=42)
    sub.add_argument("--device", default="auto")
    sub.add_argument("--max-train", type=int, default=0)
    sub.add_argument("--resume", type=Path, default=None, help="resume from a prior best.pt or last.pt checkpoint")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if not args.allow_source_split:
        parser.error("prototype training requires --allow-source-split because patient grouping is unavailable")
    result = args.handler(args)
    print(json.dumps({"output_dir": result["config"]["output_dir"], "test_metrics": result["test_metrics"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
