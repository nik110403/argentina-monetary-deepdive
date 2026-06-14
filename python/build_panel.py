"""Merge cleaned series into the two analysis panels.

  data/panel_monthly.csv : 2022-01..vintage, monthly. Stocks are monthly means
                           of daily observations; CPI columns are index levels
                           plus m/m % inflation computed here (never from
                           pre-computed variation columns).
  data/panel_daily.csv   : FX rates, gap, reserves, EMBI, daily, with phase
                           and event flags.

Both also written as .parquet when pyarrow is available. R reads the csv.
Missing input files are tolerated with a loud warning (the dependent R module
will stop with its own message), EXCEPT the CPI and BCRA monetary files, which
are hard requirements for everything."""

import sys
from pathlib import Path

import pandas as pd

from common import CONFIG, DATA, banner, params

REQUIRED = ["indec_cpi.csv", "bcra_monetary.csv"]
OPTIONAL = ["bluelytics.csv", "rem.csv", "itcrm.csv", "fiscal.csv",
            "embi.csv", "bcra_factors.csv"]


def load(name):
    p = DATA / name
    if not p.exists():
        if name in REQUIRED:
            sys.exit(f"MISSING REQUIRED INPUT: data/{name} — run its ingester.")
        print(f"  WARNING: data/{name} missing; downstream module will skip.")
        return None
    df = pd.read_csv(p, parse_dates=["date"])
    return df[["date", "series", "value"]]


def wide(df, freq):
    """Pivot tidy->wide at the given frequency; daily series averaged monthly."""
    if freq == "M":
        df = df.copy()
        df["date"] = df["date"].dt.to_period("M").dt.to_timestamp()
        df = df.groupby(["date", "series"], as_index=False)["value"].mean()
    return df.pivot(index="date", columns="series", values="value")


def add_phase(df, phases):
    df["phase"] = pd.NA
    df["phase_label"] = pd.NA
    for ph in phases:
        m = (df.index >= pd.Timestamp(ph["start"])) & \
            (df.index <= pd.Timestamp(ph["end"]))
        df.loc[m, "phase"] = ph["phase"]
        df.loc[m, "phase_label"] = ph["label"]
    return df


def write(df, stem):
    out = DATA / f"{stem}.csv"
    df.to_csv(out)
    print(f"  -> {out}  {df.shape[0]} rows x {df.shape[1]} cols, "
          f"{df.index.min().date()}..{df.index.max().date()}")
    try:
        df.to_parquet(DATA / f"{stem}.parquet")
    except Exception as e:  # pyarrow optional
        print(f"  (parquet skipped: {e})")


def main():
    banner("build_panel")
    p = params()
    phases = p["phases"]
    events = pd.read_csv(CONFIG / "events.csv", parse_dates=["date"])

    tidy = {n: load(n) for n in REQUIRED + OPTIONAL}

    # ---------------- monthly panel ----------------
    monthly_inputs = [tidy[n] for n in
                      ("indec_cpi.csv", "bcra_monetary.csv", "bluelytics.csv",
                       "rem.csv", "itcrm.csv", "fiscal.csv", "embi.csv")
                      if tidy.get(n) is not None]
    m = wide(pd.concat(monthly_inputs, ignore_index=True), "M").sort_index()

    # m/m inflation from index levels
    for col, out in (("cpi_headline", "infl_headline"), ("cpi_core", "infl_core"),
                     ("cpi_regulated", "infl_regulated"),
                     ("cpi_seasonal", "infl_seasonal")):
        if col in m:
            m[out] = m[col].pct_change() * 100

    # parallel gap (%): blue and (where available) CCL vs wholesale A3500
    if {"fx_blue", "fx_official_a3500"} <= set(m.columns):
        m["gap_blue"] = (m["fx_blue"] / m["fx_official_a3500"] - 1) * 100
    if {"fx_ccl", "fx_official_a3500"} <= set(m.columns):
        m["gap_ccl"] = (m["fx_ccl"] / m["fx_official_a3500"] - 1) * 100

    # real aggregates (index: deflated by headline CPI)
    if {"base_money", "cpi_headline"} <= set(m.columns):
        m["real_base"] = m["base_money"] / m["cpi_headline"] * 100
    if {"m2_transac", "cpi_headline"} <= set(m.columns):
        m["real_m2"] = m["m2_transac"] / m["cpi_headline"] * 100

    m = add_phase(m, phases)
    m = m[m.index >= pd.Timestamp(p["sample_start"])]
    write(m, "panel_monthly")

    # ---------------- daily panel ----------------
    daily_inputs = [tidy[n] for n in
                    ("bcra_monetary.csv", "bluelytics.csv", "embi.csv")
                    if tidy.get(n) is not None]
    d = wide(pd.concat(daily_inputs, ignore_index=True), "D").sort_index()
    keep = [c for c in ("fx_official_a3500", "fx_blue", "fx_mep", "fx_ccl",
                        "embi", "reserves_gross") if c in d.columns]
    d = d[keep].dropna(how="all")
    if {"fx_blue", "fx_official_a3500"} <= set(d.columns):
        d["gap_blue"] = (d["fx_blue"] / d["fx_official_a3500"] - 1) * 100
    if {"fx_ccl", "fx_official_a3500"} <= set(d.columns):
        d["gap_ccl"] = (d["fx_ccl"] / d["fx_official_a3500"] - 1) * 100

    d = add_phase(d, phases)
    d["event"] = ""
    for _, ev in events.iterrows():
        if ev["date"] in d.index:
            d.loc[ev["date"], "event"] = ev["slug"]
    write(d, "panel_daily")

    # factors pass straight through (daily, long) — 07_decomposition.R reads it
    if tidy.get("bcra_factors.csv") is not None:
        print("  factors present: data/bcra_factors.csv (long format, daily)")
    else:
        print("  NOTE: factors absent — 07_decomposition.R (Test 2) will stop.")


if __name__ == "__main__":
    main()
