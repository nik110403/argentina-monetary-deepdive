"""EMBI Argentina (riesgo país) + MEP and CCL dollar rates from Ámbito's
historical endpoints. Semi-official status: documented in the methodology
section; EMBI level is used only for event studies, never for levels claims."""

import datetime as dt
import sys

import pandas as pd

from common import (banner, comma_decimal, get, params, session, snapshot,
                    urls, vintage_guard, write_tidy)


def _chunks(start, end, max_months=1):
    """Split a date range into monthly chunks.

    Monthly chunks avoid the Ámbito quirk where any range crossing Aug 1-13 2025
    returns 400; those months are skipped individually and logged as data gaps.
    """
    cur = start
    while cur <= end:
        m = cur.month + max_months
        y = cur.year + (m - 1) // 12
        m = (m - 1) % 12 + 1
        chunk_end = min(dt.date(y, m, 1) - dt.timedelta(days=1), end)
        yield cur, chunk_end
        cur = chunk_end + dt.timedelta(days=1)


def _parse_date(s):
    """Parse DD-MM-YYYY or DD/MM/YYYY date strings from Ámbito."""
    s = str(s).strip()
    for fmt in ("%d-%m-%Y", "%d/%m/%Y"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_rows(rows):
    body = (rows[1:] if rows
            and isinstance(rows[0][0], str)
            and "fecha" in str(rows[0][0]).lower()
            else rows)
    recs = []
    for row in body:
        d = _parse_date(row[0])
        if d is None:
            continue
        recs.append((d, comma_decimal(row[1])))
    return recs


def _get_lenient(sess, url):
    """Like get() but returns None on 400 (Ámbito data gap); warns on other errors."""
    import time as _time
    for i in range(3):
        try:
            r = sess.get(url, timeout=60)
            if r.status_code == 400:
                return None      # known Ámbito data gap — not a real error
            if not r.ok:
                print(f"    HTTP {r.status_code} for {url[-60:]}")
                if i < 2:
                    _time.sleep(3 * (i + 1))
                continue
            return r
        except Exception as e:
            print(f"    Error: {e}")
            if i < 2:
                _time.sleep(3 * (i + 1))
    return None


def fetch(sess, template, start, end, series, label):
    """Try the whole range in one request first (riesgopais serves it fine).
    The dolarrava endpoints cap the window and 400 on ranges touching their
    Aug 1-13 2025 gap — for those, fall back to monthly chunks and skip the
    gap months individually."""
    import time as _time
    all_recs = []
    skipped = 0
    r = _get_lenient(sess, template.format(start=start.strftime("%d-%m-%Y"),
                                           end=end.strftime("%d-%m-%Y")))
    if r is not None:
        all_recs = _parse_rows(r.json())
    else:
        print(f"  {label}: full-range request refused, falling back to monthly chunks")
        for chunk_start, chunk_end in _chunks(start, end):
            url = template.format(start=chunk_start.strftime("%d-%m-%Y"),
                                  end=chunk_end.strftime("%d-%m-%Y"))
            _time.sleep(0.5)  # avoid rate-limiting on burst requests
            r = _get_lenient(sess, url)
            if r is None:
                print(f"  SKIP {chunk_start}..{chunk_end} (400 — Ámbito data gap)")
                skipped += 1
                continue
            all_recs.extend(_parse_rows(r.json()))
    snapshot("ambito", f"{series}.json",
             str(all_recs).encode())  # save combined for the record
    if skipped:
        print(f"  NOTE: {skipped} chunk(s) skipped due to Ámbito data gaps")
    if not all_recs:
        print(f"  WARNING: {label} returned no rows")
        return None
    df = pd.DataFrame(all_recs, columns=["date", "value"]).drop_duplicates("date")
    df["series"] = series
    print(f"  {label}: {len(df)} rows")
    return df


def main():
    vintage_guard()
    banner("Ámbito: EMBI, MEP, CCL")
    u = urls()["ambito"]
    p = params()
    sess = session()
    start = dt.date.fromisoformat(str(p["sample_start"]))
    end = dt.date.fromisoformat(str(p["vintage_end"]))

    frames = []
    for key, series, label in (("embi", "embi", "EMBI riesgo país"),
                               ("mep", "fx_mep", "Dólar MEP"),
                               ("ccl", "fx_ccl", "Dólar CCL")):
        df = fetch(sess, u[key], start, end, series, label)
        if df is not None:
            frames.append(df)

    if not frames:
        sys.exit("All Ámbito endpoints failed — check config/urls.yaml (ambito).")
    write_tidy(pd.concat(frames, ignore_index=True), "embi.csv",
               "Ámbito Financiero historical endpoints (semi-official)")


if __name__ == "__main__":
    main()
