# Исследование переиспользования

## Имеющиеся блоки

Проверены основной Dockerfile/Compose, `ops/cloudru/start-managed-vm.sh`, overrides
образов, port guard, env guards, существующий upload acceptance и browser/integration
тесты. Отдельные исследовательские сессии gpt-6.1-sol изучили код и официальные
источники Docker/SSH. Готового двухцелевого release runner в проекте не найдено.

Переиспользуются Docker build/save/load/inspect, Git archive, SSH/SFTP, Compose
config/up/migrator. Не создаются новый orchestrator, Kubernetes или второй продукт.
Существующий `start-managed-vm.sh` нельзя вызывать вслепую: он жёстко привязан к
каталогу, проверяет занятость своих портов как конфликт и запускает миграцию.

## Внешние первичные источники

- [Docker digest](https://docs.docker.com/dhi/core-concepts/digests/): tag изменяем,
  digest идентифицирует содержимое образа в registry.
- [docker image save](https://docs.docker.com/reference/cli/docker/image/save/) и
  [load](https://docs.docker.com/reference/cli/docker/image/load/): архив доставки
  требует собственного checksum и сверки локальных image IDs после импорта.
- [Compose project name](https://docs.docker.com/compose/how-tos/project-name/):
  project name отделяет Compose-ресурсы, но не внешний бакет и секреты.
- [OpenSSH client configuration](https://man.openbsd.org/ssh_config): строгая
  проверка host key и отдельный профиль транспорта.

## Инвентаризация

Факты предоставлены root/владельцем; planner не выполнял новых live probes.

| Объект | Снимок и роль |
|---|---|
| `cloud-c` | SSH; семь прежних контейнеров, journal 26, 3 аккаунта, 0 media/payments |
| `site-test` | SSH; существующий n5 test на сервере сайта, journal 28, 5 аккаунтов, 4 видео, 10 клипов, 6 платежей, реферальные данные, shared production bucket |
| Controller `/home/clipmkr` | Источник/запуск runner, физически отдельно по inventory; старый localdevstage не target |

«Сервер сайта и сервер разработки — одно и то же»: под VPS владелец понимает
site-server, новый dev-контур не создаётся. Production clipmkr.ru, main containers
и DNS не переключаются. ВСЕ данные обеих test copies сохраняются.
Site backup/restore сделан; root переснял sourceIdentity/live account SHA/full journal
и получил match с реально восстановленным test.dump: 5 accounts/28 migrations.
Новый binding — input site-test; localstage исключён. До apply нужны drift check
и baseline остальных значимых media/payment/referral/credit данных.
Actual Docker labels: app web/workers в одном application project, DB/Redis в другом
старом test infra project, main production отдельно. Активная test DB отличается
от POSTGRES_DB default контейнера. Profile связывает applicationProject и отдельные
databaseProject/redisProject, pinned containers/volumes/network, binding.dbName.
SQL выбирает DB из application DATABASE_URL и проверяет её host на exact test DB
container в test network; нельзя брать POSTGRES_DB или main DB, создавать DB/Redis/up.
На site-server свободно 3,6 ГБ / занято 97%: admission считает реальный пик
images/layers/archives/распаковки с сохранением rollback images и резерва.
Read-only inventory своего кэша допустим; cleanup — отдельный план, без global prune.

## Наблюдения процесса и платежей

`dz integrations-verify` для Codex hooks в 0.8.58 возвращает статический отказ по
policy. Это не доказательство фактически выполненного live probe. Штатный writer
пишет user-global hooks; проектная установка им не подтверждена. Глобальные хуки
не устанавливаем в обход scope. Все gates вызываются явно, с честными receipts.

Успешная оплата применяется только webhook-получателем. Существующий тестовый
магазин направляет уведомление в прежний тест, а не в новый Cloud-кандидат.
Polling страницы возврата этого не исправляет. Владелец выбрал временное окно
нынешнего TEST shop. Конкретные время/окончание окна и завершение pending intents
ещё не согласованы/не подтверждены. До этого callback неизменён. UI-оператор
в окне направляет HTTP notifications на `https://c.clipmkr.ru/api/webhooks/yookassa`,
проверяет native/replay/credits/referrals, после Cloud intents возвращает n5 callback.
Basic auth shop API не управляет HTTP notifications; реальные списания выключены.

## Рекомендация

Один выпуск содержит полный SHA, image IDs/digests и checksum архива. Разрешены
только явные тестовые цели. Результат каждой цели хранится отдельно, частичный
успех — общий ненулевой exit. Обновляются существующие изолированные тестовые
копии с сохранением всех их данных. По новому явному решению владельца нынешний
общий S3 key сохраняется с production-правами, ограничение только в коде/SDK.
Для site нужны DB-whitelist copy
synthetic objects в `tests/site/`, size/SHA verify и разрешение pending multipart;
исходные объекты и logical DB keys сохраняются. Никакого молчаливого prefix чужих
production-ссылок. Сначала fresh sourceIdentity/baseline, isolation/disk admission,
затем apply, E2E и повторная доставка.

Откат меняет приложение на предыдущий совместимый manifest, не стирает volumes
и не восстанавливает пользовательскую БД автоматически.

## Переиспользование namespace и реальные зависимости

Прочитаны `packages/s3/src/client.ts`, operations/multipart/presign/erasure,
`apps/worker/src/render/storage.ts`, media/download, shared config и env adapters.
StorageClient уже владеет internal transport и отдельным signingClient, destroy
закрывает оба. Единственная точка преобразования — middleware обоих клиентов;
новый storage service, ручная правка всех callers и новые dependencies не нужны.
Переиспользуются `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, Vitest и
существующий MinIO test profile. SDK command contract приведён в ADR-003.

В этом дереве общий S3 parser называется `loadS3Config` (`S3Config` выводится из него).
Отдельный символ `sharedS3Config` поиском не найден; это роль общей конфигурации,
для неё не создаём второй parser. Добавление S3_KEY_PREFIX обязано пройти явные
`apps/web/src/server/environment.ts`, `apps/worker/workers/stt.ts`, `render.ts`,
Compose S3 anchor и test fixtures. Иначе default empty молча оставит часть процессов
без namespace. Эти обнаруженные зависимости включены в targets, worker-llm ключ не нужен.
Import graph проверен: workers/stt.ts и render.ts явно передают env в startWorker
из src/runtime.ts → role !== worker-llm → loadS3Config(env) → createS3Client.
Select импортирует общий runtime, но S3 config для worker-llm не создаётся;
ключ/prefix ему не добавляются. `tests/fixtures/environment.ts` — обязательный target:
check-env-wiring требует explicit поля адаптеров/fixtures даже для optional variable.
Vitest уже включает `tests/**/*.test.ts`, tests tsconfig включает новые TS-файлы;
отдельные изменения package.json/lockfile/vitest config не предполагаются.

Проекты 1–8 и OSS: этот план не утверждает нового полного аудита проектов.
Существующий S3-клиент Clipmkr уже адаптирован из `.reference/jan-clone`; найденных
блоков достаточно для middleware. Инвентаризация существующих ops-блоков выше
сохраняется; новый orchestrator или перенос чужого storage stack не нужны.

## Owner exception и ограничения доказательства

После объяснения границ владелец явно решил: «Нынешний общий ключ; ограничиваем
тесты в коде». Общий bucket/текущий key с полными production-правами сохраняются.
Новых SA/key/BucketPolicy и IAM rollout нет. Ограничение tests/cloud/ и tests/site/
только code/SDK; доступ общего key при обходе SDK остаётся production-wide.
История прежнего scoped-key design и прежних gates сохранена в 07_progress;
предыдущий IAM-current-key 403 не является текущей зависимостью либо scope proof.

Root read-only проверил: policy отсутствует, CORS уже разрешает c/n5 PUT,
versioning disabled. Production settings не меняем. SDK proof — изолированный
MinIO: physical prefix всех object/list wire операций/signing/multipart/retention,
unsafe/unknown/bucket mutations до сети, outside canary size/SHA прежние.
GetBucketVersioning read exact bucket — явное исключение без object path.
Реальный Cloud canary только inside tests/cloud/ и tests/site/; без мутаций рабочих
namespaces, без требования provider 403 от общего ключа. Это compatibility proof,
не IAM isolation. Infra/key IDs/секреты/подписанные URL в Git не включаются.

## Текущий технический checkpoint — сведения root

Controller `scripts/release-candidate.mjs` и его tests: Node 22, 10/10 checkpoint,
typecheck 0; prepare/validate/read-only inspect/source-sync. Apply/reconcile/rollback
заблокированы. Remote prototype в `/tmp` не интегрирован; fake 14+4 не live proof.
Dockerfile/health source `71e7812b70017a3dff5c1c262233f0da90bb9901` реально
build-tested: 200/no-store/immutable SHA/runtime override cannot forge.
Полный suite того source нашёл 7 failures в 3 файлах из-за классификации
NEXT_PUBLIC_RELEASE_REVISION как runtime-required. Нужны точный build-time contract,
wiring regression и повторный full suite; baseline full PASS сейчас отсутствует.
