"""REM (Relevamiento de Expectativas de Mercado): median expected inflation
over the next 12 months, monthly survey.

The REM database xlsx layout has changed before, so the parser is heuristic:
it hunts every sheet for a long-format block containing an inflation variable
with a next-12-months horizon and a median column, and prints what it found.
If parsing fails the raw file is already snapshotted; adjust the hints below."""

import re
import sys
import unicodedata

import pandas as pd

from common import (banner, get, scrape_link, session, snapshot, urls,
                    vintage_guard, write_tidy)

VAR_HINT = r"(inflaci[óo]n|precios).*"
# "Próx. 12 meses" normalises to "prox. 12 meses" so match abbreviated form too
HORIZON_HINT = r"(pr[óo]x(imos|\.)?\s*12|12\s*meses)"
MEDIAN_HINT = r"mediana"


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().lower()


def try_sheet(raw):
    """Find (header_row, cols) such that the block parses; return tidy df or None."""
    for hdr in range(min(8, len(raw))):
        cols = [norm(c) for c in raw.iloc[hdr]]
        if not any(re.search(MEDIAN_HINT, c) for c in cols):
            continue
        df = raw.iloc[hdr + 1:].copy()
        df.columns = cols
        med = next(c for c in cols if re.search(MEDIAN_HINT, c))
        varc = next((c for c in cols if "variable" in c), None)
        # prefer the period/horizon column ("periodo") over "referencia"
        horc = (next((c for c in cols
                      if re.search(r"horizonte|^per[i]odo$", c)), None)
                or next((c for c in cols
                         if re.search(r"per[i]odo|referencia", c)), None))
        datec = next((c for c in cols
                      if re.search(r"fecha|^mes$", c)), cols[0])
        if varc is None or horc is None:
            continue
        m = df[df[varc].map(norm).str.contains(VAR_HINT, na=False, regex=True)
               & df[horc].map(norm).str.contains(HORIZON_HINT, na=False,
                                                 regex=True)]
        if m.empty:
            continue
        out = pd.DataFrame({
            "date": pd.to_datetime(m[datec], errors="coerce"),
            "series": "rem_infl_12m",
            "value": pd.to_numeric(m[med], errors="coerce"),
        }).dropna()
        if len(out) >= 24:
            return out
    return None


def main():
    vintage_guard()
    banner("REM expected inflation")
    u = urls()["rem"]
    sess = session()

    url = u["direct"] or scrape_link(sess, u["page"], u["link_regex"], u["base"])
    if not url:
        sys.exit("No REM xlsx link found. Paste the 'base de datos' URL into "
                 "config/urls.yaml (rem.direct).")
    print(f"  fetching {url}")
    r = get(sess, url)
    path = snapshot("rem", url.rsplit("/", 1)[-1], r.content)

    book = pd.read_excel(path, sheet_name=None, header=None, engine="openpyxl")
    for name, raw in book.items():
        out = try_sheet(raw)
        if out is not None:
            print(f"  parsed sheet '{name}': {len(out)} monthly observations")
            # survey dates may be day-stamped; collapse to month start, keep last
            out["date"] = out["date"].dt.to_period("M").dt.to_timestamp()
            out = out.groupby("date", as_index=False).last()
            out["series"] = "rem_infl_12m"
            write_tidy(out, "rem.csv", "BCRA REM (median, next 12 months)")
            return
    print("  sheets found:", list(book))
    sys.exit("REM parser: no sheet matched the heuristics. Inspect the raw "
             "snapshot and adjust VAR_HINT / HORIZON_HINT / MEDIAN_HINT.")


if __name__ == "__main__":
    main()
