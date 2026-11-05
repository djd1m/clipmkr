# План учебной памятки — S

Inputs read: 01_requirements.md, 02_reuse_inventory.md, AGENTS.md, docs/model-matrix.md.

Координатор принимает документный план в рамках прямого запроса владельца. Требования01, reuse02, AGENTS и матрица моделей обязательны; S не требует ADR/DDD. K1 N/A. До автора — настоящий K2.

- T1 — specification; FR-1, FR-2, FR-3: автор gpt-6.1-sol high читает согласованные требования, реальные проектные примеры и создаёт один Markdown, без runtime кода.
- T2 — refinement; FR-4, FR-5: автор сверяет примеры команд с pinned help/skills, локальные ссылки с реальными файлами, различает предполагаемую и пройденную проверку.
- T3 — completion; FR-1, FR-2, FR-3, FR-4, FR-5: после freeze/host prepare новая сессия gpt-6-astra xhigh самостоятельно проверяет требования→документ, команды/ссылки/границы; originating recheck после исправлений.
- T4 — delivery; FR-5: diff/privacy/anti-drift, supported checkpoints по реальным результатам, verified commit/push одинакового SHA в три Git, ссылка владельцу. Приложение/БД/Cloud не меняются.

Риск-selected studio-extended-qe reference: requirements validation, risk-based verification, source traceability; браузер/WCAG/оплата N/A для Markdown.

- T5 — specification/refinement; FR-2, FR-6: отдельно разобрать пересечение требований, дополнительную пользу OpenSpec и цену двойного ведения; показать минимальную привязку FR→spec/hash и отделить возможности OpenSpec от реально заполненного ledger Clipmkr.

EXPECTED_CODE_TARGETS:
- docs/course/dz-feature-adr-openspec.md
