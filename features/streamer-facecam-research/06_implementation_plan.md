# План исполнения research (без реализации продукта)

Inputs read:00_complexity_assessment.md,01_requirements.md,02_reuse_inventory.md,AGENTS.md,CLAUDE.md,docs/acceptance/core-cjm.md,docs/model-matrix.md, feature-adr modules00/01/02/06, problem-solver-enhanced. S-tier03_adr и05_architecture N/A: architecture-options — предложение исследования, не approvedADR.

Goal state:7 русских документов с первичными источниками, ограничениями и проверяемым pilotproposal; runtime/deps/OpenSpec без изменений. K1 N/A(no executable names). K2 + native plan checkpoint перед публичным draft; scope authority — прямое поручение владельца/root, не выдуманная историческая receipt.

- TASK-1: FR-1,FR-3,FR-7 — pinned recall, прочитать native renderer и official dz-harness surface/modules; зафиксировать resource inventory и что реально применялось. Test: exact source commit/path и method receipt.
- TASK-2: FR-2,FR-3,FR-7 — bounded primary web research5–7products и OSS; read license/release/latestsourcechange, claimed success отдельно от measurement. Depends: TASK-1. Test: primary URL/date/evidence map, недоступность отмечена.
- TASK-3: FR-1,FR-4,FR-5 — firstprinciples/SCQA, TRIZ separation/resources; сравнить варианты и failure modes, file-upload/CJM baseline/длительность/CPUcost. Depends: TASK-2. Test: предложение явно отделено от факта/приёмки.
- TASK-4: FR-6 — pilotfixturematrix/metrics/realhumanmeasurement и costledger без исполнения. Depends: TASK-3. Test: no unsupported performance/UMUX/visibility guarantees.
- TASK-5: FR-1,FR-2,FR-3,FR-4,FR-5,FR-6,FR-7 — ссылки/claims/license/anti-drift/local checks, freeze SHA и independentreviewhandoff. Depends: TASK-4. Test: onlydeclaredresearchdocs+featureprocess changed; reviewerswrite features/.../reviews outside measureddocs.

Уточнения FR-1/3/4/6 перед freeze отражаются в существующих семи документах: coding/education, строгий режим и два знаменателя coverage, старый dual/будущая дельта требований, общий D′, дублирование камеры и скрытые пиксели; локальная оценка геометрии отдельно от полного CJM-пилота; краткое сравнение SAM 3/RVM/OBS. Новых product targets, зависимостей или runtime-шагов нет.

EXPECTED_CODE_TARGETS:
- docs/research/streamer-facecam/README.md
- docs/research/streamer-facecam/analogs.md
- docs/research/streamer-facecam/oss-candidates.md
- docs/research/streamer-facecam/architecture-options.md
- docs/research/streamer-facecam/streamer-cjm-and-pilot.md
- docs/research/streamer-facecam/sources.md
- docs/research/streamer-facecam/evidence-map.md
