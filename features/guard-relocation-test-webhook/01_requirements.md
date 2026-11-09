# Требования к guard TEST callback

Статус: конкретный scoped план, код не написан. Родитель поручил подготовить требования/план и реальные pre-code gates; implementation в этом задании запрещён. Конечный владелец — владелец Clipmkr; реализация requested Sol high, independent code review requested Astra xhigh в новой сессии по docs/model-matrix.md.

## Исходное условие и граница

Origin: `features/relocate-clipmkr-to-workspace-vps`, original `qe-primary-01` (HIGH, structural), отчёт private `config-qe-report.private.md`. Existing billing-handler отвечает200 после unknown_intent DB outcome. Parent ADR-001/TASK-5 требуют503 для позднего source события, отсутствующего вQA. Это исправление принятого требования. Отдельный slug не создаёт новую историю parent: его исходная роль/condition/2 witnessed QE cycles сохраняются; компонентная closure не закрывает migration.

## Functional requirements

- FR-1 MUST: для проверенного payment.succeeded/refund.succeeded без точной локальной пары intent/provider ID отвечать503 ДО любого payment consumer. Два повторных и20 параллельных запроса дают только503; delta payment_event/payment/credit_grant/payment_intent/account balance=0. Null/invalid order и другой/unbound provider ID закрыты.
- FR-2 MUST: штатные raw-body/IP/provider GET/TEST checks предшествуют локальному SELECT; неправильный IP/payload/test mode сохраняет штатный отказ без ledger writes. QA adapter допускается только в exact isolated profile по06. Off/live/production binding →503 до payment consumer, SQL failure →503. Ignored unsupported events сохраняют штатный200/no-write контракт.
- FR-3 MUST: известный локальный intent/payment проходит штатный consumer ровно один раз; повтор/параллельные deliveries не дают второго grant; refund ordering прежний. Отзыв checkout exception закрывает создание, но не callback drain при сохранённом TEST provider. Событие до штатного setIntentProviderPayment получает503, после привязки повтор проходит.
- FR-4 MUST: canonical `/api/webhooks/yookassa`, billing-handler/deps/runtime/provider/DB consumers и плановые финансовые writers не изменяются. Существующий route guard допускает только два точных webhook paths, checkout paths и3plan writers. Новый QA route — тонкий wiring, не копия provider logic.
- FR-5 MUST: реализованы meaningful RED/GREEN real-DB tests, independent review, code/spec anti-drift и4-file source manifest. Нет изменения parentnorms/history, Caddy/Compose/runtime/DNS/merchant/source/legacy/c и production финансовых строк. Исходный qe-primary-01 закрывается только в parent исходным reviewer на новой разрешённой ревизии.

## Reuse и lessons

Pinned Node22 dz recall выполнен,5 hits; прочитаны. Применяемые3: unknown provenance нельзя объявлять конфликтом двух известных owners (teach:2d00a4e3e9909522); не признавать synthetic provider/local tests реальным payment recovery (teach:40d3c6c824589acc); после неопределённого checkout результата нельзя создавать новый intent/key (teach:89ea17b2ebf27600). Advisory context, не отдельное разрешение. Полный private log: guard-planning/recall.actual.private.log.

## Acceptance boundary

Тесты на fake-YooKassa HTTP fixture используют настоящий адаптер и PostgreSQL. Они не доказывают real provider retry, merchant UI, полный UI payment E2E или cutover. Нужны4 code targets: новая factory/route/test и существующий route guard. Нет новых env, dependency/package, schema или worker. При росте scope пересчитать tier.

## OpenSpec ledger

Точный delta: `openspec/changes/guard-relocation-test-webhook/specs/qa-payment-callback/spec.md`. SHA-256 delta `479c4e6ad8abcb16cf05019cb44fdfcfa22c0cf5f8aa05f78719e71fff3adba5`; все4 ledger hashes в `requirements-revision.json`; feature-adr06 остаётся execution authority. OpenSpec apply не обход pre-code gates.
