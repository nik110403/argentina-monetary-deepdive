"""Bluelytics: daily blue (parallel) and official retail USD/ARS, full history."""

import pandas as pd

from common import banner, get, session, snapshot, urls, vintage_guard, write_tidy


def main():
    vintage_guard()
    banner("Bluelytics")
    sess = session()
    r = get(sess, urls()["bluelytics"]["evolution"])
    snapshot("bluelytics", "evolution.json", r.content)

    df = pd.DataFrame(r.json())
    # rows: {date, source: 'Oficial'|'Blue', value_sell, value_buy}
    df["series"] = df["source"].map({"Oficial": "fx_official_retail",
                                     "Blue": "fx_blue"})
    df = df.dropna(subset=["series"])
    df["value"] = (df["value_sell"] + df["value_buy"]) / 2
    write_tidy(df[["date", "series", "value"]], "bluelytics.csv",
               "Bluelytics API v2")


if __name__ == "__main__":
    main()
