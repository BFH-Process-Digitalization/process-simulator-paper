# Research plan

Status: draft for author discussion. Nothing in this plan is a result.

## 1. Contribution

A paper about the Process Simulator, a BPMN 2.0 discrete-event simulator that runs in the browser and as a Camunda Modeler plugin, evaluated entirely by automated experiments. No human participants are involved.

Two contributions:

1. **Artefact.** A BPMN-native simulator for what-if analysis on unchanged BPMN 2.0 models, with no installation and no server, designed so that scenario comparisons are statistically sound by default (common random numbers, replications, warm-up handling).
2. **Methodological finding.** A quantification of how often the common practice of comparing scenarios from single, independently seeded runs leads to the wrong decision, and how much common random numbers and replications reduce that error.

A tool description alone will not pass review at an IF > 3.5 journal; contribution 2 carries the paper.

## 2. Research questions

- **RQ1 (correctness).** Does the simulator reproduce analytical queueing results?
- **RQ2 (accuracy).** How closely do simulations reproduce real process behaviour recorded in public event logs, compared with an established business process simulator?
- **RQ3 (decision quality).** How often does a single-run scenario comparison select the inferior scenario, and how does this error depend on load, variability, effect size and run length, with and without common random numbers and replications?
- **RQ4 (efficiency).** Is the browser engine fast enough for interactive what-if analysis at realistic model sizes and case volumes?

## 3. Hypotheses

- **H1.** For all verification models, the analytical value lies within the 95% confidence interval of the simulated mean.
- **H2.** On the same discovered models, the simulator's accuracy is not worse than that of the reference simulator on the standard similarity measures.
- **H3.** The wrong-decision rate of independent single-run comparisons rises with utilisation and falls with effect size; at utilisation 0.9 and small effects it exceeds 20%.
- **H4.** Common random numbers reduce the wrong-decision rate at equal computing time; adding replications with a confidence-interval stopping rule reduces it below 5%.
- **H5.** A comparison of three scenarios with 10,000 cases each completes within a few seconds in current browsers on a standard laptop.

Thresholds in H3 and H5 are placeholders to be set after a pilot and stated before the main runs.

## 4. Experiments

### E1 Verification against queueing theory (RQ1)

| Model | Reference |
| --- | --- |
| M/M/1, M/M/c | Erlang C waiting time, utilisation |
| M/G/1 with lognormal and gamma service | Pollaczek–Khinchine formula |
| Tandem and branching open networks | Jackson network results |
| Every run | Little's Law, L = λW, from the event log |
| Gateways | Observed vs. configured branch frequencies |
| Working hours and timers | Hand-calculated deterministic cases |

Loads 0.5, 0.7, 0.9 and 0.95; at least 30 replications; warm-up removed with Welch's method. The tests become part of the simulator's automated test suite.

### E2 Accuracy on public event logs (RQ2)

1. **Logs.** Public real-life logs, e.g. BPI Challenge 2012, 2017, 2019 and 2020, plus the logs used in prior simulation-discovery studies (check licences; all must be openly available).
2. **Discovery.** Discover the BPMN model and simulation parameters (arrivals, task-time distributions, branching probabilities, resources, calendars) from a training part of each log, using the established discovery pipeline so both simulators get the same model.
3. **Translation.** Convert the discovered parameters into the Process Simulator's format with a documented, automated converter.
4. **Simulation.** Simulate the test period with the Process Simulator and with the reference simulator; 10 to 30 replications each.
5. **Measures.** The similarity measures proposed for business process simulation models: control-flow (n-gram) distance, absolute and relative event distribution, circadian distribution, arrival distribution, cycle-time distribution.
6. **Analysis.** Paired comparison per log and measure; report where and why the engines differ (semantics of calendars, resource allocation, batching).

This isolates the engine: both simulators run the same discovered model, so differences come from simulation semantics, not from discovery.

### E3 Decision quality of scenario comparison (RQ3)

**Ground truth.** For each pair of scenarios, the true better scenario is fixed by very long runs with many replications.

**Factors.**

| Factor | Levels |
| --- | --- |
| Model | Generated BPMN models of increasing size and structure (sequence, parallel, choice, loop) |
| Utilisation of the bottleneck | 0.6, 0.8, 0.9, 0.95 |
| Coefficient of variation of task times | 0.5, 1.0, 1.5 |
| True effect size on mean cycle time | 1%, 2%, 5%, 10%, 20% |
| Run length | 100, 1,000, 10,000 cases |
| Intervention type | Faster task, more capacity, lower rework probability, changed routing |

**Comparison methods.**

1. Single run each, independent seeds (common practice).
2. Single run each, common random numbers.
3. k replications with independent seeds, decision by confidence interval.
4. k replications with common random numbers, paired confidence interval (the simulator's design).

**Responses.** Wrong-decision rate, rate of "no difference" verdicts, computing time to a correct decision.

**Analysis.** Logistic regression of a wrong decision on the factors and methods; error-rate curves per load and effect size; equal-computing-time comparison of the methods.

### E4 Performance (RQ4)

Run time and memory in Chrome, Firefox and Safari for 1,000 to 100,000 cases, 10 to 200 activities and 1 to 10 scenarios, on stated hardware, median of ten runs. Same models in the reference simulator for orientation.

## 5. Simulator work needed

1. **Batch runner.** Headless command (Node) that runs scenario files over a list of seeds and writes one result file per run. Needed for every experiment.
2. **Replications and confidence intervals in the app**, with paired comparison under common random numbers. This is the design feature the paper evaluates in E3.
3. **Time-based warm-up** in addition to case trimming.
4. **Run metadata** in every export: simulator version, seed, scenario hash.
5. **Parameter import** from the discovery pipeline's output format (E2).
6. **Model generator** for E3, or use of an existing random process-model generator.

## 6. Reproducibility

- Every number in the paper comes from scripts in `analysis/` that read `runs/`.
- Pin the simulator commit for every run.
- Publish generated models, scenario files, converters, raw results and analysis scripts with a DOI (e.g. Zenodo).
- The web app is public; the simulator source is proprietary. State this in the data and code availability statement and offer reviewers access to the exact engine version. Check each journal's code policy before submission.

## 7. Threats to validity

- E2 depends on the quality of the discovered models; the comparison is between engines on the same model, not of discovery.
- Generated models in E3 may not represent real processes; mitigate with the E2 models as an additional set.
- Ground truth in E3 is itself estimated; use run lengths that make its error negligible relative to the smallest effect.
- Author is also the tool developer; mitigate with fully scripted, published experiments.

## 8. Target journals

IF values marked ✓ were read from publisher pages in August 2026; the others must be verified before choosing.

| Journal | IF | Fit |
| --- | --- | --- |
| Decision Support Systems | about 6–7, to verify | Best fit: simulation models from event logs and decision quality |
| Expert Systems with Applications | about 7–8, to verify | Computational evaluation, high volume |
| Information Systems Frontiers | 6.2 ✓ | IS artefact framing; median 34 days to first decision ✓ |
| Business Process Management Journal | 5.8 ✓ | BPM practice framing; fast first decision ✓ |
| Computers in Industry | 9.1 ✓ | Needs an industrial application angle |
| IEEE Access | about 3.5, to verify | Fast fallback; open-access fee |

Recommended: Decision Support Systems first; Expert Systems with Applications or Business Process Management Journal as fallbacks.

## 9. Work plan

| Phase | Content | Duration |
| --- | --- | --- |
| 0 | Literature review, journal decision, pilot for thresholds | 2–3 weeks |
| 1 | Simulator work packages 1–4 | 3–4 weeks |
| 2 | E1 verification and E4 performance | 2 weeks |
| 3 | E2 discovery pipeline, converter, runs | 4–6 weeks |
| 4 | E3 decision-quality experiment | 4 weeks |
| 5 | Writing | 4–6 weeks |

About four to six months to submission; review and publication typically another six to twelve months.

## 10. Literature to review

Candidates only; each needs a verified DOI before it is cited.

- Business process simulation: van der Aalst, business process simulation survival guide; Dumas et al., *Fundamentals of Business Process Management*.
- Discovery of simulation models from event logs: Camargo et al., Simod; López-Pintado et al., Prosimos; Chapela-Campa et al., measuring the quality of business process simulation models.
- Simulation output analysis: Law, *Simulation Modeling and Analysis*; Sargent on verification and validation; Welch's warm-up method; literature on common random numbers and variance reduction.
- Queueing: Little (1961); Kingman (1961).
- Random process-model generation for experiments.
