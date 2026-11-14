# Process Simulator paper

Experiments and manuscript for a tool paper on the [Process Simulator](https://github.com/BFH-Process-Digitalization/process-simulator), a BPMN 2.0 simulation environment that runs in the browser and as a Camunda Modeler plugin, developed by Prof. Moritz Maier, Bern University of Applied Sciences (BFH). Target journal: Simulation Modelling Practice and Theory.

Status: draft manuscript with first complete results (V1–V7). Not submitted.

## Repository map

| Path | Content |
| --- | --- |
| `docs/research-plan.md` | Research questions, design, experiments and limits |
| `experiments/` | One script per experiment (V1 analytical queues, V2 Prosimos cross-check, V3 BPI Challenge 2012 with Simod, V4 value stream semantics, V5 decisions from single vs. replicated runs, V6 performance) |
| `data/` | Generated models and raw runs (JSONL/CSV) |
| `models/` | The BPMN test models rendered in Appendix~A (`analysis/render_models.mjs` regenerates them and renders `paper/figures/models/`) |
| `results/` | Aggregated results per experiment (JSON) |
| `analysis/make_figures.py` | Turns `results/` into every table, figure and number in the paper (`paper/generated/`) |
| `analysis/render_models.mjs` | Renders `models/*.bpmn` to the appendix figures (needs esbuild, bpmn-js, bpmn-auto-layout, playwright-core) |
| `analysis/screenshots.mjs` | Screenshots of the web app used as manuscript figures; needs the built simulator served on `APP_URL` (default `http://localhost:4173/`, e.g. `vite preview` in `tools/process-simulator`) |
| `paper/` | Manuscript (`elsarticle`), bibliography with verified DOIs |

## Reproduce

Requirements: Node.js 20, Python 3.11 or 3.12 with `requirements.txt` and Simod 5.2.1 and headless Chromium and Firefox through Playwright (installed by `make env`), and a LaTeX distribution with `elsarticle` and `apacite`.

```sh
make simulator   # clone and build the simulator CLI into tools/process-simulator
make env         # Python environments for Prosimos/analysis and for Simod
make all         # run V1–V6, generate tables and figures, build paper/main.pdf
```

Single experiments: `make v1` … `make v6`; `make figures`; `make models`; `make screenshots`; `make paper`. Seeds are fixed in the scripts; every run records the simulator version, model and scenario hashes, seed and replication index.

## Data

The BPI Challenge 2012 log (4TU.ResearchData, https://doi.org/10.4121/uuid:3926db30-f712-4394-aebc-75976070e91f) is subject to the 4TU General Terms of Use. It is downloaded by `experiments/v3_prepare.py` and not redistributed here, nor are the work-item extract and the model Simod discovers from it.

## Licence

© 2026 Bern University of Applied Sciences (BFH), Prof. Moritz Maier.
