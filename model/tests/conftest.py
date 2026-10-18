import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from traceline_model.standin_data import write_split  # noqa: E402


@pytest.fixture(scope="session")
def tiny_data(tmp_path_factory):
    root = tmp_path_factory.mktemp("data")
    write_split(root / "train", "train", 1, 1000)
    write_split(root / "dev", "dev", 1, 2000)
    return root
