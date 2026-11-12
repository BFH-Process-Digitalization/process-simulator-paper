# Research plan

Status: draft for author discussion. Nothing in this plan is a result.

## 1. Contribution

A tool paper about the Process Simulator: a BPMN 2.0 discrete-event simulator that runs in the browser and as a Camunda Modeler plugin, with no installation and no server.

The paper claims a design contribution, not an empirical finding:

> Business process simulation is rarely used outside specialist teams because tools need installation, separate modelling notations and statistical expertise. The Process Simulator lets non-specialists parameterise a standard BPMN model directly on the diagram and compare what-if scenarios with safeguards that make the comparison statistically sound.

Distinguishing features to argue (to be checked against the related tools in §3):

- Runs entirely in the browser and inside Camunda Modeler on unchanged BPMN 2.0 files.
- Parameters set by clicking on the diagram; a scenario stores only its differences from the baseline.
- Scenario comparison with common random numbers by default.
- Token playback and waiting-time colouring on the diagram.
- Working hours, roles, costs and revenue in the same model.
- Excel and PDF reports; event logs as CSV and XES for process mining tools.

## 2. Research questions

- **RQ1 (correctness).** Does the simulator reproduce known queueing results and agree with an established business process simulator on the same models?
- **RQ2 (efficiency).** How long do simulations take in the browser, depending on cases, model size and number of scenarios?
- **RQ3 (usability).** Can users without simulation training set up a model, run scenarios and draw the correct conclusion, and how usable do they find the tool?

## 3. Related tools

Compare on: installation, BPMN 2.0 support, modelling environment, stochastic features (distributions, calendars, resources, costs), scenario comparison, replications and confidence intervals, playback, export (event log, report), licence and availability.

Candidates: BIMP, Prosimos and Simod, Apromore simulation, the bpmn-js token simulation, Bizagi Modeler simulation, SAP Signavio simulation, ARIS simulation, general-purpose tools such as AnyLogic and Simul8. Every cell of the comparison table must be checked against the current tool or its documentation.

## 4. Requirements and design

Derive five to seven requirements from the literature on simulation adoption and from teaching experience in the CAS and BSc courses. Proposed:

| Req. | Requirement | Design feature |
| --- | --- | --- |
| R1 | No installation, works on standard BPMN | Browser app, Camunda Modeler plugin, BPMN 2.0 import |
| R2 | Parameterise where the process is | Properties on the diagram elements |
| R3 | What-if analysis without copying models | Scenarios store differences only |
| R4 | Sound comparisons without statistical training | Common random numbers, case trimming, warnings near full utilisation |
| R5 | Understandable dynamics | Token playback, queue and waiting-time colouring |
| R6 | Results that can be shared and reused | Excel and PDF reports, CSV and XES event logs |

Architecture section: BPMN graph extraction, event-driven engine in a web worker, seeded random number generator, parameter layering, result aggregation, export.

## 5. Evaluation

### E1 Verification against queueing theory (RQ1)

| Test | Reference |
| --- | --- |
| M/M/1 and M/M/c waiting time and utilisation | Erlang C |
| M/G/1 with lognormal or gamma service | Pollaczek–Khinchine formula |
| Tandem and branching networks | Jackson network results |
| Little's Law on every run | L = λW from the event log |
| Gateway routing | Observed vs. configured branch frequencies |
| Working hours and timers | Hand-calculated deterministic cases |

Loads 0.5, 0.7 and 0.9; at least 30 replications each; pass if the analytical value lies inside the 95% confidence interval. The tests go into the simulator's automated test suite so the paper can cite them.

### E2 Cross-check with an established simulator (RQ1)

Five to ten models, from a public collection where possible, run in the Process Simulator and in Prosimos or BIMP with the same parameters. Compare cycle-time and waiting-time distributions (CI overlap, two-sample tests) and resource utilisation. Report differences that come from different semantics, e.g. how calendars or resource selection work.

### E3 Performance (RQ2)

Run time and memory in Chrome, Firefox and Safari for 1,000 to 100,000 cases, models with 10 to 100 activities, and 1 to 10 scenarios. Recorded on stated hardware, median of ten runs.

### E4 Usability study (RQ3)

- **Participants.** 20 to 30 students or practitioners without simulation training, preferably not only from the authors' own courses.
- **Tasks.** Open a model, set arrival and task times, create two scenarios, run them, find the bottleneck and decide which scenario is better.
- **Measures.** Task completion and correctness, time on task, System Usability Scale, short interview on difficulties.
- **Ethics.** Informed consent and anonymised data; check whether BFH ethics review is required.

### E5 Use cases (illustration)

Two or three short cases: the coffee shop example, a teaching case from the CAS, a real process modelled in Camunda Modeler. They show the features; they are not evidence of benefit.

## 6. Simulator work needed for the paper

1. **Batch runner.** Headless command that runs a scenario file for a list of seeds and writes one result file per run (needed for E1 to E3).
2. **Replications in the app.** Run a comparison over several seeds and show confidence intervals. This strengthens R4 and is a feature reviewers will ask about.
3. **Run metadata.** Simulator version, seed and scenario hash in every export.
4. **Parameter export for the cross-check.** Export to the input format of the reference simulator (E2), or a documented manual translation.

## 7. What the paper can and cannot claim

| Claim | Supported by |
| --- | --- |
| The simulator computes queueing behaviour correctly | E1 |
| Results agree with an established simulator | E2 |
| Runs fast enough for interactive use in the browser | E3 |
| Non-specialists can use it to reach correct conclusions | E4 (small sample, indicative) |
| Simulation improves real organisational decisions | Not this paper |

## 8. Availability and licence

The web app is publicly available; the source code is proprietary. Tool and demo tracks usually require the tool to be accessible, and some software journals require an open-source licence. Before choosing a venue, check its availability rules and decide whether to:

- publish only the web app and a screencast,
- give reviewers access to the code under a restricted licence, or
- publish an archived version (e.g. on Zenodo with a DOI) for citation.

## 9. Venues

To be checked for scope, format, availability rules and deadlines:

- BPM Conference, Demos and Resources track: short paper with screencast; best first target.
- BPM Forum or a BPM-related workshop.
- A journal version later (e.g. Business Process Management Journal or Simulation Modelling Practice and Theory) with E4 completed.
- Software journals such as SoftwareX only if their licence requirements can be met.

## 10. Work plan

| Phase | Content | Duration |
| --- | --- | --- |
| 0 | Decide venue and licence route; tool comparison | 2 weeks |
| 1 | Simulator work packages 1–3 | 3 weeks |
| 2 | E1 verification and E3 performance | 2 weeks |
| 3 | E2 cross-check | 2–3 weeks |
| 4 | Demo paper and screencast | 2 weeks |
| 5 | E4 usability study (ethics, recruitment, sessions) | 6–8 weeks |
| 6 | Journal version | 4–6 weeks |

## 11. Literature to review

Candidates only; each needs a verified DOI before it is cited.

- Business process simulation: van der Aalst, business process simulation survival guide; Camargo et al., Simod; López-Pintado et al., Prosimos; Dumas et al., *Fundamentals of Business Process Management*.
- Simulation methodology: Law, *Simulation Modeling and Analysis*; Sargent on verification and validation of simulation models.
- Queueing: Little (1961); Kingman (1961).
- Usability: Brooke, System Usability Scale; Bangor et al. on interpreting SUS scores.
- Design science framing for the requirements: Hevner et al. (2004); Peffers et al. (2007).

## 12. Later paper

A follow-up can use the simulator to evaluate digitalisation decisions from the PDI framework (compare gap-based and simulated priorities on real processes). It needs the batch runner from §6 and is out of scope here.
