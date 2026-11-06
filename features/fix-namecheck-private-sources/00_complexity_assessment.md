# fix-namecheck-private-sources — кандидат S

Task kind: bugfix

Объект — локальный process gate. Сейчас только planning; requested planner gpt-6-astra xhigh, serving NOT_ATTESTED.

| Измерение | Балл / основание |
|---|---|
| Файлы | 1: два существующих repo-файла patch/test |
| Домены | 1: name-check source collection |
| Интеграции | 1: новых нет, Node/Python stdlib |
| Breaking | 1: документированные старые args/decision fields сохраняются |
| Модели | 1: новых persisted models нет |
| Cross-cutting | 1: локальная input boundary, без app auth/финансов/network |

6 → S. Активные этапы 0→1→6→K1/K2→7→8. ADR и light architecture — дополнительные уточнения source policy, не выполненные Step3/5 и не основание выдумывать QCSD. Три swarm-роли для этого S не требуются. Если реализация требует расширить два файла, публичный API/core decision или общий scanner platform, routing пересматривается до кода.

Scope: `patches/dz-name-check-app-source.patch` и `tests/feature-adr-paths.test.mjs`. Patch может менять несколько vendor hunks; это честно учитывается при review, а не отдельные tracked code files. Root сообщил отдельный worktree от 7e77484; planner его не изменял и Git base не удостоверял. Оценка: requirements/design 30, code 45, tests/review 45 минут; это не основание сократить gates.

Recall/checkpoints/K1/K2/код/QE NOT_RUN. Нет нового разрешения на установку в shared node_modules, native recovery QE или STEP4 runtime.
