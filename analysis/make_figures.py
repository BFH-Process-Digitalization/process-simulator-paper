"""Turns results/*.json into the LaTeX tables, macros and figures used in the paper."""
import json
import math
from pathlib import Path

try:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.ticker import FixedLocator, FuncFormatter, LogLocator, NullFormatter, NullLocator
except ImportError:
    plt = None  # tables and macros are still generated; figures need matplotlib

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "results"
OUT = ROOT / "paper/generated"
OUT.mkdir(parents=True, exist_ok=True)
if plt:
    plt.rcParams.update({"font.size": 8, "font.family": "serif", "figure.dpi": 200})
macros = []


def load(name):
    p = RES / f"{name}.json"
    return json.loads(p.read_text()) if p.exists() else None


def macro(name, value):
    macros.append(f"\\newcommand{{\\{name}}}{{{value}}}")


def pct(x, d=1):
    return f"{100 * x:.{d}f}\\,\\%"


def tex(s):
    return s.replace("_", "\\_").replace("%", "\\%").replace("rho", "$\\rho$").replace("lambda", "$\\lambda$")


def v1(r):
    lines = [r"\begin{tabular}{llrrrc}", r"\toprule", r"Model & Quantity & Exact & Simulated (95\,\% CI) & Error & In CI \\", r"\midrule"]
    worst = 0
    covered = 0
    total = 0
    for x in r["rows"]:
        if x["quantity"].startswith("Little"):
            continue
        total += 1
        covered += x["covered"]
        worst = max(worst, abs(x["relErr"]))
        lines.append(f"{tex(x['case'])} & {x['quantity']} & {x['exact']:.1f} & {x['mean']:.1f} $\\pm$ {x['half']:.1f} & {100 * x['relErr']:+.2f}\\,\\% & {'yes' if x['covered'] else 'no'} \\\\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    (OUT / "v1_table.tex").write_text("\n".join(lines) + "\n")
    little = max(abs(x["relErr"]) for x in r["rows"] if x["quantity"].startswith("Little"))
    macro("VoneReps", r["reps"])
    macro("VoneCases", f"{r['cases']:,}".replace(",", "\\,"))
    macro("VoneWorst", pct(worst, 2))
    macro("VoneCovered", f"{covered} of {total}")
    macro("VoneLittle", pct(little, 2))


def v2(r):
    lines = [r"\begin{tabular}{llrrr}", r"\toprule", r"Model & Quantity & This tool & Prosimos & Difference (95\,\% CI) \\", r"\midrule"]
    worst = 0
    zero = 0
    for x in r["rows"]:
        worst = max(worst, abs(x["rel_lo"]), abs(x["rel_hi"]))
        zero += x["rel_lo"] <= 0 <= x["rel_hi"]
        q = "mean cycle time" if x["metric"] == "cycle" else "mean wait " + x["metric"].split(".", 1)[1]
        lines.append(f"{x['label']} & {q} & {x['own']:.1f} & {x['prosimos']:.1f} & {100 * x['rel_diff']:+.1f}\\,\\% [{100 * x['rel_lo']:+.1f}, {100 * x['rel_hi']:+.1f}] \\\\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    (OUT / "v2_table.tex").write_text("\n".join(lines) + "\n")
    macro("VtwoReps", r["reps"])
    macro("VtwoCases", f"{r['cases']:,}".replace(",", "\\,"))
    macro("VtwoBound", pct(worst, 1))
    macro("VtwoZero", f"{zero} of {len(r['rows'])}")
    equiv = sum(x["rel_lo"] > -0.05 and x["rel_hi"] < 0.05 for x in r["rows"])
    macro("VtwoEquiv", f"{equiv} of {len(r['rows'])}")


def v4(r):
    lines = [r"\begin{tabular}{lrrrrrr}", r"\toprule", r"Case & \multicolumn{2}{c}{Lead time} & \multicolumn{3}{c}{PCE} & Rework \\", r" & exact & tool & exact & tool & linear map & tool \\", r"\midrule"]
    for x in r["rows"]:
        c = x["classic"]
        lines.append(
            f"{x['case']} & {x['exact']['lead']:.1f} & {x['tool']['lead']['mean']:.1f} & {x['pce']['exact']:.3f} & {x['pce']['tool']['mean']:.3f} & "
            f"{'--' if not c else f'{c['va'] / c['lead']:.3f}'} & {x['tool']['rework']['mean']:.1f} \\\\"
        )
    lines += [r"\bottomrule", r"\end{tabular}"]
    (OUT / "v4_table.tex").write_text("\n".join(lines) + "\n")
    macro("VfourPartition", f"{max(x['partitionError'] for x in r['rows']):.0e}".replace("e-", "\\times10^{-") + "}")
    macro("VfourReps", r["reps"])


def wilson(b, d=1):
    return f"{100 * b['p']:.{d}f} [{100 * b['lo']:.{d}f}, {100 * b['hi']:.{d}f}]"


def v5(r):
    budgets = [str(k) for k in r["budgets"] if str(k) != "1"]
    lines = [
        r"\begin{tabular}{lrrrrrrrrr}",
        r"\toprule",
        r"Problem & Best gap & \multicolumn{3}{c}{One run per option} & \multicolumn{%d}{c}{Paired replications per option} \\" % len(budgets),
        r" & & one stream & per-source & indep.\ seeds & " + " & ".join(budgets) + r" \\",
        r"\midrule",
    ]
    for p in r["problems"]:
        m = p["methods"]
        cells = [p["name"], pct(p["gapPct"]), wilson(m["singleStreamSameSeed"]), wilson(m["keyedSameSeed"]), wilson(m["independentSeeds"])]
        cells += [wilson(p["budgets"][k]) for k in budgets]
        lines.append(" & ".join(cells) + r" \\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    (OUT / "v5_table.tex").write_text("\n".join(lines) + "\n")
    lines = [r"\begin{tabular}{llrrrr}", r"\toprule", r"Problem & Option & True difference (s) & \multicolumn{3}{c}{Variance of the difference} \\", r" & & & independent & one stream & per source \\", r"\midrule"]
    best_ratio = 0
    for p in r["problems"]:
        names = {s["id"]: s["name"] for s in p["scenarios"]}
        for v in p["varianceOfDifference"]:
            best_ratio = max(best_ratio, v["singleStream"] / v["keyed"])
            lines.append(f"{tex(p['name'])} & {tex(names[v['id']])} & {v['trueDiff']:+.1f} & {v['independent']:.0f} & {v['singleStream']:.0f} & {v['keyed']:.0f} \\\\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    (OUT / "v5_variance.tex").write_text("\n".join(lines) + "\n")
    office = r["problems"][1]
    macro("VfiveN", f"{r['trials']:,}".replace(",", "\\,"))
    macro("VfiveRef", f"{r['ref']:,}".replace(",", "\\,"))
    macro("VfiveOfficeSingle", pct(1 - office["methods"]["singleStreamSameSeed"]["p"]))
    macro("VfiveOfficeKeyed", pct(1 - office["methods"]["keyedSameSeed"]["p"]))
    macro("VfiveOfficeIndep", pct(1 - office["methods"]["independentSeeds"]["p"]))
    macro("VfiveOfficeIndepCI", wilson({k: v for k, v in office["methods"]["independentSeeds"].items()}))
    macro("VfiveOfficeRep", pct(1 - office["budgets"]["10"]["p"]))
    macro("VfiveRatio", f"{best_ratio:.0f}")
    macro("VfiveCoffeeIndep", pct(1 - r["problems"][0]["methods"]["independentSeeds"]["p"]))
    pv = [p["pairedVsBaseline"] for p in r["problems"]]
    macro("VfiveWrong", pct(max(x["wrong"] for x in pv)))
    macro("VfiveNs", pct(max(x["ns"] for x in pv)))


RUNTIMES = [("Node.js", "#1f4e79", "o-"), ("Chromium", "#c55a11", "s--"), ("Firefox", "#548235", "^:")]
V6_TICKS = {"cases": [1e3, 1e4, 1e5, 1e6], "sequence": [5, 10, 20, 50, 100, 200], "parallel": [2, 5, 10, 20, 50]}


def tick(v):
    return f"$10^{{{round(math.log10(v))}}}$" if v >= 1000 else f"{v:g}"


def v6(r):
    rows = [dict(x, runtime="Node.js") for x in r["rows"]]
    b = load("v6_browser")
    if b:
        rows += b["rows"]
    if not plt:
        _v6_macros(r, b)
        return
    fig, axes = plt.subplots(1, 3, figsize=(7, 2.4))
    for ax, series, xl in zip(axes, ["cases", "sequence", "parallel"], ["cases", "activities in sequence", "parallel branches"]):
        for name, colour, style in RUNTIMES:
            pts = [x for x in rows if x["series"] == series and x["runtime"] == name]
            if pts:
                ax.plot([x["x"] for x in pts], [x["ms"] / 1000 for x in pts], style, color=colour, ms=3, lw=1, label=name)
        ax.set_xscale("log")
        ax.set_yscale("log")
        ax.xaxis.set_major_locator(FixedLocator(V6_TICKS[series]))
        ax.xaxis.set_major_formatter(FuncFormatter(lambda v, _: tick(v)))
        ax.xaxis.set_minor_locator(NullLocator())
        ax.yaxis.set_major_locator(LogLocator(base=10))
        ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _: f"{v:g}"))
        ax.yaxis.set_minor_formatter(NullFormatter())
        ax.set_xlabel(xl)
        ax.grid(alpha=0.3, which="major")
    axes[0].set_ylabel("run time (s)")
    if b:
        axes[0].legend(frameon=False, loc="upper left")
    fig.tight_layout(w_pad=1.5)
    fig.savefig(OUT / "v6_performance.pdf")
    _v6_macros(r, b)


def _v6_macros(r, b):
    big = max((x for x in r["rows"] if x["series"] == "cases"), key=lambda x: x["x"])
    macro("VsixMillion", f"{big['ms'] / 1000:.1f}")
    macro("VsixRate", f"{round(big['casesPerSecond'], -3):,.0f}".replace(",", "\\,"))
    macro("VsixCpu", r["cpu"].replace("(R)", "").replace("(TM)", "").strip())
    macro("VsixNode", r["node"])
    if b:
        macro("VsixReps", str(b["reps"]))
        macro("VsixChromium", b["browsers"]["Chromium"].split(".")[0])
        macro("VsixFirefox", b["browsers"]["Firefox"].split(".")[0])
        macro("VsixMismatches", str(b["mismatches"]))
        macro("VsixCompared", str(len(b["rows"])))
        for name, key in [("Chromium", "Chromium"), ("Firefox", "Firefox")]:
            m = max((x for x in b["rows"] if x["series"] == "cases" and x["runtime"] == name), key=lambda x: x["x"])
            macro(f"VsixMillion{key}", f"{m['ms'] / 1000:.1f}")
        ratios = [x["ms"] / next(y["ms"] for y in r["rows"] if y["series"] == x["series"] and y["x"] == x["x"]) for x in b["rows"]]
        macro("VsixRatioMin", f"{min(ratios):.1f}")
        macro("VsixRatioMax", f"{max(ratios):.1f}")


for name, fn in [("v1", v1), ("v2", v2), ("v4", v4), ("v5", v5), ("v6", v6)]:
    r = load(name)
    if r:
        fn(r)
v3 = load("v3")
if v3:
    for k, v in v3.get("macros", {}).items():
        macro(k, v)
    (OUT / "v3_table.tex").write_text(v3["table"])
(OUT / "macros.tex").write_text("\n".join(macros) + "\n")
print("\n".join(macros))
