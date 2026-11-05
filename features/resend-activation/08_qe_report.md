# QE подключения Resend — текущий статус

**Resend включён на test clipmkr.ru. Проверочное письмо получено владельцем. Recovery отправлен приложением; ручной reset→login ожидается.** Дата05.11.2026.

## Проверки

- Existing targeted unit suite30/30PASS (Resend transport/config/email handler/page state/UI), code unchanged; tests используют управляемый transport, не подтверждают сами реальную доставку.
- Штатный loadMailConfigPASS, real Resend POST200. Отдельное явное подтверждение владельца о получении нейтрального проверочного письма. Предупреждение Unsupported Domains касалось custom trackingTLS; обычная отправка с clipmkr.ru фактически прошла.
- Fresh backup сохранён, pg_restore cataloguePASS. Before/after apply26tables/644businessrowsHashmatch;session excluded. Три mailenv web изменены, image/source/nonwebIDs/otherenv/mounts сохранены.
- Actual browser public /forgotenabled, POST202 ровно1, pageerrors0; новая token delivery_state accepted прочитана из БД без вывода digest/token/email.
- Независимый fresh-context Astra ops reviewGO до apply; actual anonymous /forgot200 enabled и /health200 source8859f76 подтверждены самостоятельно после apply. Полный reset, пароль и emailдоставку reviewer не присваивает себе.
- K2PASS0fail/2warnings/3skip: S не требует ADR/architecture; C5 warnings честно сохранены, фиктивные artifacts не созданы. K1N/A(no newruntime names/modules). Actual supported router/plan checkpoints есть. OpenSpec strict validationPASS.

## Требование → риск → сценарий → результат → граница

| ID | Риск и проверка | Результат | Граница |
|---|---|---|---|
| FR-1 | Параллельный mail stack → reuse existing adapters/config/handler/UI и existing suite | PASS | Новый runtimecode/SDK/schema/dependencies отсутствуют |
| FR-2 | Неполный/неверный профиль → loadMailConfig+real provider+closed3env apply | PASS | Owner-reported verified setup; provider accepted и receipt фактически проверены |
| FR-3 | Config/data/container drift → exact candidate/runtime/env/mount/nonwebIDs/rowhash and same source | PASS | Backup catalogue проверен; новый full restore rehearsal не выполнялся; Cloud не тронут |
| FR-4 | Accepted выдан за полный reset → browser request202/tokenaccepted, user receipt и manual reset раздельно | PARTIAL | Проверочное письмо получено; recovery letter→reset→login ожидает владельца |
| NFR-1 | Secret leakage → closed0700/0600 profiles, argv/publicstdout/Git без secrets | PASS | Private config/runtime snapshots содержат ключ; не заявлять «не логируется нигде» |
| NFR-2 | Ложная полнота → explicit status по каждому этапу | PASS | Sending accepted не равен completed reset |

## Anti-drift и ограничения

Code/spec anti-drift: ровно существующий Resend и три объявленных web переменные; проверенный image/source8859f76 сохранён. Ни auth API/UI, ни session/password policy, ни SQL/модели, ни лимиты/платежи не изменялись. OpenSpec initial proposal/spec/tasks остаются на точных input SHA в01; текущий execution status — этот feature-adr отчёт. Ранний baseline pending-статус заменён реальными наблюдениями активации; прежняя отключённая почта в public-entry отчёте отражает прошлый релиз до этой разрешённой настройки.

Сохранены неудачный prepare, исправление, actual commands и private review; артефакт существованием не создаёт gate. Полное завершение QE/ручная приёмка не объявляются до результата reset→login. Новые контейнеры/MinIO/Cloud deployments не создавались, платёжные настройки не менялись. Секреты и адрес получателя в публичный report не помещены.

Краткий протокол:07_activation_record.md. Руководство:docs/operations/resend.md.
