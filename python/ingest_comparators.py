"""Comparator stabilizations (Test 3 support): monthly CPI for Israel 1985 and
Brazil 1994, plus US CPI for real comparisons.

DEVIATION FROM PLAN, DOCUMENTED: the plan named IMF IFS via `imfr`, but the IFS
SDMX API was migrated in 2025 and the legacy endpoint retired. Sources here:
  - Brazil: BCB SGS series 433 (IPCA, monthly % variation) — open API, no key.
  - Israel: FRED ISRCPIALLMINMEI (CPI index, monthly) via the keyless
    fredgraph.csv endpoint.
  - US: FRED CPIAUCSL, same endpoint.
Same numbers, stable access. Bolivia 1985 and Peru 1990 get one sentence in
prose and no data pull (per plan)."""

import io

import pandas as pd

from common import (banner, get, series_ids, session, snapshot, urls,
                    vintage_guard, DATA, RAW, TIDY_COLS)
import datetime as dt


def fred_csv(sess, base, code, series):
    import subprocess, pathlib
    # Use cached snapshot if already downloaded today (curl fallback for sites
    # that time out under Python's SSL stack but work under curl).
    today = dt.date.today().isoformat()
    cached = RAW / "comparators" / today / f"fred_{code}.csv"
    if cached.exists():
        print(f"  FRED {code}: using cached snapshot at {cached}")
        content = cached.read_bytes()
    else:
        try:
            r = get(sess, base, params={"id": code})
            content = r.content
            snapshot("comparators", f"fred_{code}.csv", content)
        except SystemExit:
            # Fall back to curl if requests times out
            print(f"  FRED {code}: requests timed out, trying curl fallback...")
            url = f"{base}?id={code}"
            cached.parent.mkdir(parents=True, exist_ok=True)
            result = subprocess.run(["curl", "-s", "--max-time", "30", url,
                                     "-o", str(cached)], capture_output=True)
            if result.returncode != 0 or not cached.exists():
                raise SystemExit(f"curl fallback also failed for FRED {code}")
            content = cached.read_bytes()
            print(f"  FRED {code}: curl fallback succeeded")
    df = pd.read_csv(io.BytesIO(content))
    df.columns = ["date", "value"]
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df["series"] = series
    print(f"  FRED {code}: {len(df.dropna())} rows")
    return df.dropna()


def bcb_sgs(sess, template, code, series):
    r = get(sess, template.format(code=code), params={"formato": "json"})
    snapshot("comparators", f"bcb_sgs_{code}.json", r.content)
    df = pd.DataFrame(r.json())
    df["date"] = pd.to_datetime(df["data"], format="%d/%m/%Y")
    df["value"] = pd.to_numeric(df["valor"], errors="coerce")
    df["series"] = series
    print(f"  BCB SGS {code}: {len(df)} rows")
    return df[["date", "series", "value"]].dropna()


def main():
    vintage_guard()
    banner("Comparators: Israel 1985, Brazil 1994, US CPI")
    u, cfg = urls(), series_ids()
    sess = session()

    frames = [
        fred_csv(sess, u["fredgraph"], cfg["fred"]["israel_cpi"], "cpi_israel"),
        fred_csv(sess, u["fredgraph"], cfg["fred"]["us_cpi"], "cpi_us"),
        bcb_sgs(sess, u["bcb_sgs"], cfg["bcb"]["brazil_ipca"], "infl_brazil"),
    ]
    df = pd.concat(frames, ignore_index=True)
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df["source"] = "FRED fredgraph.csv / BCB SGS (IFS deviation documented)"
    df["retrieved_at"] = dt.datetime.now().isoformat(timespec="seconds")
    df = df[TIDY_COLS].sort_values(["series", "date"])

    # NOTE: deliberately NOT vintage-clipped — historical episodes predate
    # sample_start by decades, so this file bypasses write_tidy's clip.
    DATA.mkdir(exist_ok=True)
    out = DATA / "comparators.csv"
    df.to_csv(out, index=False)
    print(f"  data -> {out}  ({len(df)} rows)")
    for s, g in df.groupby("series"):
        print(f"    {s:14s} {g['date'].min()} .. {g['date'].max()}  n={len(g)}")


if __name__ == "__main__":
    main()
