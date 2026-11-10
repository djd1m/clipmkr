# ADR-003: Дедуплицировать напоминания в PostgreSQL и существующем mail transport

## Status
proposed; обратимо до первой отправки. Пересмотр после проверки официального срока/гарантий idempotency Resend и решения catch-up; ни одной отправки не выполнено.

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
Предлагается PostgreSQL `retention_notice` в добавляющей миграции и модуль `apps/web/src/server/retention-notices.ts`, вызываемый из существующего watchdog с независимой обработкой ошибок. Логическая уникальность: video_id + deadline + offset_days (1/3); это группа клипов с одинаковой датой. Дата, account, state, due_at, immutable payload snapshot/hash, stable provider key, lease/attempt timestamps и provider receipt сохраняются. Не хранить подписанные S3 URL. Новое право supersede pending по старой дате; после принятой отправки старое письмо остаётся историческим фактом.

Перед отправкой повторно проверить account active, наличие будущего конечного deadline и актуальность группы. Короткая SQL claim/lease, затем сеть вне transaction. Принимать результат как accepted, failed либо unknown, не delivered. Дополнить существующий transport bounded generic content/key, оставив verify/reset поведения. Для Resend переносится узкий idempotency-key контракт N1; его актуальная гарантия ещё проверяется. Retry использует тот же неизменный payload/key только в подтверждённом provider окне; после него unknown требует разбирательства. SMTP не получает фиктивную идемпотентность; до отдельного решения reminder работает только в Resend/test, остальные режимы наблюдаемо unavailable.

Catch-up предлагается без шквала просроченных писем: не отправлять истёкшим; при пропущенных offsets отправить только ближайшее ещё полезное предупреждение. Точные интервалы, правила группировки и email eligibility (включая неподтверждённый адрес) остаются в technical-clarifications до согласования.

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
