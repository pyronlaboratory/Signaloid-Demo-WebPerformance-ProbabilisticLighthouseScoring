#!/usr/bin/env python3

import subprocess
import os
from tqdm import tqdm
from concurrent.futures import ProcessPoolExecutor

URL = "https://www.ronnie.tech"
TOTAL_RUNS = 1000
MAX_WORKERS = 1  # os.cpu_count()


def run_lighthouse(i):
    output_file = f"reports/run_{i}.json"

    result = subprocess.run(
        [
            "lighthouse",
            URL,
            "--output=json",
            "--output-path=" + output_file,
            "--chrome-flags=--headless",
            "--preset=desktop",
            "--throttling-method=provided",
            "--quiet",
            "--no-enable-error-reporting",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return result.returncode


if __name__ == "__main__":
    os.makedirs("reports", exist_ok=True)

    with ProcessPoolExecutor(max_workers=MAX_WORKERS) as executor:
        results = list(
            tqdm(
                executor.map(run_lighthouse, range(TOTAL_RUNS)),
                total=TOTAL_RUNS,
                desc="Running Lighthouse",
            )
        )

    failed = [i for i, code in enumerate(results) if code != 0]
    if failed:
        print(f"\n{len(failed)} runs failed: {failed}")
