# QA callback: фактическая проверка автора

Статус: код и компонентные проверки выполнены; независимое компонентное Astra QE завершено CLEAN; native компонентная closure получена; runtime/merchant E2E остаются отдельно. Это не release/closure и не закрытие parent `qe-primary-01`. Автор `gpt-6.1-sol high` не выступает своим независимым reviewer. Native code/QE receipts ведёт coordinator после фактических этапов.

Реализация использует `createPaymentWebhookHandler` и `createBillingDependencies`, настоящий `createYooKassaProvider` через существующий HTTP fixture и существующие PostgreSQL migrations/consumers. В Git нет DB credentials, приватных raw DB URL, приватного медиа или raw runtime logs; URL в config fixture — passwordless примеры exact QA bindings, а настоящий test DB профиль остаётся вне Git. Coordinator предоставил заранее созданную отдельную `*_test` БД на существующем PostgreSQL, с ограниченной ролью; каждый suite использует случайную схему и удаляет её в finally. DB профиль в config fixture отражает QA runtime, injected Pool соединяется только с отдельной test DB. Это явно обозначенный test seam, а не runtime override.

Использованы code-impl и feature-adr Step 7/8, reference методы studio-extended-qe: risk-based (главный риск — 503 после commit), contract (реальная provider verification до guard), mutation (удаление трёх safeguards), brutal-honesty (разделение наблюдения и недоказанного). Прочитаны pinned protocols из `/home/product-studio/vendor/agentic-qe`; AQE runtime, MCP/fleet и новый mutation framework не запускались.

## Требование → риск → сценарий → результат

| Требование | Риск и реальная проверка | Команда / наблюдение | Ограничение |
|---|---|---|---|
| FR-1 / AM-1 | Foreign payment и refund: unknown UUID, mismatch provider ID, unbound ID; 2 sequential +20 simultaneous доставок для каждого сочетания | `npm test -- tests/relocation-test-webhook.integration.test.ts` test `foreign TEST payment and refund retries return 503 before any ledger write`: все 132 ответа503, полное равенство строк payment_event/payment/credit_grant/payment_intent/account, оба consumers не вызваны | Проверяется HTTP fixture магазина, не внешняя доставка ЮKassa |
| FR-1 / FR-2 | Verified null/invalid order не доходит до SQL/consumer; настоящие malformed/raw/IP/amount/TEST/provider-down события проверяются раньше SELECT; refund с отсутствующим metadata даёт verified null | Tests `verified null or invalid intent is refused before SQL and consumers`, `raw body, IP and provider verification precede local SELECT`: PASS; ignored event200/no-write | Invalid UUID и missing-order payment сам existing provider отвергает400 до admission. Ожидание503 относится к verified event, а не к нарушению canonical verification. Синтетический verified-invalid seam отдельно подписан в тесте |
| FR-2 / AM-4 | Неверные DB host/name/role/port/query/hash/URL, Redis host/DB/port/query/hash, billing/checkout/origin/prefix; off/fake/live money/wrong key/empty key, null/fake provider | Test `QA webhook rejects non-QA bindings and live mode before ledger access`: PASS503/no-store, no verification/SELECT/consumer | Config проверяется по типизированному runtime; сам Pool создаётся тем же getRuntime в настоящем route |
| FR-2 | SQL недоступен на обоих financial paths | `SELECT failure returns retryable 503 before either consumer`: PASS503, no consumers, неизменные полные таблицы | Локальный контролируемый SQL failure; production chaos не запускался |
| FR-3 / AM-3 | До setIntentProviderPayment503, после binding тот же event проходит; checkout exception отозван, callback drain продолжает работать; 20 concurrent дают один grant, ещё 2 повтора не меняют строки | `known QA payment remains idempotent and drains after checkout revocation`: PASS; также пройдены default PostgreSQL/Redis ports | Не доказывает реальное merchant retry/оплату в UI |
| FR-3 | Known refund до/после payment, 20 parallel refund, повтор | `known refund ordering and repeat deliveries retain canonical behavior`: PASS, payment refunded, повтор без delta | Financial SQL не изменён |
| FR-4 / AM-2 | Настоящие QA/canonical route modules: foreign QA503/no-write, canonical200/unknown_intent с прежним ledger behavior; startup503/no-store/no private details; точные2 webhook paths и3 plan writers | Новый route test + `tests/payments-guards.test.ts` и существующий `tests/test-webhook-route.test.ts`: PASS | Не runtime Caddy/merchant routing; canonical source hashes не переписаны |
| FR-5 | Ровно4 code targets, фактические hashes, независимая приёмка отдельно | `07_code_changes/change_manifest.md`; `git diff --check` exit0; independent component review CLEAN; native closure pending | Parent исходная condition, 2 witnessed cycles и release ограничения не изменены |

## Semantic RED → GREEN

До создания adapter тот же тест использовал существующий canonical factory (реальный компилирующийся import, без missing-module). Оба financial paths, включая 22 доставки для unknown/mismatch/unbound, фактически ответили200 и изменили ledger: один `payment_event` уже опровергает zero-write contract. Test завершился exit1 по semantic assertions. Private log `guard-code/semantic-red-both-paths.private.log`.

После thin adapter и route targeted команда:

`npm test -- tests/relocation-test-webhook.integration.test.ts tests/billing.integration.test.ts tests/test-webhook-route.test.ts tests/payments-guards.test.ts`

Финальный actual результат после восстановления mutations: **exit0, 4 files, 50 passed, 0 skipped**, 11.53с; новый suite8/8. Случайный дефект самого первого test SQL (`credit_grant.intent_id` вместо существующего `payment_ref`) исправлен в тесте и не выдаётся за product RED. Финальный положительный known/drain/grant case выполнен после этого исправления.

## Mutation negatives

Каждая мутация применялась временно к одному adapter, отдельным процессом запускался acceptance test. В finally восстановлены исходные bytes; финальный targeted suite повторён на восстановленном коде.

| Мутация | Acceptance test | Факт |
|---|---|---|
| Удалить оба `await admit(input)` до consumers | foreign payment/refund retries | exit1, meaningful failure:200 и ledger delta |
| Отключить exact profile refusal | non-QA bindings/live mode | exit1: provider verification был вызван на запрещённом binding |
| Сделать null testCheckoutAccountId callback gate | known drain after revocation | exit1: ожидаемый200 стал503 |

Это **3 конкретные убитые мутации**, не общий mutation/coverage процент. Logs и `mutations.actual.private.json` сохранены приватно у coordinator.

## Статические проверки и общий набор

- `npm run lint`: exit0, статические правила без ошибок.
- `git diff --check`: exit0.
- Локальный runner `scripts/test.mjs`/`vitest.config.ts` собирает `tests/**/*.test.ts`; новый suite реально собран и в targeted, и в общем запуске (8 cases), а не просто лежит вне selector.
- `npm run typecheck`: exit2, те же4 известных baseline errors: нет checkoutAllowedForAccount в установленном shared dist (upgrade/page и billing-runtime), нет `@noble/hashes/sha2.js`, производный unknown byte в upload-file-identity. Исходники этих файлов не менялись.
- Отдельный `tsc --noEmit -p tests/tsconfig.json` на финальных bytes: exit2, только те же4 baseline errors; новых ошибок в4 targets нет.
- `npm run build`: exit1, Next compile не нашёл существующую зависимость `@noble/hashes/sha2.js` из upload-file-identity/Uploader. Это ограничение текущего node_modules, не PASS; packages/shared/db/s3/queue/worker compilation до Next выполнена. Новые зависимости не устанавливались, runtime/image/deploy не запускались.
- Полный `npm test` выполнен только с private dedicated *_test DB; REDIS_URL/S3-live/resource-proof не включены. **Exit1, 153 files: 144 passed /7 failed /2 skipped; 1566 tests:1546 passed /3 failed /17 skipped**, 793.96с. Новая интеграция8/8 прошла и здесь. Полная проверка НЕ пройдена.
- Пять suites не собраны из-за того же missing `@noble/hashes/sha2.js`: compaction-uploader, music-uploader, pack-shot-uploader, teaser-uploader, upload-file-identity; один case workspace-presentation падает по той же причине. Ещё два existing watermark-startup cases: web startup ожидал exit1, получил0; worker-video получил ранний REDIS_URL password/DB config error вместо injected unfit-format error. Оба отказа затем фактически воспроизведены отдельным контрольным запуском на `git archive` исходного HEAD `34780301edead98eb517f63982630a1713ccda97`, без всех четырёх guard targets: **18 cases,16 passed/2 failed, exit1**, те же сообщения. Это подтверждает baseline, не исправляет его. Node_modules в baseline остаётся тем же symlink; точная причина alias/compiled fixture отдельно не исправлялась. Raw `startup-baseline-final.private.log` и привязка исходников сохранены приватно.
- Все17 skips перечислены реальным обязательным reporter: guest-pack1, queue-redis2, release-candidate-acid1 (real OOM/ENOSPC proof не включён), retention1, storage-prefix1, upload11. Это не разрешение включать production Redis/S3 или создавать MinIO ради GREEN. Real Redis/Cloud S3/full upload/resource-proof остаются NOT RUN.

## Code/spec anti-drift и граница приёмки

Delta ledger `openspec/changes/guard-relocation-test-webhook/specs/qa-payment-callback/spec.md` остаётся SHA-256 `479c4e6ad8abcb16cf05019cb44fdfcfa22c0cf5f8aa05f78719e71fff3adba5`, requirements-revision не переписан. FR1–5/AM1–4 сопоставлены с реальными assertions в таблице. 4 code targets совпадают с authoritative06; callback допускается по существующим QA bindings, provider verification и локальной паре, без нового toggle/registry. Checkout allowance используется только существующим checkout policy и не закрывает drain. Invalid raw provider inputs сохраняют canonical400; verified foreign events дают503 до claimEvent.

Не доказаны: настоящая доставка/повторы ЮKassa, merchant настройки, payment UI E2E, immutable QA image и его runtime, Cloud.ru/source/legacy/c/DNS/cutover, full compiler green. Ни один такой результат не следует из50 component assertions. Независимая component closure и исходная parent `qe-primary-01` closure требуют отдельных фактических receipts. Файл фиксирует работу автора и не заменяет их.

Learning: перед Step 8 прочитаны 10 actual recall hits из canonical project store; в план/проверки применён prior урок о проверке до первого эффекта. Confirmed component lesson `teach:f4ad0f35c576a061` фактически записан через pinned `dz teach --project /home/clipmkr --no-mirror`, повторный recall вернул этот ID. Урок явно ограничен author component evidence и не объявляет independent/merchant/build/parent closure.

## Независимая проверка и изолированная сборка — coordinator

Отдельная сессия `gpt-6-astra xhigh` получила сначала нормативные документы, затем самостоятельно проверила реализацию: 50/50 целевых и 5/5 собственных проверок PASS. Три независимые мутации обнаружены; восстановленный baseline 5/5 PASS. Четыре code hashes сохранены, подтверждённых замечаний нет. Serving model: NOT_ATTESTED. Приватные отчёт и результат: `guard-review/review.private.md`, `guard-review/result.private.json`. Это компонентный результат, не merchant E2E и не parent closure.

Сборка в отдельном контексте из точного source `11a90aec9d26be56849ac06c9f12a98001739a28` с наложением ровно четырёх проверенных файлов завершилась успешно. Использован существующий Dockerfile с чистым npm ci, без host node_modules и приватных runtime данных. Получен QA image `sha256:d1880bc89258fd88c27bdcd3f9393c69bb70ebdf6bf4e54216f92cbd946688f9`; пока не активирован. Исходная общая проверка host по-прежнему имеет перечисленные выше отказы: успешная сборка образа не заменяет её результат. Provenance и полный build log сохранены приватно.

Native `dz qe-rounds --source native --action evaluate` фактически завершился exit0 / closed для revision `3a3b1b2df256e70dba9b62d9de42447883ba50972ea8a4551777fd37962a85dd`, sequence2, один witnessed cycle. Исходный независимый reviewer проверил все11 snapshot paths и точное равенство isolated build context: 4483 файла, без расхождений. Parent история и `qe-primary-01` этим результатом не закрываются. Общий host suite остаётся не полностью зелёным; граница closure — проверенный четырёхфайловый компонент.
