from pathlib import Path
import sys
import unittest

import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from train_prototype import SmallClassifier, SmallUNet, segmentation_loss  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()
