# Независимый Fleet QE — интеграционные границы

Вердикт: **NO-GO** для текущей ревизии. Новые условия: **RET-INT-001 HIGH**, **RET-INT-002 WARNING**. Существующие RET-QP-001/002/003 остаются у qe-primary; этот отчёт их не закрывает и не создаёт дубликаты.

Reviewer `fleet-integration`, family `owner-exception`; отдельная сессия `/root/retention_fleet_integration`, без истории кодирования. По фактическим параметрам dispatch, сообщённым координатором: reviewer `gpt-6-astra xhigh`, автор `gpt-6.1-sol high`; основание — `docs/review-policy.md`. Внешний provider session ID не предоставлен.

База `68af4887f44290f0654db445636f390bbd3064d0`. Revision `95410c60010ac1bc64a9b8cd4684b1c1abb44d9608f7c01556834b61f1fe4c2d`, nonce `9e362573-5340-4ee3-bf45-a031d0aa0d8c`. Все 51 SHA host manifest и все три OpenSpec SHA из `requirements-revision.json` сверены и совпали. Код, миграции, host и lineage не изменялись.

## Входы и независимость

Прочитаны AGENTS.md, docs/review-policy.md, CLAUDE.md, core-cjm; согласованные 01_requirements, technical-clarifications, ADR-001/002/003, 04_domain_model, 05_architecture, 06_implementation_plan и OpenSpec spec по закреплённой ревизии. Применены canonical feature-adr Step9, контракт receipt Step8 и pinned enterprise-integration-testing / qe-coverage-analysis в Reference Mode. AQE runtime не запускался.

После требований самостоятельно найдены реализация и тесты через Git diff к base-ref и поиск потребителей. Полный `08_primary_review.md` прочитан после собственного анализа. Ограничение порядка входов: при раннем чтении native host для revision/nonce были также видны уже записанные primary conditions. Поэтому отсутствие предварительного знакомства с этими тремя findings не заявляется; новые RET-INT-001/002 получены из самостоятельной проверки runtime и подтверждены отдельным исполнением. История кодирования и авторские отчёты успеха входными доказательствами не служили.

## Проверенные связи

| Граница | Контракт и результат |
|---|---|
| Billing → SQL deadline → web/cleanup | `retentionFromSql` учитывает started payment grants независимо от остатка; `retentionDeadlineSql` и `clipAliveSql` общие. SQL/TS parity и payment-before-claim focused tests прошли. Общий актуальный clock остаётся заблокирован RET-QP-001; legacy payment test не доказывает этот иной interleaving. |
| Worker → S3 → DB publication | Изучены `apps/worker/src/workers/render.ts`, render/storage.ts и db/render.ts: PUT вне SQL, create-only контракт, fenced acceptance запрещает claim/deleted, ready_at не сбрасывается при rerender. Полный worker job в этой сессии не запускался. |
| Claim → free/paid/thumb S3 → marker/recheck | Три prefix calls предшествуют null keys/marker; claim/due сохраняются после успеха. PostgreSQL + memory storage tests подтвердили late PUT после первого sweep, retry после ошибки, сохранение исходника/истории. `packages/s3/src/erasure.ts` проверен чтением: fixed UUID prefix и отказ versioned bucket. Внешний S3 не вызывался. |
| Owner/guest/short/showcase → signer | Изучены file/thumbnail handlers, guest-pack, short-link, showcase-file, screen-runtime и /c route. Абсолютный notAfter проходит до signer; signer передаёт тот же signingDate SDK. Focused signature-delay test прошёл. Гостевой UI consumer остаётся RET-QP-002. |
| Watchdog → mail coordinator → DB journal → SupportMailer | Runtime подключает coordinator и изолирует его exception от retention. Указанные ниже два новых разрыва подтверждены. Состояния, payload/key, recipient, 23h и текущие catch-up tests прошли; unsafe concurrent reaper остаётся RET-QP-003. |
| Erasure → notice payload | Миграция использует ON DELETE CASCADE account/video. Existing focused test подтвердил удаление notice после удаления video. Полный account-erasure pipeline в этой сессии не исполнялся. |

Указанные worker/storage зависимости и `support/routes.ts` прочитаны, но отсутствуют в host manifest; привязка native условий дана только к измеренным source/test paths. Это не доказательство измерения всех транзитивных зависимостей snapshot.

## RET-INT-001 — HIGH: тестовый почтовый транспорт не подключён в runtime

**FR-4, ADR-003, TASK-5.** `apps/web/src/server/queue-runtime.ts:33` создаёт `new SupportMailer(runtime.config.mail)` без `captureRetention`. Для mode=test `retentionSender` в `support/mail.ts:64–65` при этом непустой, coordinator создаёт и claim-ит notice. Но `support/mail.ts:76` без capture всегда возвращает failed. Даже synthetic verified адрес никогда не получает тестовую квитанцию; три разрешённых попытки будут расходованы без тестовой доставки.

Это именно разрыв wiring: существующий `support/routes.ts:19–24` подключает защищённый test capture для verify/reset; новая retention ветка не подключает свой callback вообще. Unit test транспорта передаёт callback вручную и потому не ловит runtime omission.

Уточнение границы: сам DI-контракт `SupportMailer` корректно отказывает без capture; от адаптера не требуется самостоятельно читать env или создавать outbox. Нарушение относится к вызывающему runtime: он не передаст capture даже при уже настроенном `N5_MAIL_TEST_CAPTURE_FILE`. Минимальная корректировка — переиспользовать существующий защищённый sink и существующий env, не вводя новый outbox/сервис/настройку и не выводя адреса или payload в stdout. При отсутствии настроенного sink явный unavailable предпочтительнее расходования attempts; однако один такой отказ не делает настроенный test runtime доступным согласно FR-4. Сам диагностический probe исполняет точный конструктор вызывающей стороны, а не полный startup web. Для действующего production mode=resend этот дефект не утверждается.

**Воспроизведение:** isolated PostgreSQL, verified synthetic owner, клип с remaining=2 дня, coordinator получает ровно конструктор из runtime: `new SupportMailer({mode:'test'})`. Ожидание `{state:'accepted', attempts:1}`; фактически `{state:'failed', attempts:1}`. Диагностический тест падает на этом assertion; внешних писем нет.

**Условие закрытия:** подключить существующий безопасный test capture к retention runtime, сохранив synthetic-only ограничение и недоступность real delivery в test mode. Проверка должна использовать реальный runtime factory/wiring либо эквивалентно проверяемый общий конструктор, а не отдельно переданный fake mailer: synthetic notice captured/accepted, несинтетический адрес не отправляется, verify/reset не регрессируют. Measurement scope: queue-runtime.ts, support/mail.ts, tests/support-mail-resend.test.ts; новый integration test включить в следующий prepared scope при добавлении.

## RET-INT-002 — WARNING: unavailable transport отключает восстановление истёкших leases

**FR-4, ADR-003.** `apps/web/src/server/retention-notices.ts:83–87`: отсутствие sender возвращает результат до SQL lease recovery. Если попытка была sending, процесс упал, а restart произошёл с disabled/SMTP, истёкшая lease останется sending на каждом tick. Журнал не отражает обязательный unknown, хотя lease давно истекла. После восстановления Resend reaper снова доступен; повторная отправка или потеря байтов данным сценарием не доказана, поэтому severity WARNING.

**Воспроизведение:** создать notice через реальный coordinator/fake unknown provider, зафиксировать sending с уже истёкшей lease, вызвать coordinator с `new SupportMailer({mode:'disabled'})`. Ожидание unknown; фактически sending. SMTP имеет ту же sender-null ветку, отдельно не исполнялся.

**Условие закрытия:** восстановление истёкшего sending→unknown независимо от доступности транспорта; unavailable режим по-прежнему не вызывает сеть и не расходует новые attempts. Сохранить first_attempt_at, immutable payload/key и receipt; concurrent safety чинится по исходному RET-QP-003. Это дополнительный сценарий с отсутствующим transport, а не повтор race из primary. Scope: retention-notices.ts и tests/retention-notices.integration.test.ts.

## Фактическое исполнение и покрытие

Использован Node22 из предоставленного wrapper и его isolated `_test` DB env. Все fixture schemas уникальные, после прогонов удалены. Секреты/connection strings не выводились.

1. `run-fleet-integration.private.sh`: исходный `run-final-focused.private.sh` с аргументами только `tests/retention-policy.integration.test.ts tests/retention-notices.integration.test.ts tests/support-mail-resend.test.ts`. Exit **0**, **43 passed / 1 skipped**, 3 files, 13.10s. Пропущен real S3 тест: env S3 отсутствовал; это не полный E2E PASS. Лог `/root/.config/clipmkr/clip-retention-20261110/fleet-integration-focused.log`.
2. `run-fleet-integration-probe.private.sh`: Vitest с private config и двумя самостоятельными диагностическими сценариями выше. Exit **1**, **2 failed**, 2.32s; оба падения — ожидаемое требование против фактического дефектного результата, не сбой подготовки. Лог `.../fleet-integration-probe.log`; тест `.../fleet-integration-probe.test.ts`, SHA256 `fff91fe33a5261cbc9345f3960c89e144c28fc4e5747665e8e3cd2aa5c90f494`. Код теста сохранён вне worktree, source freeze соблюдён.

Coverage analysis здесь семантический, по критическим границам. Численные statement/branch/differential coverage и пороги 80/90% не измерены и не объявлены пройденными. Наивысший незакрытый риск критического cross-system пути — исходный RET-QP-001. Дополнительно не покрыты runtime test capture и disabled lease recovery (теперь есть два воспроизводящих failed probe). Текущие зелёные module tests не заменяют эти сценарии.

Нового полномасштабного CJM, браузерного E2E, Redis runtime startup, живого S3, provider/inbox, нагрузки, production/deploy или независимого полного аудита всей системы не выполнялось. Подтверждения родительского QE не присваиваются этой сессии. Начать repair/новый snapshot и закрыть условия может только координатор с originating reviewers; этот отчёт не даёт release authorization.
