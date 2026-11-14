"""V3: real data. A simulation model discovered by Simod from the BPI Challenge 2012 work items
is simulated by Prosimos and, after import, by this tool. Both are compared with the log itself."""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
LOG = ROOT / "data/v3/bpic12w.csv"
MODEL_DIR = Path(os.environ.get("SIMOD_OUT", ROOT / "data/v3/simod")) / "best_result"
CLI = os.environ.get("PROCSIM", str(ROOT / "tools/process-simulator/dist-cli/procsim.mjs"))
REPS = int(os.environ.get("REPS", 10))
OUT = ROOT / "results/v3.json"


def case_stats(df):
    df = df.copy()
    df["start_time"] = pd.to_datetime(df["start_time"], utc=True, format="ISO8601")
    df["end_time"] = pd.to_datetime(df["end_time"], utc=True, format="ISO8601")
    first = "start_time"
    if "enable_time" in df:
        df["enable_time"] = pd.to_datetime(df["enable_time"], utc=True, format="ISO8601")
        first = "enable_time"
    g = df.groupby("case_id")
    cycle = (g["end_time"].max() - g[first].min()).dt.total_seconds() / 3600
    work = ((df["end_time"] - df["start_time"]).dt.total_seconds() / 3600).groupby(df["case_id"]).sum()
    acts = df.groupby("activity").size() / df["case_id"].nunique()
    return {"cycle_h": float(cycle.mean()), "cycle_median_h": float(cycle.median()), "work_h": float(work.mean()), "events_per_case": float(len(df) / df["case_id"].nunique()), "activity_freq": acts.to_dict()}


def main():
    bpmn = next(MODEL_DIR.glob("*.bpmn"))
    params = MODEL_DIR / (bpmn.stem + ".json")
    log = pd.read_csv(LOG)
    n = log["case_id"].nunique()
    start = pd.to_datetime(log["start_time"], utc=True, format="ISO8601").min()
    real = case_stats(log)
    print("log", json.dumps({k: v for k, v in real.items() if k != "activity_freq"}))

    from prosimos.simulation_engine import run_simulation

    rows = []
    tmp = Path(tempfile.mkdtemp())
    for i in range(REPS):
        import random

        random.seed(1000 + i)
        np.random.seed(1000 + i)
        logp = tmp / f"p{i}.csv"
        run_simulation(str(bpmn), str(params), n, None, str(logp), start.isoformat())
        p = pd.read_csv(logp).rename(columns={"case_id": "case_id", "activity": "activity", "start_time": "start_time", "end_time": "end_time"})
        s = case_stats(p)
        rows.append({"tool": "Prosimos", "rep": i, **{k: v for k, v in s.items() if k != "activity_freq"}, "freq": s["activity_freq"]})
        print("prosimos", i, round(s["cycle_h"], 2), flush=True)

    own = tmp / "own.jsonl"
    cmd = ["node", CLI, "run", str(bpmn), "--prosimos", str(params), "--cases", str(n), "--start", start.isoformat(), "--reps", str(REPS), "--seed", "7", "--activities", "--out", str(own)]
    notes = subprocess.run(cmd, check=True, capture_output=True, text=True).stderr.strip().splitlines()
    for line in own.read_text().splitlines():
        r = json.loads(line)
        m = r["metrics"]
        freq = {a["name"]: a["count"] / max(1, r["casesStarted"]) for a in r.get("activities", [])}
        events = sum(a["count"] for a in r.get("activities", [])) / max(1, m["casesCompleted"])
        rows.append({"tool": "This tool", "rep": r["replication"], "cycle_h": m["cycle"] / 3600, "events_per_case": events, "freq": freq, "wallMs": r["wallMs"]})
    df = pd.DataFrame(rows)
    (ROOT / "data/v3").mkdir(parents=True, exist_ok=True)
    df.drop(columns=["freq"]).to_csv(ROOT / "data/v3/runs.csv", index=False)

    def ci(xs):
        xs = np.asarray(xs, float)
        h = stats.t.ppf(0.975, len(xs) - 1) * xs.std(ddof=1) / np.sqrt(len(xs)) if len(xs) > 1 else 0
        return float(xs.mean()), float(h)

    summary = {"log": real, "cases": int(n), "reps": REPS, "approximations": notes}
    lines = [r"\begin{tabular}{lrrr}", r"\toprule", r"Measure & Log & Prosimos & This tool \\", r"\midrule"]
    for key, label in [("cycle_h", "mean cycle time (h)"), ("events_per_case", "work items per case")]:
        cells = []
        for tool in ["Prosimos", "This tool"]:
            m, h = ci(df[df.tool == tool][key])
            summary[f"{tool}:{key}"] = {"mean": m, "half": h}
            cells.append(f"{m:.2f} $\\pm$ {h:.2f}")
        lines.append(f"{label} & {real[key]:.2f} & " + " & ".join(cells) + r" \\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    own_c = summary["This tool:cycle_h"]["mean"]
    pro_c = summary["Prosimos:cycle_h"]["mean"]
    summary["table"] = "\n".join(lines) + "\n"
    summary["macros"] = {
        "VthreeCases": f"{n:,}".replace(",", "\\,"),
        "VthreeLogCycle": f"{real['cycle_h']:.1f}",
        "VthreeOwnCycle": f"{own_c:.1f}",
        "VthreeProCycle": f"{pro_c:.1f}",
        "VthreeDiff": f"${100 * (own_c - pro_c) / pro_c:+.1f}$\\,\\%",
        "VthreeApprox": str(len(notes)),
    }
    OUT.write_text(json.dumps(summary, indent=1, default=float))
    print(summary["table"])
    print("\n".join(notes))


if __name__ == "__main__":
    sys.exit(main())
