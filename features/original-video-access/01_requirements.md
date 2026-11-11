# Доступ к исходной записи — требования

## Источники и согласование

Исходный commit `e66d9addfad16e1b6dcd7bd07bf06c5abb1343f1`; исследовательский пакет `docs/research/original-video-access/` и переданное root поручение владельца 11.11.2026 реализовать этот пакет параллельно Zoom03. Надпись «макет не согласован» в историческом README сохраняется как состояние исследования; её не переписываем задним числом. Источник текущей авторизации — сообщение владельца, переданное root, не наличие файла. Root фиксирует точную квитанцию согласования/checkpoint.

Pins sha256: README `7ffe7bb51c42c1d31e03cff16e21f055751d763f631a345d451aafa0aae9c403`; mockup.html `ddfedb3cf797237955f044c22d5663cb07af8663771ed7c9cf03fc675484c174`; mockup-390.png `24a44792e98d385d9d6fe8ce3df38b387a2f5685c9a14bab3110503fdbd21ab5`; viewer-1440.png `803ed81fb251061f90d170722461d8ff3361411ae42fdd779205e916535c0a9b`.

OpenSpec delta: `openspec/changes/original-video-access/specs/original-video-access/spec.md`; её точный hash закреплён в `requirements-pin.json` после записи. Feature-adr — владелец исполнения, OpenSpec не заменяет gates.

Инженерная дельта11.11.2026: root в фактическом сообщении сессии `/root/original_video_architecture` разрешил same-origin stream для Zoom canvas/ownership: S3 signature≤900 остаётся server-internal, каждый Range проходит auth, attachment/inline headers отдаёт приложение; нет клиентского bearer/URL-refresh. Это решение координатора по реализации, не утверждение, что владелец задал конкретный протокол. Предыдущие требования и OpenSpec SHA `e45e4b6d1f4bafbdbbdfab0ccbe79892061312553c78fdcc456eaca31b2546bd` сохранены в `history/design-r0/`.

Конкретное дополнение состояний подготовлено: `docs/research/original-video-access/states.html`, SHA256 `6521026a864be1ca323cd082ecb402360062bd12b65a1e5fae71ab67ffe10953`, 8 состояний × 390/1440 × dark/light. Его owner approval остаётся pending у root; нормальные «Смотреть/Скачать» уже авторизованы и повторно не согласуются.

## Участники

Пользователь/блогер/владелец читают только собственный исходник. Владелец принимает UI и тестовую поставку; независимое QE назначает координатор.

## Функциональные требования

Все FR — MUST.

| ID | Условие/действие → проверяемый результат |
|---|---|
| FR-1 | Собственная активная запись с завершённой загрузкой и подтверждённым объектом → компактная строка «Исходник · Смотреть · Скачать» под заголовком, реальные длительность/тип/HEAD bytes; без выдуманного срока |
| FR-2 | «Смотреть» → исходник в существующей области без autoplay; выбор клипа сохранён; «К клипам» и выбор клипа возвращают его; играет один media; keyboard/focus и 390/1440 px соответствуют pinned макету |
| FR-3 | «Скачать» → attachment с безопасным UTF-8 именем и расширением проверенного контейнера; исходное имя не обещается, поскольку его нет в БД; браузер получает файл без JS Blob/полного скачивания сервером |
| FR-4 | Аноним, foreign ID, неизвестный ID, удалённая запись/неактивный аккаунт, owner против чужой записи → одинаковый 404, без метаданных, HEAD/GET и подписи; guest/showcase/referral не дают доступ |
| FR-5 | Загрузка не завершена → нет подписи; завершённый объект во время обработки допустим; отсутствие объекта → недоступен; timeout/5xx S3 → временная ошибка, не ложное удаление; неизвестный TTL не превращать в expiry |
| FR-6 | Same-origin GET/HEAD и Range повторяют авторизацию; server-internal S3 GET signature≤900с и меньшего реально известного source срока. Range/206/seek подтверждаются на Cloud.ru; браузер не получает bearer/redirect и использует тот же URL после900с. Новый запрос получает свежую подпись; позиция/pause не сбрасываются автоматическим обновлением URL, бесконечного retry нет |
| FR-7 | MP3/M4A → аудиопросмотр, MOV/WebM/MP4 → по проверенному контейнеру; неподдержанный codec → честный отказ просмотра при доступном скачивании, без платной конвертации |
| FR-8 | Чтение/скачивание → не запускает jobs, не меняет credits/growth clip download/retention; готовые клипы живут независимо |

Уточнения FR-2/FR-5/FR-7 после независимого QCSD r1:

- `clips.length=0` и ready source: «Смотреть» открывает исходник в имеющемся месте `clip-grid` рабочей области; списка/выбора фиктивного клипа нет. «К клипам» закрывает и выгружает source, показывает прежнее empty-state текущего `video.status` и возвращает focus на «Смотреть». Header/progress сохраняются. Если клипы появились во время source, действующий poll выбирает первый обычным способом; возврат показывает этот клип. При существующих клипах выбранный ID и DOM не меняются.
- Media error не закрывается успешной проверкой metadata. При результате ready в прежнем viewer остаётся «Не удалось воспроизвести исходник. Нажмите «Смотреть» ещё раз или скачайте файл» (для audio — «Слушать»). Прежнее действие запускает ровно одну новую попытку по явному нажатию, без автоматического reload; native playback/ready подтверждаются фактическим событием media, не metadata. При incomplete/missing/error/404/429 применяется точная таблица05 без ложного unsupported или обещания удаления.
- Оба визуальных примера входят в обновлённый пакет states.html для однократного согласования всех дополнительных состояний владельцем; новых кнопок, панелей или меню нет. Условия OQ-QUALITY-1/OQ-QUALITY-2 остаются открыты до проверки originating reviewer и не означают owner approval.

## Нефункциональные требования

NFR-1: авторизация через существующие session/rate-limit/UUID/active account/ownership и DB object_key; никакого client supplied key. NFR-2: media/metadata/errors `private, no-store`, `no-referrer`, безопасные сообщения без сырого S3 error/URL/token; подписи не попадают в browser, SSR, list/get poll, logs, telemetry, local/session storage или Git. NFR-3: HEAD и локально ограниченные первые≤4096bytes только по запросу отдельного original read seam, не HEAD всех видео в 5-секундном poll; не вводить cross-user cache. NFR-4: существующий signer сохраняет byte/URL контракты clip/showcase без новых options; изменения stream/bytes helpers обратно совместимы. NFR-5: отсутствие новых env/schema/integration; реальный Cloud.ru, не MinIO как доказательство поставщика.

## Ограничения и границы

Нет изменения retention, новых публичных original endpoints без account check, массовых операций и автоматической конвертации. Не доказывать наличие исторических исходников одним примером. Не изменять email/payment/Cloud/DNS и существующие исследовательские материалы. S3 fixture uploads только после gates в тестовый prefix; planning не скачивает production media. Источник lifecycle/purge неизвестен: не обещать вечного хранения. Истёкший clip не означает истёкший source. Начавшийся авторизованный stream не обещает немедленного отзыва; следующий запрос проверяет session снова. Accepted source overwrite не входит в scope; sourceRevision означает immutable upload identity, не content hash.

## Открытые вопросы

Дополнение loading/check-failed+retry/missing/incomplete/audio/unsupported нарисовано и ожидает owner approval до frontend, как требует AGENTS.md. Специальный URL-refresh UI не нужен для выбранного server-internal signing. API/MIME/generated filename определены в ADR/05; QCSD и настоящие K1/K2 ещё требуются. Runtime lifecycle inventory выполняется read-only после согласования доступа; без него срока в UI нет. Иных продуктовых уточнений для backend scope не требуется.
