# Workstream B -- one command per deliverable (guide section 6)
PY ?= python3
CONFIG ?= configs/default.json
TRAIN_RUNS ?= 24
DEV_RUNS ?= 8

.PHONY: setup test test-js data train ablations export golden eval bench report all clean

setup:
	$(PY) -m pip install -r requirements.txt
	npm install

test:
	$(PY) -m pytest tests -q

test-js:
	npm test

# TEMPORARY stand-in data (replace with Member A's files: same contract, same folder layout)
data:
	$(PY) -m traceline_model.standin_data --out data/standin --train-runs $(TRAIN_RUNS) --dev-runs $(DEV_RUNS)

train:
	$(PY) -m traceline_model.train --config $(CONFIG) --out models

ablations:
	for c in no_nlos no_temporal no_prediction crowd; do $(PY) -m traceline_model.train --config configs/$$c.json --out models; done

eval:
	$(PY) -m traceline_model.evaluate

export:
	$(PY) -m traceline_model.export_onnx --model-dir models/default
	$(PY) -m traceline_model.golden

bench:
	$(PY) -m traceline_model.benchmark

report:
	$(PY) -m traceline_model.model_card

# full pipeline from a clean checkout
all: data train ablations eval export bench report test test-js

clean:
	rm -rf models reports/*.png reports/*.json reports/summary.md golden model.onnx model_meta.json
