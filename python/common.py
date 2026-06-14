"""Shared helpers for all ingest scripts.

Contract (from the project plan): every ingester downloads to
data-raw/{source}/{YYYY-MM-DD}/ (never overwrites), parses to a tidy frame with
columns [date, series, value, source, retrieved_at], writes to data/, and logs
row counts and date ranges to stdout.
"""

import datetime as dt
import io
import json
import os
import re
import sys
import time
from pathlib import Path

import certifi
import pandas as pd
import requests
import yaml

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data-raw"
DATA = ROOT / "data"
CONFIG = ROOT / "config"

TIDY_COLS = ["date", "series", "value", "source", "retrieved_at"]

UA = ("Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0")


def load_yaml(name):
    with open(CONFIG / name, encoding="utf-8") as f:
        return yaml.safe_load(f)


def params():
    return load_yaml("params.yaml")


def urls():
    return load_yaml("urls.yaml")


def series_ids():
    return load_yaml("series_ids.yaml")


def vintage_guard():
    p = params()
    if p.get("vintage_locked"):
        sys.exit(
            "REFUSING TO RUN: vintage_locked is true in config/params.yaml.\n"
            "The data vintage is frozen. Set vintage_locked: false only if you "
            "intend to re-open the vintage (and say so in the paper)."
        )


def session(verify=True):
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept": "*/*"})
    s.verify = verify
    return s


def bcra_session():
    """Session for api.bcra.gob.ar with its incomplete-chain workaround.

    Verification stays on. Preference order for the CA bundle:
    $BCRA_CA_BUNDLE > config/bcra_chain.pem (built by `make bcra-cert`) > certifi.
    """
    bundle = os.environ.get("BCRA_CA_BUNDLE", "")
    if not bundle:
        local = CONFIG / "bcra_chain.pem"
        bundle = str(local) if local.exists() else certifi.where()
    return session(verify=bundle)


def get(sess, url, retries=4, sleep=3.0, **kw):
    last = None
    for i in range(retries):
        try:
            r = sess.get(url, timeout=120, **kw)
            r.raise_for_status()
            return r
        except requests.exceptions.SSLError as e:
            sys.exit(
                f"TLS verification failed for {url}\n{e}\n"
                "If this is api.bcra.gob.ar, run `make bcra-cert` to export the "
                "server's full chain into config/bcra_chain.pem (verification is "
                "never disabled)."
            )
        except requests.exceptions.RequestException as e:
            last = e
            time.sleep(sleep * (i + 1))
    raise SystemExit(f"FAILED after {retries} tries: {url}\n{last}")


def snapshot(source, filename, content):
    """Save raw bytes under data-raw/{source}/{today}/, never overwriting."""
    d = RAW / source / dt.date.today().isoformat()
    d.mkdir(parents=True, exist_ok=True)
    path = d / filename
    if path.exists():
        stem, suf = path.stem, path.suffix
        k = 1
        while path.exists():
            path = d / f"{stem}_{k}{suf}"
            k += 1
    mode = "wb" if isinstance(content, bytes) else "w"
    with open(path, mode) as f:
        f.write(content)
    print(f"  raw -> {path.relative_to(ROOT)}")
    return path


def write_tidy(df, outname, source):
    """Validate, stamp, clip to vintage, write data/{outname}, log per series."""
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df["source"] = source
    df["retrieved_at"] = dt.datetime.now().isoformat(timespec="seconds")
    df = df[TIDY_COLS].dropna(subset=["value"]).sort_values(["series", "date"])

    p = params()
    end = dt.date.fromisoformat(str(p["vintage_end"]))
    start = dt.date.fromisoformat(str(p["sample_start"]))
    before = len(df)
    df = df[(df["date"] >= start) & (df["date"] <= end)]
    if before - len(df):
        print(f"  vintage clip: dropped {before - len(df)} rows outside "
              f"{start}..{end}")

    DATA.mkdir(exist_ok=True)
    out = DATA / outname
    df.to_csv(out, index=False)
    print(f"  data -> {out.relative_to(ROOT)}  ({len(df)} rows)")
    for s, g in df.groupby("series"):
        print(f"    {s:28s} {g['date'].min()} .. {g['date'].max()}  "
              f"n={len(g)}")
    return df


def scrape_link(sess, page_url, link_regex, base):
    """Return the last (most recent) href on `page_url` matching `link_regex`."""
    html = get(sess, page_url).text
    hits = re.findall(link_regex, html, flags=re.IGNORECASE)
    if not hits:
        return None
    href = hits[-1].replace("\\", "/")
    if not href.startswith("http"):
        href = base.rstrip("/") + "/" + href.lstrip("/")
    return href


def comma_decimal(x):
    """'1.234,56' -> 1234.56 ; '1234,56' -> 1234.56 ; passthrough floats."""
    if isinstance(x, (int, float)):
        return float(x)
    x = str(x).strip().replace(".", "").replace(",", ".")
    try:
        return float(x)
    except ValueError:
        return float("nan")


def record_resolved(block, key, value):
    """Append a resolved id to config/series_ids.yaml for the record."""
    path = CONFIG / "series_ids.yaml"
    cfg = yaml.safe_load(path.read_text(encoding="utf-8"))
    cfg.setdefault(block, {}).setdefault("resolved", {})
    if cfg[block]["resolved"].get(key) == value:
        return
    cfg[block]["resolved"][key] = value
    path.write_text(yaml.safe_dump(cfg, allow_unicode=True, sort_keys=False),
                    encoding="utf-8")


def banner(name):
    print(f"\n=== {name} ===")
