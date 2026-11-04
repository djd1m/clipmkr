# Передача архитектору/QC: upload-transfer-recovery

Только документный комплект вне Git. 22 code targets → L; код не написан.
Путь загрузки владельцем согласован, весь 8-screen redesign — нет.

1. Прочитать 00/01/02, ADR-002/003 (ADR-001 исторически superseded), CONDITIONAL quality с author resolutions,
   domain model, architecture и конкретный план06; затем OpenSpec delta.
2. Архитектор/QC работают независимо в новых сессиях. Прежние COND/QC нельзя объявлять
   закрытыми текстовым K2; при интеграции сохранить existing .fa-state lineage.
3. Использовать S-dependency main12b2e175 (source-bound9b8b043), не повторять count/HEAD код. Перед кодом подтвердить
   реальную интеграцию dependency/routing/K1/K2 в изолированном writer worktree.
4. Новый стек не создавать: только existing clipmkr-stage-20261028, данные/volumes сохранять.
   Публичный stage address/DNS ещё не подтверждён, ссылки для владельца пока нет.

Реальные локальные K1: два exit0/free, JSON рядом. Реальный K2 L с strict requirements:
exit0, 0 failures/warnings/skips; 19 targets, 10 requirements, 3 ADR в прежнем snapshot до QC amendments; актуальный K2 повторяется на22 targets. Это только проверка плана.
Актуальный K2 после четырёх amendments реально PASS: exit0, 0 failures/warnings/skips,
22 targets/10 requirements/3 ADR; raw k2-after-four-qc-rework.private.txt приватный.
QCSD CONDITIONAL: четыре исходных IDs ждут own-reviewer verification на новом host snapshot;
реализация/тесты/review/fleet/stage apply/E2E/ручная приёмка pending.

Дополнительные тестовые адаптации не спрятаны: music/teaser/compaction hook-host,
pack-shot SSR account prop и clip-cta старый source guard включены в targets/задачи.
Неисполняемый без нового решения сценарий: loss metadata после серверного assembly;
bounded клиент сообщает ограничение, не создаёт скрытый новый multipart.
