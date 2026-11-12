# Research plan

Status: draft for author discussion. Nothing in this plan is a result.

## 1. Positioning

The Process Simulator can be the object of a paper in three different ways. They need different evidence and should not be mixed in one claim.

| Option | Contribution | Main evidence | Fit |
| --- | --- | --- | --- |
| A. Artefact paper | A BPMN-native, browser-based simulator that lets non-specialists compare what-if scenarios correctly | Verification against queueing theory, comparison with an established simulator, usability study | Demo or tool track; short paper |
| B. Decision-support paper | Simulation as the evaluation step of "what to digitalise and automate next" | Computational experiments plus three to five real process applications | Full journal paper; companion to the PDI paper |
| C. Teaching paper | Simulation-based learning of process performance (queues, utilisation, variability) | Pre/post test with students, ideally with a control group | Education venue |

**Recommendation: B as the main paper, with A's verification as a required section, and A as an early short tool paper.**
B builds directly on the PDI framework ("What to Digitalise and Automate Next") and answers its weakest point: the framework ranks digitalisation needs by self-assessed relevance and fulfilment, but says nothing about the operational effect of acting on them.
C is a separate study and needs its own ethics approval; it is listed in `TASKS.md` as a later option.

## 2. Research questions (option B)

- **RQ1.** How do typical digitalisation and automation interventions change cycle time, waiting time, throughput and cost per case, and how does the effect depend on load, variability and the position of the intervention in the process?
- **RQ2.** How far does a priority ranking based on self-assessed digitalisation gaps agree with a ranking based on simulated operational effect?
- **RQ3.** Does a simulation step change which intervention practitioners choose, and how confident they are in that choice?

RQ1 is answered with computational experiments, RQ2 with real process applications, RQ3 with a practitioner study.

## 3. Propositions

Grounded in queueing theory and the business process redesign literature. H1 to H3 are expected from theory; the contribution lies in quantifying them for realistic BPMN processes and in H4 and H5.

- **H1 (bottleneck).** Automating a task that is not the bottleneck has a negligible effect on mean cycle time, at every load level.
- **H2 (variability).** The cycle-time benefit of reducing processing-time variability grows non-linearly with utilisation (Kingman's approximation).
- **H3 (rework).** Above a threshold rework probability, removing a rework loop (e.g. through digital intake and validation) beats speeding up the reworked task.
- **H4 (gap vs. effect).** Rankings of interventions by self-assessed gap and by simulated effect agree only weakly (Kendall's tau below 0.5).
- **H5 (decision change).** After seeing simulation results, practitioners change their preferred intervention more often than a control group that re-ranks without simulation.

## 4. Simulator readiness

What the simulator already provides (verified in the code and wiki):

- BPMN 2.0 execution with exclusive, parallel and inclusive gateways, timer events, boundary timers, subprocesses and terminate events.
- Stochastic task times (fixed, exponential, normal, uniform, triangular, lognormal, gamma), arrival processes, roles, working hours, costs and revenue.
- A seeded random number generator; scenarios run with the same seed (common random numbers).
- Trimming of first and last cases to reduce warm-up and end effects; a simulation horizon.
- Results by activity, resource and path; Excel and PDF reports; event logs as CSV and XES.

Gaps to close before the experiments (proposed simulator work packages):

1. **Batch runner.** A headless command (Node) that runs a scenario file for a list of seeds and writes one result file per run. The UI is not suitable for hundreds of runs.
2. **Replication statistics.** Mean, standard deviation and 95% confidence interval across seeds, and paired differences between scenarios under common random numbers.
3. **Run metadata.** Simulator version or commit, seed, scenario hash and run timestamp written into every export.
4. **Time-based warm-up.** Warm-up deletion by simulated time in addition to case trimming; Welch's method to choose its length.
5. **Interoperability (optional).** Import or export of simulation parameters in a format that an established simulator reads (e.g. BPSim or Prosimos JSON), so the same model can be cross-checked.
6. **Calibration from event logs (optional).** Derive arrival rates, task-time distributions and branch probabilities from an event log, e.g. with the ProcessIntelligence platform, to parameterise real processes.

## 5. Study 1: simulator verification (credibility)

Goal: show that the simulator produces correct numbers. This verifies the simulator only; it says nothing about the PDI framework.

| Test | Reference |
| --- | --- |
| M/M/1 and M/M/c waiting time and utilisation | Analytical results (Erlang C) |
| M/G/1 with lognormal or gamma service | Pollaczek–Khinchine formula |
| Tandem and branching networks | Jackson network results |
| Little's Law across all runs | L = λW from the event log |
| Gateway routing | Observed vs. configured branch frequencies |
| Working hours and timers | Hand-calculated deterministic cases |
| Same model in an established simulator | Distribution of cycle time (two-sample tests, CI overlap) |

Pass criterion per test: the analytical value lies inside the 95% confidence interval over at least 30 replications, at loads of 0.5, 0.7 and 0.9. Tests become part of the simulator's automated test suite.

## 6. Study 2: computational experiments (RQ1, H1–H3)

**Models.** Four to six stylised reference processes (linear, with parallel branches, with a rework loop, with an approval gateway, with a shared resource pool), plus the real processes from Study 3 once available.

**Intervention catalogue**, mapped to the PDI framework dimensions and to redesign best practices:

| Intervention | Simulator manipulation |
| --- | --- |
| Automate a task | Processing time × 0.1–0.5, lower variability, robot resource with its own cost |
| Digital intake and validation | Lower rework probability at the downstream gateway |
| Remove a handover | Merge two tasks into one, combined time minus a handover setup |
| Self-service | Part of the arrivals bypass a task |
| Add capacity | One more person in the bottleneck role |
| Extend service hours | Change working hours |

**Factors.** Intervention type × position (bottleneck / non-bottleneck) × utilisation of the bottleneck (0.6, 0.8, 0.9) × coefficient of variation of task times (0.5, 1.0, 1.5).

**Responses.** Mean and 90th-percentile cycle time, waiting time, throughput, cases served and cases balked, utilisation, cost per case.

**Run control.**

- Common random numbers within each cell: baseline and intervention use the same seed set.
- 30 seeds per cell (to be confirmed by a pilot: stop when the CI half-width is below 5% of the mean).
- Warm-up chosen with Welch's method per model and load level; the horizon is long enough that results do not depend on it at ρ = 0.9 (checked by doubling the horizon).
- Over-capacity cells (ρ ≥ 1) are reported separately and excluded from mean effects.

**Analysis.** Paired differences with 95% CIs; regression of effect size on factors and their interactions; effect plots per load level. Analysis scripts in `analysis/`, results from `runs/` only.

## 7. Study 3: process applications (RQ2, H4)

Three to five real processes from different organisations, ideally outside the CAS programme. This also delivers the documented framework applications that the PDI paper lists as an alternative route to external validation.

Per organisation:

1. Process owner completes the PDI checkup for the process; derive the gap-based intervention ranking.
2. Model the process in BPMN with the process owner; parameterise from event logs where available, otherwise from structured estimates (minimum, most likely, maximum → triangular).
3. Validate the as-is model: simulated vs. observed cycle time and throughput (face validity with the process owner; quantitative where data exists).
4. Simulate every candidate intervention; derive the effect-based ranking.
5. Compare the rankings (Kendall's tau, top-1 agreement); discuss the differences with the process owner.

A second evaluation cycle after implementation (where an organisation implements an intervention) compares predicted and realised effect.

Coding and comparison of rankings are done by a person not involved in developing the framework.

## 8. Study 4: practitioner study (RQ3, H5)

- **Participants.** Process owners and analysts, at least 40, recruited outside the authors' own programme where possible.
- **Design.** Between-subjects: both groups rank interventions for a realistic case; the treatment group then sees simulation results, the control group gets the same time to re-think; both re-rank.
- **Measures.** Ranking change, agreement with the simulated optimum, decision confidence, perceived usefulness and ease of use.
- **Pre-registration** of hypotheses and analysis before data collection.

## 9. What each study can and cannot claim

| Claim | Supported by |
| --- | --- |
| The simulator computes queueing behaviour correctly | Study 1 |
| Where digitalisation interventions pay off, in stylised processes | Study 2 |
| Gap-based priorities diverge from effect-based priorities in practice | Study 3 (small n, illustrative) |
| Simulation improves practitioners' intervention choices | Study 4 |
| The PDI instrument is valid and reliable | Not this paper; needs the survey with n ≥ 200 |
| Effects generalise to the Swiss economy | Not this paper |

## 10. Reproducibility and data

- Pin the simulator commit for every run; archive the exact version together with models, scenarios and scripts for the paper.
- Stylised models and their scenarios are published; partner models only with written permission, otherwise anonymised or described.
- Study 3 and 4: informed consent, anonymised data, no participant-level data in the repository without consent.
- **Licence conflict to resolve:** the simulator is proprietary. Many journals and artefact tracks expect code availability. Options: release an archived version for reviewers under a restricted licence, publish only the batch runner and analysis code, or make the research version open. Decision in `TASKS.md`.

## 11. Ethics

- Studies 1 and 2 involve no people.
- Studies 3 and 4 need BFH ethics review, consent forms and data-protection handling (Swiss FADP).
- Disclose that the first author developed both the simulator and the framework and directs the programme from which participants might come.

## 12. Work plan

| Phase | Content | Duration |
| --- | --- | --- |
| 0 | Decisions in `TASKS.md`; literature review on BPS and redesign heuristics | 2–3 weeks |
| 1 | Simulator work packages 1–4 | 3–4 weeks |
| 2 | Study 1 verification; optional short tool paper | 3 weeks |
| 3 | Study 2 computational experiments | 4 weeks |
| 4 | Ethics approval, partner recruitment (in parallel with 1–3) | 6–8 weeks |
| 5 | Study 3 process applications | 8–12 weeks |
| 6 | Study 4 practitioner study | 6–8 weeks |
| 7 | Writing and internal review | 6 weeks |

Studies 1 and 2 alone are enough for a first conference paper; Studies 3 and 4 are needed for the journal version.

## 13. Literature to review

Candidates only; each needs a verified DOI before it is cited.

- Design science: Hevner et al. (2004); Peffers et al. (2007); Venable et al. (2016), FEDS evaluation framework.
- Business process simulation: van der Aalst, business process simulation survival guide; Camargo et al., Simod; López-Pintado et al., Prosimos; Dumas et al., *Fundamentals of Business Process Management*.
- Simulation methodology: Law, *Simulation Modeling and Analysis*; Sargent on verification and validation of simulation models; Welch's warm-up method.
- Queueing: Little (1961); Kingman (1961).
- Redesign: Reijers and Liman Mansar (2005), best practices in business process redesign.
- Digitalisation prioritisation: the PDI paper and the maturity models it positions against.

## 14. Candidate venues

To be checked for scope, format and deadlines: BPM Conference (main, Forum, Demo tracks), Business Process Management Journal, Simulation Modelling Practice and Theory, Journal of Simulation, Winter Simulation Conference.
