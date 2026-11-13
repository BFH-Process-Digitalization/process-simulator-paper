# Reproduces every number, table and figure in the paper.
#   make            simulator + all experiments + figures + PDF
#   make paper      PDF from the results in results/

SIMULATOR_REPO ?= https://github.com/BFH-Process-Digitalization/process-simulator.git
SIMULATOR_REF  ?= v1.0.0
SIM            := tools/process-simulator
CLI            := $(SIM)/dist-cli/procsim.mjs
PY             ?= .venv/bin/python
SIMOD          ?= .venv-simod/bin/simod

.PHONY: all simulator env experiments v1 v2 v3 v4 v5 v6 figures models screenshots paper clean

all: experiments figures paper

$(CLI):
	test -d $(SIM) || git clone $(SIMULATOR_REPO) $(SIM)
	cd $(SIM) && git checkout $(SIMULATOR_REF) && npm ci && npm run build:cli

simulator: $(CLI)

env:
	python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
	python3 -m venv .venv-simod && .venv-simod/bin/pip install simod==5.2.1
	npm ci && npx playwright-core install chromium firefox

experiments: v1 v2 v3 v4 v5 v6

v1: $(CLI)
	node experiments/v1_analytical.mjs
v2: $(CLI)
	$(PY) experiments/v2_prosimos.py
v3: $(CLI)
	.venv-simod/bin/python experiments/v3_prepare.py
	$(SIMOD) --configuration experiments/v3_simod.yml --output data/v3/simod
	$(PY) experiments/v3_bpic.py
v4: $(CLI)
	node experiments/v4_value_stream.mjs
v5: $(CLI)
	node experiments/v5_decisions.mjs
v6: $(CLI)
	node experiments/v6_performance.mjs
	node experiments/v6_browser.mjs

figures: models
	$(PY) analysis/make_figures.py

# renders the BPMN test models in models/ to paper/figures/models/
models:
	node analysis/render_models.mjs

# screenshots of the web app; needs `vite preview` serving the built simulator on APP_URL
screenshots:
	node analysis/screenshots.mjs

paper: figures
	cd paper && latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex

clean:
	cd paper && latexmk -C
