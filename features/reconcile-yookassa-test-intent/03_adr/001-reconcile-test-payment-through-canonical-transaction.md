# ADR-001: Сверять TEST-намерения через канонические транзакции

## Status

**proposed, R3**. Автор gpt-6-astra. QCSD R2 дал 13 структурных условий; исправления R3
ожидают originating reviewers, без авторского closure. До реализации решение обратимо.
Пересмотр: scope шире трёх cases, невозможно доказать drained окно, новый writer/schema,
необходимость менять frozen web, daemon/multi-shop/live money или новая политика прав.

## Context

Три TEST intent текущей БД остались created (один provider succeeded, два canceled).
Legacy receiver другой DB ACKed succeeded как unknown_intent; это наблюдение расследования,
не promise retry/не текущая проверка. Владелец поручил обработать три intent и продолжить;
root делегировал отдельный M-design. Конкретный CLI не объявляется ранее одобренным.
Current public payments off/provider absent позволяет предложить M ДО S receiver activation,
при свежем доказательстве actual identity и drain всех управляемых writers/ingress.
Native apply уже атомарно начисляет, но operator path требует atomic frozen expectations,
полных refund facts, bounded исполнения и честного audit. Старый markIntentCanceled не
проверяет эти ожидания; claim native происходит до advisory lock и невидим до commit.

## Decision Drivers

1. Единственный financial writer и отсутствие двойного/чужого начисления (FR-2..5).
2. Exact target и доказанное закрытое writer/refund окно (FR-1/3/7).
3. Честная provenance, сохранённый native event hash и раздельный native gate (FR-6/8).
4. Минимум поставки без смены deployed images/schema/правил исторических прав (FR-7/9).

## Considered Options

| Вариант | Сильная сторона | Ограничение / решение |
|---|---|---|
| Ждать native retry | Штатный ingress | После HTTP 200 не обещан, существующий случай не решает |
| Одноразовый GET + существующий apply без guards | Мало кода | Неполные refund/expected checks; отклонён |
| Controller CLI + existing writers + private proof/admission | Канон, прежний event key, без schema/image change | Выбран; требует доказуемого drain ДО S и durable proof |
| Старый markIntentCanceled без guards | Existing writer | Недостаточно binding/no-financial checks; optional typed guard в той же функции |
| Изменить native web для полной сериализации cancel/callback | Единая новая write policy | Меняет frozen source и S coupling; вне M. Если drain недоказуем — stop/re-route |
| Добавить reconciliation/provenance table | SQL-поиск | Не нужно трём cases; external proof + existing event hash достаточно при retention |
| Новый порядок expired/late entitlements | Мог бы продлить права | Новая бизнес-политика не обоснована; отказ/эскалация, canonical captured_at сохранён |

Прямые SQL grants, legacy transfer, spoof source IP и synthetic notification недопустимы.

## Decision

Controller Node 22.23.4 через штатный закрытый SSH DB tunnel; один selected case/run из
immutable private manifest. Default dry-run/ранний refusal выполняет только GET/SELECT и
диагностику: без DB/provider/proof/outcome mutations, без writable audit permissions.
Explicit apply после preflight сохраняет durable API-proof, затем вызывает existing writer.

Succeeded: existing YooKassa transport/normalizer + полный bounded refunds snapshot; expected
binding/active/created/SKU/price/offer/grant/fulfilled проверяются внутри applyVerifiedPayment
под existing locks. Typed exception откатывает claim/payment/grant. Existing fulfillment
получает captured_at; возвращённый period проверяется до COMMIT. Expired addon/неожиданный
base schedule/overlap или drift → rights_review_required/rollback и отдельный разбор root,
без изменения captured_at/компенсации/нового writer. Normal result проверяется readback и
отдельной приёмкой прав; наличие grant не доказывает paid usage.

Canonical key `payment_succeeded:<paymentId>` совпадает с native. При нашем claim exact hash
исходного API-proof записывается existing payload_sha256. При native-first/другом existing
claim исходный hash НЕ перезаписывается; API-proof внешний, outcome различает источник
проверки и источник применения. Native source требует связанную native evidence; unknown
existing hash/source не считается resolved reconciliation. Crash-replay использует исходный
proof/связанные rows; proof без commit не доказывает действие. Legacy DB ничего не переносит.

Canceled: официальный exact payment/shop/test/RUB/order/price GET подтверждает terminal
canceled/paid=false; existing markIntentCanceled получает optional typed expected guard.
Payment → account → intent locks, binding/active/created и no payment/grant/success event;
already_canceled только полная проверка/no-op. Нет financial event/claim/grant, audit внешний.
**Одного lock недостаточно против frozen native.** Live apply требует измеримый off/drained
admission из 05 до S receiver activation, иначе запрещён. Официальный lifecycle делает
terminal canceled/succeeded неизменяемыми для того же payment ID; конфликтующие snapshots
отклоняются без утверждения реального provider incident. Другой payment ID/поздний факт
остаётся штатным needs_review без grant при несовпадении binding; не скрывать journal.
No-financial guarantee относится к locked transition/terminal readback в удерживаемом окне,
не ко всем будущим callbacks. Обнаруженный late conflict → indeterminate handoff/разбор.

Admission перечисляет actual targets/shop/writers/authority, freeze/drain evidence, срок и
revocation generation; не self-declared boolean. Ответственный удерживает freeze до resolved
commit/readback. Checks после locks и pre-COMMIT, отзыв сначала запрещает apply, затем ждёт
resolved run прежде release writers. Невидимые/in-flight/неуправляемые writers запрещают apply.
SQL не блокирует внешний refund; after-commit внешний конфликт — остаточное ограничение.

Общий monotonic budget 60s: ≤40 preflight/GET/proof, ≤10 transaction, ≤10 readback; каждый GET
≤5s/remaining, pages≤10. Existing transaction helper получает optional bounded options,
same-client PG statement/lock timeouts, абсолютный transaction watchdog, pre-COMMIT admission
check и typed indeterminate для неизвестного COMMIT. Прежние callers без options неизменны;
второго transaction wrapper нет. Уничтожение connection после неизвестного COMMIT не доказывает
rollback; readback bounded, blind retry запрещён. Подробные временные границы и тесты — 05/06.

## Rationale и Consequences

Canonical writer, source_key/UNIQUE и helpers переиспользуются; никакого нового OSS/table/
daemon. Controller поставляется отдельно, old native совместим по event key. Цена — private
audit retention/backup, доказуемое операционное управление и явные отказ/indeterminate.
Hash без proof не раскрывает источник; потеря файла не разрешает выдумать provenance.
Frozen web не исправляется: при недоказанном drain live cancellation остаётся BLOCKED.
Невозможной распределённой транзакции PG/provider и вечного no-financial promise нет.
Три terminal case дают только M handoff. Новая native TEST-оплата требует принятой S canary
поправки, exact dependency hashes/review и отдельного admission; M её не реализует.
После closed QCSD root вправе принять требования/план/docs commit в делегированной границе;
реализация и live по-прежнему требуют собственных гейтов. Владелец пересмотра — root.

## Confirmation

- Method: реальные PG integration/barrier tests, negative API contracts, fault injection; live TEST отдельно после admission.
- Monitoring: structured reason/readback, event/proof hash и фактический source, period/counts; private retention, без нового сервиса.
- Success metric: один правильный payment/grant в succeeded, canceled только correct terminal/no-financial на определённой точке; mismatch/drift/refund/rights/admission failure не оставляет финансового commit.
- Owner implementation: gpt-6.1-sol high; независимый QE gpt-6-astra xhigh в чистой сессии, по docs/review-policy.md.
- Load-bearing checks: typed guard rollback; native/operator обе очередности и source; uncommitted claim admission refusal/late review preservation; deadline и unknown COMMIT без второго grant.
- Required tests: `tests/payment-reconciliation.integration.test.ts` — barriers для drift/claim/native двух порядков/другого payment ID/erasure/refund, bounded lock/COMMIT fault, canceled replay, expired-addon/later-base rollback; `tests/payment-reconciliation.unit.test.ts` — dry-run no effects/no audit permissions, API mismatches/refunds/cursors, admission missing/stale/revoked, durable proof/crash/provenance. `tests/billing.integration.test.ts` — старые callers с прежним контрактом.
- Discrimination: снятие deadline/guard/refund/admission refusal или изменение canonical event key обязано ломать соответствующий тест. Tests NOT RUN; baseline tests root не доказывают новый код.

Все Q1–4/RISK-01–04/T1–5 перенесены буквально в author-handoff-conditions.json. Авторская
карта изменений не reviewer verification; подтверждение R3 принадлежит originating ролям.
