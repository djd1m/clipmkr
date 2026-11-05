# Сверка существующих TEST-платежей: требования

Статус: **R3 proposed** после замечаний QCSD R2. Все 13 условий сохранены в
`author-handoff-conditions.json`; автор предлагает исправления, originating reviewers
ещё не проверили R3. Реализация и live apply этим документом не разрешены.

## Заинтересованные стороны

Пользователь ожидает оплаченные права; оператор отвечает за проверку конкретного
намерения; root принимает решения в делегированной владельцем границе трёх intent.

## Функциональные требования

Все требования MUST. OpenSpec — ledger пользовательской дельты; выполнение, решения и QE — здесь.
Ревизия OpenSpec `R3`, дата 05.11.2026, база `c35b8686bf258c79b9de30e5cddbba2d78838b8d`:

| Артефакт | SHA-256 точных байтов |
|---|---|
| `openspec/changes/reconcile-yookassa-test-intent/proposal.md` | `09e500c54687d7a9267f055cfde2003adef28068488d1913336a9dbed9416d09` |
| `openspec/changes/reconcile-yookassa-test-intent/specs/payment-reconciliation/spec.md` | `855f8294dc820c7952fb4ffb62e139c8d829cbe3008248d4061532e18029c014` |

FR-1. Закрытая адресная сверка: default dry-run, immutable private manifest трёх known
cases (один succeeded, два canceled), один selected target за run, TEST-only. Explicit
apply допускается после M-гейтов и отдельного live admission. AC: dry-run и ранний отказ
до границы apply не вызывают DB writers/provider mutations и не создают/изменяют
persistent proof/outcome или другие файлы. Разрешены read-only GET/SELECT и диагностика
stdout/stderr; внешний инфраструктурный access log не является артефактом CLI. Dry-run
не требует writable audit directory. Проверяются снимки БД/аудита и вызовы writers.

FR-2. API — источник финансового факта: официальный authenticated GET, точные payment/order
ID, recipient/shop, test=true, RUB/полная цена; succeeded требует paid=true/captured_at,
canceled — terminal canceled/paid=false. AC: mismatch, неполнота, timeout/429/5xx — typed
refusal без финансовых mutations; provider POST запрещён. Оба terminal статуса неизменяемы
по официальному контракту ЮKassa. Противоречивые snapshots — отказ/разбор, не доказанный
инцидент или предполагаемый нормальный переход canceled→succeeded.

FR-3. Возвраты succeeded: все страницы GET refunds данного payment, проверенные связи,
статусы и суммы, сверка refunded_amount и local refunded/review. AC: любой найденный refund
(даже canceled), incomplete pagination, unknown status или противоречие блокируют recovery.
Отсутствие refunded_amount и refundable не доказывают отсутствие refund.

FR-4. Atomic expected guards: owner/account status, intent created перед новым переходом,
price/provider ID/SKU/offer/grant/fulfilled marker повторно проверяются под каноническими
locks. Drift после preflight вызывает typed exception и rollback, включая succeeded claim.
Единственный путь начисления — applyVerifiedPayment → fulfillCreditIntentTx. Canceled —
existing markIntentCanceled с optional typed guard и authoritative row lock, без SQL writer
в CLI; payment/grant/success event по payment ИЛИ intent исключают переход. Stored provider ID
для cancellation обязателен, non-null и точно равен selected payment. Already canceled
допустим лишь как проверенный no-op с тем же binding. Live cancellation разрешена только
в измеримом writer/ingress drain окне FR-7 ДО S receiver activation; один row lock не
сериализует frozen native path, который делает claim раньше lock. AC: unknown/in-flight
writer запрещает admission; отсутствие финансовых фактов подтверждается при locked
переходе и terminal readback в удерживаемом окне, без обещания вечного отсутствия строк.
Поздний факт другого payment ID сохраняется штатным review и блокирует handoff при обнаружении.

FR-5. Повторность succeeded: canonical key `payment_succeeded:<paymentId>` в текущей БД.
AC: обе очередности CLI/native дают не больше одного правильного payment/grant. Duplicate
принимается только по связанному readback intent/payment/grant/event и отсутствию review.
Аномалия не ремонтируется удалением claim/новым key. Legacy event другой БД не переносится.
Повтор canceled проверяет bindings/terminal/no financial facts; payment_event не создаётся.

FR-6. Аудит: после всех preflight checks и explicit apply, ДО DB writer, сохраняется durable
immutable API-proof `source=operator_api_reconciliation`; после commit — отдельный outcome.
При собственном succeeded claim existing payload_sha256 равен exact hash исходного proof.
При native-first/ином existing claim hash НЕ меняется: outcome хранит existing event hash,
отдельный API-proof и подтверждённый источник исходного применения либо `unknown_existing`.
Последний не принимается как закрытая reconciliation. Native source требует собственного
native evidence; одно несовпадение hash его не доказывает. Canceled — только external
proof/outcome. AC: failure durable write запрещает DB apply; crash-replay использует исходный
proof и readback без второго начисления. Proof до apply не доказывает commit/авторство;
неопределённый COMMIT или неполный readback даёт indeterminate, не fake rollback/success.
Нельзя конструировать notification/source IP. После начала apply отказ может оставить
честный attempted proof/outcome; это явно отличается от dry-run и раннего refusal FR-1.

FR-7. Target/admission: controller Node 22, закрытый SSH tunnel, actual PG identity/database/
schema/user на том же write connection. M выполняется ДО S receiver activation: actual
public payments off/provider absent сохраняются; shared TEST checkout/refund writers
закрыты, provider pending/waiting_for_capture=0, current-DB ingress и уже начатые writers
drained. Legacy receiver — другая проверенная DB. Private admission содержит authority,
target/shop/code/manifest binding, полный writer roster и способ freeze/drain, issuedAt,
expiresAt, generation/revocation, наблюдения и ответственного удержания. AC: missing,
stale, wrong scope, unknown writer/отзыв/истечение запрещают apply; проверка повторяется
после locks и непосредственно перед COMMIT без network под lock. Окно удерживается до
подтверждённого outcome или разрешения indeterminate. После commit не обещается защита от
будущего внешнего refund. Web/worker images, source 8859, compose, Resend и schema прежние;
credentials/DB URL только закрытый профиль/env/FD, не argv/Git.

FR-8. API reconciliation не закрывает native webhook first acceptance. M передаёт три
private terminal readback с точным source/ограничениями. User-auth canceled не установлен:
используется отдельный OS/SSH operator authority, без fake session/password reset. Новая
TEST-оплата принадлежит отдельной S-поправке, принятой до canary: loaded route/origin/timer,
полный baseline, одна UI creation, подтверждённый checkout freeze и drain in-flight
creation, полный diff всех новых intent до этой границы; затем native callback. AC: любое
лишнее/неизвестное создание или потеря полноты observation → abort/freeze/drain всех,
без full-window admission. QA список не allowlist. Exact dependency hashes закреплены в 05;
stale dependency запрещает handoff до нового prepare/review. M не реализует canary.

FR-9. Поздние права сохраняют канон: captured_at не меняется, addon начинается в captured_at,
base — по существующему nextCreditBaseStart. Preflight переиспользует readCreditPurchaseWindows
с captured_at, private case фиксирует ожидаемые SKU/период. AC: expired addon, неожиданное
расписание/overlap base или истечение до commit дают typed rights_review_required без
финансового commit. Возвращённый fulfillCreditIntentTx период проверяется под существующими
locks ДО COMMIT; mismatch/expiry exception откатывает claim/payment/grant целиком. Нового
scheduling writer/автоматического переноса на now/компенсации нет; root получает отдельный
разбор. Existing native-first expired result сохраняется как факт, но не выдаётся за успешное
восстановление текущих прав. Readback проверяет точные period_start/end, а права/relogin/
использование — отдельная допустимая приёмка; один grant сам по себе не CJM PASS.

## Нефункциональные требования

NFR-1. Суммы — safe integer minor units, без float rounding; zero refund parser не расширяет
positive payment parser. Shop/test не зависит от UI.
NFR-2. Provider API вне SQL transaction; existing lock order/UNIQUE/rollback сохраняются.
Для canceled отдельный already_canceled readback, не обход created precondition.
NFR-3. Один monotonic deadline 60 секунд: preflight/provider/proof ≤40, transaction ≤следующих
10, последние 10 — bounded readback. Каждый GET ≤min(5 секунд, оставшийся preflight budget),
максимум 10 refund pages, без retry/silent truncation. Pool acquire/connect, DB statements,
lock wait и COMMIT ограничиваются на том же write connection (05). При неопределённом
COMMIT — indeterminate; истечение readback budget не даёт права повторять grant.
NFR-4. Proof/outcome — существующий закрытый OS audit с retention/backup; нет новой auth
службы, таблицы/миграции/daemon/OSS. PII, keys и actual финансовые ID только приватно.
NFR-5. Node/TypeScript/PostgreSQL; typed boundaries/errors; canonical reuse без god-files.
Existing transaction helper получает только optional bounded options для этого caller,
прежние native callers сохраняют поведение; совместимость проверяется regression.

## Полномочия, зависимости и остающиеся гейты

Основание — поручение владельца обработать три intent и продолжить; root разрешил M-design.
Это не утверждение approval конкретного будущего CLI. После закрытого QCSD root может
принять требования/план и docs commits в делегированной границе. До code: Step 5/6, K1/K2;
до live: независимый QE и отдельный actual admission. Canary/full window принимаются в S.
Политики: AGENTS.md, docs/acceptance/core-cjm.md, docs/review-policy.md, docs/model-matrix.md.
Public launch/main/Cloud/DNS/real money вне scope. Нет прямых grants/legacy transfer/spoofing.
QCSD R2 выполнен: quality/risk conditional, testability no-go. Recheck R3/closure, Step 5/6,
K1/K2, код, тесты и live admission ещё не выполнены. Preliminary 05 не означает Step 5 PASS.
