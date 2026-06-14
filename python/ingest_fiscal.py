"""Fiscal series + nominal GDP from datos.gob.ar (Series de Tiempo API).

Series ids are resolved at runtime via the search endpoint, filtered by the
title regexes in config/series_ids.yaml; set an explicit `id` there to skip
the search. Resolved ids are recorded back into the config for the paper's
appendix."""

import re
import sys

import pandas as pd

from common import (banner, get, record_resolved, series_ids, session,
                    snapshot, urls, vintage_guard, write_tidy)


def resolve(sess, search_url, spec, key):
    if spec.get("id"):
        return spec["id"], "(explicit id from config)"
    r = get(sess, search_url, params={"q": spec["q"], "limit": 50})
    hits = r.json().get("data", [])
    rx = re.compile(spec["title_regex"], re.IGNORECASE)
    for h in hits:
        title = h.get("field", {}).get("title", "") or h.get("title", "")
        desc = h.get("field", {}).get("description", "") or ""
        sid = h.get("field", {}).get("id", "") or h.get("id", "")
        if sid and (rx.search(title) or rx.search(desc)):
            return sid, title or desc
    print(f"\nSEARCH PROBLEM for '{key}' (q={spec['q']!r}): "
          f"{len(hits)} results, none matched {spec['title_regex']!r}.")
    for h in hits[:20]:
        f = h.get("field", {})
        print(f"  {f.get('id','?'):40s} {f.get('title') or f.get('description','')}")
    sys.exit("Set an explicit id in config/series_ids.yaml (datos_gob_ar) and re-run.")


def fetch(sess, series_url, sid, start):
    r = get(sess, series_url, params={
        "ids": sid, "format": "json", "start_date": start, "limit": 5000})
    data = r.json().get("data", [])
    if not data:
        sys.exit(f"datos.gob.ar returned no data for {sid}")
    return pd.DataFrame(data, columns=["date", "value"])


def main():
    vintage_guard()
    banner("datos.gob.ar fiscal + GDP + EMAE")
    cfg = series_ids()["datos_gob_ar"]
    u = urls()["datos_gob_ar"]
    sess = session()

    frames = []
    for key in ("fiscal_primary", "fiscal_financial", "gdp_nominal", "emae"):
        sid, title = resolve(sess, u["search"], cfg[key], key)
        print(f"  {key}: {sid}  '{title}'")
        record_resolved("datos_gob_ar", key, sid)
        df = fetch(sess, u["series"], sid, "2021-01-01")
        snapshot("fiscal", f"{key}.json",
                 df.to_json(orient="records", date_format="iso"))
        df["series"] = key
        frames.append(df)

    write_tidy(pd.concat(frames, ignore_index=True), "fiscal.csv",
               "datos.gob.ar Series de Tiempo (MECON/INDEC)")


if __name__ == "__main__":
    main()
