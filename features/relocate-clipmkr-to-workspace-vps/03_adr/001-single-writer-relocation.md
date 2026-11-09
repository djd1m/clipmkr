# ADR-001: перенести экземпляр с единственным писателем

## Status
proposed, 09.11.2026. Обратимо до первой записи на новой цели; после неё возврат требует актуального состояния по ADR-003. Это проект решения, не пройденный gate и не разрешение DNS.

## Context
Перенос 194.85.249.105 → 77.83.87.178 сохраняет основной clipmkr.ru и Libredesk. Отдельный legacy n5.clipmkr.ru архивируется и остаётся на source; его сервис и DNS этим переносом не меняются. Локальная n5 также сохраняется. Основной TEST webhook фактически идёт в основной web через rewrite; предположение о его привязке к legacy опровергнуто read-only routing inventory. Фоновые watchdog/retention пишут даже без посетителей.

## Decision Drivers
1. FR-1, FR-3, FR-7: сохранность подтверждённой истории и отсутствие повторных списаний — high.
2. FR-5: отдельная команда владельца на DNS/cutover — high.
3. Минимум новых компонентов и короткое измеренное окно — medium.

## Considered Options
| Вариант | Плюсы | Минусы |
|---|---|---|
| A. Тот же immutable релиз, fence/drain, полный финальный срез, один writer | Сохраняет идентичность и штатную идемпотентность; простой возврат до записей | Окно недоступности записи; нужен полный inventory |
| B. Две writable копии во время DNS propagation | Пользователи сразу получают ответ от обоих адресов | Конфликт финансов, очередей и сессий; штатного merge нет |
| C. Репликация PostgreSQL/Redis с автоматическим failover | Потенциально меньше окно и RPO | Новый эксплуатационный контур и отдельное доказательство корректности; не минимальный перенос |

## Decision
Выбрать A. До отдельного cutover разрешена подготовка target и QA; импортированные production/helpdesk приложения не стартуют. После разрешения: закрыть новые записи edge, завершить активные jobs и HTTP completion, остановить workers/web и helpdesk consumers, проверить отсутствие оставшихся писателей, снять согласованный PG/Redis/uploads срез и восстановить его на цели. Production S3 bucket/prefix и session secret сохраняются. Production приложение и schema не обновляются вместе с переносом. Единственное QA-only исключение — отдельный guard web image по ADR-002; его нельзя выдавать за новый production релиз.

В каждый момент для каждого перенесённого набора данных действует ровно один комплект writers. После запуска target старый edge передаёт весь трафик этого экземпляра, включая основной и TEST webhook, на target без fallback. Legacy сохраняет собственные БД/Redis и маршруты на source. Поддержка переносится полностью: PG, Redis, uploads, конфигурация, staff/inbox/identity, mail delivery state.

Поздние webhook во время финального fence получают 503, никогда фиктивный 200. Перед cutover требуется реальная проверка повторной доставки TEST-магазином после 503 и чтение статуса всех незавершённых provider IDs; автоматический retry не предполагается без доказательства. После запуска target оба исходных callback пути идут только в target; успешные повторы применяются штатным idempotent handler. Несходящийся provider/DB статус блокирует завершение; финансовые строки вручную не исправлять, события не выдумывать. До разрешения это только план проверки.

## Rationale
A сохраняет существующие инварианты без нового replication/failover кода. B нарушает FR-3 даже при низком трафике. C полезен для полноценного DR, но не требуется для безопасной подготовки и не заявляется выполненным.

## Consequences
Положительные: неизменные ID, ссылки и финансовые записи; старый сервер остаётся relay/rollback площадкой.
Недостатки: окно измеряется репетицией; незавершённые multipart и delayed jobs нельзя потерять ради «нулевой очереди». Неуспешный drain блокирует cutover, не независимую подготовку.
Follow-up ADRs: ADR-002 — изоляция QA; ADR-003 — возврат и off-host backup.
After-action Review: оператор вместе с владельцем после наблюдения и перед выключением старого VPS.

## Confirmation
- Method: контроль фактических writers/соединений, согласованного среза и маршрутов на обоих IP; команды TEST-GATE-3/5/6 в плане.
- Required automated check: `tests/queue-redis.integration.test.ts`, `tests/queue-probe.integration.test.ts`, `tests/test-webhook-route.test.ts`, `tests/payments-guards.test.ts` и отдельная реальная проверка provider retry. Эти файлы не доказывают runtime cutover сами по себе.
- Load-bearing property: ни один старый writer не принимает запись после включения нового; повтор webhook даёт ровно одно начисление.
- Success metric: 0 старых active writers; идентичные manifest/hash всех таблиц frozen snapshot; 0 новых grants от duplicate TEST callback; оба ingress ведут к одному target.
- Monitoring: сравнение target/access/worker/provider журналов без публикации секретов. Owner: оператор, независимый QE проверяет доказательства. Все будущие проверки NOT RUN.

## Уточнение по QCSD, 09.11.2026 — qrisk-03, qtest-06
До временного merchant callback QA окна только read-only инвентаризацией идентифицировать по shop ID все source creators, включая main/legacy/admin integrations; текущие checkout false не заменяют доказанный запрет creation на всё окно. Legacy n5.clipmkr.ru, c.clipmkr.ru и любые source сервисы вне явно разрешённых targets остаются без изменений: для них не выполнять запись, create probe, изменение checkout/config/route или остановку. Их общий shop и уже закрытое создание TEST intents не считаются установленными без фактов. Отдельное разрешение merchant callback не расширяет эту границу. Для разрешённых targets последующее конкретное owner решение и пересмотренный runbook должны перечислить временные create-checkout fences и проверки отказа нового intent/неизменности counts; сейчас они не исполняются. Если полный fence всех creators на всё окно нельзя доказать без изменения сервиса вне этой границы, callback не переключать, TEST E2E = NOT RUN; независимую подготовку QA продолжать. Требуемое изменение такого сервиса предъявляется владельцу отдельно, с точным target, действием и восстановлением; лишь отдельное явное решение и обновлённый план могут его разрешить. Source webhook остаётся работоспособным на этапе drain.

Сохранить private provider/source/QA manifest всех незавершённых и недавно завершённых payment IDs, intent IDs, статусов/сумм/grant counts. Получить provider GET, дождаться или явно урегулировать pending и проверить отсутствие недоставленных source событий. Если нельзя установить полный shop scope, исчерпание pending/retry или fencing всех creators, callback не менять. Во время QA разрешён ровно один owner TEST creator; source создание остаётся закрытым. При позднем source событии, пришедшем в QA, не отвечать ложным200 и не создавать отсутствующий intent: оставить503 и остановить новые QA checkout, затем восстановить исходный callback, сверить событие с source/provider и ждать штатной повторной доставки. Аналогично QA события должны завершиться до возврата callback наsource. При невозможности закончить drain сохранить QA и ранее явно разрешённые source checkout fences до решения, не изменяя остальные сервисы и не теряя событие ради выхода из окна.

После QA закрыть его creator, сверить provider/source/QA и duplicate grants, восстановить исходный callback, проверить реальную доставку на исходный endpoint. Только затем вернуть прежний source checkout profile в тех targets, чьи изменения были отдельно явно разрешены. Любая ошибка возвращает безопасное закрытое состояние и NOT RUN/FAIL, а не финансовое SQL исправление. Документированный retry24ч — предел, который нужно учитывать по времени события; событие за пределом не считать автоматически доставляемым.

## Уточнение реализации503 — originating qe-primary-01

На QA TEST endpoint foreign payment/refund проверяется до ledger consumer: verified provider notification → параметризованный SELECT локальной пары intent/provider payment ID → существующий consumer только при совпадении. Иначе503/no-write, в том числе повторно. Прямой target `/api/webhooks/yookassa-test` вызывает QA adapter; rewrite в `/api/webhooks/yookassa` запрещён. Canonical production route/handler/DB consumers остаются исходными. QA derived web image ограничен ADR-002; TEST window/fence/reconciliation и границы legacy/c выше не ослабляются.

Confirmation: `tests/relocation-test-webhook.integration.test.ts` проверяет real-DB zero-write payment/refund/repeats, known-intent drain и QA scope; `tests/workspace-relocation-config.test.ts` проверяет actual Caddy direct route и closed503. Эти component/config checks не доказывают реальную provider delivery. Исходный parent condition и review history сохраняются до собственной независимой closure.
