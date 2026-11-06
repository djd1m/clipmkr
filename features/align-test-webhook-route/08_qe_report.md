# QE: TEST callback route — код проверен, runtime ещё не исполнен

06.11.2026. Complexity M10, scope WRITE2 + READ-ONLY3. Приложение/БД/окружение не меняются этой поставкой: один TEST alias должен указывать на существующий proxy основного приложения, сохраняя rewrite и X-Forwarded-For. Требования и hashes OpenSpec — в01; ADR/03.5/05 неизменны. Исторические кандидатные pending-строки06 намеренно сохранены в pinned input; текущее решение владельца и статус описаны в09 и этом отчёте.

## Фактически исполненный gate

После трёх неуспешных обычных циклов владелец разрешил ровно один дополнительный для точного09305c и predecessor из09. Supported begin-continuation exit0; три originating собственные проверки завершились clean. Проектный `dz qe-rounds --source native --action evaluate` фактически вернул **exit0, verdict closed, rounds4, unresolved=[]**.

- revision: `09305c199a2dee9aae2e4316eed951898b9dd9346673a49a443d86fa1cf74487`
- nonce: `59c26dbc-7f3b-4b32-9edb-03c6e4717e95`
- cycle: `d601889c-a7af-4ee9-ab41-3c594c850995`
- journal: `4568510f-841d-40c2-af6a-b84526212aae`
- sequence9; eventDigest: `aa8b78e02b12e31081c5d6a6b7b3bccb52b063653eace9b4c9247d5df17ba9e9`

История и все13 исходных условий сохранены; target не перенаправлен. Первая CLI-попытка evaluate отказала exit2 из-за неподдерживаемого для этого action флага --reviewers; она сохранена отдельно и не объявляется исполненным QE. Повтор использовал поддерживаемую форму без этого флага и дал actual closed. Это не обход ceiling и не новый цикл вместо согласованного.

## Исправление и доказательства

Единственный private source delta отR3 — `CONFIRMED.clear()` первым действием operate, до fallible lookup/lstat/lock/open/read. Строка отзывает старое process-local разрешение даже при раннем отказе. Durable marker/backup/pending/history не сбрасываются. Нестандартное использование namespace для нескольких операций требует дополнительной revalidation; это ограничение доступности, не расширение полномочий.

| Привязка | SHA-256 |
|---|---|
| Private executor/entire payload | `db0dbd2fbdae3caea1de1b9416d5c9a67596dc5f59bfff0363d2613610118087` |
| Launcher, неизменён | `b9b8ab7b8965d518f1dc4849d3dea0903696dc13200efbaa803e320cdff25892` |
| Measured test | `4292d6eb2e5fd726ddb999f0e40a0b542d76503b1e998f30b7ce092682bcee16` |
| Captured composite test program | `377873df7e248088ff910e413e05806f46a9f931a1e660e37577a918f47fbc98` |

Автор:8 old RED,10 targeted GREEN,40 operational/2 portable,14 mutants RED. Независимые повторения и hashes — [originating-qe-r4.md](reviews/originating-qe-r4.md). Удаление entry clear снова даёт точный старый source и воспроизводит callback1; исправленный даёт0 после восстановления fault fixture. Positive control требует полной повторной revalidation. Current own13 verifications и whole structural delta подтверждены каждым владельцем условия.

## Трассировка и anti-drift

| Требование/риск | Реальное доказательство | Граница |
|---|---|---|
| FR-1: exact TEST alias/rewrite/XFF, unchanged RO owners | portable2 и bound operational profile,11 hashes | live parser/apply ещё не исполнены |
| FR-2/AM-4/7/8: sole account/TEST/new intent/correlation | authority/clock/old-intent/cancel/relay отрицательные cases; unchanged normative scope | provider/main-ledger реального нового платежа ещё нет |
| FR-3/NFR-1/AM-1/2/3/5/6: fail-closed/durable/recovery/captured source | actual owned fd/inode/fsync/flock/fork/SIGKILL, former entry failures, mutated guards | external runtime adapters SIMULATED |

OpenSpec/01/ADR/03.5/05/fragment/3RO не изменены. Repo code delta остаётся scoped fragment/test; metadata06 заранее связывает actual private source. Отдельные08/09/review records фиксируют факты и не меняют native target. Full config, секреты, token/session profiles, raw пользовательские данные и медиа в Git не помещены.

## Что НЕ закрыто

CLOSED относится к code/offline QE. Actual runtime route apply, parser/health нового candidate, TEST checkout/decline/cancel/notification/duplicate/grant/paid media и трёхролевой отчёт ещё **NOT RUN**. Historical terminal TEST debt не начислялся/не пересылался; он остаётся read-only/deferred. Cloud/c.clipmkr/DNS и настоящие списания не менялись.

Старый private preparer ожидает старую release и closedR3; он не допущен к запуску. Его ограниченная актуализация должна проверить реальный CLOSED4/current source/release, пройти собственные synthetic checks и независимое ревью. Только затем fresh BOTH-store inventory/control/health и root runtime GO. Generic FIFO helper остаётся quarantined; финансовая приёмка использует отдельную проверенную canonical SQL процедуру для одного фактически наблюдаемого job. Не превращать текущий closed code gate в полный payment/CJM PASS.
