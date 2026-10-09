from pathlib import Path
import sys
import tempfile
import unittest

import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from train_prototype import AZH_CLASS_LABELS, SmallClassifier, SmallUNet, restore_checkpoint, segmentation_loss  # noqa: E402


class PrototypeTrainerTests(unittest.TestCase):
    def test_binary_unet_and_loss(self) -> None:
        model = SmallUNet(1)
        inputs = torch.randn(2, 3, 64, 64)
        logits = model(inputs)
        self.assertEqual(tuple(logits.shape), (2, 1, 64, 64))
        target = torch.randint(0, 2, (2, 64, 64), dtype=torch.float32)
        loss = segmentation_loss(logits, target, multiclass=False, classes=1)
        self.assertTrue(torch.isfinite(loss))
        self.assertTrue(loss.requires_grad)

    def test_multiclass_unet_and_loss(self) -> None:
        model = SmallUNet(4)
        inputs = torch.randn(2, 3, 64, 64)
        logits = model(inputs)
        self.assertEqual(tuple(logits.shape), (2, 4, 64, 64))
        target = torch.randint(0, 4, (2, 64, 64), dtype=torch.long)
        loss = segmentation_loss(logits, target, multiclass=True, classes=4)
        self.assertTrue(torch.isfinite(loss))
        self.assertTrue(loss.requires_grad)

    def test_classifier_shape(self) -> None:
        model = SmallClassifier(6)
        logits = model(torch.randn(2, 3, 64, 64))
        self.assertEqual(tuple(logits.shape), (2, 6))

    def test_azh_label_mapping(self) -> None:
        self.assertEqual(AZH_CLASS_LABELS["BG"], "Background")
        self.assertEqual(AZH_CLASS_LABELS["N"], "Normal skin")
        self.assertEqual(AZH_CLASS_LABELS["D"], "Diabetic wound")
        self.assertEqual(AZH_CLASS_LABELS["P"], "Pressure wound")
        self.assertEqual(AZH_CLASS_LABELS["S"], "Surgical wound")
        self.assertEqual(AZH_CLASS_LABELS["V"], "Venous wound")

    def test_checkpoint_resume_restores_epoch_and_optimizer(self) -> None:
        model = SmallClassifier(6)
        optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
        with tempfile.TemporaryDirectory() as directory:
            checkpoint = Path(directory) / "last.pt"
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "epoch": 4,
                    "best_validation_loss": 0.75,
                    "history": [{"epoch": 4}],
                },
                checkpoint,
            )
            next_epoch, best, history = restore_checkpoint(model, optimizer, checkpoint, torch.device("cpu"))
        self.assertEqual(next_epoch, 5)
        self.assertEqual(best, 0.75)
        self.assertEqual(history, [{"epoch": 4}])


if __name__ == "__main__":
    unittest.main()
