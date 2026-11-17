# Переиспользование и затронутые контракты

- `packages/shared/src/screen-layout.ts`: parser и planner, единый producer геометрии для UI и FFmpeg. Исправить узкую ветку новой01/02, сохранить прежние версии и03.
- `apps/worker/src/render/screen-layout.ts`, `ffmpeg.ts`: существующие crop/scale/overlay, YuNet и один timebase. Новый render pipeline/OSS runtime не нужен.
- `apps/web/src/app/clips/ClipLayoutChoice.tsx`, `ClipLayoutPreview.tsx`, `clip-layout-draft.ts`: черновик/ROI/подтверждение, canvas; переиспользовать без новой страницы.
- `packages/db/src/clip-layout.ts`, `render.ts`, migration032: strict versioned layout, durable intent и `COALESCE(i.layout,c.rendered_layout->'requested')`. Потребители music/CTA тоже читают опубликованный layout, поэтому замена геометрии v1 глобально недопустима.
- `tests/screen-layout.test.ts`, `screen-layout-media.test.ts`, `render.test.ts`, browser/clip-layout, clip-music/CTA integration; actual FFmpeg/PG/Redis/real S3 existing harness. В новый scope не переносить и не сбрасывать прежние закрытые QE receipts.
- `scripts/test-framing-mutations.mjs`: существующие mutation anchors/точные source string replacements. До правок выписать затронутые anchors; не обновлять guard/SHA механически, чтобы скрыть RED. Контрольные мутации wrong01 placement/wrong02 order/screen shrink должны давать behavioural RED.
- `docs/research/zoom-screen-layout/mockup.html`: неизменный независимый original; Playwright и существующий browser runtime делают публичные PNG и геометрию. Приватные кадры/медиа остаются закрытыми.

Новые зависимости, ML, хостинг и дизайн-система не требуются. Native blocks + существующие maintained FFmpeg/OpenCV/Playwright достаточно. Точный список файлов/версий и required checks окончательно закрепить в плане перед K2.


## QER-03/QER-04: конкретное переиспользование до исправления

- `ops/backup/clipmkr-prepare.sh` inspect_binding/capture: проверка runtime DATABASE_URL/DNS→bound main DB, existing admin POSTGRES_USER, native pg_dump -d actualDB -Fc и pg_restore --list. Переиспользовать этот scoped pattern, не запускать весь backup/restic/другие datastore hooks из Zoom executor.
- `scripts/release-candidate.mjs`: exact databaseName/endpoint, postgresSystemIdentifier/databaseOid и bound admin psql с явным -d; запрет endpoint/query overrides и ambiguous network alias. Restricted app role не получает pg_control_system grant.
- `packages/db/src/migrate.ts`: существующий exported migrate(pool), transaction, advisory lock50921001, immutable prior journal SHA, COMMIT/ROLLBACK. Не писать второй SQL migration engine, не менять033/032.
- Прочитан pinned Node22 `npm run dz -- recall ... --project /home/clipmkr --json`: полный урок retention10.11 `teach:8119d170196985a9` уже требовал admin preflight до остановки и restricted app role. Новый Zoom executor этот известный урок не применил. Его исторический retention-specific GRANT для новой таблицы не переносится на033:033 меняет только constraint, новых runtime grants нет.
- Полностью прочитан `teach:462ac78506d4ce16`: фактический DNS из приложения и сопоставление pinned PostgreSQL, isolated native restore на existing PostgreSQL. Известна также ловушка pre-pause observer внутри уже activated rollback path (`teach:b1fd71811be798ee`); qualification до pauseAttempted, не в execute('pause').
- Фактические инцидентные read-only probes: restricted app/admin подтвердили одинаковые actual DB name/OID; admin existing superuser/owner authority, app CREATE=false/owner=false;033 отсутствует. Точная SQL ошибка получена из bounded existing PG logs, migration заново не запускалась. Private artifacts `candidate-modular/qer0304-*`; retained actual-app dump1753214байт SHA256 df3b705aafb49d5cf15ad1e253fd39e2197c91baf949b291304a5bba38c90dd9. Это evidence инцидента, не успешный future release.

Нужен один узкий shared DB-boundary helper для checker/executor и тестовый support для новых negative cases; это не новый deploy/backup framework. Existing original/parser/geometry/mutation pins и compatibility C0 не меняются. Admin authority проверяется как effective inherited ownership/superuser, не plain MEMBER с необходимостью SET ROLE; существующие public object OID и trusted admin search_path=public квалифицируются до canonical migrate. Initial pending033, already033 idempotence и rollbackC0/noDDL различаются явно.
