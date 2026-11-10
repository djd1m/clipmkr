# Независимый Fleet QE: регрессии существующих сценариев

**NO-GO: выборочный regression pass имеет 4 failed проверки в двух существующих suites.** Новый собственный condition — **RET-REG-001 HIGH**, рассинхронизация transitive test fixtures с новой политикой. Это подтверждённый дефект регрессионного набора, а не доказательство неправильного продуктового поведения текущего SQL. Уже зарегистрированные условия других reviewers сохраняются; этот отчёт их не закрывает и не создаёт дубликатов.

10.11.2026. Роль `fleet-regression`, family `owner-exception`. Новая сессия `/root/retention_fleet_regression`, запрошенная host модель `gpt-6-astra`, reasoning `xhigh`; автор `gpt-6.1-sol high`. Cross-model исключение — `docs/review-policy.md` и `docs/model-matrix.md`; это не cross-family. Отдельный provider session ID инструмент не предоставил.

Baseline: `68af4887f44290f0654db445636f390bbd3064d0`. Native revision: `95410c60010ac1bc64a9b8cd4684b1c1abb44d9608f7c01556834b61f1fe4c2d`; nonce: `9e362573-5340-4ee3-bf45-a031d0aa0d8c`. До и после прогона сверены все 51 digest host manifest, расхождений нет. Source freeze соблюдён.

## Входы и независимость

Сначала прочитаны AGENTS.md, CLAUDE.md, core CJM/review policy, `01_requirements.md`, `technical-clarifications.md`, три ADR, `05_architecture.md`, `06_implementation_plan.md`. Затем самостоятельно исследованы diff относительно base-ref, новые migration/notice/policy test файлы и вызывающие их существующие upload/render/billing/partner/guest/auth компоненты. Host snapshot был прочитан для привязки: его RET-QP-001/002/003 были видны до собственного анализа кода; это ограничение контекстной независимости явно раскрыто. Авторская история кодирования не передавалась. После собственного анализа прочитаны независимые risk/traceability отчёты и агрегаты предоставленных private logs; их исполнения не приписаны этой сессии.

Методология: `/home/clipmkr/.agents/skills/feature-adr/modules/09-fleet-qe.md`, receipt contract `modules/08-qe.md`, pinned `qe-ref-regression-testing/REFERENCE.md` и `qe-ref-qe-coverage-analysis/REFERENCE.md`. Применены change-based selection, проверка transitive dependencies и разбор фактических assertions. AQE runtime не запускался. Другие агенты не создавались.

## Change-based выбор проверок

Выбраны 30 из 157 найденных `tests/**/*.test.ts` вне `tests/browser` и архивных artifacts: сокращение числа файлов 80,9%. Это только размер выборки, не измерение покрытия или сокращения времени. В `progress-screen.test.ts` дополнительно реально исполнены четыре browser сценария Chromium/WebKit.

| Приоритет | Изменение → затронутый контракт | Выбранные suites, все с префиксом `tests/` |
|---|---|---|
| mustRun | `tariff.ts`, `plan.ts`, migration 028, `retention.ts` → readiness, срок, оплаченные права, erasure/source/history | `retention-policy.test.ts`, `retention-policy.integration.test.ts`, `retention.test.ts`, `retention.integration.test.ts`, `paid-plan.integration.test.ts` |
| mustRun | `render.ts`, `clip-music.ts`, `video-cta.ts` → fencing, первая публикация, rerender/quota, отмена при очистке | `render.integration.test.ts`, `render-worker.test.ts`, `clip-music-choice.integration.test.ts`, `clip-cta.integration.test.ts`, **`clip-cta-rerender.integration.test.ts`** |
| mustRun | screen/file/guest/short-link/signature → доступ, ownership, границы гостя, сохранённые referral counters, player | `progress-screen.test.ts`, `progress-screen.integration.test.ts`, `guest-pack.test.ts`, `guest-pack.integration.test.ts`, `short-link.test.ts`, `short-link.integration.test.ts`, `s3-public-endpoint.test.ts` |
| mustRun | notice + общий mail transport → provider payload, retry и прежний verify/reset transport | `retention-notices.integration.test.ts`, `support-mail-resend.test.ts`, `support-mail-tls.test.ts` |
| shouldRun | Общие account/payment/credit grants и render activation → начисления, webhook replay, attribution, signup/erasure | `credit-packages.integration.test.ts`, `billing.integration.test.ts`, `payments-guards.test.ts`, `partner.integration.test.ts`, `auth.test.ts`, `support-email.integration.test.ts` |
| shouldRun | watchdog/retention + общий S3 package → upload quotas/completion, queue recovery и диагностика | `upload.integration.test.ts`, `upload-completion-integrity.test.ts`, `queue-probe.integration.test.ts`, **`watchdog-diagnostics.test.ts`** |
| canSkip в этом focused pass | Нет изменений алгоритмов ffmpeg, audio/face tracking/subtitles, STT/LLM selection/cost, upload widget/resume UI, тарифного каталога/цен и auth UI; их прямые handlers/helpers не менялись | Остальные suites не запускались. Это не разрешение пропустить необходимые release/CJM проверки после ремонта |

Граница canSkip проверена по diff и вызовам: `effectivePlanSql` сохраняет расчёт текущих paid возможностей и watermark/quota; меняется отдельный retention deadline. Upload `signParts` не изменён, новая absolute deadline применяется к `generateDownloadUrl`. В render сохранены существующие fences, завершение credit charge и activation attribution. Guest consent/revoke/ownership и short-link event dedupe остались прежними; изменён доступ к media. Новая notice таблица удаляется через video FK при существующем account erasure, которое анонимизирует аккаунт, а не удаляет его строку.

## Фактическое исполнение

Один собственный запуск Node **22.23.4**, проектный `scripts/test.mjs` с явным списком выше и `--env-file=<private isolated test DB env>`. Случайные отдельные схемы в разрешённой `*_test` БД, fake storage/provider и локальные browser fixtures. Начало 10:19:28 UTC; **188,22 с; exit 1; 28 файлов passed / 2 failed; 430 passed / 4 failed / 14 skipped, всего 448 tests**. Full suite, дополнительные retries и production операции не выполнялись.

Private log: `/root/.config/clipmkr/clip-retention-20261110/fleet-regression-independent.private.log`; SHA-256 `3a19df35f5eac1b7a39b0833c4ee9824026eaf7d4ff14031a60741a83076ed2b`. Секреты, URL БД и подписанные media URLs в этот отчёт не копировались.

14 skipped — явные opt-in live S3 сценарии: 11 полного server upload, по одному guest revoke bytes, account erasure HEAD и retention late-PUT/source/sibling. PostgreSQL наборы не были пропущены. Поэтому этот запуск подтверждает upload quota/completion contracts, но не реальную multipart передачу; не подтверждает Cloud.ru или внешний почтовый inbox. Четыре browser теста проверяют локальный player/polling/selection/disclosures, а не опубликованный полный CJM.

После собственного анализа просмотрены чужие `author-final-pass.private.log` (17 suites, 171 passed / 3 skipped, SHA `4808253682814015ce341de732aa8f6be36ca09942073a92fab9ff229354f2ea`) и `s3-regression.private.log` (2 suites, 9 passed / 10 skipped, SHA `c0a06395792567930f542cd038363fd6c81eb81c135863d639d6471b3a58e564`). Это дополнительные свидетельства других исполнителей. Их окружение и весь execution provenance самостоятельно не воспроизводились. Author17 не включал оба упавших transitive suites.

## RET-REG-001 — HIGH: transitive fixtures не переведены на новый retention lifecycle

Требование: FR-1/FR-5, ADR-001/002 Confirmation и TASK-7 требуют сохранить working regression checks для границы срока, очистки с активной пересборкой, stale publication, storage retry и диагностики. Зелёные feature tests этого не заменяют.

1. `tests/clip-cta-rerender.integration.test.ts:38` вставляет готовые клипы **после миграции**, без `ready_at/ready_at_source`; они получают unknown. Строки 182–186 по-прежнему ожидают истечение через **3 суток от video.finished_at**. При утверждённых 7 сутках и per-clip readiness ожидаемый `rerendering:0` получает 2. Старая минутная граница, которая проходит, также не проверяет новую границу срока.
2. В том же файле строки 198–204 и 221–226 меняют только `video.finished_at` и запускают retention через два дня. Unknown readiness правильно исключена из destructive cleanup, поэтому `object_key` остаётся `old-1`, а mock S3 error не вызывается. Соответственно падают проверки «очистка после постановки пересборки» и «отказ хранилища при очистке». Их последующие assertions об отмене attempt, отказе `getRenderInput`, непринятии позднего `publishRenderResult`, удалении orphan и повторном sweep уже не достигаются.
3. `tests/watchdog-diagnostics.test.ts:81` возвращает старую candidate row без `account_id`, а mock на строках 81–84 не обслуживает успешный новый video lock и lifecycle reread. Claim возвращает false до S3. Поэтому на строке 91 ожидаемые **2** ошибки становятся **1** (только account erasure); проверка clip error/retry/unlock не доходит до intended path. Сама обработка ошибок продукта этим failure не опровергнута.

Все четыре failures наблюдены в собственном запуске, а оба файла не изменены относительно base-ref. Отдельный baseline-run этой сессией не выполнялся. Точная причина следует из fixtures, согласованной новой политики и выполненных failing assertions; правильность предполагаемой правки не выдаётся за проверенную.

**Закрытие:** включить оба файла в план и measured repair manifest; обновить fixture готовых клипов с реальным `ready_at/ready_at_source`, проверить до/ровно/после семи суток и передвигать cleanup относительно этой даты. Сохранить проверки quota, cancel/stale publication/orphan cleanup и повтор после storage failure. Обновить диагностический mock под account→video→clip/lifecycle claim так, чтобы оба заданных storage failures действительно исполнялись, и сохранить checks original cause, retry, unlock/release. Оба suites должны пройти без удаления/skip/ослабления assertions. Не возвращать старые 3 суток и не снимать unknown guard ради зелёного теста. Если адаптированные fixtures обнаружат продуктовый дефект, исправить и независимо проверить его в том же measured repair.

Текущий condition привязан к измеренным источникам контрактов: `apps/web/src/server/video-cta.ts`, `apps/web/src/server/retention.ts`, `apps/web/src/server/watchdog.ts`, `packages/db/src/render.ts`, `features/clip-retention-policy/06_implementation_plan.md`. Найденные два test consumers сейчас отсутствуют в host manifest; перед изменением их необходимо добавить, а не объявлять покрытыми текущей привязкой.

## Покрытие, прежние условия и пределы вывода

Из исполненного: checkout/webhook replay/credits и partner attribution прошли; auth/reset/verify и прежний Resend/SMTP transport прошли; guest consent/revoke/membership, short-link counters после expiry, render publication/fencing и player прошли в указанных fixtures. Остальные выбранные тесты не показали новых failures. Нельзя превращать это в утверждение «регрессий нет»: RET-REG-001 остаётся незакрытым, а tests не охватывают все interleavings.

RET-QP-001/002/003 не дублируются: clock-after-wait/credit-grant race, пользовательские purchase/guest тексты и конкурентный lease reaper остаются за `qe-primary`. RET-TR-001 относится к историческому migration backfill, это иной пробел, чем найденные CTA/diagnostic fixtures. RET-INT-001/002 относятся к runtime mail wiring/recovery; мои transport tests не закрывают эти integration findings.

Line/branch/function и differential coverage численно не измерены; пороги 80% new code / 90% critical paths **не установлены**, проценты не выводятся из числа tests. Критичные незакрытые ветки перечислены собственным условием и условиями других reviewers. Полная real-provider CJM приёмка, live S3, настоящий магазин, inbox, нагрузка/backlog, production deployment и owner acceptance вне этой сессии.

Записана только собственная reviewer entry под flock, с сохранением чужих entries/author handoff. Native prepare/evaluate/checkpoint не вызываются этой ролью. Завершён focused regression pass; выпуск и завершение всей фичи не подтверждены.
