## The promise
```yaml
kind: prose
```
Monthly inflation ran at 25.5% in December 2023. Javier Milei had campaigned on three monetary commitments, each stated without qualification: dollarization of the economy, closure of the Banco Central de la República Argentina, and a deficit of zero. Days after the November 2023 runoff the office of the president-elect reaffirmed that the closure of the central bank "no es un asunto negociable." The inaugural address carried the fiscal pledge in three words, "no hay plata."

An economic argument sat beneath the rhetoric. Argentina had removed thirteen zeros from its currency across four reforms between 1969 and 1992, defaulted on sovereign debt nine times since independence, and entered 2023 with annual inflation above 200% and a central bank financing the Treasury directly. In that setting the promise amounted to credibility imported wholesale.

Neither institutional commitment survived. Four successive peso regimes arrived in their place, and monthly inflation printed 2.1% in May 2026. Three questions order the grade that follows: whether confidence in the peso returned, what anchored it, and whether the arrangement now in force can keep holding it.

## Three regimes of inflation
```yaml
kind: scrolly
chart: fig02_inflation_phases
png: arg-fig02
flavor: overlay
```
Two days after the inauguration the monetary program began. On 12 December 2023 the economy ministry under Luis Caputo moved the official rate from 366 to 800 pesos per dollar, a step of 118%, committed the central bank to a <span class="k" data-key="blue">crawling peg</span> of 2% per month, and pledged that the bank would extend no new financing to the Treasury. That crawl ran unbroken through January 2025. From 1 February 2025 it slowed to 1% per month.
```yaml
highlight: { from: 23, to: 38, label: "Crawling peg" }
```
On 11 April 2025 the IMF approved a 48-month Extended Fund Facility of about USD 20bn. The same day the central bank replaced the crawl with a band of 1,000 to 1,400 pesos per dollar, eliminated the exporter blend rate, and lifted the cepo for individuals. Reserve-accumulation targets were missed, recorded as such in the Fund's own review.
```yaml
highlight: { from: 39, to: 47, label: "IMF band" }
```
On 1 January 2026 the current regime entered force. Indexation is its defining feature: the band's maximal monthly depreciation at month T equals headline CPI inflation at month T−2. Permitted depreciation widened from 2.5% in January 2026 to 3.4% in May while <span class="k" data-key="crimson">headline inflation</span> fell from 2.9% to 2.1%. A band that widens during disinflation is the procyclical loosening indexation implies.
```yaml
highlight: { from: 48, to: 52, label: "Indexed band" }
```
<span class="k" data-key="crimson">Headline inflation</span> has printed at or above 2% in every month since September 2025, nine consecutive prints. Real transactional balances remain below where they stood at the start of the program. The <span class="k" data-key="actual">core</span> print of 1.9% in May is the first below that line. Disinflation that stalls at a 2% floor while the nominal anchor moves with lagged prices is a different object from disinflation that converges.
```yaml
annotate: { x: 51, text: "~2% floor" }
```

## Confidence returned
```yaml
kind: scrolly
chart: fig03_gap_events
png: arg-fig03
```
Among the confidence statistics the parallel-market premium is the most legible. The <span class="k" data-key="blue">blue gap</span> averaged above 100% across 2022 and 2023 and now trades within about 1% of the official rate. Across the four phases its means run 100.9%, 27.6%, 2.1%, and 1.4%. One qualification attaches: corporate capital controls were still partly in force at the vintage, so some of the narrowing is a shrinking arbitrage window rather than a fall in the demand for dollars.
```yaml
focus: [Blue gap]
```
That collapse starts at the devaluation of 12 December 2023, marked here, and continues through the IMF band of April 2025 and the indexed band of January 2026. That premium is the price of evading the currency, and its move from triple digits to near parity is the market's verdict that holding pesos no longer carries a confiscation discount.
```yaml
annotate: { x: 537, text: "Caputo deval" }
```
Money balances tell a more textured story. Indexed to 100 at December 2023, the <span class="k" data-key="blue">real monetary base</span> fell to a trough of 78.7 in March 2024, climbed to 183.2 in August 2025, and stood at 137.7 in May 2026. Part of that is mechanical: the July 2024 LEFI migration shifted sterilized liquidity into the base, so the raw index overstates the behavioral recovery.
```yaml
swap: fig04_remonetization
```
<span class="k" data-key="green">Real transactional M2</span> remains below its starting level, at 95.3 in May. The narrow base recovered and the broad aggregate did not, and the asymmetry is the hinge of the reading. Obstfeld's semi-elasticity near −0.12 replicates at −0.125 and extends to −0.113 on the locked vintage, while the same specification on M2 returns an insignificant +0.050. The levels money-demand relation fails a cointegration test, so the levels elasticity is a conditional correlation.
```yaml
focus: [Real M2]
```

## The anchor was fiscal and political
```yaml
kind: scrolly
chart: fig01_decomposition
png: arg-fig01
```
Holding to an exact accounting identity, the decomposition shows where the money came from with no residual to estimate. <span class="k" data-key="crimson">Treasury financing</span> goes to zero after December 2023 and stays there for the whole window. Nothing in statute compelled that. The pledge was made two days after the inauguration and honored by decision alone. Every other delivery in this program has the same form.
```yaml
focus: [Treasury]
```
By 2025 creation comes from <span class="k" data-key="blue">foreign-exchange purchases</span> offset by sterilization. Around the indexed band sits a remonetization program of reserve purchases, USD 10bn as a 2026 baseline, executed daily at no more than 5% of market volume, with a stated success criterion of a base-money corridor rising from 4.2% to 4.8% of GDP by December 2026.
```yaml
focus: [FX purchases]
```
<span class="k" data-key="amber">Sterilization</span> and the interest complex wind down through the 2024 cleanup. At the change of government the stock of remunerated liabilities stood at about two and a half times the monetary base, and the interest paid on it was itself a source of money creation. BOPREAL bonds absorbed importer arrears, the liabilities migrated into LEFI in July 2024, and that stock matured in July 2025. Quasi-fiscal cost moved from 1.6% of GDP in 2024 to −0.5% in 2025.
```yaml
focus: [Sterilization]
```
Seigniorage quantifies the heavy lifting. Measured as the monthly change in the base over annual-rate GDP and summed by year, it runs 1.13% of GDP in 2022, 1.73% in 2023, 2.98% in 2024, 1.61% in 2025, and 0.05% through May 2026. That 2024 peak was a one-off stock adjustment harvested while real balances were rebuilding. Excluding the LEFI migration the 2024 figure is 2.41% of GDP, against 0.05% in the highlighted window.
```yaml
highlight: { from: 48, to: 52, label: "Indexed band" }
```

## Durability is borrowed
```yaml
kind: scrolly
chart: fig12_nir
png: arg-fig12
```
<span class="k" data-key="blue">Gross international reserves</span> ended 2025 at USD 27.6bn, and the Fund projects USD 36.1bn for end-2026. Read on its own, that path looks like a buffer being rebuilt. Durability is a financing question before it is a monetary one, and the gross figure answers none of it.
```yaml
focus: [Gross]
```
At end-2025 the <span class="k" data-key="crimson">net international reserve position</span> was −USD 11.8bn. The Fund's definition nets out activated swap lines, foreign-currency reserve requirements on dollar deposits, and frozen Fund credit, arriving below zero against an encumbrance near USD 39bn. A Treasury line drawn in October 2025 was repaid in December by drawing an equal BIS line that still sits inside the reserve wedge, so the borrowing changed counterparty without leaving the balance sheet.
```yaml
focus: [NIR]
```

## Can the wall be rolled?
```yaml
kind: widget
module: nir-scenarios              # story/widgets/nir-scenarios.js
data: dsa_grid.json           # story/data/dsa_grid.json → dist/data/ (exported from output/data/fig15_dsa.rds)
```
External amortizations falling due run USD 8.6bn in 2026, near USD 11.9bn in 2027, and a peak USD 14.6bn in 2028, with Fund credit peaking at 1,329% of Argentina's quota in 2026. Netting the financing need against the reserve accumulation the program targets yields the rollover rate the program implicitly requires. On the full reserve path the wall is rollable, the required rate rising to 82% by 2028. Halve the accumulation, and the 2027 and 2028 walls demand rollover above 100%, more than the entire stock of maturing debt.

## The institution that was not built
```yaml
kind: scrolly
chart: fig08_comparative
png: arg-fig08
flavor: stack
```
Comparators show what the removal of indexation buys. Brazil's Real Plan erased indexation memory before the currency switch, through a transitional unit of account later frozen, so indexation served as the bridge to its own removal. <span class="k" data-key="amber">Israel</span> from 1985 and <span class="k" data-key="green">Brazil</span> from 1994 are plotted against months from their own stabilization date.
```yaml
focus: [Israel 1985, Brazil 1994]
```
Argentina wrote indexation into the exchange-rate rule instead. Post-stabilization inflation persistence, the summed autoregressive coefficient of monthly inflation, is 0.60 for <span class="k" data-key="crimson">Argentina</span> under the indexed band against 0.26 for de-indexed Israel. A ceiling that follows the authority's own lagged inflation lets the price level inherit a stochastic trend, so the exchange-rate rule supplies no nominal anchor and its breach costs nothing.
```yaml
focus: [Argentina 2023]
```

## The verdict
```yaml
kind: prose
```
The record reads in four states. Delivered: the disinflation from 25.5% to 2.1% per month, the parallel premium from triple digits to near parity, a fiscal surplus held every month since January 2024, and the legibility of the monetary aggregate restored. Reversed: dollarization and the closure of the central bank, replaced by an actively managed peso regime. Partial: the cepo, lifted for individuals in April 2025 and still binding on corporates. Held by discretion: the surplus, whose deficit rule remains a pending IMF benchmark, and the reserve position, negative on net and financed by borrowed buffers.

Falsifiable by design, this reading may already be meeting its falsifier. A corridor that held through a genuine political shock, with the budget loosening and the disinflation surviving, would weaken the claim that the anchor is borrowed. Core inflation breaking decisively below 2% under the band would weaken the inertia mechanism, and the May core print of 1.9% is the first below that line. Pre-registered for the December 2026 print, the persistence-break test is the scheduled adjudication of both. Until those prints exist, the verdict stands as the evidence leaves it. Disinflation is real, and the institution that would make it last is still the one promise the program has not kept.

## Six more views
```yaml
kind: grid
items:
  - { chart: fig06_itcrm, png: arg-fig06, caption: "Real appreciation and band-binding risk: the BCRA real multilateral index, monthly mean, where a lower reading means a stronger peso." }
  - { chart: fig07_reserves, png: arg-fig07, caption: "Gross international reserves, daily in USD mn, through the September–October 2025 drain and the 2026 purchase program." }
  - { chart: fig09_recursive_elasticity, png: arg-fig09, caption: "Money-demand elasticity estimated recursively: log real base on log expected inflation, against Obstfeld's dashed reference." }
  - { chart: fig10_embi_crisis, png: arg-fig10, caption: "The September–October 2025 sequence: daily EMBI and parallel gap through the near-collapse and the United States Treasury backstop." }
  - { chart: fig11_corridor, png: arg-fig11, caption: "Base money as a share of GDP against the BCRA's December 2026 projected corridor, with cumulative emission from reserve purchases." }
  - { chart: fig13_unwind, png: arg-fig13, caption: "The remunerated-liability unwind: the monthly sterilization factor in ARS bn, as the quasi-fiscal money machine was switched off." }
columns: 3
```

## Method
```yaml
kind: prose
```
Data are frozen at the May 2026 consumer-price print, and every figure here is computed on that vintage. That freeze is itself a fact about the regime, since the band indexes to a CPI whose methodology is under political dispute, still carrying expenditure weights from the 2004–05 household survey, its scheduled rebasing shelved after the resignation of INDEC's director in February 2026. A regime indexed to that number has to be read against a stated vintage of it.

Base money, reserves, and the official and parallel exchange rates come from the BCRA; consumer prices from INDEC; the reserve path, the maturity schedule, and Fund credit from IMF Country Report 2026/105, documentary rather than pipeline-estimated and flagged as such at the source line of each figure.

Full empirical treatment, methodology, and references sit in [the working paper](/assets/papers/dae618c21735d5da1bbfb0620c40a59c.pdf). The condensed prose version is [the post](/post/argentinas-monetary-report-card-promise-versus-delivery-under-milei), and the code behind every series and figure is public at [github.com/nik110403/argentina-monetary-deepdive](https://github.com/nik110403/argentina-monetary-deepdive).
