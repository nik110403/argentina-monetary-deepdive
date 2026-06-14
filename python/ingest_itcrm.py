"""ITCRM: BCRA daily multilateral real exchange rate index (ITCRMSerie.xlsx)."""

import sys

import pandas as pd

from common import (banner, bcra_session, get, snapshot, urls, vintage_guard,
                    write_tidy)


def main():
    vintage_guard()
    banner("BCRA ITCRM")
    url = urls()["itcrm"]["direct"]
    sess = bcra_session()
    r = get(sess, url)
    path = snapshot("itcrm", url.rsplit("/", 1)[-1], r.content)

    raw = pd.read_excel(path, header=None, engine="openpyxl")
    # locate header row: first row whose first cell parses as a date is data;
    # the ITCRM column is the first numeric column next to the date column.
    dates = pd.to_datetime(raw[0], errors="coerce")
    data = raw[dates.notna()].copy()
    if data.empty:
        sys.exit("ITCRM parser: no date column found in column 0 — inspect raw.")
    df = pd.DataFrame({
        "date": pd.to_datetime(data[0]),
        "series": "itcrm",
        "value": pd.to_numeric(data[1], errors="coerce"),
    })
    write_tidy(df, "itcrm.csv", "BCRA ITCRM serie diaria")


if __name__ == "__main__":
    main()
