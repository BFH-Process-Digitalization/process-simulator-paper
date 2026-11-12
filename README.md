# Process Simulator paper

Research and manuscript repository for a paper based on the [Process Simulator](https://github.com/BFH-Process-Digitalization/process-simulator), a BPMN 2.0 process simulator that runs in the browser and as a Camunda Modeler plugin, developed by Prof. Moritz Maier, Bern University of Applied Sciences (BFH).

Status: research planning. No data has been collected and no results exist yet.

## Repository map

| Path | Content |
| --- | --- |
| `docs/research-plan.md` | Research questions, design, experiments, evaluation, claims and limits, work plan |
| `TASKS.md` | Open decisions and work packages |

Planned once the design is agreed:

| Path | Content |
| --- | --- |
| `models/` | BPMN models used in the experiments, one folder per model with its source and licence |
| `scenarios/` | Scenario and parameter files, one per experimental cell |
| `runs/` | Exported results (Excel, CSV, XES) with simulator commit, seeds and run date |
| `analysis/` | Scripts that turn `runs/` into every table and figure in the paper |
| `paper/` | Manuscript |
| `references/` | Bibliography with verified DOIs |

## Working rules

- Every number in the paper must be reproducible from `runs/` and `analysis/`, with the simulator commit and seeds recorded.
- Participant-level data, partner process models and unpublished partner material are not committed without written approval.
- Literature claims need a citation with a verified DOI.
