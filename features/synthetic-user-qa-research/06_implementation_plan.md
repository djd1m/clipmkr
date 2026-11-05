# План research

Inputs read: 01_requirements.md,02_reuse_inventory.md,AGENTS.md,CLAUDE.md,core-cjm.md. Тир S, ADR/architecture не требуются, продуктовый код не изменяется.

- TASK-1: FR-1 — locate официальный /llms.txt и actual trends machine layer, сохранить URL/дату/наблюдение, отделить searchindex от actual retrieval.
- TASK-2: FR-2,FR-4 — bounded shortlist, primary GitHub/docs/license/activity; no installs/benchmarks/liveactions.
- TASK-3: FR-3,FR-4 — Clipmkr pilot matrix с deterministic oracles, затратами/границами и humanacceptance.
- TASK-4: FR-1,FR-2,FR-3,FR-4 — source/link/claim checks, actual K2, independent draftreview до commit/push.

Порядок1→2→3→4. K1 N/A нет command/module/export; structural K2 не заменяет independent researchreview.

EXPECTED_CODE_TARGETS:
- docs/research/synthetic-user-qa/README.md
- docs/research/synthetic-user-qa/project-cards.md
- docs/research/synthetic-user-qa/clipmkr-pilot-plan.md
- docs/research/synthetic-user-qa/sources.md
