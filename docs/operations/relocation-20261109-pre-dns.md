# Clipmkr: подготовка до DNS, ручная приёмка и окно переноса

Актуальный срез10.11.2026: владелец разрешил техническое окно и финальную синхронизацию данных `clipmkr.ru` с194.85.249.105 на77.83.87.178. Оплата проверяется после готовности перенесённого приложения. Предыдущее TEST-окно закрыто: callback возвращён владельцем, исходная настройка web восстановлена, source healthy. Историческое платёжное расхождение сохраняется без исправления и не блокирует копирование. DNS и включение нового production writer в текущий шаг не входят. Ниже сохраняется история проверок; актуальный порядок уточнён в последних разделах.

Это операторский checklist, не новая нормативная фича и не receipt приёмки. Автор прочитал требования, ADR/план,08 и фактические private receipts; команды ниже не выполнял, runtime не менял. Независимое review самого документа не заявляется. Авторитетные нормы: [требования](../../features/relocate-clipmkr-to-workspace-vps/01_requirements.md), [план](../../features/relocate-clipmkr-to-workspace-vps/06_implementation_plan.md), [актуализации QE](../../features/relocate-clipmkr-to-workspace-vps/08_qe_report.md), [core CJM](../acceptance/core-cjm.md). Ранние NOT RUN внутри08 исторические; читать последующие уточнения. Старые04.11 operational docs не переопределяют текущий IP QA scope.

## Что уже доказано

Private evidence root `P=/root/.config/clipmkr/relocate-workspace-20261109`; ниже только пути, без credentials, object keys, account/provider IDs и чужой переписки.

| Факт | Доказательство и предел |
|---|---|
| Семь code targets независимо проверены; native третьего QE цикла closed | Revision `10630462e49286bd8fb7ec69c58d635108f9fe55c3ef7fc4a2cc3c75e6aa3614`; `.fa-state/review-convergence-qe-review.json`, native historysequence6;106/106 scoped tests,0skips. Это limited config/component closure, не весь перенос; четвёртый обычный цикл не открывать. |
| QA web healthy на новом immutable image | `runtime/guard-route-runtime.actual.private.json`; image `sha256:d1880bc89258fd88c27bdcd3f9393c69bb70ebdf6bf4e54216f92cbd946688f9`. Source production web/worker images прежние. QA образ не предназначен для production cutover. |
| Защищённый UI, health200, callback503; шесть сетевых probes прошли | `runtime/post-guard-correct-health.actual.private.json`, `guard-route-runtime.actual.private.json`, `network-probes-post-guard.actual.private.json`, `qa-guard-loaded-parity.actual.private.json`. Первый ошибочный `/api/health`404 сохранён; корректный путь `/health`. Реальный tailnet-client probe этим не доказан. |
| Реальная короткая загрузка→STT/LLM→два клипа, play/download | `runtime/browser-upload.actual.private.json`, `prepare/qa-single-video-monitor.actual.private.json`; после нового image `runtime/browser-clips-post-guard.actual.private.json`.120с input;1080×1920,48.52/25.6с; download6710269/3934902байт. Повторные play/download не являются новой обработкой или доказательством90/120мин. |
| Письмо сброса получено владельцем, окно отправки закрыто | `runtime/mail-provider-result.actual.private.json`, recipientReceipt=CONFIRMED_BY_OWNER. Использование токена/повторный отказ ещё не доказаны этим receipt. |
| Main/support импорт сверялся; support agent history и synthetic reply/attachment проверены | `prepare/target-row-equality.actual.private.json`, `target-sequences.actual.private.json`, `schema-acl-readonly.actual.private.json`; `runtime/support-repair-edge.actual.private.json`, `support-admin-reply.actual.private.json`. Public widget/reopen отдельно открыт. |
| Полная ограниченная R2 data rehearsal завершена | `r2-drill/9900bb62-10c9-468a-a73a-9ef474657fc8/continuation-apply-result.actual.private.json`:27/57PGtables,19/23Rediskeys,6files; строки/схемы/sequences/типы/TTL/bytes совпали, BUSYKEY/corrupt probes отказали. Source restored test DB не обслуживала приложение. |
| Реальный неизвестный результат startup обработан безопасно | `startup-unknown-20261109T214231Z/`, `runtime/startup-unknown-maintenance-live.actual.private.json`; новый snapshot `r2-drill/cb687415-7029-418b-86c8-cf94f7d73505/` после непрочитанного ACK.27/57tables,22/26Rediskeys,7files; artifacts off-host SHA equal. Старый snapshot не включался; этот свежий snapshot повторно в source DB не восстанавливался. Root interlock против ручного R1 отсутствует. |

## Незакрытые gates и ближайшие действия

Каждую строку закрывать своим actual evidence; отсутствие результата оставляет NOT RUN. Просроченная/ошибочная проверка не становится PASS от достижения срока3–4часа.

| Gate | Что осталось и как закончить | Граница допуска |
|---|---|---|
| G1 TEST merchant | Один shop main/legacy/cloud. Владелец разрешил окно; main allowance временно отключён и authenticated checkout возвращает503 без новых намерений. Независимое чтение compiled code подтвердило действующий запрет checkout в legacy/cloud; прочие найденные магазины отличаются. Но provider GET выявил один succeeded TEST при source intent=created и отсутствии начисления. | DEFERRED_UNTIL_DATA_READY. Callback возвращён владельцем, прежняя настройка source восстановлена. QA callback503. Историческое расхождение сохраняется; перенос данных продолжается. Legacy/c/Cloud не менялись. |
| G2 Реальная оплата | После G1: единственный разрешённый TEST identity, success/cancel/refund при применимости, provider GET, повтор без второго grant, login/paid use; реальная повторная доставка после503; drain перед возвратом callback. | Guard component PASS не равен merchant E2E. Настоящие списания и SQL финансовые исправления запрещены. |
| G3 Роли, limits, resume | Закрыть отдельными browser traces regular/blogger/owner, прерванный/resumed multipart,90/120мин boundary и индивидуальный лимит с отказом self-escalation. Сначала безопасные existing integration boundary tests; реальные длинные записи требуют отдельного resource window относительно текущего120с бюджета. |120с pipeline не заменяет эти проверки. Непроведённый длинный сценарий предъявить владельцу; исключение может принять только владелец и оно остаётся ограничением, не PASS. |
| G4 Referral CJM | Разные контексты: блогерская ссылка→регистрация разрешённого клиента→использование→TEST→совпадающая owner/blogger статистика, reload/duplicate и чужие данные403. | Полный сценарий зависит от G2. Уже существующую QA историю не стирать ради сценария без отдельного зафиксированного QA reset/budget. |
| G5 Reset | Проверить одноразовый token в QA, login и отказ повторному использованию. | Получение уже доказано. Не менять source пароль; не отправлять новое письмо автоматически, если достаточно сохранённого доступного QA token. Истёкший token означает новую ограниченную проверку, не PASS. |
| G6 Support | Настоящий защищённый public widget: запрос→agent reply→attachment→повторный вход/восстановление истории; разрешить отдельно наблюдавшийся BasicAuth/widget конфликт. Уточнить фактические mail/inbox исходящие доставки и отсутствие их дублирования при запуске перенесённой поддержки. | Native agent UI/host-only widget успех не заменяет public widget. Не открывать реальные обращения без owner fence и не рассылать реальные письма. Новый product defect — отдельный scoped разбор, не тайный четвёртый QE. |
| G7 Сеть и эксплуатация | Реальный tailnet-client negative к5811/5812/directIP; актуальные Docker IP/fence; production support ingress без зависания на ephemeral proxy, egress/mail profile; TLS renewal после DNS и monitoring/backup cadence. |6probes уже доказаны, tailnet не приписывать им. Transient `systemd-socket-proxyd` требует проверенного targetIP и восстановления после recreate/reboot. |
| G8 Финальные данные/ingress | Подготовить reviewed private production Compose/env/roles, source maintenance+relay и target Caddy с точным XFF, все aliases/direct ingress, правильные runtime images. Повторить classified S3 whitelist/GET/media/multipart inventory. | Final source freeze/dump/restore и запуск imported writers только в отдельно согласованном cutover окне; preliminary imports не финальные. S3 bucket/prefix не менять. |
| G9 Завершение приёмки | Свести FR1–7 с evidence/NOT RUN; независимый L-tier fleet assessment отсутствует на срезе (`09_fleet_qe_assessment.md` не создан); завершить применимые actual checkpoints/anti-drift без вымышленных receipts. Предъявить ручную приёмку владельцу. | Limited QEclosed не является cutover GO. Original native history сохранить. |

Read-only S3 baseline уже включает HEAD,6RangeGET и multipart/parts (`storage-source.private.json`, [inventory](../../features/relocate-clipmkr-to-workspace-vps/operations-storage.md)). Не объявлять missing исходные ключи новой потерей:65done clip NULLkeys,13uploading без match и unknown-owner multipart остаются отдельными категориями. До cutover нужны актуальные count/category comparisons, полное скачивание/checksum/play доступного source clip и объяснение новых404/part differences; ничего не abort/delete для очистки статистики.

## Инструкция владельцу для ручного просмотра

1. Открыть **https://77.83.87.178** в отдельном профиле браузера. Первый диалог — внешний QA BasicAuth; credentials выдаются приватно. Затем отдельный вход в Clipmkr. Не вводить QA BasicAuth в форму приложения. Не обходить предупреждение сертификата.
2. Открыть «Мои записи», ранее подготовленную запись120с. Выбрать первый фрагмент, проверить проигрывание и скачать. Затем выбрать второй фрагмент и повторить. Кнопка скачивания относится к выбранному фрагменту; два одновременных download buttons не ожидаются.
3. Проверить кабинет/роль/лимит/баланс, перезагрузить страницу и войти повторно. QA dataset изолирован: отсутствие всех source записей в QA dashboard не означает потерю импорта. Полнота импорта подтверждается manifests; старые аккаунты проверяются после активации единственного production writer до открытия ingress.
4. Просмотр support history — через подготовленный оператором hostname-resolve кtarget и отдельную support учётную запись. Обычный `support.clipmkr.ru` пока смотрит наsource; его нельзя представлять какtarget preview. Не создавать реальные обращения/рассылку ради проверки.
5. Новую загрузку/обработку/платёж не запускать без предусмотренного окна: QA workers сейчас stopped, payments/mail off, TEST callback503. Полный payment сценарий выполнится совместно после G1. Зафиксировать конкретную ошибку и время без секретов.
6. Ручная приёмка должна перечислять принятые сценарии и оставшиеся ограничения. «Посмотрел QA» не является командой сменить DNS.

## Безопасные повторные проверки сейчас

Команды ниже read-only для runtime, с приватными output files. Не печатать `docker inspect` целиком или env; они содержат secrets. Выполнять наtarget. Наличие частного curl profile само по себе не доказывает актуальность credentials; отказ401 не обходить.

```bash
P=/root/.config/clipmkr/relocate-workspace-20261109
W=/tmp/clipmkr-relocate-workspace-20261109
export PATH=/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin:$PATH
umask 077
docker inspect --format '{{.Name}} {{.Image}} {{.State.Status}}' clipmkr-stage-20261028-web-1 clipmkr-stage-20261028-worker-stt-1 clipmkr-stage-20261028-worker-llm-1 clipmkr-stage-20261028-worker-video-1 clipmkr-stage-20261028-relocation-helpdesk-1
curl --disable --config "$P/runtime/owner-auth.curl.private" --silent --show-error --output /dev/null --write-out '%{http_code} %{ssl_verify_result}\n' https://77.83.87.178/health
curl --disable --silent --show-error --output /dev/null --write-out '%{http_code} %{ssl_verify_result}\n' https://77.83.87.178/
curl --disable --request POST --silent --show-error --output /dev/null --write-out '%{http_code} %{ssl_verify_result}\n' https://77.83.87.178/api/webhooks/yookassa-test
dig @ns1.yandexcloud.net +norecurse clipmkr.ru A
dig @ns1.yandexcloud.net +norecurse www.clipmkr.ru A
dig @ns1.yandexcloud.net +norecurse support.clipmkr.ru A
```

Ожидания: health200/TLS0, anonymous401/TLS0, closed callback503/TLS0; web/support running, workers exited. DNS пока source194.85.249.105. Не делать provider POST через прямой web ради «проверки» — off-profile503 уже наблюдался; valid real callback требует G1/G2.

## Cutover: только после отдельного owner GO

До GO подготовить конкретный пакет с hash: время окна/ответственный, только main+www+support DNS records, old/current TTL/A/AAAA, source/target image IDs, private main/support profile и restore destinations, maintenance/relay candidate с сохранением чужих routes, XFF tests, final manifest path и R1/R2. `n5.clipmkr.ru`, `c.clipmkr.ru`, Cloud.ru вне изменений. Неподготовленный production override или неизвестная destination — STOP, не импровизация команды. QA overlay вproduction не применять.

1. **Freeze ingress.** Source main/www/support и дополнительные aliases из routing inventory получают согласованный maintenance; webhook503. Закрыть direct host/container обход и cron/admin writers. Source `ai-hub-tls-proxy` обслуживает другие сайты: только reviewed scoped candidate, actual Caddy adapt/validate, inplace bind inode, reload и loaded parity. Аналогичный guard наtarget. Не выполнять глобальные compose down/system prune.
2. **Drain.** Не выдавать новые signed URLs; дождаться in-flight Complete до 360 с и уже выданных part URL до 900 с плюс завершения PUT. Снять два ListParts с одинаковыми key/uploadId/parts. Очереди active/wait/paused/delayed/waiting-children/prioritized/repeat/stalled/locks и PG job_attempt/video transitional states должны иметь согласованную судьбу; historical completed/failed сохранить. Не менять вручную credits/status/jobs. Unsettled операция продлевает окно или останавливает переход.
3. **Остановить только writers.** После drain команды наsource через установленный SSH alias; не трогать PG/Redis/legacy.30 с Docker timeout — не замена drain; SIGKILL/незавершённая transaction требует исследования.

```bash
ssh -F /root/.config/clipmkr/release-parity-20261103/site-test.sshconfig clipmkr-site-test \
  docker stop --time 30 n5-clipmaker-web-1 n5-clipmaker-worker-stt-1 n5-clipmaker-worker-llm-1 n5-clipmaker-worker-video-1 n5-helpdesk-app-1
```

4. **Доказать freeze.** Сохранить stopped/image/StartedAt для пяти writer containers, process/cron/systemd inventory; PostgreSQL `pg_stat_activity` поmain/support без app clients/idle-in-transaction; Redis CLIENT LIST без app клиентов. Использовать existing containercredentials в памяти, не argv. Source legacy остаётся running со своими DB/Redis. Любой неизвестный writer — STOP. Только затем получить общий frozen backup набор.
5. **Final backup.** Новый private каталог наsource, не поверх раннего snapshot. Штатные команды ниже выполняются В source shell только после freeze; `POSTGRES_DB/USER` должны быть сверены с actual binding. Это main/support, не legacy.

```bash
umask 077
CUTOVER_DIR=/root/.config/clipmkr/relocate-workspace-20261109/final-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 "$CUTOVER_DIR"
docker exec n5-clipmaker-db-1 sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > "$CUTOVER_DIR/main.dump"
docker exec n5-helpdesk-db-1 sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > "$CUTOVER_DIR/support.dump"
docker exec -i n5-clipmaker-db-1 pg_restore --list < "$CUTOVER_DIR/main.dump" > "$CUTOVER_DIR/main.toc"
docker exec -i n5-helpdesk-db-1 pg_restore --list < "$CUTOVER_DIR/support.dump" > "$CUTOVER_DIR/support.toc"
sha256sum "$CUTOVER_DIR/main.dump" "$CUTOVER_DIR/support.dump" > "$CUTOVER_DIR/pg.sha256"
```

При действительно stopped writers dumps двухDB относятся к frozen state; если есть допускаемый writer, нужен exported readonly snapshot/`pg_dump --snapshot` и новый обоснованный общий fence, а не сравнение с поздней liveDB. Дополнить ВСЕ table rows/schema/FK/index/functions/sequences, roles/ACL mapping; scoped Redis mainDB0/supportDB0 binary/type/TTL/queues; helpdesk uploads/config/encryption key; scratch/model-spend/конфигурацию; S3 classified whitelist/multipart manifests. Source backups плюс проверенная копия наtarget; SHA aftertransfer. Полный RedisAOF не накладывать наобщийtarget.

6. **Restore без перезаписи старого.** Назначить новые пустые БД для final cutover, отдельные владельцы/app роли по05; preliminary `n5_relocated_20261109`/`n5_helpdesk_relocated_20261109` уже существуют, restore без проверки поверх них запрещён. Новые имена/payload/ACL заполняет reviewed private packet. Пример существующего инструмента наtarget:

```bash
# FINAL_MAIN_DB/FINAL_SUPPORT_DB — уже созданные и проверенные пустые назначения,
# MAIN_DUMP/SUPPORT_DUMP/SUPPORT_TOC — проверенные локальные private artifacts.
: "${FINAL_MAIN_DB:?review empty target DB}" "${FINAL_SUPPORT_DB:?review empty support DB}"
: "${MAIN_DUMP:?verified dump}" "${SUPPORT_DUMP:?verified dump}" "${SUPPORT_TOC:?reviewed pg_trgm TOC}"
docker exec -i clipmkr-stage-20261028-db-1 pg_restore --exit-on-error --no-owner --no-acl --role=n5_relocated_owner -U n5 -d "$FINAL_MAIN_DB" < "$MAIN_DUMP"
docker cp "$SUPPORT_TOC" clipmkr-stage-20261028-db-1:/tmp/relocation-final-support.toc
docker exec -i clipmkr-stage-20261028-db-1 pg_restore --exit-on-error --no-owner --no-acl --role=n5_helpdesk_relocated_owner --use-list=/tmp/relocation-final-support.toc -U n5 -d "$FINAL_SUPPORT_DB" < "$SUPPORT_DUMP"
```

Support `pg_trgm` администратор создаёт только в новой БД; reviewed TOC исключает только его CREATE/COMMENT, сохраняя остальные entries. Затем нужны explicit grants по private SQL и полное сравнение строк, схем, sequences и ACL с frozen manifest. Redis main DB1/support DB3 — только после повторных DBSIZE=0/no-clients; RESTORE без REPLACE, с сохранением типа, бинарных значений и остаточного TTL. При разных версиях Redis сравнивать hash по бинарным полям/значениям; отличие DUMP encoding не отменяет остальные проверки. Uploads/spend/config восстановить в отдельные каталоги и сравнить bytes/hash/modes.

**На текущем срезе production candidate отсутствует:** есть `runtime/qa.env` и `helpdesk-qa.toml`; `main.env`, `helpdesk-main.toml` и production override ещё надо подготовить и проверить offline. Credentials брать из `runtime/database-credentials.private.json` и фактического source runtime только в закрытом контуре. Значения не печатать; QA config не переименовывать в production по предположению. Исходный source config содержит важные session/encryption/mail/provider bindings.

Existing `r2-drill/operator.private.py` привязан к QA/test destinations и для production без пересмотра не запускается. Прежние initial-restore scripts тоже имеют фиксированные старые пути. Подготовка offline candidate допустима до DNS; запуск imported приложений — отдельный cutover gate.

7. **Единственный target writer.** После equality/config admission применить reviewed production override: исходные web4afa/worker6e66, main DB/Redis1/root S3 prefix, support DB/Redis3/uploads/encryption key. Прежний QA web остановить; PostgreSQL/Redis не пересоздавать. Существующим Compose `config --format json` сохранить private вывод и проверить images, роли, origin и привязки секретов. Затем scoped `up -d --no-build --no-deps` только разрешённых web/workers/support. Конкретная команда зависит от ещё не подготовленного production override. Неизвестный исход первой попытки запуска означает R2/maintenance, не автоматический R1.
8. **До обычного ingress.** Через hostname-resolve направить `clipmkr.ru/www/support` на 77.83.87.178; проверить прежние сессии, аккаунты, роли, лимиты и историю поддержки. Source writers остаются stopped. Вход на IP QA этого не доказывает. Проверить TLS/origin/XFF, provider/mail routing и отсутствие повторного исполнения очередей. Ошибка удерживает maintenance.
9. **Relay и DNS.** После отдельного согласования включить scoped old edge→target relay без fallback на старую БД. Доверять только проверенному old IP; canonical XFF проверить фактическим probe. Main, оба callback пути, support и aliases направить к одному новому writer; legacy routes сохранить. QA guard на IP не подменяет production canonical callback. Изменить только согласованные A main/www/support с 194.85.249.105 на 77.83.87.178; TTL исходно300/300/600, перед окном повторно прочитать authoritative NS. DNS API/zone credentials и mutating команда пока не установлены: использовать owner UI/API только после GO. MX/TXT/NS/legacy/c не менять.
10. **Наблюдение.** Проверить authoritative DNS, старый/новый IP через resolve, TLS, прежний вход и сессии, upload resume, playback/download, support/mail/webhook reconciliation и отсутствие старых writers. Проверить TLS renewal: копии scoped сертификатов и короткий IP certificate не являются постоянным решением. Записать возраст backup, интервал возможной потери, restore time, logs/alerts. Source и старые БД после одного зелёного health не удалять; это требует отдельного решения после наблюдения.

## Отказ и откат

| Ситуация | Разрешённое действие |
|---|---|
| Ошибка до любого target production startup, доказан ноль записей | R1: остановить target writers, проверить полное отсутствие новых записей, восстановить проверенный source ingress/profile, затем source writers. Возврат DNS, если он уже менялся, — только в пределах согласованного rollback пакета. |
| Target writer запускался или исход команды неизвестен | Maintenance, R2_REQUIRED. Заморозить target ingress/consumers, сохранить актуальные main/support PG+Redis+uploads+spend/config и передать off-host. Source над старым snapshot не запускать. |
| Target доступен, актуальный R2 набор полон | Восстановить в новые source DB/Redis/file destinations; сравнить все категории; запустить ровно один комплект writers, затем relay/DNS по согласованному пакету. Репетиция доказала data roundtrip, но production bindings требуют отдельной проверки. |
| Target VPS целиком недоступен | Maintenance. Показать время последнего проверенного off-host backup и интервал неизвестных записей. Старую БД автоматически не публиковать: нужно решение владельца либо восстановление target. RPO0 без реплики не обещается. |

Сохранить failure/start/stop/manifest evidence до cleanup. Откат image с той же актуальной БД и R1 возврат данных — разные операции. До отдельной команды владельца результат подготовки — защищённый QA preview, честная матрица готовности и конкретный пакет будущего окна. **DNS остаётся на source.**

## Уточнение после согласования TEST-окна

Source readonly provider reconciliation выявил:4 намерения в статусеcreated,0payment_event,0payment; в ЮKassa три отменены и одно успешно(TEST,990рублей). Причина недоставки не установлена; финансовые строки не исправлялись. Подробности — [инцидент](../incidents/2026-11-09-test-payment-reconciliation.md). Sourceweb пересоздан с прежним образом, единственная envдельта — пустой N5_TEST_CHECKOUT_ACCOUNT_ID; workers/support IDs иStartedAt прежние. Вход существующим тестовым аккаунтом200, checkout503checkout_paused, logout200; counts4/0/0 сохранены. Платежи QA выключены, callback503. Возврат исходного allowance — после подтверждённого возврата callback и reconciliation, отдельный финансовый ремонт не подразумевается.

Дополнительный QA browser smoke: свежий вход/выход,кабинет/настройки,сохранение светлой/тёмной темы икомпоновки,два воспроизводимых клипа иотказ обычному аккаунту в owner API403. Полный трёхролевой CJM этим не закрыт. Приватный отчёт qa-ui-acceptance.actual.private.md.

## Приоритет владельца: данные раньше оплаты

Последующее решение09.11: сначала перенести все необходимые базы, затем проверять оплату на этом VPS. G1/G2 относятся к платёжной приёмке, а не к допуску безопасного snapshot/copy/restore. Свежие отдельные snapshots main/legacy/helpdesk на22:38UTC уже перенесены и восстановлены в отдельные локальные базы;27/27/57 таблиц совпали с манифестами из тех же exported snapshots. Источник не заморожен, финальный cross-store срез ещё впереди.

Production candidate теперь имеет конкретные пути и предварительные resource caps; offline render проверяет все7 сервисов, ротация логов поддержки сохранена. Независимое ревью принято только для offline preparation. Первые imports main отличаются от свежего snapshot в clip_link/growth_event/session; support совпадает по57 таблицам. Значит, запуск первоначальной main копии без финального обновления запрещён. Свежие snapshots сохранены раздельно, никакой финансовой корректировки или слияния не выполнялось.


### Закрытие временного платёжного окна

По указанию владельца проверка оплаты отложена до переноса данных и запуска перенесённого приложения. На старом сайте восстановлены исходные настройки web, включая прежнее персональное разрешение тестовых покупок; образ и остальные сервисы сохранены. Повторная фактическая проверка Docker: running healthy. Владелец подтвердил возврат URL уведомлений на старый домен. На QA оплата выключена, TEST callback закрыт. Финансовые записи не исправлялись, DNS не менялся.


## Разрешённое окно финальной синхронизации — 10.11.2026

Владелец явно поручил приступить к пункту2: техническое окно старого сайта и финальная синхронизация баз, очередей и локальных файлов. Это разрешение на остановку записи main/support, контролируемый перенос и проверку сохранности; DNS и запуск нового production writer этим шагом не выполняются. Legacy сохраняется отдельно без остановки/переключения. До изменения ingress проверяются активные задания и точные команды восстановления. После прекращения выдачи S3 подписей учитывается900сек срок действия уже выданных partURL и выполняются повторные сверки частей.

Рабочий каталог: `/tmp/clipmkr-relocate-workspace-20261109`; private operational bundle: `/root/.config/clipmkr/relocate-workspace-20261109/final-sync-20261110/`. Автор подготовки — gpt-6.1-sol high; независимый reviewer — gpt-6-astra xhigh, отдельная сессия. Runtime изменяет только координатор после проверки конкретных команд. Подготовка не означает, что maintenance уже включён.
