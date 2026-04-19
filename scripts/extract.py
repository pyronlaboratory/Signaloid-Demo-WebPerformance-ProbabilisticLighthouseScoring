#!/usr/bin/env python3

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(BASE_DIR, "..", "reports")
INPUT_DIR = os.path.join(BASE_DIR, "..", "inputs")

os.makedirs(INPUT_DIR, exist_ok=True)


def natural_sort_key(s):
    return [
        int(text) if text.isdigit() else text.lower()
        for text in re.split("([0-9]+)", s)
    ]


files = [f for f in os.listdir(REPORTS_DIR) if f.endswith(".json")]
files.sort(key=natural_sort_key)
total_count = len(files)

metrics = {
    "fcp": "first-contentful-paint",
    "lcp": "largest-contentful-paint",
    "tbt": "total-blocking-time",
    "cls": "cumulative-layout-shift",
    "si": "speed-index",
}

file_handles = {
    name: open(os.path.join(INPUT_DIR, f"{name}.txt"), "w") for name in metrics
}

for fh in file_handles.values():
    fh.write(f"{total_count}\n")

for filename in files:
    filepath = os.path.join(REPORTS_DIR, filename)

    try:
        with open(filepath, "r") as f:
            data = json.load(f)

        audits = data["audits"]

        for key, audit_id in metrics.items():
            raw_score = audits[audit_id].get("score", 0)
            if raw_score is None:
                raw_score = 0

            score_val = raw_score * 100.0
            file_handles[key].write(f"{score_val}\n")

    except Exception as e:
        print(f"Error in {filename}: {e}")

for fh in file_handles.values():
    fh.close()

print(
    f"Done. {total_count} records processed. Files saved to: {os.path.abspath(INPUT_DIR)}"
)
