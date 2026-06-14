"""INDEC IPC cuadros: national headline, core (núcleo), regulated (regulados),
seasonal (estacionales) and the twelve divisions, as INDEX LEVELS.

The sh_ipc_*.xls workbook has merged headers and stacked regional blocks, so the
parser is deliberately defensive: it locates the month header row by counting
date-like cells and the 'Total nacional' block by label, then matches row labels
against known names. Inflation rates are computed downstream from index levels
(never trust pre-computed variation columns). Raw file is snapshotted first, so
a parser failure costs nothing.

Division weights are NOT in the workbook; they live in
config/indec_division_weights.csv (verify against the methodology doc)."""

import re
import sys
import unicodedata

import pandas as pd

from common import (banner, get, scrape_link, session, snapshot, urls,
                    vintage_guard, write_tidy, CONFIG)

CATEGORIES = {
    "nivel general": "cpi_headline",
    "estacional": "cpi_seasonal",
    "estacionales": "cpi_seasonal",
    "nucleo": "cpi_core",
    "regulados": "cpi_regulated",
}


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().lower()


def find_header_row(raw):
    """Row with the most parseable-as-date cells = the month header."""
    best, best_n = None, 0
    for i in range(min(12, len(raw))):
        n = pd.to_datetime(raw.iloc[i], errors="coerce").notna().sum()
        if n > best_n:
            best, best_n = i, n
    if best is None or best_n < 12:
        sys.exit("INDEC parser: could not locate a month header row "
                 f"(best row had {best_n} date cells). Inspect the raw snapshot.")
    return best


def national_block(raw, label_col):
    """Row range of the 'Total nacional' block (to the next region or EOF)."""
    labels = raw[label_col].map(norm)
    starts = labels[labels.str.contains("total nacional", na=False)].index
    if len(starts) == 0:
        return 0, len(raw)  # some vintages are national-only
    start = starts[0]
    nxt = labels[(labels.index > start) &
                 labels.str.contains(r"^regi[o]n", na=False)].index
    end = nxt[0] if len(nxt) else len(raw)
    return start, end


def main():
    vintage_guard()
    banner("INDEC IPC")
    u = urls()["indec"]
    sess = session()

    url = u["direct"] or scrape_link(sess, u["page"], u["link_regex"], u["base"])
    if not url:
        sys.exit("Could not find an sh_ipc_*.xls link on the INDEC page. "
                 "Paste the current URL into config/urls.yaml (indec.direct).")
    print(f"  fetching {url}")
    r = get(sess, url)
    fname = url.rsplit("/", 1)[-1]
    path = snapshot("indec", fname, r.content)

    engine = "openpyxl" if fname.endswith("x") else "xlrd"
    book = pd.read_excel(path, sheet_name=None, header=None, engine=engine)

    # pick the index-levels sheet: name contains 'indice' (not 'variacion')
    sheet = next((n for n in book
                  if "indice" in norm(n) and "variac" not in norm(n)), None)
    if sheet is None:
        sys.exit(f"No index-level sheet found. Sheets: {list(book)}")
    raw = book[sheet]
    print(f"  sheet: '{sheet}'  shape={raw.shape}")

    hdr = find_header_row(raw)
    dates = pd.to_datetime(raw.iloc[hdr], errors="coerce")
    # columns are months by definition; floor to month start (one 2026-03 header
    # cell in the May-2026 vintage carried a stray day-of-month)
    dates = dates.dt.to_period("M").dt.to_timestamp()
    date_cols = dates[dates.notna()].index.tolist()
    label_col = 0

    start, end = national_block(raw, label_col)
    block = raw.iloc[start:end]

    weights = pd.read_csv(CONFIG / "indec_division_weights.csv")
    divisions = {norm(d): d for d in weights["division"]}

    rows_cat, rows_div, seen = [], [], set()
    for _, row in block.iterrows():
        lab = norm(row[label_col])
        if not lab:
            continue
        if lab in CATEGORIES and CATEGORIES[lab] not in seen:
            seen.add(CATEGORIES[lab])
            for c in date_cols:
                rows_cat.append((dates[c], CATEGORIES[lab], row[c]))
        elif lab in divisions and lab not in seen:
            seen.add(lab)
            for c in date_cols:
                rows_div.append((dates[c], divisions[lab], row[c]))

    missing_cat = set(CATEGORIES.values()) - seen
    missing_div = set(divisions) - seen
    if missing_cat:
        sys.exit(f"INDEC parser: categories not found: {missing_cat}. "
                 "Inspect the raw snapshot and adjust CATEGORIES.")
    if missing_div:
        print(f"  WARNING: divisions not matched: "
              f"{[divisions[d] for d in missing_div]}")
        if len(missing_div) > 2:
            sys.exit("Too many unmatched divisions — fix label matching.")

    cat = pd.DataFrame(rows_cat, columns=["date", "series", "value"])
    cat["value"] = pd.to_numeric(cat["value"], errors="coerce")
    write_tidy(cat, "indec_cpi.csv", "INDEC IPC cuadros (index levels)")

    div = pd.DataFrame(rows_div, columns=["date", "series", "value"])
    div["value"] = pd.to_numeric(div["value"], errors="coerce")
    write_tidy(div, "cpi_divisions.csv", "INDEC IPC cuadros (divisions, index levels)")


if __name__ == "__main__":
    main()
