"""V3 step 1: BPI Challenge 2012 to a CSV with one row per work item (W_ activities).

The log is downloaded from 4TU.ResearchData (doi:10.4121/uuid:3926db30-f712-4394-aebc-75976070e91f)
and is not redistributed here. START and COMPLETE events of the same activity in a case are paired.
"""
import csv
import gzip
import urllib.request
from collections import defaultdict
from pathlib import Path

from lxml import etree

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/BPI_Challenge_2012.xes.gz"
URL = "https://data.4tu.nl/file/533f66a4-8911-4ac7-8612-1235d65d1f37/3276db7f-8bee-4f2b-88ee-92dbffb5a893"
OUT = ROOT / "data/v3/bpic12w.csv"


def attrs(el):
    return {c.get("key"): c.get("value") for c in el if c.get("key")}


def main():
    if not RAW.exists():
        RAW.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, RAW)
    rows = []
    with gzip.open(RAW) as f:
        for _, trace in etree.iterparse(f, tag="{*}trace"):
            case = attrs(trace).get("concept:name")
            open_items = defaultdict(list)
            for ev in trace.iterfind("{*}event"):
                a = attrs(ev)
                act = a.get("concept:name", "")
                if not act.startswith("W_"):
                    continue
                life = a.get("lifecycle:transition", "").upper()
                if life == "START":
                    open_items[act].append((a["time:timestamp"], a.get("org:resource", "")))
                elif life == "COMPLETE" and open_items[act]:
                    start, res = open_items[act].pop(0)
                    rows.append({"case_id": case, "activity": act, "start_time": start, "end_time": a["time:timestamp"], "resource": a.get("org:resource") or res or "unknown"})
            trace.clear()
    rows.sort(key=lambda r: (r["case_id"], r["start_time"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["case_id", "activity", "start_time", "end_time", "resource"])
        w.writeheader()
        w.writerows(rows)
    print(len(rows), "work items in", len({r["case_id"] for r in rows}), "cases")


if __name__ == "__main__":
    main()
