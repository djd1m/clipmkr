#!/usr/bin/env bash
set -euo pipefail
cd /home/user1/clipmkr
compose=(sudo docker compose -f docker-compose.yml -f ops/cloudru/compose.cloudru.yml --profile edge --profile storage)
"${compose[@]}" config --quiet
./ops/cloudru/check-ports.sh
"${compose[@]}" up -d --no-build --wait --wait-timeout 180 db redis minio
"${compose[@]}" run --rm --no-deps -T worker-stt node packages/db/dist/migrate.js
"${compose[@]}" run --rm --no-deps -T worker-stt node < ops/cloudru/init-storage.cjs
"${compose[@]}" up -d --no-build --wait --wait-timeout 180 web worker-stt worker-llm worker-video proxy
"${compose[@]}" ps
