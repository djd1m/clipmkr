# Протокол проверок переноса

09.11.2026. Итог: NOT READY FOR CUTOVER. На целевом VPS запущена защищённая QA-копия web с отдельной базой; исходный сайт и DNS не переключались. Ранние результаты ниже сохранены как история, актуализация — в конце.

| Требование/риск | Проверка | Факт | Ограничение |
|---|---|---|---|
| FR1/неверная цель | DNS/IP + docker DNS из web + read-only PG | source39accounts/42video/71clip; stage1/0/0 | Последовательные live-срезы, не финальный freeze |
| FR6/потеря данных | Предварительные4pg_dump/restore плюс3exported snapshot dump+полная сверка табличного содержимого | 4restore0; same-snapshot SHA-256/count всех27main+27legacy+57support совпали после restore; временные БД удалены | ACL/роли и согласованность PG/Redis/S3 перед cutover не проверены |
| FR3/двойная запись | отдельный архитектурный разбор | Риск watchdog/retention и Redis подтверждён кодом | Freeze/relay/queues NOT RUN |
| FR2/S3 | сохранение namespace в ADR | План | HEAD/GET/media inventory NOT RUN |
| FR4/приёмка | основной CJM + почта/TEST checkout/support | План | E2E NOT RUN |
| FR5/DNS | отдельная ручная команда после приёмки | Переключения не было | TLS на новой цели NOT RUN |
| FR7/rollback | разделены R1/R2 | План | Обратный restore NOT RUN |

Изолированная архитектурная консультация Astra xhigh получила документы/код без секретов, runtime не проверяла. Она не является независимым код-QE или closure QCSD. Обслуживающая модель не аттестована.
Раннее независимое ревью документов Terra xhigh: NOT READY FOR EXECUTION/CUTOVER; выявлены открытые условия полноты support, freeze/late webhook, R2/off-host состояния, S3, изоляции и TLS/ресурсов. Они перечислены в плане, не объявлены закрытыми.

Архив uploads поддержки сохранён, tar-list0, каталог на срезе пуст. Backup Redis и S3 ещё не снят.

K1/K2, QCSD, код/QE/fleet checkpoints не выполнены. Положительные исторические receipts других фич не используются как допуск этого переноса.

## Code/spec anti-drift текущего подготовительного среза
Продуктовый код, Compose, origin, DNS, финансовые строки и рабочие БД не менялись. Новые документы/OpenSpec не объявляют перенос выполненным; структурная OpenSpec validation и git diff --check проверяются отдельно. Приватные backup/receipt находятся вне Git. Проверка восстановления затрагивала только созданные для неё временные БД внутри существующего PostgreSQL; они удалены после успешной проверки.

Обновление разрешения: владелец ответил «действуй» на предъявленный план. Это не DNSGO. Проверка фактического маршрута исключает прежнее предположение о legacy TEST backend для основного домена; старый n5 остаётся отдельной целью, сохраняется архив, автоматический перенос его runtime не включается. Подробности и ограничения сетевого доказательства фиксируются в operations-routing.md.

## Актуализация: допуск к подготовке

- Native ideation evaluate: exit0, `closed`, revision `cc37192df7fdf3de2ca33101c4d7e142ad57c9c080b7cc2ad96c605b70146e7d`, unresolved/reasons пусты. Три исходных независимых проверяющих подтвердили исправленный дизайн по десяти условиям. Это не проверка работающего приложения.
- K1: имя тестового модуля свободно; точная инвентаризация трёх новых путей. K2: PASS, 0 ошибок, 0 предупреждений, 1 SKIP — acid corpus не объявлен. OpenSpec strict validation: valid.
- Закреплённый dz записал настоящий checkpoint `plan`, измерив восемь существующих артефактов. Подготовка разрешена владельцем; переключение DNS и окно магазина требуют отдельных решений.
- Current code-target admission: `admitted`, manifest `127b50adb0a04427163a428f0efbed014ff3e258f19e6f9553cda7b0e5548088`. Literal coder context: `complete`, digest `e05350cb755399c84f7048cd5bc0a643c086e46c13f707e91cd275fc93452100`.
- Базовые тесты `storage-prefix`, `proxy-rate`, `config`: 72/72 PASS. Это unit-проверки исходного кода, не новый runtime E2E.
- Копии архивов сохранены также на исходном сервере, SHA-256 совпали. Там же восстановлены main/support во временные базы: совпали хеши строк всех 27/57 таблиц, временные базы удалены. Это предварительная репетиция PostgreSQL, не полный R2 с Redis и файлами.
- Read-only S3/CORS: существующее правило разрешает `https://77.83.87.178`, GET/HEAD/PUT и необходимые заголовки; изменения CORS не потребовались. Browser upload/playback ещё NOT RUN. Инвентаризация файлов и её исходные ограничения — в `operations-storage.md`.
- Начато восстановление отдельных назначений на target. Main восстановлена; первая попытка support остановилась до создания таблиц на праве владельца `pg_trgm`. Администраторское расширение сохраняется, из списка восстановления исключены только его CREATE/COMMENT; исправленная попытка проверяется отдельно. Ошибка не скрыта и не устранена повышением прав приложения.

### Anti-drift на границе подготовки

Документы разграничивают предварительный backup и финальный согласованный срез. Существующие 65 записей готовых клипов с NULL object keys не считаются 65 переносимыми файлами; исходные пропуски не исправляются этим переносом. Отдельные базы назначения не обслуживают пользователей. Рабочие source данные, callback, DNS и Cloud.ru не менялись. Код конфигурации находится в реализации; независимое код-ревью, runtime E2E и полный rollback остаются открытыми.


## Актуализация 09.11: изолированный web запущен

- Main/support назначения восстановлены. Строки всех 27/57 таблиц и 56 support sequences совпали с соответствующими архивами; support QA также совпала. Сравнение схем/ACL не выявило расхождений определений; роли приложения ограничены, исходные роли superuser не перенесены.
- QA main содержит схему, 28 миграций и одну согласованную учётную запись с исходным хешем пароля. Это не полная пользовательская база для QA. Основные импортированные базы не подключены к приложению.
- Scoped Redis drill: четыре синтетических ключа, бинарные значения/типы/остаточный TTL сохранены; BUSYKEY и повреждённый payload отвергнуты. Сняты предварительные read-only DUMP источников (main263/support16/legacy33 ключа). Полный согласованный R2 ещё NOT RUN.
- Авторские проверки конфигурации: 76/76 тестов; независимые: 62/62. Проверены настоящие Compose5.6/Caddy2.11.7 и offline SDK из точных образов источника, без S3-запросов. Общий typecheck остаётся с четырьмя исходными ошибками вне новых файлов.
- Независимый cross-model QE (`gpt-6-astra xhigh`, отдельная сессия; serving model NOT_ATTESTED) разрешил CP-QA при выключенных оплате/почте/callback. Native QE цикл1 остаётся conditional: `qe-primary-01` требует решить ответ200 на неизвестный payment intent перед платёжным окном. Revision `7894687508c57ee8f35e2a08b7eaed357d72a57968affad8ecab7790e27e2638`; успешная closure не заявляется.
- Локальные старые три воркера остановлены; existing PostgreSQL/Redis не пересозданы. Web использует точный source image, QA DB/Redis4 и ограниченный S3-prefix, restart=no. Исходный сайт продолжает работать.
- Сетевая проверка обнаружила ранний ACCEPT в Tailscale: собственный точечный guard установлен первым FORWARD, дополнительно DOCKER-USER/INPUT и nft bridge guard. Чужие правила не удалены. Synthetic probes: Caddy→web/support200; соседний контейнер→host5811/5812 и direct container ports — timeout, 6/6 ожидаемых результатов.
- Docker internal network не публикует requested support port. Временная операторская замена — штатный transient systemd-socket-proxyd, только172.29.8.1:5812→проверенный supportIP:9000. Internal network сохранена. Перед заменой synthetic support на приложение остановить socket/service, перепроверить containerID/IP и повторить probes; это не постоянная production-конфигурация.
- Target Caddy перезагружен с сохранением inode исходного bind-mounted файла; четыре посторонних маршрута сверены. HTTPS с настоящими сертификатами: IP/main/support/www без пароля401, с паролем200 (www308). Узкий POST TEST callback503. DNS не менялся; hostname probes использовали локальный resolve.
- Настоящий Chromium открыл QA landing: HTTP200, форма регистрации/входа присутствует, pageerror отсутствуют. Это пока не приёмка нарезки, оплаты, почты или истории поддержки.

Оставшиеся обязательные проверки: полный browser CJM с реальным S3, поддержка, почта, согласованное TEST-окно с закрытием qe-primary-01, полный R2, актуальный финальный freeze и ручная приёмка. Новые конфигурационные файлы не меняют продуктовую логику; частичный runtime успех не объявляет перенос завершённым. Приватные профили/пароли/скриншоты находятся вне Git.


## Browser CJM и исправление support ingress

- В настоящем Chromium созданы synthetic QA account и сессия: регистрация200, автоматический переход `/dashboard`. В QA также сохранены ID/хеши двух согласованных реальных учётных записей (плательщик и владелец); исходные пароли не менялись.
- Реальный120.000s файл загружен через UI→Cloud.ru S3 (OPTIONS200/PUT200), complete202. STT/select/два render завершены без повторов:2/2 clips DONE; расход2min STT/1LLM. Все три QA worker после результата остановлены exit0.
- Оба видео воспроизводятся в Chromium: currentTime>0.2, videoWidth1080/videoHeight1920, media.error=null. Через UI выбраны и скачаны оба клипа:6 710 269 и3 934 902 байта; ffprobe подтверждает H.264/AAC,1080×1920,48.52s/25.6s. Первые download probes ошибочно искали вторую одновременно видимую кнопку: фактически нужно сначала выбрать фрагмент. Исправлен private тест, приложение этим не менялось.
- Support первоначально принимал логин, но API возвращал401. Контролируемая проверка одной cookie: без внешнего Authorization200, с QA BasicAuth401. Это фактический конфигурационный дефект, а не потеря перенесённых обращений.
- Support-only repair удаляет Authorization перед Libredesk после проверки BasicAuth; main/callback прежние. Native begin-repair после actualdelta принят: revision `4316c1d2e34fb110ade84210df6b4568a7bbc0a1f52fc77f6911a780aee6d9c7`. Автор RED→76/76PASS; независимый pre-apply14/14PASS, guard-removal falsifier,13/13manifest hashes. Это не closure всего QE.
- После target-only Caddy reload одна cookie через защищённый TLS edge: valid credentials200, absent/wrong401. Browser Libredesk показывает My Inbox3/Unassigned8/All11; Invalid credential отсутствует. Создание нового QA обращения/attachment ещё не принято.
- Один browser forgot202 для владельца; QA `support_email_token.delivery_state=accepted`, затем отправка снова отключена. Владелец подтвердил получение письма в чате. Исходный пароль не менялся;202 само по себе не объявлено подтверждением доставки.
- External source-host probes к target public5811/5812 блокируются; после подключения existingDB/Redis к support bridge повторены same-bridge отрицательные проверки. Три исходящих support TCP probes (внешний IP/source/target443) заблокированы. Реальный tailnet-client probe пока NOT RUN.
- `dz teach` сохранил подтверждённый сетевой урок `teach:2375dbebc4aa6262`; повторный lexical recall его вернул. Старый Node24 дал ABI mismatch better-sqlite3; фактический рабочий запуск использовал закреплённый Node22 и SQLite store.

Anti-drift: product source logic/DB schema не изменены; QA support repair только Caddy+contract test в ранее допущенных путях. Рабочий source, DNS, Cloud.ru и source callbacks не менялись. Платёжное условие qe-primary-01, полная R2 репетиция и финальный cutover остаются открытыми.


### Дополнение: поддержка и границы QA-авторизации

Native evaluate второго цикла: exit1, `unresolved:[qe-primary-01]`, sequence4, eventDigest `9cf6feaf6ba4409e3caf8cf76589b08f04e365ba2bebe1122564a44da6a469e2`. Support condition02 проверено независимым reviewer, платёжное01 не закрыто.

Созданы два синтетических обращения только в QA support; через native operator UI к одному добавлен ответ и реальное вложение69байт. Upload API200/message API200; media1→message23→conversation13, disk size/SHA совпали с синтетическим файлом. Это не обращения рабочей поддержки.

Публичный widget под дополнительной QA BasicAuth не принят: инициализация200 не доказала дальнейший обмен; заголовок авторизации виджета нужно отдельно учитывать в защищённом preview. Само синтетическое сообщение проверено native widget на private container endpoint, доступном только оператору хоста; внешний и соседский обход закрыты. Operator attachment создан через защищённый agent UI. Эти проверки не объявлены полным публичным widget E2E. После нового browser context widget-state не сохранился в Playwright storageState; причина не установлена и исторический backlog хранения истории не закрывается переносом.


### Репетиция R2: фактический снимок и первый restore

Локальные QA web/support и три воркера остановлены, активные подключения к QA PostgreSQL отсутствовали. Снимок содержит 27 main/57 support таблиц, 56 support sequences, Redis4/5 (19/23 ключа) и шесть локальных файлов. Синтетическая цепочка account→video→fake payment→credit grant создана только в QA; она проверяет сохранность связей, но не является оплатой через ЮKassa. Реальное QA-вложение поддержки включено. Независимый recheck операторского скрипта закрыл два замечания до запуска; это не новый native QE cycle.

Повреждённая копия pg_dump отвергнута настоящим pg_restore, повреждённая копия вложения и неполный manifest отвергнуты. В новые отдельные базы на прежнем сервере восстановлены main/support: все строки, определения схем и последовательности совпали. Рабочие базы сайта и маршрутизация не изменялись.

Restore остановлен на строгой проверке Redis: все19 main ключей присутствуют, однако DUMP SHA четырёх hash-ключей отличается. Target Redis7.4.12, source7.4.11. Причина ещё проверяется сравнением самих бинарных полей/значений; различие сериализации пока гипотеза. Support Redis13 остаётся пустым. Повторный импорт поверх существующих ключей не запускался, общий R2 PASS не заявляется. QA остаётся остановленной до завершения сверки. Исходное приложение продолжает работать.


Дополнительная read-only диагностика подтвердила точное равенство бинарных полей и значений всех восьми main hash. Для каждого текущий target DUMP совпал с исходным frozen archive; расхождение четырёх source DUMP не означает изменение значений. Узкая проверка сравнивает hash по бинарным парам; остальные типы сохраняют DUMP-byte проверку, типы и оставшийся TTL проверяются отдельно. Подготовлены sidecar для8/20 hash с привязкой к неизменённым архивам. Read-only continuation: main19/19 keys прошли проверку, support13 empty, PG повторно совпали, пять source apps сохранили ID/image/StartedAt. Это ещё не apply/полный R2 PASS. Подтверждённый урок `teach:b0caebf236bf3f32` записан pinned dz; повторный recall вернул его.

Для исходного платёжного условия подготовлена самостоятельная S-зависимость `features/guard-relocation-test-webhook`:4 code targets, actual K1/K2/OpenSpec/native pre-code gates. Она не закрывает migration qe-primary-01 и не сбрасывает два parent QE cycles. Реальные DB-тесты изолированы в отдельной локальной базе `_test` на существующем PostgreSQL, новых контейнеров нет. Развёртывание нового QA образа и родительская проверка ещё не выполнены.


### R2: завершённая ограниченная репетиция восстановления

09.11,21:37UTC: reviewed continuation выполнен root, exit0. Main/support в новых source test DB сохраняют все строки/определения/последовательности. Main Redis19/19 проверен без повторного импорта; support Redis23/23 восстановлен в предварительно пустой DB13. Бинарные значения, типы и остаточные TTL совпали; в обоих Redis реальные BUSYKEY и corrupt-DUMP probes отказали, payload не изменён. Все шесть приватных файлов восстановлены в отдельный каталог и совпали по bytes/SHA/mode; фактическое вложение включено. Исходные восемь artifacts сохранены неизменными. Независимый recheck перед apply проверил sidecars8/20 и шесть отрицательных read-only случаев.

Итого DRILL-R2-ALL data roundtrip пройден в согласованных изолированных назначениях. Source application не запускалось на восстановленных тестовых данных, пять работающих source приложений сохранили ID/image/StartedAt, DNS не менялся. Это не переключение сайта, не обещание RPO0 и не закрытие DRILL-STARTUP-UNKNOWN. Тестовые DB/roles/Redis13 и private artifacts пока сохранены для аудита; автоматического cleanup нет. QA writers остаются stopped до следующей контролируемой проверки.


### DRILL-STARTUP-UNKNOWN: фактический запуск без прочитанного ACK

После R2 весь QA ingress переведён в503: actual TLS GET/POST без auth и с неверным BasicAuth по IP/main/www/support дали16/16 ожидаемых ответов. Независимый review подтвердил точное сохранение остальных четырёх сайтов/TLS/globals. Первая попытка потери ответа закрыла socket слишком рано: Docker отменил запуск с context canceled, StartedAt не изменился. Она не засчитана.

Вторая попытка оставила Docker request соединение открытым3с, но ни разу не читала ответ. Отдельный inspect и engine start event подтвердили фактический запуск того же QA web; затем он остановлен, все QA writers и DB clients проверены. Старый snapshot не активировался. При закрытом ingress снят новый полный R2 snapshot после этого старта:27/57таблиц, Redis22/26ключей,7файлов. Его восемь artifacts скопированы off-host и сверены SHA; нового source DB restore не выполняли. Доказано исполнение операторской последовательности maintenance→актуальный backup. Отдельного технического interlock, запрещающего root вручную выбрать старый R1, нет; такой автоматической гарантии не заявляем.

После снимка возвращены текущие QA web/support и прежняя защищённая Caddy-конфигурация; три воркера stopped. Повторные network probes6/6, unauth UI401/owner health200/callback503. Браузер повторно воспроизвёл и скачал оба ранее созданных клипа:1080×1920, error=null, размеры совпадают с первым проходом. Source сайт/DNS/рабочие данные не менялись. Временная maintenance-конфигурация удалена из активной конфигурации; private evidence сохранено.

## QA guard: независимый третий цикл и фактическое обновление

Исходная роль `qe-primary`, независимая сессия `gpt-6-astra xhigh`, проверила семь cumulative code targets и обе сохранённые condition01/02. Actual scoped suite:106/106 PASS,0skips;26/26 snapshot hashes и4483/4483 файлов isolated source context совпали. Native evaluate: exit0,closed,revision `10630462e49286bd8fb7ec69c58d635108f9fe55c3ef7fc4a2cc3c75e6aa3614`,sequence6,три witnessed cycles. Условия и история не сбрасывались. Это closure ограниченного config/component исправления, не всей миграционной приёмки.

На существующем QA VPS пересоздан только web с image `sha256:d1880bc89258fd88c27bdcd3f9393c69bb70ebdf6bf4e54216f92cbd946688f9`; все значения его environment совпали с предыдущим контейнером. Применён candidate Caddy `de1bc79fdc2a84124237ec87b39d52dd066e97eb7d63a4c9bb50a63d5a2bab4e`: ровно удаление TEST canonical rewrite, inode сохранён; reload0 и actual loaded JSON равен адаптированному candidate. Callback закрыт503, payments/mail выключены, workers остановлены. Source web проверен healthy, без перезапуска.

После обновления: unauthenticated UI401, защищённый `/health`200, closed TEST503; прямой новый route внутри QA при off-profile503. Первый операторский probe ошибочно использовал отсутствующий `/api/health` и получил404; это сохранено отдельно, исправленный URL проверен200. Шесть actual network probes PASS (оба разрешённых upstream200, четыре обхода заблокированы). Повторный браузерный просмотр двух готовых клипов:48.52/25.6сек,1080×1920,таймердвижется,error=null; оба download завершены без ошибки. STT/LLM, новое письмо и оплата повторно не запускались.

Code/spec anti-drift: source canonical handlers/worker images/данные не менялись; QA новый image и direct TEST route соответствуют AM8/9, OpenSpec и плану. Targeted config5/5 PASS, два возврата старого поведения действительно ломают assertions. Host общий suite/typecheck сохраняют описанные в child08 baseline ограничения; они не скрыты успешной изолированной сборкой. Незакрыты: merchant delivery/payment UI E2E, прочие явно указанные core-CJM приёмки, финальная свежая копия данных после остановки writers, ручная приёмка и отдельное разрешение DNS.

## Проверки после TEST-окна и восстановления сессии

Владелец согласовал временное TEST-окно и сообщил о смене callback на QA IP. Read-only inventory подтвердил один магазин у main/legacy/cloud; независимое чтение фактических compiled handlers выявило действующий unconditional checkout=false fence в legacy/cloud (10 совпадающих runtime файлов). Main сохранял персональное исключение; независимо проверенный override удалил только N5_TEST_CHECKOUT_ACCOUNT_ID. Пересоздан только source web с прежним image4afa; остальные четыре main/support app ID/StartedAt сохранены. После перезапуска сессии повторно проверено: source и QA healthy. Authenticated source negative probe: login200, checkout503checkout_paused, logout200; counts payment_intent4/payment_event0/payment0 неизменны.

Provider GET четырёх source намерений вернул3canceled и1succeeded/paid/test=true,990рублей; metadata соответствует intent. Успешное намерение создано02.11, source ledger его не применил. Это наблюдённое историческое расхождение, а не доказательство причины. Новая QA оплата не запускалась. Владелец затем подтвердил возврат callback на старый clipmkr.ru/api/webhooks/yookassa-test; ручной повтор не выполнен. Дополнительное исправление финансовых записей пока не разрешено. Основной сайт работает, новые TEST покупки временно закрыты, обработка уведомлений включена.

Независимый QA desktop smoke: свежий login/logout, account settings, сохранение темы икомпоновки после reload, обычному аккаунту ownerAPI403, безBasicAuth401, два клипа проигрываются. Нет отдельной приёмки blogger/owner credentials иполного трёхролевого пути.

Read-only original-media check с нового VPS: единственный source clip с object_key полностью скачан из настоящего S3,23087439байт; SHA256 `509b52e10b50c857426968d3120158ec99001f333664c74e604b9e39969052c5`. ffprobe:H264/AAC,1080×1920,71сек. Chromium получил действительную подписанную S3 ссылку, currentTime0.96сек/error=null. Объекты не изменялись. Результат не распространяется на65 исходных done clips с NULLkeys. Приватный файл не коммитится.

Production candidate подготовлен офлайн из исходных образов инастроек с заменой data bindings; наличие кандидата не означает разрешение запуска. Private mounts/resources ещё требуют конкретизации и independent review. Полные fleet assessment ифинальная приёмка не объявлены завершёнными.

## Уточнение порядка и свежий перенос данных22:38UTC

Владелец потребовал перенести необходимые базы до тестирования оплаты. Требования, план и OpenSpec обновлены с exact hash; strict OpenSpec validate exit0. Выполнены pinned recall→teach `teach:ee20a38d1bb5bf9e`→recall, урок реально найден. Нового native QE closure на изменённые нормативные bytes не заявляется; прежняя closure семи code targets остаётся исторической.

В каждом source PostgreSQL открыт свой REPEATABLE READ READ ONLY exported snapshot, pg_dump использовал тот же snapshot, rows manifest вычислен до его закрытия. Main/legacy/helpdesk dumps переданы на target, SHA совпали. В существующем localPG создан NOLOGIN owner и три новые snapshotDB с PUBLIC CONNECT revoked; существующие DB не очищались. Restore exit0; полное равенство row manifests по27/27/57 таблицам. Это три согласованных внутри своих БД снимка, не атомарный cross-store final snapshot: writers не заморожены.

Дополнительно сравнили первоначальные main/support imports с новым snapshot: support57/57 совпадает; main отличается в clip_link(66/66строк),growth_event(166→167),session(159→160). Это основание обязательной финальной синхронизации, а не разрешение включить старый import. Fresh proof находится в private fresh-transfer/.

Production private candidate исправлен по независимому замечанию: сохранена exact source support log rotation; конкретизированы15mount/resource значений, all7services config render exit0. Первый saved render ошибочно исключал app profile; исправлен explicit production-cutover-NOT_READY и повторно проверен reviewer. Source images/business env сохранены; изменены только data bindings. Caps предварительные5.5GiB/8CPU, full-duration load NOT RUN, dirs пусты, activation не выполнялась.


### Закрытие временного платёжного окна

По указанию владельца проверка оплаты отложена до переноса данных и запуска перенесённого приложения. На старом сайте восстановлены исходные настройки web, включая прежнее персональное разрешение тестовых покупок; образ и остальные сервисы сохранены. Повторная фактическая проверка Docker: running healthy. Владелец подтвердил возврат URL уведомлений на старый домен. На QA оплата выключена, TEST callback закрыт. Финансовые записи не исправлялись, DNS не менялся.

Независимый cross-model reviewer подтвердил свежий перенос: main27таблиц/994строки, legacy27/159, helpdesk57/138. Все111таблиц совпали по counts/digests; SHA трёх dump и трёх manifest совпали на обоих VPS. NOLOGIN/ACL и отсутствие иных клиентов проверены. Это предварительные снимки при работающем source, не финальная синхронизация и не готовность к DNS.
