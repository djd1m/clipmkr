# Текущее read-only наблюдение root

05.11.2026. Сетевые команды исполнил root; архитектор прочитал локальные private receipts. Ни один результат ниже не означает migration-ready, backup/restore PASS или приёмку приложения. Source и c оставались активными. B2/B3/B4/B5 — отдельные READ ONLY REPEATABLE READ транзакции с разными snapshots; стороны читались последовательно. Это текущий inventory, **не единый консистентный migration/financial baseline**.

## Identity и schema
Root SSH19:30: Cloud7services, web/workers877ec806; Site11clip containers, web9ec8231/workers ebb590. Cloud primary/backup maintenance active/enabled. Root сообщил `/health` HTTP200/status ok и совпадение revision с web labels. Legacy MinIO на Site присутствует, использование не доказано; real S3 остаётся требуемой средой проверки.

B1 receipts19:37 подтверждают private hostname/project/container/shared-network alias/URL host/DB name-role binding и PG160004 на обоих. DB size: Cloud10 932 707 bytes, Site12 800 483 bytes — **только БД, не media/storage**. Архитектор сравнил: 28 journal names+SHA одинаковы между сторонами и с локальными migration bytes; 27tables, 288column descriptors, 207constraint metadata records совпадают. Все колонки запросов B2–B5 присутствуют, missing=0. Оба schemaOutput заканчиваются ROLLBACK.
Это равенство прочитанных descriptors, не полная schema equivalence: B1 не содержал definitions индексов/constraints, triggers/functions/roles. До import нужна полная структурная проверка. Фактическое состояние данных из journal не выводится.

## Агрегаты B2–B5
| Наблюдение | Cloud | Site |
|---|---:|---:|
| Активные accounts | 9 | 38 |
| Verified accounts | 0 | 1 |
| Blogger accounts | 2 | 5 |
| owner_unlimited | 2 | 1 |
| Custom blogger limit | 0 | 4 |
| Видео всего | 6 | 41 |
| Видео done / failed / uploading | 2 / 3 / 1 | 20 / 3 / 18 |
| Клипы done / failed | 8 / 0 | 64 / 5 |
| done clips с object refs / thumbnail refs | 8 / 8 | 17 / 17 |
| clip links / guest packs | 8 / 0 | 64 / 3 |
| partner codes / attributions | 2 / 1 | 7 / 2 |

Counts аккаунтов **не суммируются как уникальные люди**: cross-dataset collisions unknown. owner flags сохраняются с provenance и отдельной проверкой, не выбираются по max. Cloud9 иSite38 — разные snapshots и могут меняться.
У Site47done clips без object_key и47без thumbnail_key на момент B3; 64done не значит64playable. Причина может зависеть от retention/истории, не установлена; это blocker обещания полной playable migration до классификации missing/deleted/expired и S3 verification. Ссылки на объекты в DB не доказывают существование bytes; SQL суммы media bytes не storage audit. Upload_id у done/failed не доказывает живой multipart, нужен read-only object-state inventory позже.

Cloud B4: 3 succeeded/no-review payments на597000 minor units, 1refunded/needs_review на149000; 5payment events; 4payment grants total180000/remaining167400/reserved0 seconds, 9signup grants16200/16200/0. Site B4: payment/event SELECT не вернул строк, 3created start intents; 16signup grants total55800/remaining49694/reserved0; 6settled и2released charges. Это чтение, не доказательство shop/TEST/live provenance или отсутствия внешних pending платежей.
Два простых orphan counts и broken_grant_bounds равны0 на каждой стороне. Они не доказывают полный graph/ledger consistency. Normalized email collision groups внутри каждой DB=0; cross-dataset identity неизвестна. Native per-blogger monthly reconciliation ещё не выполнялся; B5 — только обзор policy и payment monthly aggregates.

## Источники и ограничения
Private directory `/root/.config/clipmkr/ui-recovery-cloud-20261105`:
- `cloud-readonly-20261105T193041Z.private.json`, `site-readonly-20261105T193042Z.private.json`.
- `cloud-schema-20261105T193732Z.private.json`, `site-schema-20261105T193733Z.private.json`.
- `cloud-aggregates-20261105T193926Z.private.json`, `site-aggregates-20261105T193927Z.private.json` (внутренний site observedAt19:39:47UTC, имя файла не заменяет время наблюдения).

Не выполнены cross-dataset comparands, S3/retention audit, backup/restore, identity-conflict decisions, provider/shops verification, full graph consistency, freeze/cutover/rollback, новый CJM или independent review. Следующие gates именно это должны установить. Нельзя подменять ими отсутствие сейчас полного execution plan.

## Последующее UI решение, сообщение root
Root сообщил: владелец явно согласовал реализацию конкретного макета трёх ролей; evidence `features/ux-simplification/owner-approval.md`, commit6023ac0 опубликован координатором. Это закрывает design approval макета, но не runtime E2E/ручную приёмку source и не cutover c. Данная архитектурная ветка остаётся от80cab4e; код/чужие документы сюда не переносились.
