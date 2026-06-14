"""BCRA Estadísticas API v4.0: monetary stocks, A3500, deposits, and the
factors of explanation of the monetary base.

Series ids are never hardcoded: the variable catalog is fetched first and
descriptions are matched against the regexes in config/series_ids.yaml.

The factors decomposition is the single most important dataset for Test 2.
If no catalog entry matches, this script WARNS LOUDLY and continues, so the
rest of the pipeline still runs; the fallback is parsing the Informe Monetario
xlsx annexes (budget half a day, see plan).

API note: v3.0 was deprecated (410 Gone) as of June 2026. v4.0 uses the same
catalog path but the data endpoint wraps rows in a 'detalle' list."""

import json
import re
import sys

import pandas as pd

from common import (banner, bcra_session, get, params, record_resolved,
                    series_ids, snapshot, urls, vintage_guard, write_tidy)


def fetch_catalog(sess, base):
    r = get(sess, f"{base}/estadisticas/v4.0/monetarias", params={"limit": 2000})
    snapshot("bcra", "catalog_monetarias.json", r.content)
    cat = r.json().get("results", [])
    if not cat:
        sys.exit("BCRA catalog came back empty — inspect the raw snapshot.")
    return cat


def match_one(cat, spec, key):
    """spec: string (regex) or dict {regex, categoria?, unidad?}"""
    if isinstance(spec, dict):
        pattern  = spec["regex"]
        cat_filt = spec.get("categoria")
        uni_filt = spec.get("unidad")
    else:
        pattern = spec
        cat_filt = uni_filt = None

    rx = re.compile(pattern, re.IGNORECASE)
    hits = [v for v in cat if rx.search(v.get("descripcion", ""))]
    if cat_filt:
        hits = [v for v in hits if v.get("categoria", "") == cat_filt]
    if uni_filt:
        hits = [v for v in hits
                if uni_filt.lower() in v.get("unidadExpresion", "").lower()]
    if len(hits) == 1:
        return hits[0]
    print(f"\nREGEX PROBLEM for '{key}': pattern {pattern!r} matched "
          f"{len(hits)} catalog entries (after filters):")
    for v in (hits or cat)[:40]:
        print(f"  id={v.get('idVariable'):>5}  cat={v.get('categoria')}  "
              f"unit={v.get('unidadExpresion')}  {v.get('descripcion')}")
    sys.exit("Fix the regex/filters in config/series_ids.yaml (bcra.monetarias) and re-run.")


def fetch_series(sess, base, var_id, desde):
    """v4.0: results is [{idVariable, detalle:[{fecha,valor},...]}]"""
    rows, offset, limit = [], 0, 3000
    while True:
        r = get(sess, f"{base}/estadisticas/v4.0/monetarias/{var_id}",
                params={"desde": desde, "limit": limit, "offset": offset})
        results = r.json().get("results", [])
        chunk = results[0]["detalle"] if results else []
        rows.extend(chunk)
        if len(chunk) < limit:
            break
        offset += limit
    return pd.DataFrame(rows)


def main():
    vintage_guard()
    banner("BCRA Estadísticas v4.0")
    cfg, u, p = series_ids(), urls(), params()
    base = u["bcra_api_base"]
    sess = bcra_session()
    desde = str(p["sample_start"])

    cat = fetch_catalog(sess, base)

    # --- core monetary series ------------------------------------------------
    frames = []
    for key, spec in cfg["bcra"]["monetarias"].items():
        v = match_one(cat, spec, key)
        print(f"  {key}: id={v['idVariable']}  '{v['descripcion']}'")
        record_resolved("bcra", key, int(v["idVariable"]))
        df = fetch_series(sess, base, v["idVariable"], desde)
        if df.empty:
            sys.exit(f"No data returned for {key} (id={v['idVariable']}).")
        frames.append(pd.DataFrame({
            "date": df["fecha"], "series": key, "value": df["valor"]}))
    tidy = pd.concat(frames, ignore_index=True)
    snapshot("bcra", "monetarias_raw.json",
             tidy.to_json(orient="records", date_format="iso"))
    write_tidy(tidy, "bcra_monetary.csv", "BCRA Estadísticas API v4.0")

    # --- factors of explanation ----------------------------------------------
    rx_any = re.compile(cfg["bcra"]["factors_any"], re.IGNORECASE)
    fvars = [v for v in cat if rx_any.search(v.get("descripcion", ""))]
    if not fvars:
        print("\n" + "!" * 78)
        print("!! NO CATALOG ENTRY MATCHED THE FACTORS-OF-EXPLANATION REGEX.")
        print("!! Test 2 (decomposition) is BLOCKED until this is resolved.")
        print("!! Either fix bcra.factors_any in config/series_ids.yaml, or fall")
        print("!! back to parsing the Informe Monetario xlsx annexes (see plan).")
        print("!" * 78 + "\n")
        return

    groups = cfg["bcra"]["factor_groups"]
    frames = []
    for v in fvars:
        desc = v["descripcion"]
        grp = next((g for g, pat in groups.items()
                    if re.search(pat, desc, re.IGNORECASE)), "other")
        print(f"  factor[{grp}]: id={v['idVariable']}  '{desc}'")
        df = fetch_series(sess, base, v["idVariable"], desde)
        if df.empty:
            continue
        frames.append(pd.DataFrame({
            "date": df["fecha"],
            "series": f"factor_{grp}",
            "value": df["valor"]}))
    if not frames:
        sys.exit("Factors matched in catalog but returned no data — inspect raw.")
    fact = (pd.concat(frames, ignore_index=True)
              .groupby(["date", "series"], as_index=False)["value"].sum())
    write_tidy(fact, "bcra_factors.csv", "BCRA Estadísticas API v4.0 (factores)")


if __name__ == "__main__":
    main()
