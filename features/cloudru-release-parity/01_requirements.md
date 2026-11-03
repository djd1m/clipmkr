# Требования к версии Cloud.ru и общему пути обновления

Статус: revision pending focused QCSD после уточнений владельца 03.11.2026.
Есть частичный controller; доставка и полный Cloud CJM ещё не приняты.

## Участники

Владелец принимает кандидат и отдельно решает о production; оператор изменяет
код в controller workspace `/home/clipmkr`; пользователи, блогеры и владелец используют существующий CJM.

## Функциональные требования

### FR-1 — единая исходная версия

После правки в `/home/clipmkr` оператор фиксирует проверенный Git-коммит. Одна
команда доставки разворачивает версию на двух явных SSH-целях: `cloud-c`
(Cloud, c.clipmkr.ru) и `site-test` (существующий n5 test на сервере сайта).
После успеха обе цели подтверждают тот же commit
и ожидаемые образы. Ошибка одной цели не превращается в общий успешный результат.
Прямые несохранённые правки работающих контейнеров не являются источником версии.
По уточнению владельца «сервер сайта и сервер разработки — одно и то же»;
под «этим VPS» он понимает site-server. Физический controller workspace по inventory
расположен отдельно; это не третья цель. Старый `localdevstage` исключён,
новый dev-контур не создаётся. Оба targets используют SSH, локального executor нет.

### FR-2 — E2E на Cloud.ru

На настоящем опубликованном Cloud.ru-кандидате выполняется обязательная приёмка
`docs/acceptance/core-cjm.md`: загрузка/нарезка/просмотр/скачивание; тестовая оплата
и подтверждение прав; блогер, индивидуальные ограничения и реферальная статистика
для блогера и владельца. Chromium проверяет настоящий Play и декодированные кадры.
Обычный лимит 90 минут, блогер 120, индивидуальный 2–1440 с возвратом к 120.

### FR-3 — демонстрация повторного изменения

После первого успешного выпуска выполняется отдельная небольшая проверяемая
правка в controller workspace, новый коммит и повторная доставка на обе SSH-цели.
Подтверждаются новая версия и видимый результат на Cloud.ru; откат возвращает
предыдущий согласованный выпуск без отката пользовательской БД вслепую.

### FR-4 — изоляция и сохранность

Перед запуском кандидата сняты inventory и независимые backup существующих БД.
Кандидат не делит production PostgreSQL/Redis/session secrets. S3 — явное owner
exception FR-8: нынешний общий key сохраняет полные production-права, безопасность
тестовых операций обеспечивается кодом/SDK namespace, IAM-изоляция не заявляется.
Общий bucket допустим. Cloud: 3 аккаунта,
0 media/payments, journal 26; `site-test`: 5 аккаунтов, 4 видео, 10 клипов,
6 платежей, journal 28. Сохраняются ВСЕ аккаунты, медиа, платежи и реферальные
данные обеих копий, их DB/Redis/volumes; отсутствуют reset/seed/подмена другой БД.
Cloud получает только добавляющие 026/027; site уже на 28, без повторного применения.
Root уже переснял site sourceIdentity и live account SHA/full journal и сверил с
реально восстановленным test.dump: 5 accounts/28 migrations match. Это input текущей
ревизии; localstage binding исключён. Перед apply повторно проверить отсутствие drift
и дополнить baseline всеми существенными media/payment/referral/credit строками.
Перед namespace change остановить test writers и безопасно разрешить старые pending
multipart. Копировать только DB-whitelist synthetic objects в `tests/site/`, проверить
каждый size и SHA-256, сохранить исходники. Чужие production-ссылки блокируют apply;
нельзя молча добавлять им prefix. DB keys остаются logical, без переписывания строк.

Actual labels site: web/workers принадлежат application compose project, DB/Redis —
другому старому test infra project, main production отдельно. Profile явно задаёт
applicationProject, databaseProject/redisProject, pinned container/volume/network
identities. Не сводить projects в один, не создавать/не выполнять up новых DB/Redis.
SQL выбирает database из application DATABASE_URL, сверяет с binding.dbName и
точным test DB container; активное имя отличается от POSTGRES_DB default контейнера.
DATABASE_URL host обязан соответствовать этому container в test network, не main DB.
Несовпадение database/host/container/project/volume блокирует любые migrations/apply.

### FR-5 — явная граница production

До отдельного решения владельца не меняются маршрутизация основного сайта,
production DNS, production БД/очереди и его web/worker. Команда тестового выпуска
по умолчанию не имеет production-цели; попытка выбрать production отклоняется.
Настоящие списания не включаются. Временно используется нынешний TEST shop;
отдельный shop не обязателен. До согласования конкретных начала/конца окна и
завершения pending intents callback не меняется. В окне UI-оператор сохраняет n5
callback, меняет HTTP notifications на `https://c.clipmkr.ru/api/webhooks/yookassa`,
проверяет native checkout/replay/credits/referrals, дожидается завершения Cloud
intents и возвращает текущий n5 callback с проверкой восстановления доставки.
Shop API Basic auth не управляет этими webhooks. Нужны UI-оператор и частная
квитанция окна; без них платежная приёмка blocked. Симуляция/polling не дают passed.

Для окна обязателен серверный gate `N5_CHECKOUT_ENABLED` (default true для
прежнего поведения): false запрещает ВСЕ новые и повторные POST /api/checkout
до чтения тела, createIntent и provider create. Сохраняются исходные rate/origin/auth
проверки; ответ 503 с понятным сообщением. GET статуса, webhook receiver и проверка
provider остаются рабочими: N5_PAYMENTS_MODE=off не заменяет checkout gate.
Сначала закрываются checkout ОБОИХ test-контуров, подтверждаются 503, завершение
старых in-flight requests/старого web и drain прежних intents по БД+provider.
Только затем оператор меняет callback на Cloud; после подтверждения маршрута
открывается Cloud, site остаётся закрыт. Перед возвратом снова закрыть Cloud,
drain его intents и callbacks, вернуть n5 URL и только после подтверждения открыть
site. Cloud checkout остаётся закрыт после окна. Нулевой pending до freeze,
только UI-скрытие кнопки либо mode=off не доказывают безопасное окно. Проверки
creation после freeze и during transition дают 503 и ноль новых intents/calls;
callback/status уже созданного платежа завершается и начисляет ровно один раз.

### FR-6 — восстановление частичной доставки

На каждой цели один writer/lock и приватный атомарно записываемый state до
изменения контейнеров. Обрыв SSH либо истечение ключа даёт unknown, а не success
или rollback. До повторного apply выполняется inspect/reconcile по наблюдаемым
контейнерам и журналу схемы. Разрешение/маршрут SSH автоматически не расширяются.

### FR-7 — совместимость и ресурсный допуск

Откат приложения разрешён только при совпадающем проверенном journal схемы
либо отдельном доказательстве совместимости. В этом выпуске автоматический
откат допускается между релизами одного schema journal; переход 26→28 не
считается таким откатом. Ошибка миграции останавливает только тестовую цель,
сохраняет предыдущие артефакты/state и требует сверки, без restore БД вслепую.

Перед запуском: минимум 2 ГиБ доступной памяти на цели, лимиты памяти каждого
контейнера и один активный медиапроцесс; для входа резерв диска не меньше
существующей проверки ×3 от размера файла плюс 2 ГиБ свободного системного
резерва. Параллельные длинные задания приёмки запрещены. Реальные тесты ограничены
одним файлом на 90 минут и одним на 120, максимум двумя STT-проходами и четырьмя
LLM-вызовами; повторы требуют анализа причины, а не бесконечного retry.
Нулевой остаток бюджета, OOM или свободный системный резерв ниже 2 ГиБ прекращает
приёмку; старый production не очищается и не останавливается.

На site-server по inventory свободно 3,6 ГБ, диск заполнен на 97%. До apply
нужен фактический допуск места под передаваемые source/image archives, временное
распаковывание, incremental image layers, текущие и rollback images и резерв.
Медиадопуск ×3+2 ГиБ не заменяет этот release admission. Нельзя заранее обещать
достаточность места, делать global prune, удалять чужие проекты или rollback images.
Разрешены read-only inventory собственного кэша и отдельный reviewable cleanup plan.

### FR-8 — namespace S3 по bucket и prefix

Явное решение владельца после разъяснения границ: «Нынешний общий ключ;
ограничиваем тесты в коде». В общем рабочем bucket разрешены `tests/cloud/` и
`tests/site/`; общий текущий key полностью сохраняет production-права. Новые
SA/key/BucketPolicy не требуются и не создаются. Это осознанное owner exception:
только code/SDK namespace boundary, без настоящей IAM-изоляции или scope proof.
При обходе SDK либо компрометации key доступ к production остаётся возможен.
По read-only проверке root policy отсутствует, CORS уже допускает c и n5 PUT,
versioning disabled. Production storage settings не меняем; IAM rollout/403 не blocker.

Минимальная реализация — AWS SDK middleware существующего StorageClient,
без новых dependencies. Валидируемый `S3_KEY_PREFIX` по умолчанию пуст:
production сохраняет прежнее поведение; test profiles обязаны задать точный prefix.
Один контракт действует на internal client и public signing; проверяет Bucket,
преобразует Key/Prefix/KeyMarker и обратные response Key/NextKeyMarker.
Обходы `..`, slash/backslash/encoded path и неизвестные команды отклоняются;
точная allowlist и пагинация — ADR-003. GetBucketVersioning read допустим,
bucket-wide mutations запрещены при непустом namespace. Erasure/multipart/retention
получают прежние logical keys. Admission сравнивает bucket+prefix, а не bucket inequality.

Проверка SDK — настоящий MinIO с двумя prefixes и outside canary: size/SHA до/после,
public PUT/GET, list/multipart/retention/erasure. Capture всех wire requests доказывает
physical prefix всех object/list операций; unsafe input/unknown commands/bucket
mutations отказывают до сети. GetBucketVersioning exact bucket read — исключение
без object prefix. Outside canary изменяется только fixture setup/teardown, не SDK.
Реальный Cloud canary оператор выполняет только внутри tests/cloud/ и tests/site/,
без мутаций рабочих namespaces. Общий key не даёт требуемого denial: 403 не ожидаем,
не требуем и не заявляем; Cloud canary подтверждает совместимость, не IAM scope.

### FR-9 — точный build-time env и полная регрессия

На source `71e7812b70017a3dff5c1c262233f0da90bb9901` полный suite обнаружил
7 failures в 3 файлах: wiring ошибочно требует runtime NEXT_PUBLIC_RELEASE_REVISION.
Исправить точную классификацию этой build-time переменной в `scripts/check-env-wiring.mjs`
и добавить regression в `tests/wiring.test.ts`: проверяем build wiring Dockerfile,
не освобождаем все NEXT_PUBLIC_* и не убираем guard runtime-required env.
Dockerfile/health уже build-tested: HTTP 200, no-store, runtime override не подделывает
immutable revision. Эти результаты сохраняются, но baseline full PASS нельзя
заявлять до исправления семи failures и реального повторного полного suite.

## Нефункциональные требования

Повторяемость по SHA и digest; минимальные права с owner exception общего S3 key FR-8; ключи только в закрытых профилях;
строгая проверка SSH host keys; понятный частичный результат; сохранение текущего
единого стека. Документы на русском, частые проверенные коммиты и push.

## Ограничения и зависимости

Существующий план переноса — входной материал, не разрешение на cutover.
Туннель временный, разрешение ключа до 04.11 около 15:01 UTC; юнит transient.
Нужны повторная проверка site binding/drift и полный data baseline, SDK/MinIO proof, disk admission,
согласованное окно текущего TEST shop и UI-оператор. Бюджеты реальных STT/модельных проверок должны опираться на текущие
настройки и ограниченный объём приёмки; неизвестное не выдаётся за подтверждённое.

## Границы реализации

Входит: проверяемая доставка тестового кандидата, изоляция, backup/restore,
E2E и повторное изменение. Отдельный будущий этап: production cutover и его
freeze/relay/DNS/перенос рабочей БД. Новый стек и новая ВМ не требуются.

## Открытые вопросы, разрешаемые inventory

- Проверить новый site binding (5 accounts/28 match) на drift и дополнить полный data baseline/DB-whitelist; привязать раздельные app/infra projects и DATABASE_URL database/host.
- Состояние старых pending multipart и безопасный порядок их завершения/abort до смены namespace.
- SDK namespace/wire/canary proof и Cloud canary только внутри tests prefixes; IAM rollout не требуется.
- Реальное место под incremental images/archives на site; при нехватке отдельный cleanup plan.
- Конкретное окно TEST shop, отсутствие pending intents с обеих сторон и UI-оператор.
- Новые prepare/три focused QCSD, K1 namespace/exports и K2; старые receipts не переиспользуются.

## Матрица приёмки

Этот документ задаёт проверки, не утверждает их прохождение. Для каждой строки
отчёт содержит PASS/FAIL/BLOCKED, время UTC, SHA/digests и закрытую ссылку на
доказательство без PII, ключей и signed URL в Git. Платёжный блок до магазина
и native маршрута — BLOCKED; это блокирует итоговый полный core-CJM.

## Пользовательские сценарии на опубликованном Cloud.ru

| ID | Субъект и действие | Критерий и свидетельство |
|---|---|---|
| CJM-01 | Обычный пользователь, настоящий файл 5400 с | Сервер probe фиксирует 5400 с, запись проходит STT/select/render; журнал попытки и UI |
| CJM-02 | Обычный пользователь, файл сверх 5400 с | Серверный отказ too_long без STT-вызова и списания за обработку; API/UI и журнал |
| CJM-03 | Назначенный владельцем блогер, файл 7200 с | Сервер фиксирует 7200 с, завершённый pipeline на Cloud worker, transcript/clip rows и UI |
| CJM-04 | Владелец задаёт индивидуальный предел, сбрасывает | Значение действует на новую запись; пустое возвращает 7200 с; 1/1441/дробь отвергаются |
| CJM-05 | Не-владелец пытается повысить роль/лимит | 401/403 либо валидированный отказ; права и предел не изменились |
| CJM-06 | Оператор прерывает upload и продолжает | Тот же upload/video, отсутствует повторный credit charge, только недостающие parts |
| CJM-07 | Пользователь смотрит и скачивает клип | Настоящий Chromium Play: currentTime растёт, decoded frames >0, download MP4 ffprobe/sha и ненулевой размер |
| CJM-08 | Три отдельных browser context: owner/blogger/client | Независимые cookie/session; чужие записи и owner API недоступны; публичные ссылки без selector |
| CJM-09 | Клиент приходит по реферальной ссылке | Регистрация и реальное использование привязаны нужному блогеру, повтор страницы не удваивает счётчики |
| CJM-10 | Настоящий тестовый checkout каждого SKU | Native callback, provider lookup, один payment/grant, платная функция и повторный вход работают |
| CJM-11 | Отказ/отмена и повтор/чужое уведомление | Отмена не начисляет; повтор не дублирует; чужой shop/mode/intent/IP не создаёт право |
| CJM-12 | Блогер и владелец сверяют статистику | Одинаковые реальные регистрации/использования/оплаты; целочисленная оценка 20/30%; запрет чужих данных |

Для 90/120 границ ffprobe измеряет настоящие файлы с достаточной точностью;
прежний файл 7199 с не выдаётся за точную границу 7200. Для отказа сверх лимита
допускается отдельный короткий прогон до probe, без обращения к STT.

## Доставка и сохранность

| ID | Проверка | Свидетельство |
|---|---|---|
| REL-01 | A на SSH-целях cloud-c и site-test | Полный SHA, SHA-256 source archive, OCI revision, image IDs каждого web/worker, runtime inspect и health; localdevstage отвергается |
| REL-02 | Источник действительно соответствует SHA | Архив строится Git archive из выбранного commit, из него собираются образы; checksum сверяется после передачи и извлечения |
| REL-03 | Кодовая правка B, A→B→A→B | Наблюдаемая разница ответа health из приложения; на КАЖДОЙ цели и КАЖДОЙ фазе A→B→A→B сохраняются полный SHA, archive SHA, OCI revision, реальные image IDs КАЖДОГО web/worker и HTTP health. После rollback и повторного B сравниваются schema journal, прежние аккаунты и все созданные к этому моменту данные; исходники B на Cloud |
| REL-04 | Подмена/пропуск/неподходящий journal | Негативные synthetic и acid проверки stale image с правильной label, неверного archive checksum, runtime mismatch, отсутствующей цели, частичного отказа |
| REL-05 | Потеря SSH и конкуренция | Remote lock исключает второго writer; после disconnect state=unknown, inspect/reconcile до retry, без auto-resume и расширения ключа |
| DATA-01 | Каждая изменяемая test DB имеет backup | Новый site sourceIdentity/account SHA/journal match test.dump: 5/28; перед apply drift check и полный data baseline, не localstage |
| DATA-02 | Restore и сравнение | pg_restore в отдельную пустую БД с network none и без app/worker; полный journal, counts и хеши значимых строк совпадают со snapshot-derived baseline; повреждённый/чужой backup отклоняется |
| DATA-03 | Cloud 26→28, site 28→28 | Cloud добавляет только 026/027; site не мигрирует повторно; сверены все прежние аккаунты/медиа/платежи/referrals и созданные после baseline данные |
| DATA-04 | Схема при rollback | A и B имеют одинаковые полные journal; иной journal блокирует автоматический откат; БД/volumes не откатываются |
| DATA-05 | Owner exception общего ключа | Полные production-права сохранены; нет новых SA/key/policy/IAM proof/требования 403. Root read-only: policy отсутствует, CORS c/n5 PUT, versioning disabled; Cloud canary только внутри tests prefixes |
| DATA-06 | Code/SDK граница test copies и production objects | Реальный MinIO: один bucket, tests/cloud/ и tests/site/, весь object/list wire трафик и signing prefixed; markers/responses/public signing/retention/multipart; unsafe/unknown mutations без сети; outside canary size/SHA до/после прежние |
| DATA-07 | Переход непустого site-test | DB-whitelist synthetic objects скопирован с size/SHA в tests/site/; оригиналы сохранены, DB keys прежние; чужая ссылка/неснятый pending multipart блокирует смену namespace |
| DATA-08 | Раздельные app/infra projects и точная DB | applicationProject ≠ test infra допустим; pinned containers/volumes/network сохранены, DATABASE_URL DB = binding.dbName и host → exact test DB container; POSTGRES_DB default/main DB/mismatch отклоняются, DB/Redis up отсутствует |
| PAY-01 | Окно нынешнего TEST shop | Согласованы начало/конец, drained intents; UI-оператор переключил native notifications, проверены replay/credits/referrals; callback n5 восстановлен после завершения Cloud intents |
| RES-03 | Release admission site-server | Фактический disk/layers/archive peak с резервом и сохранёнными rollback images; при нехватке apply blocked, global prune отсутствует |
| REG-01 | Build-time wiring и полная регрессия | Точный NEXT_PUBLIC_RELEASE_REVISION/ARG contract, отрицательные runtime/build guards; 7 прежних failures устранены, полный suite реально повторён |

Snapshot-derived baseline снимается из согласованного архива. Для backup→restore
не сравниваем рабочую изменяемую БД в другое время как будто это тот же snapshot.
До apply дополнительно сверяем journal и идентичности тестовых аккаунтов с
текущей целью; несовпадение требует нового backup/reconcile. PII/хеши паролей
не публикуются, агрегатные hashes сохраняются только в закрытом журнале.

## Допуск ресурсов и провайдеров

Перед платными вызовами проверяются реальные настройки целей и новые тестовые
аккаунты. В Cloud-приёмке только два основных STT job: 90 и 120 минут;
каждый job состоит из многих оплачиваемых chunk-вызовов. Два job не означают
два API-запроса. Все повторы считаются в существующем authorizeSttCall и spend log.

На выделенной тестовой цели устанавливаются конечные N5_LIMIT_GLOBAL_MINUTES=240,
N5_LIMIT_USER_MINUTES=240, N5_LIMIT_PAID_USER_MINUTES=240 и
N5_LIMIT_GLOBAL_LLM=4/N5_LIMIT_USER_LLM=4. Перед каждым chunk/LLM dispatch
переиспользуется существующий атомарный SQL-допуск; first dispatch chunk использует
первичное резервирование полного файла, retry дополнительно расходует минуты.
Проверяется отсутствие посторонних пользователей/задач, способных расходовать
эти бюджеты. Если это невозможно — отдельный изолированный счётчик/контур до E2E.

Остаток — limit минус текущий quota_counter; attempts/outcomes не суммируются дважды.
Spend log считает секунды и вызовы, не подтверждённый денежный счёт. Overlap,
округление провайдера и неизвестный результат попытки отражаются отдельно;
обещания денежного hard cap нет. Точный input план/chunk duration и повторные
попытки ограничены существующим кодом; выход за quota останавливает тест.

Обе реальные длинные обработки выполняются только на Cloud и последовательно;
site-test проверяет доставку/повторный выпуск и сохранность медиа, не дублирует платный STT.
Минимальная доступная память до старта 2 ГиБ, диск ≥3×input+2 ГиБ, memory limits
включены. OOM, нехватка резерва или нулевой остаток прекращают тестовый worker;
production и чужие проекты не очищаются. Отрицательные проверки quota/параллельности
переиспользуют integration tests, без новых платных обращений.

Отдельные отрицательные испытания RES-01 и RES-02 выполняются только в disposable
контейнере тестового worker без подключения к production: RES-01 намеренно превышает
малый cgroup memory limit и подтверждает OOMKilled/ненулевой exit; RES-02 использует
ограниченный tmpfs и реальное исчерпание места (ENOSPC). Для каждого сохраняются
состояния остальных контейнеров до/после, ненулевой результат и свидетельство, что
остановлен только тестовый worker, без очистки/перезапуска других проектов.
Production isolation проверяется сравнением container IDs, StartedAt и restart counts
по read-only инвентаризации. Fault injection не выполняется внутри рабочего media job.


## Расчёт реферальной оценки: независимый числовой оракул (QT-07)

Детерминированный PostgreSQL сценарий (не native-платёжный E2E): месяц 2030-01,
Europe/Moscow, paid_at от 2029-12-31T21:00:00Z включительно до
2030-01-31T21:00:00Z исключительно. Блогер B, две ссылки R1/R2, один и тот же
плательщик C: подтверждённые пакеты R1 99000+149000 коп., R2 399000 коп.;
payment/intent согласованы, fulfilled, needs_review=false. Ожидаются R1:2 платежа,
248000 коп.,1 плательщик; R2:1,399000,1; B:3,647000,ОДИН distinct плательщик.
При ставке20% оценки R1=49600,R2=79800,B=129400 коп.; при30% —
74400,119700,194100 коп.; при null все три estimate=null с прежней выручкой.

Дополнительные canceled/pending/refunded/needs_review/self-referral и unfulfilled
intent, а также paid_at ровно на верхней границе месяца, не меняют эти суммы.
Каждая исключаемая запись проверяется отдельно, нижняя граница включается.
После смены/деактивации кода и текущей referral записи платежи со snapshot R1
остаются у R1; новые платежи со snapshot R2 учитываются R2. Возврат именно
R1-платежа149000 коп. даёт R1=99000,R2=399000,total498000; @20%
19800/79800/99600, @30%29700/119700/149400 коп.

Сверяются владелец и собственный кабинет B; другая учётка не видит эти данные.
Результат фиксирует входные строки/идентификаторы и агрегаты только приватно.
Переиспользуются blogger-report PostgreSQL tests; недостающие cases добавляются
в тот же файл. На живом Cloud отдельно сопоставляются реальные registration/usage
и native test payments по каждой использованной ссылке, обе ставки и null через
owner UI, исходные суммы из provider-confirmed receipts и independent integer
calculation. Не выдаём seeded January fixture за native события текущего месяца.
