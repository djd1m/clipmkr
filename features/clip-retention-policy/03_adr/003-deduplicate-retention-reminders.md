# ADR-003: Дедуплицировать напоминания в PostgreSQL и существующем mail transport

## Status
Подготовлено к независимому checkpoint; контракт Resend проверен по официальному источнику в 02_research.md, ни одной отправки не выполнено.

## Context
FR-4 требует письма за 3/1 сутки без логических дублей, корректные unknown и изменение срока. `SupportMailer` уже поддерживает Resend/SMTP/test/disabled и bounded timeout, но предназначен для verify/reset и не имеет provider key. `SupportEmailStore` — журнал токенов, не очередь retention. Локальный донор N1 `01-testimonials-senja/apps/web/src/lib/email.ts` содержит idempotency-key.

## Decision Drivers
- Durable dedupe между репликами/перезапусками — high.
- Unknown не считать delivered — high.
- Переиспользовать watchdog/transport без новой платформы — medium.

## Considered Options
| Вариант | Достоинство | Недостаток |
|---|---|---|
| In-memory отправка из watchdog | Минимум схемы | Дубли/пропуски после restart, нет истории unknown |
| PostgreSQL journal + существующий transport | Атомарный unique key, контроль retries, текущий стек | Маленькая новая таблица и lifecycle; provider не гарантирует inbox delivery |
| Новая отдельная очередь и SDK | Готовые механизмы lease/retries | Новая инфраструктура всё равно не решает exactly-once внешней почты |

## Decision
Выбран PostgreSQL `retention_notice` в добавляющей миграции и модуль `apps/web/src/server/retention-notices.ts`, вызываемый из существующего watchdog с независимой обработкой ошибок. Логическая уникальность: video_id + expiry_day_msk + offset_days (1/3); это группа клипов записи с одним календарным днём МСК. Письмо содержит минимальный точный deadline и число клипов. Сдвиг секунд внутри дня не создаёт новый logical key. Pending snapshot обновляется только до первой попытки, затем immutable; stale после попытки → superseded без новой отправки по тому же key. Дата, account, state, due_at, immutable payload snapshot/hash, stable provider key, lease/attempt timestamps и provider receipt сохраняются. Не хранить подписанные S3 URL. Новое право supersede pending по старой дате; после принятой отправки старое письмо остаётся историческим фактом.

Перед каждой отправкой повторно проверить связь notice→video→текущий active owner, наличие будущего конечного deadline и актуальность группы. Immutable to обязан точно совпасть с текущим подтверждённым email; смена/отзыв адреса → superseded/recipient_changed без новой отправки, изменения bytes/key или нового key. До первой попытки snapshot можно обновить. Уже accepted письмо не отзывается. Короткая SQL claim/lease, затем сеть вне transaction. Принимать результат как accepted, failed либо unknown, не delivered. Дополнить существующий transport bounded generic content/key, оставив verify/reset поведения. Для Resend переносится узкий idempotency-key контракт N1; его актуальная гарантия — 24 часа с тем же immutable payload (02_research.md). Retry использует тот же неизменный payload/key только в подтверждённом provider окне; после него unknown требует разбирательства. `first_attempt_at` атомарно устанавливается с первой sending lease ДО внешнего вызова и больше не меняется: due_at определяет eligibility, не возраст retries; первая catch-up попытка при remaining=2суток разрешена. SMTP не получает фиктивную идемпотентность; до отдельного решения reminder работает только в Resend/test, остальные режимы наблюдаемо unavailable.

Catch-up: offset3 при 1<remaining<=3 суток; offset1 при 0<remaining<=1; остальные интервалы не отправляют. Получатель только active owner с email_verified_at. Immutable payload содержит from/to/subject/text/html, stable key не меняется при retry. Lease 2 минуты; потерянный sending lease → unknown. Максимум3 попытки с интервалом>=1час, только в текущем offset и при возрасте<23часов от durable `first_attempt_at`. После окна unknown остаётся оператору, новый key запрещён. SMTP/disabled наблюдаемо unavailable; test только synthetic адреса.

## Rationale
Unique row исключает повторное логическое событие, provider key ограничивает физические дубли после timeout; это разные гарантии. Новая очередь не устраняет crash между внешней отправкой и записью receipt. Auth token таблица смешала бы разные жизненные циклы.

## Consequences
Плюс: нет нового сервиса/SDK, повторения и переносы даты видны. Минус: exactly-once inbox недостижим из текущих данных; unknown нельзя маскировать accepted. Возможен stale текст при продлении уже после сетевого отправления; дата в кабинете авторитетна. Follow-up ADR при требовании SMTP либо гарантии доставки. After-action review: разработчик/владелец через месяц после принятия по notice accepted/unknown/backlog.

## Confirmation
- Method: fake provider, controlled lease race, timeout-after-accept, PostgreSQL unique test.
- Monitoring: pending oldest age, accepted/failed/unknown/superseded counts, transport unavailable.
- Success metric: один logical key при параллельных ticks; unknown не accepted; продление убирает старые pending; повтор внутри provider окна использует идентичный key/payload.
- Owner: разработчик и независимый QE.
- Load-bearing property: durable dedupe и честные результаты отправки.
- Required automated check: `tests/retention-notices.integration.test.ts`, `tests/support-mail-resend.test.ts` (предложены).

## Shift-left
Высокий риск — unknown после принятия: не делать новый ключ и не ретраить за пределами подтверждённого окна. Почта down не блокирует очистку/erasure и не объявляется успехом. Нагрузка ограничена batch и текущим mail budget. Given две реплики, When выбирают один offset, Then один logical notice. Given accepted provider с потерянным ответом, When повтор, Then тот же ключ/payload, состояние unknown до подтверждения. Протокол проверяется fake clock/adapter; внешние письма не нужны.

## Уточнения QCSD: временной якорь и получатель
CRT-TST-001: первая eligibility/catch-up не ограничивается возрастом due_at. В одной SQL операции до первого network выставляются first_attempt_at (COALESCE, immutable), attempts и sending lease; crash после этого консервативно считается возможной отправкой. Повторы используют только тот же first_attempt_at, payload/key, текущий offset, >=1ч, <23ч и максимум3попытки. SEC-01: текущий verified email должен совпасть с immutable to перед каждой попыткой.
Confirmation: `catchup_first_attempt_after_due_day_is_allowed`, `notice_retry_window_uses_persisted_first_attempt`, `retention_notice_retry_rejects_stale_recipient` in `tests/retention-notices.integration.test.ts`. Соответственно различают first tick−2d, restart без сброса якоря и A→B/отзыв подтверждения без следующего transport call. Тесты предложены, не выполнены.
