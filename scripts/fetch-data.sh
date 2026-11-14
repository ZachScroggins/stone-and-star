#!/usr/bin/env bash
# Download the raw datasets the build scripts read. Outputs go to data/raw/
# (gitignored). Checksums are the files used for the committed build outputs;
# a mismatch means the upstream file changed, so review before rebuilding.
set -euo pipefail
cd "$(dirname "$0")/../data/raw" 2>/dev/null || { mkdir -p "$(dirname "$0")/../data/raw"; cd "$(dirname "$0")/../data/raw"; }

fetch() { # url file sha256 [data-only]
  if [[ ! -f "$2" ]]; then curl -sSfL -o "$2" "$1"; fi
  local got
  if [[ "${4:-}" == data-only ]]; then
    # VizieR stamps the request date into '#' header lines; hash the data only.
    got=$(grep -v '^#' "$2" | shasum -a 256 | cut -d' ' -f1)
  else
    got=$(shasum -a 256 "$2" | cut -d' ' -f1)
  fi
  if [[ "$got" != "$3" ]]; then echo "$2: checksum mismatch ($got)" >&2; exit 1; fi
  echo "$2: OK"
}

# Hipparcos main catalogue (ESA 1997, CDS I/239), stars with V < 6.5,
# positions propagated by VizieR to epoch J2000 (_RAJ2000/_DEJ2000).
fetch 'https://vizier.cfa.harvard.edu/viz-bin/asu-tsv?-source=I/239/hip_main&-out=HIP,Vmag,_RAJ2000,_DEJ2000,RAICRS,DEICRS,pmRA,pmDE,Plx,B-V&Vmag=%3C6.5&-out.max=unlimited&-oc.form=d' \
  hip.tsv 1f9063f10bdce59ce953d224c7f501de00b8a687288fb6ad9b23bf7dac964fe5 data-only

# Copernicus GLO-30 DEM tile N29 E031 (AWS Open Data).
fetch 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N29_00_E031_00_DEM/Copernicus_DSM_COG_10_N29_00_E031_00_DEM.tif' \
  cop_N29_E031.tif 88daaeb7722323e58aa9386fcd520fe6c46fcd6aacfffdb4025ab98bd0a77bc5

# Stellarium 26.3 "modern" sky culture (constellation stick figures by HIP number).
# Text and data CC BY-SA 4.0, Stellarium's team.
fetch 'https://raw.githubusercontent.com/Stellarium/stellarium/v26.3/skycultures/modern/index.json' \
  stellarium-modern-v26.3.json 1f2f5ffd6c9e25a7d0dcfdbf1f756e2db03dd3b8ed4ec016a2839b09f6b0fe1e
