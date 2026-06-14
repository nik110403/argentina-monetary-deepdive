PY := $(shell [ -x .venv/bin/python ] && echo .venv/bin/python || echo python3)

INGEST = ingest_bcra ingest_bluelytics ingest_indec ingest_rem ingest_itcrm \
         ingest_fiscal ingest_embi ingest_comparators

.PHONY: all deps bcra-cert ingest panel analysis charts clean $(INGEST)

all: ingest panel analysis charts

deps:
	python3 -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r python/requirements.txt
	Rscript R/00_setup.R

# Export the full certificate chain the BCRA server actually presents.
# Verification stays ON; we just supply the intermediates the server omits.
bcra-cert:
	echo | openssl s_client -showcerts -servername api.bcra.gob.ar \
		-connect api.bcra.gob.ar:443 2>/dev/null \
		| awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/' > config/bcra_chain.pem
	@test -s config/bcra_chain.pem && echo "Wrote config/bcra_chain.pem" \
		|| (echo "FAILED: empty chain — check connectivity" && exit 1)

ingest: $(INGEST)

$(INGEST):
	$(PY) python/$@.py

panel:
	$(PY) python/build_panel.py

analysis:
	Rscript run_all.R

charts:
	Rscript R/09_export_charts.R

clean:
	rm -f data/*.csv data/*.parquet
	rm -f output/data/*.rds output/tables/* output/figures/*.png output/widgets/*.html
