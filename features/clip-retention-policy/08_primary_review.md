# Focused verification — cycle 3

Текущий вердикт qe-primary: **CLEAN — все три собственных условия verified**. RET-QP-001, RET-QP-002 и RET-QP-003 сохранены дословно и проверены на текущей ревизии. Это собственный review verdict; общий native gate требует полного roster и настоящего evaluate, а выпуск — отдельной применимой приёмки.

Reviewer: qe-primary / owner-exception; originating session /root/retention_primary_qe, gpt-6-astra xhigh. Автор — gpt-6.1-sol high. Revision 01593dab6b59e9f722db9aac5a20f49952516e31aa3f13a182de86bf095b09e6; nonce 833d9ab1-9436-438c-9a53-2d0193125d52.

## Проверка фактического изменения

Прочитаны текущие qe-author-delta.json и host manifest, исправленный guest-page.ts, затронутые HTML/CSS/JS зависимости и фактический браузерный script/results/screenshots. Все 57 текущих artifact hashes совпали с host. Из native-qe-history.jsonl самостоятельно извлечён manifest cycle2 revision 85fdf8f2b2e452d4998ab3870ff73ca18e32f63d5e047f0cc1ad758d714a5363: единственный отличающийся путь — apps/web/src/server/guest-page.ts. Таким образом, unchanged binding RET-QP-001/003 и соответствующих тестов установлен по сохранённым measured snapshots, не по заявлению автора.

Новая строка [hidden]{display:none!important} в guest CSS действительно сильнее существующего button,.download{display:inline-block}. Expired download-all остаётся в DOM с hidden disabled, поэтому существующий listener не получает null; у доступного пакета hidden отсутствует и кнопка продолжает показываться. Правило также корректно скрывает interest-login до явного .hidden=false в существующем обработчике 401. Новой продуктовой семантики, зависимости либо обхода доступа эта правка не добавляет.

## RET-QP-002 — verified

Политика 7/30, точный min(clip deadline, guest deadline) МСК и public expired state, проверенные в cycle2, сохранены. Последний residual — реально видимая недоступная глобальная кнопка — закрыт CSS cascade.

Прочитан реальный coordinator evidence:
- browser-guest-results.private.json: две строки, active и expired, обе status=200 и passed=true; SHA256 4f6ebb1e83105e00f1d6ded543d60aaa4a351a7dc77d96c0e26c583db9dd48df.
- browser-guest-check.private.cjs: SHA256 4021ec9046773c573b4eeea08d1e2c5358c5b2f116465234a0b5d23ee66f0fd7. Проверены assertions: expired download-all.isVisible()=false, active isVisible()=true, отсутствие expired приглашения/плеера/individual download, точный срок МСК, active currentTime>1, отсутствие горизонтального overflow.
- Визуально просмотрены browser-guest-expired.png и browser-guest-ready.png: в expired сохранены история и единое состояние без плеера/кнопок скачивания; в ready видны срок МСК, плеер, индивидуальная и глобальная кнопки. Скриншоты синтетические, в Git не копировались.

Корень private evidence: /root/.config/clipmkr/clip-retention-20261110. Это проверенные артефакты исполнения координатора, не собственный браузерный запуск. Исторический failing error file cycle2 не перезаписывался и не используется как результат cycle3.

## RET-QP-001 и RET-QP-003 — verified на текущей revision

Хеши callback-clock реализации queue/watchdog/retention/notices, outer state/lease reaper guards и относящихся PostgreSQL barrier tests идентичны cycle2. Сохраняется собственная проверка cycle2: post-lock actual clock учитывает оплату credit grant после ожиданий; reaper не перезаписывает accepted/live replacement lease. В этом цикле эти backend scenarios не перезапускались — изменения к ним не относятся. Тестовое исполнение не выдаётся за повторное.

## Author delta / новые риски / ограничения

authorAssessmentChecked=true: actual one-path CSS delta соответствует author classification=structural и заявленному scope; новое поведение и unaffected bindings проверены независимо. deltaVerification implementationVerified=true. Новых существенных рисков после focused review изменения и затронутых зависимостей не обнаружено; чужие fleet conditions не присваиваются этой роли.

Дополнительно прочитаны фактические итоговые строки cycle3-hidden-unit.private.log: 2 files / 25 tests passed; cycle3-hidden-build.private.log: Compiled successfully, Generating static pages 14/14. Это чужие результаты, а не собственное execution; shell exit0 известен из сообщения координатора, отдельно в просмотренных summary-строках не присутствует.

Код, production, тесты и native host этой сессией не изменялись/не запускались; изменены только собственный report и entry receipt под общим flock. Ни общий native closure, ни production release, ни ручная приёмка этим отчётом не объявляются.

---

## Исторический focused review (cycle 2)

# Focused verification — cycle 2

Текущий вердикт: **NO-GO**. RET-QP-001 и RET-QP-003 подтверждены по реализации и относящимся к ним тестам. RET-QP-002 остаётся unresolved: глобальная кнопка скачивания на полностью истёкшей гостевой странице всё ещё видима. Исходные три conditions сохранены дословно; нового condition для того же неполного исправления не создаётся.

Reviewer: qe-primary / owner-exception; та же originating session /root/retention_primary_qe, gpt-6-astra xhigh. Автор исправлений — gpt-6.1-sol high. Revision 85fdf8f2b2e452d4998ab3870ff73ca18e32f63d5e047f0cc1ad758d714a5363; nonce cc659720-bc12-4601-b9e3-39b018798275. Перед записью сверены все 57 manifest entries: mismatches=0. Код и тесты этой сессией не изменялись и не запускались.

Сначала прочитаны qe-author-delta.json и текущий host manifest; затем самостоятельно проверены реальные изменения callback clock, reaper, mail factory/runtime callers, purchase/return/guest UI, migration/test matrix, CTA и watchdog diagnostics fixtures и дополненный план. Author classification=structural верна. ChangedScope включает все 15 host changedPaths и затронутые зависимости; четыре условия других reviewers остаются их собственными условиями, моя entry не подменяет их verification.

## RET-QP-001 — verified

queue-runtime.ts теперь передаёт actual callback в watchdogTick, тот передаёт тот же callback в notices и retention. retention.ts получает decision=clock() после account→video→clip locks и использует этот decision для eligibility, claim и next due. Фиксированный Date остаётся только явно выбранным logical clock; в найденных production callers передаётся callback. notices claim вызывает clock после FOR UPDATE, поэтому ожидание notice lock больше не сохраняет старый asOf. Signature guards и формула оплаченного срока не изменены.

Проверены тесты watchdog_delay_credit_grant_before_claim_preserves_media, credit grant starting while retention waits on account lock protects media и notice_claim_rechecks_clock_after_lock_wait (expired/extended). Они используют настоящий PostgreSQL, управляемый Date, отдельные connections/наблюдение lock wait, payment credit_grant с отсутствующим legacy paid_until и assert отсутствия S3/transport. Scheduled start проверен до/на границе; прежний claim-before-payment retry остался. Проверка кода и содержания тестов выполнена независимо; их исполнение в этой сессии не заявляется.

## RET-QP-003 — verified

В retention-notices.ts outer UPDATE теперь имеет state='sending' AND lease_until<=now вместе с bounded id subquery. После ожидания row lock predicate перепроверяется на актуальной строке и не переписывает committed accepted либо новую live lease. Reaper также перенесён до unavailable transport return; immutable payload/key/first_attempt_at этим переходом не изменяются.

Проверен notice_reaper_preserves_concurrent_accepted_and_live_lease для accepted и replacement: finalizer держит реальную PG transaction, второй connection доходит до lock wait, затем commit; asserts сохраняют state/receipt/payload/first_attempt_at и не вызывают transport. Existing expired-lease retry и новые disabled/SMTP tests покрывают обратный переход sending→unknown. Собственного запуска PG tests нет.

## RET-QP-002 — unresolved, исправление частичное

Правильные 7/30 тексты появились в credits/legacy UpgradeScreen, ReturnView и гостевом offer. Поиск старых обещаний в apps/web/src и packages/shared/src не выявил остатка прежнего хранения. Гостевые карточки показывают min(clip deadline, pack expiry) с datetime/МСК, отличают unknown/failed/processing, а expired/claimed/deleted получают единое публичное состояние. Новые consumers включены в plan и measured manifest.

Остаток находится в apps/web/src/server/guest-page.ts: CSS button,.download{display:inline-block} перекрывает user-agent правило для hidden. Разметка all-expired добавляет глобальной кнопке download-all атрибуты hidden disabled, но авторского CSS, обеспечивающего скрытие, нет. Поэтому недоступная кнопка «Скачать все» всё ещё отображается. Сохранение DOM node ради существующего event listener допустимо; нужна фактическая невидимость, а не только атрибут.

tests/retention-policy.test.ts проверяет строку '<button id="download-all" hidden disabled>', поэтому этот residual не ловит. Требуемая проверка — browser visibility/computed style на all-expired при сохранении доступной кнопки в mixed/available состоянии, без поломки обработчика событий. Это остаётся частью исходного RET-QP-002, FR-3/FR-5 и TASK-9.

После собственного статического анализа запрошено прямое browser evidence. Прочитан /root/.config/clipmkr/clip-retention-20261110/browser-guest-error.private.txt: первая строка 'Error: Expired global download visible', SHA256 62dc0f294c1e77f1b86647bc6fe753e18be16712f212121e205fee7f06bcc5ca. Проверен соответствующий assertion в browser-guest-check.private.cjs: locator('#download-all').isVisible(). Это чужой реальный прогон координатора, не собственное исполнение. Секреты/адреса из private сценария не копировались.

## Delta audit и ограничения

Прочитаны новые shared mail factory и оба runtime caller: synthetic recipient gate остаётся в SupportMailer, bounded Resend transport и verify/reset API сохранены; capture использует прежний protected file writer. Дополнения migration и transitive regression tests проверяют исторические даты и прежние lifecycle/error assertions, а не ослабляют политику. Подробная приёмка четырёх fleet conditions остаётся их originating reviewers.

Других существенных рисков сверх незакрытого RET-QP-002 в проверенном repair delta не установлено. deltaVerification остаётся implementationVerified=false, поскольку весь author delta ещё не принят. authorAssessmentChecked=true означает независимую проверку с явным несогласием с полнотой UI исправления; это не авторское GO.

Общая сборка, full test execution, provider delivery, production и owner acceptance не выполнялись этой ролью. Final build по сообщению координатора ещё был pending; не объявляю его успешным. Native evaluate/begin-repair выполняет координатор после полного roster.

---

## Исторический первичный review (cycle 1)

# Независимый первичный QE / code review

Вердикт: **NO-GO**. Три незакрытых условия: RET-QP-001 (CRITICAL), RET-QP-002 (HIGH), RET-QP-003 (HIGH). Полный первый статический pass завершён; исправления и повторная независимая проверка обязательны. Этот отчёт не является разрешением production/release.

Reviewer: qe-primary; family owner-exception по решению владельца о cross-model. Модель gpt-6-astra, reasoning xhigh; отдельная сессия /root/retention_primary_qe, fork_turns=none. Координатор подтвердил фактические параметры spawn; автор — gpt-6.1-sol high, отдельная сессия /root/retention_execution. Точные внешние provider session/turn IDs инструментом не предоставлены; они не выдуманы.

База: 68af4887f44290f0654db445636f390bbd3064d0.
Prepared revision: 95410c60010ac1bc64a9b8cd4684b1c1abb44d9608f7c01556834b61f1fe4c2d.
Nonce: 9e362573-5340-4ee3-bf45-a031d0aa0d8c.
Перед завершением перечитаны хеши: все 51 entries host manifest совпали, все три OpenSpec SHA из requirements-revision.json совпали. Host не менялся.

## God-object growth (BLOCKING)

Нарушений нет. Измерены все source targets snapshot: максимальный изменённый source-файл VideoDetail.tsx — 203 строки, retention-notices.ts — 120. Новых монолитов и существенного расширения файла >=700 строк нет.

## Security violations (BLOCKING / HIGH)

Нового обхода owner/guest/showcase авторизации, SQL injection, произвольного outbound endpoint или утечки новых provider payload в логи в проверенном diff не обнаружено. Идентификаторы в SQL projection проходят существующую проверку, значения параметризованы; письмо экранирует HTML; транспорт Resend использует фиксированный endpoint, ограничение тела ответа и timeout. Абсолютный notAfter доходит до signer, TTL вычисляется от того же signingDate.

Это статическое заключение по изменению, не результат DAST, pentest или аудита всей системы. RET-QP-001 ниже остаётся критичным для целостности пользовательских файлов.

## Architectural concerns (HIGH / MEDIUM)

Новых сервисов, SDK, override-платформы или альтернативного billing-контура нет. Сохранены существующие watchdog, tariff/plan, storage adapter и mail transport. Архитектурная ошибка общего времени разобрана однократно как RET-QP-001.

## Anti-pattern violations

Отдельных подтверждённых нарушений не добавляю. Durable retries уведомлений и повторный S3 sweep прямо требуются ADR; это не произвольная дублирующая retry-платформа. Сеть вне SQL транзакций соответствует выбранному контракту.

## Type / contract issues

### RET-QP-002 — HIGH: политика не доведена до действующих экранов покупки и гостевой страницы

**Что сломано.** Изменён только ProInterest, а apps/web/src/app/upgrade/UpgradeScreen.tsx:106 всё ещё обещает хранение до конца оплаченного окна плюс 3 дня в действующем credits UI; строка 116 повторяет 3 дня в legacy UI. apps/web/src/app/upgrade/return/ReturnScreen.tsx:24 и apps/web/src/server/guest-page.ts:22 обещают хранение без срока. Гостевая страница :48 показывает только календарный срок ссылки, не точное время доступности конкретного файла; :55 не использует новое retention_state и показывает неоднозначное «истёк или файл пока недоступен».

**Почему это дефект.** FR-3/FR-7 и TASK-3/TASK-6 требуют единую дату/конечное состояние и отсутствие актуальных старых обещаний. Пользователь на странице покупки читает условия, которые не соответствуют реализованному удалению; гость не видит точный срок своего клипа. Наличие правильной строки в карточке владельца эту поверхность не исправляет.

**Воспроизведение.** Открыть /upgrade обычным credits-аккаунтом и развернуть «Условия покупки и использования кредитов» — выводится «ещё 3 дня». Отрендерить ReturnView со state.kind=succeeded или гостевой handler с paymentsOn=true, creditMode=false — выводится «без срока». Для гостевого пакета с более ранним clip deadline доступный клип не показывает этот deadline; expired clip получает старый смешанный текст.

**Исправление и критерий.** Согласованная политика 7/30 должна отображаться на перечисленных поверхностях, а гостевая карточка — показывать применимый точный срок МСК и однозначное «Срок хранения закончился» для истечения/claim/deleted. Срок guest link может оставаться отдельным ограничением. Добавить поведенческие проверки отрисованного HTML обоих режимов покупки, возврата и guest states. Для новых source targets обновить plan/admission/manifest; новых продуктовых сроков это не требует.

**Измеренный scope condition.** apps/web/src/app/dashboard/ProInterest.tsx; apps/web/src/server/guest-pack.ts; apps/web/src/lib/screen-contract.ts; features/clip-retention-policy/06_implementation_plan.md. Названные выше неизменённые consumer dependencies отсутствуют в текущем host manifest; finding привязан к измеренным источникам контракта, а их отсутствие не скрывается.

## Edge-case sweep

### RET-QP-001 — CRITICAL: старое время watchdog позволяет удалить клип после принятой оплаты

**Что сломано.** apps/web/src/server/watchdog.ts:79,84 передаёт один now, захваченный при входе в watchdog, после ожиданий предыдущих стадий. retention.ts:50 начинает performance-отсчёт только при входе в retentionTick; строка 110 прибавляет к старому now лишь длительность retentionTick. Время до его вызова потеряно. retention-notices.ts:81–82 аналогично начинает поправку после входа в свою стадию.

**Почему это дефект.** packages/db/src/plan.ts считает payment grant применимым только при entitlement_start<=asOf. При оплате credits-пакета этот start хранится в credit_grant; packages/db/src/credits.ts:130–136 не обновляет legacy plan_paid_until. Даже после правильной account-блокировки grant, уже committed до claim, исключается из срока, когда decision отстаёт от фактического времени. Получается необратимое удаление защищённого файла вопреки FR-2/FR-5 и ADR-002. В notices тот же сдвиг позволяет проверять актуальность группы/offset по устаревшему времени и отправлять предупреждение о уже продлённом либо истёкшем сроке.

**Воспроизводимый сценарий.** T0 — старт watchdog; старый бесплатный клип просрочен. Удержать предыдущую async-стадию (например, отправку чужого напоминания) на barrier. В T1>T0 принять и commit-нуть покупку credits-пакета с entitlement_start=T1 до удаления. Отпустить barrier в T2, где T2-T0 значительно больше времени самого retentionTick. decision остаётся около T0, grant исключается, clipAliveSql=false, фиксируется deletion_started_at, вызывается eraseClipPrefix. Existing тест payment_before_claim_preserves_media обновляет legacy plan_paid_until и запускает retentionTick напрямую, поэтому данный сценарий не обнаруживает.

**Исправление и критерий.** Инъецируемый единый источник актуального времени должен охватывать весь watchdog; окончательные decision после account lock и notice claim должны брать действительное текущее время, включая ожидания ДО и внутри стадий. Нельзя только заменить T0 при вызове, оставив stale snapshot после ожидания lock. Нужны PostgreSQL/barrier проверки реального credit grant: payment-before-claim после задержки watchdog не вызывает S3, scheduled window вступает в силу с начала, claim-before-payment остаётся необратим; notice после такого ожидания не отправляет устаревшую группу и соблюдает текущее окно. Логическое время фикстур должно оставаться управляемым.

**Измеренный scope.** apps/web/src/server/watchdog.ts; apps/web/src/server/retention.ts; apps/web/src/server/retention-notices.ts; packages/db/src/plan.ts; tests/retention-policy.integration.test.ts; tests/retention-notices.integration.test.ts.

### RET-QP-003 — HIGH: lease reaper перезаписывает уже сохранённый accepted

**Что сломано.** retention-notices.ts:85–87 обновляет состояние по outer predicate id IN(...). Проверки state='sending' и lease_until<=now находятся только в подзапросе выбора идентификаторов. После ожидания блокировки они не защищают актуальную версию обновляемой строки.

**Воспроизводимый interleaving.** Исходная строка — sending с истёкшей lease. Connection A начинает транзакцию и исполняет штатное завершение попытки accepted/receipt/lease=NULL, удерживая row lock до commit. Connection B начинает точный reaper UPDATE: его snapshot ещё видит sending, id входит в подзапрос, UPDATE ждёт A. После COMMIT A outer id остаётся выбранным и B пишет unknown/lease_expired поверх accepted. При attempts=3 автоматического повторения уже не будет; сохранённый факт принятия превращается в операторскую неопределённость. Аналогично нельзя стирать более новую lease. Позднее завершение/сохранение результата и параллельные replicas входят в рассматриваемый durable lifecycle.

**Почему это дефект.** FR-4/ADR-003 различают accepted и unknown: reaper вправе преобразовать лишь всё ещё истёкшую sending lease. Текущая SQL-операция не является условным переходом текущего состояния. Provider dedupe не исправляет неверный durable журнал.

**Исправление и критерий.** Добавить проверку актуального sending/lease на самой изменяемой строке либо выполнять условный переход под соответствующей блокировкой. PostgreSQL test с двумя connections/barrier должен доказать: commit accepted перед разблокировкой reaper сохраняется вместе с receipt; live replacement lease не сбрасывается; действительно истёкшая sending lease становится unknown и продолжает прежние immutable bytes/key/first_attempt_at правила.

**Измеренный scope.** apps/web/src/server/retention-notices.ts; tests/retention-notices.integration.test.ts.

Оба конкурентных сценария выше выведены статическим анализом; в этой сессии воспроизводящий тест не запускался. Они не представлены как уже полученный failing runtime trace.

## Test quality

Рассмотрены новые retention-policy unit/integration и retention-notices integration, изменения render/retention/paid-plan/guest/short-link/music/progress/legal/Resend regressions, действующие guards file/thumbnail/CTA и browser fixture. Полезные проверки уже есть: исторический fallback без now-reset, partial readiness и сохранение ready_at при rerender, SQL/TS scheduled entitlement, late PUT после первого sweep/null keys, S3 partial failure, durable first attempt, recipient change/revoke, immutable provider bytes/key, catch-up boundaries и 23-часовой бюджет.

Три условия выше имеют конкретные недостающие проверки. Не выдаю множество тестов за покрытие этих interleavings. Existing browser/video-screen.test.ts использует статические fixtures; полноценное приложение и ручную приёмку это само по себе не доказывает. Account/video cascade test проверяет удаление notice, но реальную доставку inbox — нет.

После собственного анализа прочитаны только итоговые counters предоставленных сырых логов в /root/.config/clipmkr/clip-retention-20261110:
- author-final-pass.private.log: 17 файлов, 171 passed / 3 skipped;
- author-real-s3.private.log: 1 passed / 8 skipped;
- s3-regression.private.log: 2 файла, 9 passed / 10 skipped.

Это результаты чужого исполнения, не собственный запуск. Полное соответствие команд/окружения/артефакта каждой строки лога текущему snapshot и browser evidence в этой сессии независимо не установлено. Секретные параметры, URL и приватные данные из логов не выводились. Эти результаты не отменяют findings.

## Process / done-ness gaps

Сначала прочитаны AGENTS.md и docs/review-policy.md; затем 01_requirements.md, technical-clarifications.md, все три 03_adr, 04_domain_model.md, 05_architecture.md, 06_implementation_plan.md и OpenSpec proposal/tasks/spec по requirements-revision.json. Только затем самостоятельно найдены Git changes и тесты относительно base-ref. Прежние выводы автора и предыдущие QE reports не использовались как исходные доказательства.

Дополнительные входы: CLAUDE.md, docs/acceptance/core-cjm.md, применимые локальные security/coding/testing rules; code-critic SKILL.md; feature-adr modules/08-qe.md, pinned brutal-honesty/security REFERENCE. Проверялись source dependencies billing/credits, S3 erasure, consumer страницы покупки/возврата/гостей. architecture/vision.md и architecture/degradations.md в этом worktree отсутствуют; продуктовыми фильтрами служили согласованные feature inputs.

Трассировка: FR-1 — immutable ready_at и backfill реализованы; FR-2 — формула реализована, окончательная временная граница нарушена RET-QP-001; FR-3 — signing boundary реализована, неполная UI дельта RET-QP-002; FR-4 — journal/lease/payload/retries реализованы, актуальность времени и условный reaper нарушены RET-QP-001/003; FR-5/6 — claim/recheck, сохранение истории/source реализованы, безопасная eligibility зависит от RET-QP-001; FR-7 — server exceptions/обычная blogger policy реализованы, пользовательские обещания расходятся RET-QP-002; FR-8 — исторический fallback/unknown guard реализованы.

Feature source не исправлялся. Native host, approval и история не переписывались. Собственная entry содержит author=null, verdict=no-go, три originating conditions и не содержит ложных verifications. Решение о prepare/evaluate/begin-repair остаётся у координатора.

## Production safety

До исправления RET-QP-001 destructive rollout недопустим: дефект нарушает обещанную защиту принятой оплаты. Production, миграции, настоящая отправка писем и удаление объектов в этой сессии не выполнялись. Бакет versioning, remote retention и inbox acceptance не выводятся из чтения кода.

## Suggestions only (LOW)

Нет дополнительных замечаний, необходимых для этого изменения.

## Open questions for the parent

Нет дополнительных продуктовых решений: все три исправления возвращают реализацию к согласованному контракту.

## Skipped checks (transparency)

По роли code-critic тесты и runtime не запускались, код не менялся. Не выполнялись npm audit, DAST, нагрузочные измерения, real-provider email, живой пользовательский CJM и ручная приёмка. Новый внешний SDK/пакет в изменении не введён. Числа покрытия и независимое исполнение AQE runtime не заявляются. При повторном review нужны новый measured snapshot, фактический author delta, тесты найденных сценариев и собственная проверка каждого условия originating reviewer.
