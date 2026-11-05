# Предварительная архитектура TEST reconciliation

Статус: **R3 proposed**, исправления после QCSD R2, **Step 5 не завершён**. ADR-001 proposed.
Независимая перепроверка 13 исходных условий ожидается; автор не объявляет их закрытыми.
Финансовый канон — база c35b868, controller Node 22.23.4; web/worker source 8859 сохраняется.

## Компоненты и границы эффектов

[components.mermaid](diagrams/components.mermaid): CLI — composition root, DB не импортирует
web/provider. Existing YooKassa adapter/normalizer и canonical DB writers переиспользуются.
Новых endpoints, сервисов, auth, tables/migrations/OSS/daemon нет. `--by` — attribution,
не аутентификация; authority даёт существующий OS/SSH доступ. Secrets — закрытый профиль/env/FD.

1. Проверить режим (default dry-run), digest closed manifest трёх cases, ровно одну selected
   цель, code/nonce/deadline/operator/reason. Wildcard/batch запрещён. Branch фиксирует case.
2. Read-only проверить actual PG identity/server/database/schema/user, target owner/intent,
   price/SKU/offer/grant/provider binding и аномалии. URL/localhost не доказывают actual DB.
3. Официальный GET payment через существующий adapter: exact ID/order/shop/test/RUB/full price;
   succeeded paid/captured_at либо terminal canceled/paid=false. Succeeded проверяет все
   refund pages (любой refund запрещает apply) и снова GET payment. Отсутствие refunded_amount
   не заменяет list, refundable не доказательство; unsafe integer/unknown cursor/status — отказ.
4. Для apply проверить операционное окно ниже, expected entitlement period и оставшийся бюджет.
   **Dry-run и ранний refusal завершаются здесь:** только SELECT/GET/диагностика, никаких DB
   writers, provider POST или persistent proof/outcome; audit directory permissions не нужны.
5. Только explicit apply после всех проверок создаёт immutable private proof с API source,
   exact facts/captured_at, code/manifest/admission/target binding, временем и nonce. Exclusive
   create, restrictive permissions, file+directory fsync, readback hash и retention/backup;
   failure блокирует БД. Не сохранять raw card data. Proof означает attempt, не commit.
6. Existing applyVerifiedPayment или guarded markIntentCanceled выполняет транзакцию ниже.
   Readback/outcome отдельно от proof; после границы apply отказ может оставить attempted
   proof/outcome. Потеря связи не позволяет назвать результат rollback или повторить grant.

## Измеримый live admission ДО S receiver activation

Вход — не просто self-declared boolean. Root/оператор, контролирующий перечисленные writers,
создаёт private record: authority и причина; code/manifest/selected intent/PG/shop bindings;
roster всех checkout/refund/current-DB writers (web, ops, кабинет, shared shop), их владельцы,
способ удержания freeze, refs фактических observations; issuedAt/expiresAt, generation,
revoked flag и ответственный удержания. Missing/unverifiable scope, неизвестный канал,
clock disagreement или отзыв запрещают apply; доступ к кабинету, который никто не может
удержать закрытым, нельзя считать freeze. Новые audit permissions и сервис не вводятся.

Обязательные наблюдения при issuance и перед каждым run: actual public PAYMENTS_MODE=off
и provider absent; loaded target/route и фактическая DB identity; S receiver ещё не activated;
legacy receiver привязан к другой DB; все shared TEST checkouts frozen; полная provider
pagination даёт pending/waiting_for_capture=0; управляемые refund writers остановлены,
все ранее начатые операции завершены. Current-DB writer/ingress drain доказывается совместно
roster+runtime/ingress observations+полной видимостью PG sessions/transactions и отсутствием
операций в полёте. Один SELECT financial rows, pending=0 или пустой pg_stat_activity сам по
себе не достаточен. Невидимые sessions/неучтённый writer/незавершённый native claim — отказ.
Иные writers к account (например erasure) остаются под atomic active/owner guards.

Минимальный механизм удержания — существующая закрытая операторская координация: ответственным
запрещено возобновлять roster writers/activate S до release root после resolved outcome.
Admission validity/revocation хранится в том же private control location с атомарной заменой;
CLI read-only проверяет generation/bytes/expiry при preflight, после DB locks и непосредственно
до COMMIT. Никакого network под SQL lock. При отзыве record сначала инвалидируется, затем
ожидается остановка run/разрешение commit; только потом разрешаются writers. Emergency loss
control отзывает admission и даёт indeterminate при гонке с COMMIT, без обещания rollback.
Expiry не разрешает самостоятельно снять freeze: удержание до resolved outcome обязательно.
Record должен покрывать весь 60s budget; prod admission требует реального подтверждения
всех владельцев, не unit mock. Без доказуемого механизма — только dry-run.

Freeze исключает управляемые внешние refunds в окне GET→resolved commit; PG сам их не
сериализует. Неуправляемый внешний канал или действия после release остаются ограничением:
при обнаружении конфликт сохраняется/разбирается, автоматического clawback нет.

## Canonical transactions, cancellation и точка гарантии

Succeeded сохраняет claim → payment advisory → account → intent → credits locks. На том же
write connection до claim проверяется actual PG binding; после row locks — typed expected
owner/active/created/provider/price/SKU/offer/grant/fulfilled и admission/deadline. Mismatch
бросает exception, откатывающий claim/payment/grant. Existing fulfillment получает настоящий
captured_at. API внутри transaction не вызывается, SQL writer в CLI не появляется.

Canceled использует optional typed guard existing markIntentCanceled: transaction, actual PG
binding, payment advisory → account → authoritative intent locks, полный expected binding и
отсутствие payment по provider ID ИЛИ intent, grants по source_key/payment_ref, success event.
Stored provider_payment_id обязателен non-null/exact; inactive/erasing/missing owner, drift
или financial fact → отказ. Created→canceled выполняет
existing writer; already_canceled — no-op только после того же полного readback. Нет claimEvent,
financial event/payment/grant для отмены. Старый native caller без options сохраняет контракт.

**Это не новая сериализация произвольного native ingress.** Frozen native сначала claim,
потом payment lock; чужой незакоммиченный claim невидим. Поэтому live cancel запрещён без
указанного выше drained/off окна; receiver activation выполняется S лишь после M handoff.
По [официальному lifecycle ЮKassa](https://yookassa.ru/developers/payment-acceptance/getting-started/payment-process)
(проверено 05.11.2026) succeeded и canceled финальны и неизменяемы: настоящий success того же
payment ID после свежего terminal canceled не является допустимым переходом. Противоречивые
API fixtures проверяют отказ при нарушении входного контракта, не доказывают реальный инцидент.

No-financial-facts означает проверенный locked transition и terminal readback внутри
удерживаемого окна. Будущий callback другого payment ID того же intent не удаляется: старый
native path при несовпадении сохранённого binding записывает needs_review без grant; это
проверяется regression. Committed конфликт до cancel → refusal; неизвестный/in-flight writer
до admission → refusal; обнаруженный после commit delayed conflict → indeterminate для
handoff с сохранением настоящих event/review rows. Гарантии вечного отсутствия financial rows
нет. PG tests двумя connections/barriers проверяют оба порядка, uncommitted claim до/после
lock, другой ID, erasure/refund и delayed arrival; нарушение drain не должно давать false PASS.
Контрпример с искусственно конфликтующим same-ID success демонстрирует необходимость refusal
admission, а не обязательство исправить frozen web в M. Если drain недоказуем — live cancel BLOCKED.

## Реальный bounded deadline и неопределённый COMMIT

Один monotonic budget 60s от старта run: preflight/GET/proof до t+40s, write transaction до
min(t+50s, её старт+10s), readback до t+60s. Максимум 10 refund pages, каждый HTTP timeout
min(5000ms, оставшийся preflight budget); exhausted budget/cursor limit → отказ, без retry.
Proof IO, вернувшийся после preflight deadline, не разрешает вход в transaction.

Reuse transaction в packages/db/src/quota.ts: optional bounded execution options только для
M caller, прежние вызовы неизменны. Acquire/connect ≤min(3000ms, remaining); на том же
PoolClient SET LOCAL statement_timeout ≤min(5000ms, remaining transaction budget), lock_timeout
≤min(2000ms, remaining). Перед work и COMMIT проверяются remaining/admission; абсолютный
watchdog ограничивает ВСЮ transaction, не только один SQL. Timeout/abort прерывает ожидание,
соединение уничтожается/не возвращается в pool; поздно полученный client также освобождается
без work. Нельзя ограничиться Promise.race, оставив SQL незаметно работающим. Существующие
pool defaults 3000/5000ms полезны, но сами не ограничивают последовательность запросов.

Если COMMIT не отправлен и rollback подтверждён — refused; если отправка/ответ COMMIT
неопределённы — typed indeterminate, даже если попытка ROLLBACK затем ответила. Bounded fresh
readback на другом проверенном connection использует оставшиеся ≤10s и исходный proof.
Только согласованные rows/provenance уточняют результат; недоступный/неполный readback
оставляет indeterminate, freeze удерживается, автоматического re-apply нет. Новый read-only
recovery run может разрешить неопределённость; смена nonce не даёт права второго grant.
Тесты: slow final refund page, held event/row/advisory lock, pool starvation, disconnect до
и после COMMIT; проверять elapsed bound, final rows и отсутствие оставшегося writer.

## Provenance и поздние права

| Исход succeeded | Event hash и outcome |
|---|---|
| Наш claim и подтверждённый commit | Exact hash исходного durable API-proof; source operator_api_reconciliation |
| Replay того же proof после crash | Тот же event hash + согласованные intent/payment/grant/period; новое начисление запрещено |
| Existing native claim победил | Existing native hash сохраняется; отдельный API-proof проверяет состояние, native source только по связанному native evidence |
| Другой/неизвестный existing hash | Не перезаписывать; unknown_existing/indeterminate и отдельный разбор, не закрытая recovery |

Proof до claim/после rollback не свидетельствует о commit; after-commit-before-outcome
проверяется readback. Native и operator source не смешиваются даже при одинаковом event key.
Canceled crash readback подтверждает состояние, но не приписывает авторство transition
без доказательства; already_canceled/indeterminate, external audit без webhook journal.

Captured_at/период вычисляет existing fulfillCreditIntentTx: addon от captured_at, base через
nextCreditBaseStart с уже существующими концами. Preflight переиспользует readCreditPurchaseWindows
с captured_at и сравнивает с private case; правило периода не дублируется. После fulfillment
возвращённые start/end проверяются existing apply ДО COMMIT под удерживаемыми locks: exact
ожидаемый период/допустимость прав, ещё не expired. Expired addon, неожиданное расписание
base после более позднего base/overlap или drift → typed rights_review_required и полный
rollback claim/payment/grant. Это проверка результата канонической функции, не второй writer
и не новая бизнес-политика исторических продлений. Прежние callers без guard не меняются.
Root получает отдельный разбор; перенос captured_at на now, ручной grant или автоматическая
компенсация запрещены. Existing native-first результат с истёкшими правами сохраняется, но
recovery/CJM PASS не объявляется. Тесты late-addon/later-base и expiry между preflight/commit
доказывают отсутствие commit, точный captured_at и отказ; нормальный readback сверяет period.
Фактические права/relogin/использование проходят отдельную допустимую приёмку.

## S/M contract и измеренные зависимости

M не активирует S receiver/canary и не меняет её файлы. После трёх resolved terminal readback
без unresolved conflicts root передаёт источник/периоды/ограничения. Предложение canary отдельно
принимается S: full baseline → bounded global creation → authoritative freeze/in-flight drain
→ полный diff всех creations → ровно один ожидаемый intent → native callback acceptance.
Лишний/unknown intent, потеря полноты observer или stale dependency запрещают full opening.
QA список не security allowlist. Legacy event другой DB не collision и не объект переноса.

Следующие exact bytes — часть измеряемого 05. S worktree
`/tmp/clipmkr-test-payment-window-20261105`, base HEAD
`ef22214841ecb7ba85480b7589e31da893250fdc`; uncommitted planning bytes измерены отдельно:

| Зависимость | SHA-256 |
|---|---|
| M `features/reconcile-yookassa-test-intent/dependency-contract-proposal.md` | `29e9ef1a3695721dc993c97f95bbd20e0fdb4c48bf5254e43b88dedde9d5c59f` |
| S `features/test-payment-window/01_requirements.md` | `116c8b5d6a0310a697640c77bbc1aa8a9b331eb6ede8e29bf28c2263bf5809e0` |
| S `features/test-payment-window/06_implementation_plan.md` | `4333a47809c5d3a7f312134aa8b8c0529d44f310274fbc486e103fdbe3a99fdf` |
| S `openspec/changes/test-payment-window/proposal.md` | `01410117288ff78e92a5653da52da8783e7ec50fe8f4b93a9bd1f709bd2dfa54` |
| S `openspec/changes/test-payment-window/design.md` | `05733d41f6093a3e37effab5f6f9e829d1bd5977f7fdbe98b5ade7ed79743f51` |
| S `openspec/changes/test-payment-window/tasks.md` | `2eeea111d03e16d40cbe296490ca381a2d2b938c15ae06d3c295d48ffa6d5b4c` |
| S `openspec/changes/test-payment-window/specs/test-payment-window/spec.md` | `607e2255c73234f23c4eea5ee2caef3734a00da47ffb31d261b479fd7cfa70a1` |

Root пересчитывает эти зависимости до host prepare и handoff; mismatch/недоступность даёт
stale_dependency/refusal и требует новых exact hashes в 05, prepare и originating review
затронутых условий. Проверка изменения одного байта обязательна до live handoff. Эти S bytes
фиксируют текущий native-only gate, НЕ его изменение/approval: принятая canary-поправка S
потребует новой привязки и проверки, прежний snapshot её не разрешает.

## Наблюдаемость и остаточные риски

Structured stdout: run ref/режим/outcome/reason/counts/entitlement state без secrets/raw body;
детальные IDs/proofs только private. Refusal/indeterminate/rights_review_required — ненулевой
exit. Success readback проверяет связанный event/payment/intent/grant/period/provenance;
canceled — binding/status/no financial facts в указанном окне. Нет новых метрик/сборщика.
Остаточные риски: неполное внешнее управление, потеря audit, неизвестный commit, late review,
истёкшие/отложенные права. Их нельзя выдать за native/CJM PASS. Fake HTTP допустим для
negative contracts, не настоящего TEST integration. Final QE, operational admission и
canary checks NOT RUN; R3 требует независимого originating review.
