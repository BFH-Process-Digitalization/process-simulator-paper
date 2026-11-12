# Research plan

Status: draft for author discussion. Nothing in this plan is a result.

**Working title.** BPSBench: A Business Process Simulation Benchmark with Statistically Guaranteed Ground Truth for What-If Analysis

Name check (November 2026): no paper or repository named "BPSBench" or "Business Process Simulation Benchmark" was found on GitHub, arXiv or Crossref. "WhatIfBench" is taken by an LLM counterfactual-reasoning benchmark and is not used. Repeat the check on Google Scholar before submission.

## 1. Scope

One question only: **given a process, a goal and a fixed set of candidate interventions, which intervention is best?**

Contributions:

1. **Benchmark.** Process instances, candidate interventions and, for each instance, the set of best interventions with a stated probability of correct selection.
2. **Construction method.** A procedure that makes the ground truth independent of a single simulator and of chance: analytical solutions where they exist, agreement of two simulators otherwise, and ranking-and-selection statistics.
3. **Baselines and a headline finding.** How often common practice (one run per scenario) picks a worse intervention, compared with simple rules and the statistically sound procedure.

Out of scope: LLM-generated interventions, discovery of simulation models from logs, log similarity, data-aware or agent-based simulation, usability.

## 2. Requirements for a bulletproof ground truth

| # | Requirement | How |
| --- | --- | --- |
| R1 | Not dependent on one simulator | Tier A: instances with exact queueing solutions (M/M/c, M/G/1, Jackson networks); the winner follows from the formula. Tier B: richer instances; a winner counts only if the Process Simulator and Prosimos agree, otherwise the instance is dropped and reported |
| R2 | Statistically guaranteed | Ranking and selection with an indifference zone δ (e.g. Kim–Nelson); the reported best set is correct with probability ≥ 0.95. Interventions within δ of the best are tied |
| R3 | Valid common random numbers | Random numbers keyed to events, so an intervention that changes a case's path does not shift later draws. Verify the simulator's current seed semantics first |
| R4 | Unambiguous task | One objective per instance (e.g. mean cycle time, at most +1 FTE), fixed horizon or documented warm-up, fixed intervention catalogue |
| R5 | Stable | The best set must not change under other seed streams, longer runs, another warm-up and the second simulator; publish the stability per instance |
| R6 | Not trivial | Label every instance with whether the rule "add capacity at the highest utilisation" already solves it; balance the benchmark across difficulty |
| R7 | Clean data | Only assets with verified licences; generated instances with published generator and seeds; a held-out test split for learning-based methods evaluated on the benchmark later |
| R8 | Reproducible | Open-source simulator and scripts, pinned versions, checksums, Zenodo DOI, one command recomputes every ground truth |

## 3. Instances

- **Tier A (analytical):** single-server and multi-server stations, tandem lines and open networks with exponential or general service. Interventions: add a server, speed up a task, reroute, change arrival rate.
- **Tier B (simulated):** generated BPMN models with sequence, choice, parallelism and loops, plus the Prosimos and Simod test models and the simulator's coffee-shop example (licences to verify).
- **Factors varied:** bottleneck utilisation (0.6–0.95), task-time variability (CV 0.5–1.5), true effect size between candidates, model size.
- **Candidate catalogue:** add capacity, speed up a task, remove a task (waste), change working hours, change routing probability, reduce rework probability. About 10–30 candidates per instance.

Pilot: 6–8 instances to fix δ, run lengths and thresholds before the main runs.

## 4. Experiments

- **E1 Ground-truth validation.** Tier A: simulated best set against the analytical best. Tier B: agreement rate between the two simulators; stability checks R5.
- **E2 Wrong-decision rates of common practice.** Methods: one run each with independent seeds; one run each with common random numbers; replications with confidence intervals; ranking and selection. Response: probability of choosing an intervention outside the best set, as a function of the factors. Logistic regression and error curves.
- **E3 Baselines on the benchmark.** Random choice, utilisation rule, single-run comparison, ranking and selection. Metrics: hit rate (choice in the best set), regret (relative gap to the best), cost of the chosen intervention.

## 5. Simulator work needed

1. Headless batch runner over seed lists and scenario files.
2. Event-keyed random numbers for common random numbers (R3).
3. Ranking-and-selection procedure and paired confidence intervals.
4. Time-based warm-up.
5. Run metadata in every export: simulator version, seed, scenario hash.
6. Exporter to Prosimos input for Tier B cross-checks.
7. Instance generator.

## 6. Reproducibility

- Every number in the paper comes from scripts in `analysis/` that read `runs/`.
- Benchmark, generator, scripts and raw results on Zenodo with a DOI.
- The simulator is to be released under an open-source licence before submission (decision pending).

## 7. Threats to validity

- Generated instances may not represent real processes; mitigated by Tier B public models and by reporting results per tier.
- Ground truth is itself estimated in Tier B; mitigated by R2, R5 and the two-simulator rule.
- Author is also the tool developer; mitigated by the second simulator and fully scripted, published experiments.

## 8. Target journals

IF values must be checked on the publisher page (JCR figure) before submission.

| Journal | IF | Fit |
| --- | --- | --- |
| **IEEE Access** (primary) | 4.2 per author, to verify on IEEE page | Broad scope, computational evaluation; single-round binary review; open-access fee to verify |
| Decision Support Systems | about 6–7, to verify | Decision quality of process simulation |
| Expert Systems with Applications | about 7–8, to verify | Computational evaluation, high volume |

## 9. Work plan

| Phase | Content | Duration |
| --- | --- | --- |
| 0 | Literature review, pilot, fix δ and thresholds | 3 weeks |
| 1 | Simulator work packages 1–5 | 4 weeks |
| 2 | Instance generator, Prosimos exporter, Tier A and B ground truth | 5 weeks |
| 3 | E1–E3 | 3 weeks |
| 4 | Writing, Zenodo release | 4–6 weeks |

About five months to submission.

## 10. Related work (preliminary search, arXiv and Crossref)

No published work was found that builds a benchmark of intervention-selection tasks with statistically guaranteed ground truth for business process simulation. Closest work, to be read in full and cited:

- Chapela-Campa et al., "Can I Trust My Simulation Model? Measuring the Quality of Business Process Simulation Models", arXiv 2303.17463: quality by log similarity, not decisions.
- Özdemir et al., "Rethinking BPS: A Utility-Based Evaluation Framework", arXiv 2505.22316: utility for downstream predictive tasks, not intervention selection. Closest framing.
- Fournier et al., "Towards a Benchmark for Causal Business Process Reasoning with LLMs", arXiv 2406.05506: rule-based ground truth, no simulation.
- Klievtsova et al., "Conversational Process Model Redesign", arXiv 2505.05453.
- Vidgof et al., "Large Language Models for Business Process Management: Opportunities and Challenges", doi:10.1007/978-3-031-41623-1_7.
- Common random numbers: doi:10.1109/wsc.1990.129543; doi:10.1109/wsc.2008.4736074; "Realizing Common Random Numbers: Event-Keyed Hashing for Causally Valid Stochastic Models", arXiv 2603.11084.
- To add: ranking and selection (Kim and Nelson), Law, *Simulation Modeling and Analysis*; Prosimos and Simod papers; BPM, ICPM and CAiSE 2025–2026 proceedings; Google Scholar, Scopus.
