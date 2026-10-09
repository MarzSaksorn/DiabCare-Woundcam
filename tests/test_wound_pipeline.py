from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from wound_pipeline import assign_group_splits, mark_exact_duplicates  # noqa: E402


def record(record_id: str, patient: str, digest: str) -> dict:
    return {
        "record_id": record_id,
        "source_dataset": "test",
        "source_version": "v1",
        "task": "classification",
        "image_uri": f"{record_id}.jpg",
        "annotation_uri": None,
        "label": "dfu",
        "patient_group_id": patient,
        "wound_group_id": None,
        "visit_group_id": None,
        "capture_group_id": None,
        "sha256": digest,
        "width": 10,
        "height": 10,
        "native_split": None,
        "split": None,
        "split_status": "unassigned",
        "is_exact_duplicate": False,
        "duplicate_group": None,
        "metadata": {},
    }


class WoundPipelineTests(unittest.TestCase):
    def test_patient_group_never_crosses_splits(self) -> None:
        records = [record(f"r{i}", f"p{i // 2}", f"h{i}") for i in range(12)]
        assign_group_splits(
            records,
            seed=42,
            train_ratio=0.7,
            validation_ratio=0.15,
            test_ratio=0.15,
            require_patient_groups=True,
        )
        splits = {}
        for item in records:
            previous = splits.setdefault(item["patient_group_id"], item["split"])
            self.assertEqual(previous, item["split"])
            self.assertEqual(item["split_status"], "group_safe")

    def test_exact_duplicate_extra_is_quarantined(self) -> None:
        records = [record("a", "p1", "same"), record("b", "p2", "same")]
        mark_exact_duplicates(records)
        quarantined = [item for item in records if item["is_exact_duplicate"]]
        self.assertEqual(len(quarantined), 1)
        self.assertEqual(quarantined[0]["split_status"], "quarantined_exact_duplicate")

    def test_unknown_patient_group_fails_closed(self) -> None:
        records = [record("a", "", "hash-a")]
        with self.assertRaises(RuntimeError):
            assign_group_splits(
                records,
                seed=42,
                train_ratio=0.7,
                validation_ratio=0.15,
                test_ratio=0.15,
                require_patient_groups=True,
            )


if __name__ == "__main__":
    unittest.main()
