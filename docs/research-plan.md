# Research plan

Status: draft for author discussion. Nothing in this plan is a result.

**Working title.** Process Simulator: An Open, Browser-Based BPMN Simulation Environment with Statistically Sound Scenario Comparison and Simulation-Based Value Stream Mapping

**Paper type.** Tool paper: a simulation environment, validated without human participants.

**Target.** *Simulation Modelling Practice and Theory* (SIMPAT, Elsevier). The aims and scope explicitly solicit "simulation languages and environments" and "selection and comparison procedures", and ask application papers to make "validation/verification with real data" transparent.

## 1. Contributions

1. **Integrated modelling and simulation.** A BPMN 2.0 editor and a discrete-event simulator in one environment, running in the browser without installation and as a Camunda Modeler plugin. Scenario edits are simulated immediately.
2. **Statistically sound scenario comparison.** Replications, confidence intervals and common random numbers with separate random streams, so that what-if comparisons are not decided by a single run.
3. **Simulation-based value stream mapping for BPMN.** Activities classified as value-adding, business-value-adding or waste; lead time, waiting time, process cycle efficiency and bottlenecks derived from simulation, including processes with exclusive and parallel gateways and loops.
4. **Open and reproducible.** Apache-2.0, versioned releases with a DOI, and one command that recomputes every number in the paper.

Positioning: contributions 1–3 are a combination of known ideas in one validated tool. The paper does not claim a new simulation method. Value stream mapping with simulation is established in manufacturing; the claim is limited to BPMN processes with non-linear control flow, inside a process modelling tool.

Out of scope: benchmark construction (possible follow-up paper), LLM-generated scenarios, simulation-model discovery, user studies.

## 2. Evaluation

All evaluations are automated; no human participants.

| # | Question | Method | Evidence |
| --- | --- | --- | --- |
| V1 | Is the engine correct? | Models with exact queueing results: M/M/1, M/M/c, M/G/1 (Pollaczek–Khinchine), tandem lines, open Jackson networks; Little's law on every run | Relative error of simulated means with 95 % confidence intervals; analytical value inside the interval |
| V2 | Does it agree with an established BPS tool? | Same models and parameters in Prosimos; models from the Prosimos test assets and generated models | Paired comparison of cycle time, waiting time, utilisation; equivalence within a stated margin |
| V3 | Does it work on real processes? | Simulation models discovered with Simod from public BPI Challenge logs (4TU), converted and simulated | Cycle-time distribution against the log; comparison with Prosimos on the same model |
| V4 | Are the value stream figures correct? | Hand-computable cases (sequence, XOR with known probabilities, AND, loop with known rework rate); comparison with a linear value stream map | Exact agreement on deterministic cases; size of the error of the linear map on non-linear processes |
| V5 | Does statistical comparison change decisions? | Scenario pairs with small true differences; single run versus replications with common random numbers | Share of single-run comparisons that pick the worse scenario; replications needed for a stable decision |
| V6 | Is it fast enough for interactive use? | Run time and memory by model size, case count and replications, in Chrome, Firefox and Node | Scaling curves; time to first result while editing |
| V7 | How does it compare with existing tools? | Feature comparison with BIMP, Prosimos, Apromore, Bizagi Modeler, Signavio, Camunda | Table based on documentation and trial versions, with access dates |

Case study: the coffee-shop example and one BPI model, from what-if question to decision, including the value stream map.

## 3. Simulator work needed

1. Headless command-line runner: scenario file in, JSONL out (one line per run), with simulator version, model hash, scenario hash and seed.
2. Separate random streams per source (arrivals, each activity, each gateway) for valid common random numbers.
3. Replications with confidence intervals and paired scenario comparison in the app and reports.
4. Time-based warm-up instead of a share of cases.
5. Converter to Prosimos input.
6. Tests for V1 and V4 as part of the test suite.

## 4. Reproducibility

- Every number comes from scripts in `analysis/` reading `runs/`.
- Simulator release, models, scenarios, scripts and raw results on Zenodo with a DOI.
- Licences of external models and logs verified before use (Prosimos and Simod assets, BPI Challenge logs).

## 5. Threats to validity

- The author is also the tool developer: mitigated by analytical references (V1), a second simulator (V2) and scripted, published experiments.
- Feature comparison (V7) depends on documentation of commercial tools: state versions and access dates.
- Real-data validation (V3) depends on the discovered models: report it as fidelity on given models, not as discovery quality.
- No user study: usability claims are not made.

## 6. Target journal and risk

| Journal | IF (publisher page, Nov 2026) | Fit |
| --- | --- | --- |
| **SIMPAT** (primary) | 4.6 | Simulation environments in scope |
| Information Systems | 4.0 | BPM in scope, but expects a new method; a tool paper is a weaker fit |
| SoftwareX (fallback) | 1.9 | Pure software papers; below the IF target |

SIMPAT publishing data (journal insights page, Nov 2026): acceptance rate 7 %, 19 days to first decision, 64 days to decision after review, 128 days to acceptance.

Main rejection risks and mitigations:

- *Engineering without contribution to simulation*: lead with V1, V2 and V5, not with features.
- *Business process simulation tools already exist*: V7 and the case study must show what users can do here that they cannot do elsewhere.
- *Scope*: frame as a simulation environment for service and business processes; cite SIMPAT papers on business process simulation and simulation-based value stream mapping.

Publication cost: the subscription route has no author fee. BFH is a participant in the swissuniversities–Elsevier agreement 2024–2028, and SIMPAT is in its title list; confirm with the BFH library whether open access in SIMPAT is covered.

## 7. Work plan

| Phase | Content | Duration |
| --- | --- | --- |
| 1 | Simulator work 1–4 | 2 weeks |
| 2 | Prosimos converter, V1, V2, V4 | 2 weeks |
| 3 | V3, V5, V6, V7, case study | 2 weeks |
| 4 | Writing, Zenodo release, submission | 3–4 weeks |

About two to three months to submission.

## 8. Related work (to read in full and cite)

Business process simulation tools and methods:

- Camargo, Dumas, González-Rojas, "Automated discovery of business process simulation models from event logs", Decision Support Systems, doi:10.1016/j.dss.2020.113284 (Simod).
- López-Pintado, Dumas et al., "Discovery, simulation, and optimization of business processes with differentiated resources", Information Systems, doi:10.1016/j.is.2023.102289.
- Chapela-Campa et al., "A framework for measuring the quality of business process simulation models", Information Systems, doi:10.1016/j.is.2024.102447.
- Blümel et al., "Glitches in the matrix: threats to the validity of data-driven business process simulation", Process Science, doi:10.1007/s44311-026-00056-6.
- "Evolution of BPMN and Simulation Integration: Trends, Challenges, and Future Directions", Procedia Computer Science, doi:10.1016/j.procs.2025.02.048.

Value stream mapping with simulation and process mining:

- Lian, Van Landeghem, "Analysing the effects of Lean manufacturing using a value stream mapping-based simulation generator", IJPR, doi:10.1080/00207540600791590.
- Solding, Gullander, "Concepts for simulation based Value Stream Mapping", WSC 2009, doi:10.1109/wsc.2009.5429185.
- Knoll et al., "Enabling value stream mapping for internal logistics using multidimensional process mining", ESWA, doi:10.1016/j.eswa.2019.01.026.
- "Combining value stream mapping and process mining in production: a systematic literature review", doi:10.1007/s42452-026-08446-y.
- "A tentative integration of value stream mapping (VSM) and BPMN for improved process mapping", Knowledge and Process Management, doi:10.1002/kpm.1729.

Simulation methodology:

- Law, *Simulation Modeling and Analysis*; Kim and Nelson on ranking and selection.
- Common random numbers: doi:10.1109/wsc.1990.129543; doi:10.1109/wsc.2008.4736074; "Realizing Common Random Numbers: Event-Keyed Hashing for Causally Valid Stochastic Models", arXiv 2603.11084.

To add: BIMP, Prosimos and Apromore tool papers; SIMPAT papers on business process simulation; Google Scholar and Scopus search.
