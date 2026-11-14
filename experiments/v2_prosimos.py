"""V2: cross-check against Prosimos on the models written by v2_models.mjs.

Both simulators run REPS replications per model. Statistics come from the event logs of
both tools in the same way: cases arriving in the first WARMUP seconds are left out.
"""
import json
import os
import random
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
CLI = os.environ.get("PROCSIM", str(ROOT / "tools/process-simulator/dist-cli/procsim.mjs"))
REPS = int(os.environ.get("REPS", 20))
WARMUP = 2000 * 60
START = "2026-01-05T00:00:00.000000+00:00"


def prosimos_run(m, seed):
    from prosimos.simulation_engine import run_simulation

    random.seed(seed)
    np.random.seed(seed)
    with tempfile.TemporaryDirectory() as d:
        log = Path(d) / "log.csv"
        run_simulation(m["bpmn"], m["prosimos"], m["cases"], stat_out_path=str(Path(d) / "s.csv"), log_out_path=str(log), starting_at=START)
        df = pd.read_csv(log)
    for c in ("enable_time", "start_time", "end_time"):
        df[c] = pd.to_datetime(df[c], format="ISO8601")
    t0 = pd.Timestamp(START)
    for c in ("enable_time", "start_time", "end_time"):
        df[c] = (df[c] - t0).dt.total_seconds()
    arrive = df.groupby("case_id")["enable_time"].min()
    end = df.groupby("case_id")["end_time"].max()
    kept = arrive[arrive >= WARMUP].index
    d = df[df.case_id.isin(kept)]
    out = {"cycle": float((end[kept] - arrive[kept]).mean())}
    for t in m["tasks"]:
        x = d[d.activity == t]
        out["wait." + t] = float((x.start_time - x.enable_time).mean())
    return out


def own_runs(m):
    sc = json.loads(Path(m["json"]).read_text())
    sc["warmup"] = WARMUP
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(sc, f)
    out = subprocess.run(["node", CLI, "run", m["bpmn"], "--params", f.name, "--reps", str(REPS)], capture_output=True, text=True, check=True).stdout
    os.unlink(f.name)
    return [json.loads(l) for l in out.strip().splitlines()]


def main():
    subprocess.run(["node", str(ROOT / "experiments/v2_models.mjs")], check=True)
    index = json.loads((ROOT / "data/models/v2_index.json").read_text())
    raw = []
    rows = []
    for m in index:
        own = own_runs(m)
        ps = [prosimos_run(m, 1000 + i) for i in range(REPS)]
        for r in own:
            raw.append({"model": m["name"], "tool": "process-simulator", "replication": r["replication"], "seed": r["seed"], **{k: r["metrics"][k] for k in ["cycle"] + ["wait." + t for t in m["tasks"]]}})
        for i, r in enumerate(ps):
            raw.append({"model": m["name"], "tool": "prosimos", "replication": i, "seed": 1000 + i, **r})
        for k in ["cycle"] + ["wait." + t for t in m["tasks"]]:
            a = np.array([r["metrics"][k] for r in own])
            b = np.array([r[k] for r in ps])
            diff = a.mean() - b.mean()
            se = np.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
            dof = se**4 / ((a.var(ddof=1) / len(a)) ** 2 / (len(a) - 1) + (b.var(ddof=1) / len(b)) ** 2 / (len(b) - 1))
            half = stats.t.ppf(0.975, dof) * se
            rows.append({
                "model": m["name"], "label": m["label"], "metric": k,
                "own": a.mean(), "own_half": stats.t.ppf(0.975, len(a) - 1) * a.std(ddof=1) / np.sqrt(len(a)),
                "prosimos": b.mean(), "prosimos_half": stats.t.ppf(0.975, len(b) - 1) * b.std(ddof=1) / np.sqrt(len(b)),
                "rel_diff": diff / b.mean(), "rel_lo": (diff - half) / b.mean(), "rel_hi": (diff + half) / b.mean(),
            })
            print(m["name"], k, f"{a.mean():.1f} vs {b.mean():.1f}  diff {100 * diff / b.mean():+.2f} % [{100 * (diff - half) / b.mean():+.2f}, {100 * (diff + half) / b.mean():+.2f}]", flush=True)
    (ROOT / "data/v2").mkdir(parents=True, exist_ok=True)
    pd.DataFrame(raw).to_csv(ROOT / "data/v2/runs.csv", index=False)
    (ROOT / "results").mkdir(exist_ok=True)
    (ROOT / "results/v2.json").write_text(json.dumps({"reps": REPS, "warmup": WARMUP, "cases": index[0]["cases"], "rows": rows}, indent=2))


if __name__ == "__main__":
    sys.exit(main())
