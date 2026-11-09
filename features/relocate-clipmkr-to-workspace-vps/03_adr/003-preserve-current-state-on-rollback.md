# ADR-003: возвращать актуальное состояние при откате

## Status
proposed, 09.11.2026. Обратимо до cutover; пересмотреть, если владелец потребует RPO=0 при физической потере нового VPS.

## Context
Предварительные четыре pg_dump уже успешно восстановлены во временные БД существующего PG; это не финальный cross-store snapshot и не гарантия восстановления после новых target записей. Исходный VPS остаётся доступным, S3 расположен отдельно. Репликация target PostgreSQL/Redis на другой хост не установлена.

## Decision Drivers
FR-6 — проверяемые копии (high); FR-7 — сохранить новые записи (high); минимальная операция без нового DR сервиса (medium).

## Considered Options
| Вариант | Плюсы | Минусы |
|---|---|---|
| A. Разные R1/R2, off-host backup и обратный full restore | Использует проверенные pg_dump/pg_restore; сохраняет всю историю при доступной target | R2 требует freeze/времени; при потере target возможен ненулевой RPO |
| B. Всегда вернуть старый snapshot/DNS | Быстро | Теряет новые аккаунты, платежи, jobs и обращения |
| C. Синхронная репликация с автоматическим failover | Может обеспечить RPO=0 на заданном failure domain | Отдельная архитектура, расходы и новые риски; пока не создана |

## Decision
Выбрать A. До первого target writer (R1) source остаётся последней истиной: остановить все target процессы, удостовериться в отсутствии target записей, вернуть исходный edge и только затем source writers. Финальная копия и локальный stage snapshot хранятся на target и вне target — на исходном VPS в private каталоге. Проверить SHA-256 после передачи и реальный restore вне target; копия только на target не считается off-host.

После первой target записи (R2) заморозить вход/consumers на target и source relay, завершить начатые операции, получить актуальные main/helpdesk PG+Redis+uploads, передать их на source, восстановить в новые source БД/volume без замены старых. Сверить manifests и namespace, затем запустить source один раз с актуальными binding и вернуть edge. Нельзя одновременно запустить source со старой БД и target с новой. При доступной target это контролируемый rollback без сознательной потери подтверждённых записей.

Если target целиком недоступен, применим лишь последний проверенный off-host snapshot. Указать время последней копии и интервал неизвестных записей; source старый snapshot автоматически не публиковать. Режим сохраняет maintenance до решения владельца/восстановления target. RPO=0 при таком отказе не обещается. До открытия target для новых записей владельцу показываются измеренные restore time и фактический DR предел; требование RPO=0 для whole-VPS loss потребует отдельного решения C до cutover.

## Rationale
A достаточно для авторизованной подготовки и контролируемого переключения. B противоречит FR-7. C полезен, но не может считаться существующим от наличия runbook.

## Consequences
Положительные: различаются abort до записи, обратный перенос после записи и авария хоста; полная support история входит в R2.
Недостатки: R2 требует доступности актуального target состояния и обслуживания. Backup cadence после cutover определяется измеренным временем и нагрузкой; произвольное обещание RPO не даётся.
After-action Review: оператор/владелец до снятия maintenance и до удаления source. Follow-up ADR: отдельная репликация только при соответствующем требовании владельца.

## Confirmation
- Method: TEST-GATE-1/6 — проверка dump/restore, SHA-256, manifests и обратное восстановление на source; off-host private receipts с timestamp.
- Required automated check: `tests/queue-redis.integration.test.ts` проверяет транспорт; `tests/support-email.integration.test.ts` проверяет authority/token state. Фактический backup/restore доказывают команды плана, эти unit/integration проверки не заменяют его.
- Load-bearing property: после новых записей source стартует только поверх актуального полного состояния; old snapshot не выдаётся за актуальное.
- Success metric: manifests всех frozen таблиц совпадают, Redis namespace/key inventory и uploads hash совпадают, единственный writer; потеря target в репетиции оставляет maintenance. Owner: оператор; monitoring: возраст последнего off-host backup и restore duration. NOT RUN.

## Уточнение по QCSD, 09.11.2026 — qtest-02/05
Перед target startup фиксируются frozen PG rows/sequences, Redis payload/type/TTL, uploads/spend/config hashes, stopped containers и отсутствие app clients. R1 разрешён только при доказанном нуле target записи: ни один target writer ещё не запускался и все manifests совпали, либо независимый аудит полного состояния/всех writers доказал отсутствие изменений. Лог «startup failed», нет HTTP посетителей или отсутствие строки в журнале таким доказательством не являются. Любая попытка запуска main/support writer с неизвестным исходом немедленно переводит выбор в R2_REQUIRED; при недоступном актуальном состоянии — maintenance, старый snapshot не включать.

Полная R2 репетиция проводится на synthetic post-switch данных в QA, без production writers: создать marker account/video/credit/payment TEST записи в main QA, support conversation/message и реальное synthetic attachment, Redis persistent key и expiring hash/queue, append synthetic spend entry и private fixture config. Остановить QA consumers, сохранить полный набор с manifest, восстановить на source в новые отдельные `n5_relocation_r2_main_test` (existing main PG) и `n5_relocation_r2_support_test` (existing support PG); роли того же имени, без доступа к рабочим таблицам. RedisDB13 в existing main/support instances использовать только после DBSIZE=0/no-clients, иначе STOP и новое назначение до записи. Uploads/spend/config — `/root/.config/clipmkr/relocate-workspace-20261109/r2-drill/`, не рабочие mounts.

Проверить все synthetic post-switch строки и FK/sequences, Redis type/binary payload/оставшийсяTTL с учётом времени, полные file hashes/config binding и отсутствие второго writer. В отдельных synthetic копиях повторить отказ: existing Redis key/BUSYKEY, повреждённый attachment или dump, пропущенная manifest категория и неопределённый исход startup. Каждый отказ сохраняет maintenance и запрещает R1/source старую БД. При невозможности восстановить хотя бы одну категорию полная репетиция не принята. Existing tests `tests/queue-redis.integration.test.ts`/`tests/support-email.integration.test.ts` проверяют компоненты; actual pg_restore/Redis/file roundtrip DRILL-R2-ALL в плане проверяет весь R2. Новые containers/rollback framework не нужны.
