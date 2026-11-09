# ADR-002: изолировать приёмку от импортированного состояния

## Status
proposed, 09.11.2026. Обратимо до публикации QA; пересмотреть при несовместимости текущих namespace/Compose с изоляцией.

## Context
`apps/web/src/instrumentation.ts` запускает watchdog, а retention может удалить S3 до SQL. Один read-only SQL user не защищает S3 и ломает вход/квоты. Исходный S3 prefix основного сайта пуст, legacy использует `tests/site/`; production ключ обладает широкими правами. Образ web/worker уже есть локально; rebuild не нужен.

## Decision Drivers
FR-1/FR-2 — ни одной модификации оригиналов (high); FR-4 — настоящий UI/S3/TEST провайдер (high); FR-6 — существующий PG и сохранение локальной n5 (high).

## Considered Options
| Вариант | Плюсы | Минусы |
|---|---|---|
| A. Полный production clone web + read-only DB роль | Простая проверка чтения | Не закрывает S3 deletion до SQL; auth/session/квоты требуют записи |
| B. Незапущенные полные imports + отдельная QA DB существующего stage | Сохраняет проверяемый import и безопасный полный UI | QA не является полной runtime приёмкой каждого импортированного аккаунта |
| C. Изменить приложение, добавить migration-safe режим | Возможна единая read-only копия | Меняет проверяемый immutable релиз и требует продуктовой разработки |

## Decision
Выбрать B. В существующем PostgreSQL сохранить локальную n5, восстановить основную/helpdesk в отдельных БД; legacy архивировать отдельно, не запускать приложения над ними до cutover. Полноту импорта доказывать row manifests, схемой, sequence state, ролями и read-only S3 whitelist; владельцу дать безопасные агрегаты и локально доступные отчёты, оригинальные медиа проверить GET/HEAD без signed URL в Git.

Для UI переиспользовать существующие stage web/workers, сменив только их image IDs и частный профиль на отдельную `n5_relocation_qa_test`, schema-only из исходного dump. QA Redis выделить после inventory; никаких импортированных jobs/attempts/payment_intent. Только fixture аккаунты и разрешённый владелец; можно перенести его ID/hash в QA для проверки входа, не менять источник. Нет слияния данных. QA S3 prefix — `tests/local-ux-20261104/relocate-20261109/`, все worker и web обязаны иметь одинаковый prefix; полный bucket не копировать.

Сначала mail disabled, payments off, workers stopped и пустой Redis. Затем штатный UI создаёт только QA jobs. Для настоящего короткого E2E включаются прежние live model providers исключительно для QA workers и небольшой согласованной записи. Resend включается коротким отдельным окном на защищённом QA ingress только для `je.chkov.dmitriy@gmail.com`; в QA нет pending mail или иных реальных адресов. TEST checkout глобально false, точечный ID соответствует этому email, `YOOKASSA_TEST_MODE=true`, key `test_…`; live charge запрещён. Callback настоящего TEST-магазина нельзя глобально направить на QA, пока production checkout использует тот же магазин: подготовить целевой `https://77.83.87.178/api/webhooks/yookassa-test`, затем отдельное merchant TEST окно владельца; source маршрут и текущий callback до него не менять.

## Rationale
B реализуется штатными pg_restore, Compose/env и namespace. Защита состоит из отсутствия исходных jobs/финансовых намерений, отдельного S3 namespace, отдельной БД/Redis и ограниченного ingress; отсутствие трафика само по себе не защита.

## Consequences
Положительные: импорт остаётся точной копией; тесты не расходуют пользовательские кредиты и не удаляют их объекты.
Недостатки: before-cutover проверка session/origin основного домена требует отдельного hosts-resolve прохода; UI на IP её не заменяет. Точное подтверждение всех старых аккаунтов после старта остаётся cutover проверкой.
After-action Review: оператор перед выдачей владельцу ссылки. Follow-up: ADR-003.

## Confirmation
- Method: `docker compose config` parse в памяти; отказ QA обращения к restored DB; dry-run namespace inspection и реальные PUT/GET только QA объектов; отсутствие source row/object изменений.
- Required automated check: `tests/retention-storage.test.ts`, `tests/s3-public-endpoint.test.ts`, `tests/upload-completion-integrity.test.ts`, `tests/payments-guards.test.ts`, `tests/support-mail-resend.test.ts`; плюс TEST-GATE-2/4 плана.
- Load-bearing property: ни один QA процесс не имеет production DB/queue binding или пустого S3 prefix; TEST checkout доступен ровно одному разрешённому account ID.
- Success metric: 0 production writes/deletes/mail/charges от QA; реальный UI upload→clip→play/download; TEST duplicate не меняет баланс второй раз. Owner: оператор; monitoring: private logs и before/after manifests. NOT RUN.

## Уточнение по QCSD, 09.11.2026 — qquality-01, qrisk-01/02/03, qtest-01
Это доработка proposed решения, не утверждение runtime безопасности.

Весь QA main/support защищён owner/operator BasicAuth в общем target Caddy, включая IP/hostname, UI/API/assets и методы записи. Credential hash хранится в private include0600; отсутствие include/credential должно отвергать candidate. Единственное внешнее исключение — точный POST `/api/webhooks/yookassa-test`, переписанный в штатный handler; handler проверяет provider IP/GET/status и idempotency, остальные методы/пути остаются под auth. До отдельного merchant окна callback отвечает503. Во всех QA профилях app login остаётся дополнительным уровнем.

Gateway binding5811/5812 не является достаточным fence. До запуска app добавить проверяемый DOCKER-USER/nft эквивалент: original-direction поток на эти gateway hostports разрешён только от текущего target Caddy IP172.29.8.2, остальным контейнерам/внешним адресам отказ. Свободный порт, backend firewall и отсутствие альтернативного direct/container ingress проверяются повторно после recreate. Локальный root-оператор остаётся доверенной границей host; не публиковать loopback альтернативу для обычных пользователей. Если backend правил/packet path не установлен, app не запускать. Положительная проверка owner через Caddy; отрицательные — anonymous/wrong credentials, spoofed XFF/Host, raw5811/5812 с внешнего хоста и от существующего соседнего контейнера. Support QA с настоящими обращениями не выдаётся до доказательства всех путей.

Общий S3 credential допускается решением владельца03.11; нового IAM контура не вводим. Перед live QA сверить каждый из4 app profiles с точным QA prefix, DB и Redis; пустой/чужой/неустановленный prefix или оригинальные object keys/jobs/payment_intents в QA fixture означают STOP. Namespace применяется в `packages/s3/src/client.ts` до serialize/sign ко всем Put/Get/Head/Delete, Create/Upload/List/Complete/AbortMultipart, list pagination и presigned GET/PUT. Любой фактический wire key обязан быть внутри назначенного QA namespace; foreign response/marker/unsupported Copy должны отвергаться, логический ключ не даёт обхода через raw SDK. Existing `tests/storage-prefix.test.ts` покрывает эти классы на synthetic transport; relocation contract повторяет их для точного нового prefix и4 профилей. Реальные positive/overwrite/delete/multipart проверки используют только свежие synthetic canaries данного QA run, с private key journal и ограниченной очисткой; ни один отрицательный запрос не достигает оригинального объекта. Отсутствие доказанного покрытия любого web/worker/presign пути блокирует live QA S3, а не подменяется наличием env.

Merchant TEST окно отдельно разрешается после готового UI и требует доказанного запрета новых TEST intents у всех creators этого shop на всё окно, а не только отсутствия pending в один момент. Legacy/c и source сервисы вне явно разрешённых targets допускают только read-only inventory; merchant разрешение не разрешает менять их. Если запрет creation нельзя доказать без такого изменения, callback не переключать и payment E2E оставить NOT RUN; отдельное конкретное owner решение и пересмотр плана требуются до любого изменения этих сервисов. Уже закрытый legacy не предполагается. Полный scope-qualified протокол inventory/drain/reconcile/restore указан в ADR-001 и05; независимая подготовка QA продолжается.
