# ADR-002: Проверять полный hash и строго сохранять account-scoped session v2

## Status
proposed; заменяет storage/identity часть ADR-001. Обратимо до внедрения, но автоматическое
продолжение legacy не восстанавливать без отдельного доказательства байтов старых частей.
Пересмотреть при запросе owner-scoped recovery после утраты sessionStorage.

## Context
Старый fingerprint не различает изменённое содержимое с прежними name/size/mtime.
Общий cache применим к другому вошедшему аккаунту; произвольный JSON не валидирован.
Серверная идемпотентность действует по сохранённому key, а не по metadata/hash.
FR-4/FR-5/FR-6/FR-7/NFR-1 требуют bounded client resume без новой DB/endpoint; create input узко расширяется expected account_scope.

## Decision Drivers
1. Не смешивать части двух файлов — high.
2. Не расходовать новый slot по неявному fallback — high.
3. Честная ограниченная recoverability и память до 2GB — high.
4. Переиспользование действующего multipart и узкого OSS — high.

## Considered Options

| Вариант | Плюс | Минус |
|---|---|---|
| metadata/sample hash | Быстро, мало CPU | Не доказывает полное тождество, допускает middle-byte collision |
| Полный incremental SHA-256 + session v2 (выбран) | Все байты, bounded memory, прежний key | CPU/диск на полный локальный pass; утрата cache не восстановима |
| Whole-file WebCrypto digest | Нативная криптография | Полное buffering File неприемлемо для 2GB |
| Server-owned hash/recovery API | Выдерживает утрату локального manifest | Новые DB/API/rollout, не требуется ближайшему исправлению |

## Decision
Добавить точный @noble/hashes 2.4.0 в apps/web/package.json и общий package-lock.json
одним integration owner. Import sha256 из @noble/hashes/sha2.js. Узкий helper
lib/upload-file-identity.ts: hashUploadFile(Blob, AbortSignal), UPLOAD_HASH_CHUNK_BYTES=4MiB.
Ровно один slice.arrayBuffer в работе; update всех байтов по порядку, digest→lowercase hex.
Signal до/после чтения и update, macrotask yield между chunks; не свой SHA и не Worker framework.

lib/upload-resume.ts владеет strict Zod parser и результатами чтения/записи/удаления.
Публичные exports: UploadResumeV2, UploadResumeRead, UPLOAD_RESUME_VERSION,
uploadResumeStorageKey, readUploadResume, writeUploadResume, clearUploadResume.
Schema: version literal2; accountScope/key/videoId UUID; identityAlgorithm literal sha256;
contentSha256 /^[0-9a-f]{64}$/; size safe integer 1..MAX_UPLOAD_BYTES; originalFilename
непустое с границей действующей createVideoSchema; options music/teaser/compact boolean,
ctaKind из действующего закрытого набора, ctaUrl по существующему ctaProblem/parseCtaTarget.
Не нормализовать неизвестные ctaKind в none; неверный cache отклонить.

Нет server receipt: только намерение до create. Есть server receipt: videoId и partSize
обязательны вместе; partSize positive safe int в серверно допустимом диапазоне.
Если присутствует parts, требуется nonempty array с etag nonempty opaque string и
последовательными part_number=1..ceil(size/partSize), без дублей/пропусков; максимум
по существующему complete schema. Это complete-ready, не cache отдельных in-flight частей.
Не хранить upload URLs/expiry/File/AbortController/токены. Account prop из dashboard обязателен,
не имеет дефолтного «общего пользователя». Он не заменяет auth/ownership сервера.
Старая вкладка может сохранить A prop при общей cookie B. Каждый v2 create/refresh подписей
передаёт `account_scope`=ожидаемый UUID. createVideoSchema в upload-contract.ts принимает
optional UUID: отсутствие совместимо со старым клиентом; malformed→422 до побочных действий.
VideoService.create сравнивает его с authenticated account до transaction/claim/quota/S3;
mismatch→UploadError conflict409 «Аккаунт изменился. Обновите страницу». Scope не выбирает
account и не даёт прав. Клиент сохраняет File/manifest, запрещает fallback/PUT/Complete/redirect.
Complete ownership 404 не меняется. Один client preflight оставляет TOCTOU и недостаточен.

readUploadResume возвращает found / absent / legacy / invalid / storageUnavailable, а не
молча null. Приоритет valid scoped v2; legacy global key только диагностируется и не
мигрирует. Смена account prop инвалидирует локальную попытку и очищает File/in-memory refs,
не удаляет manifest другого account. Clear/remove выполняется только для ожидаемого scope/key
и текущего generation; compare-before-remove не является межвкладочным lock.

Durable checkpoints: записать manifest и прочитать/проверить эквивалентный v2 до create,
сохранить server receipt до первого PUT; сохранить full parts до Complete. Любой set/readback
failure останавливает следующий network шаг. Текущий in-memory key не терять: повторить save
и продолжить ту же попытку по явной кнопке. Если storage так и недоступен, bounded-поток
не стартует/не завершает следующий шаг; объяснить ограничение. Исключение remove после accepted
не отменяет успех: сообщить о неочищенном локальном состоянии; при повторе Complete admitted
признаётся сервером. Не выдавать успешное сетевое ack за успешную очистку storage.

Новый File сначала полностью hash; совпадение size/hash переводит в readyResume, сеть=0.
Только отдельное «Продолжить загрузку» разрешает resume с прежними options/key/originalFilename.
Pause очищает File/native input; onChange сбрасывает input.value после захвата File, перед
picker selection недействительна. Тот же путь можно выбрать снова; cancel не трогает manifest.
Это единая таблица FR-5, а не автоматический create после hash. Mismatch/legacy/loss не auto create. Отдельный new-upload intent
после предупреждения разрешает новый key и замену scoped manifest; старый S3 upload не удаляется.

## Rationale
Целостность выбора клиента требует полного чтения; bounded chunk API и OSS дают её без нового
протокола. Durable checkpoint до Complete сохраняет нужный manifest для потери HTTP-ответа.
Отказ на legacy не утверждает знание о старых байтах. Server recovery отложен честно.

## Consequences
Плюсы: нет metadata collision, межаккаунтного cache, auto-дубля; старый transport единый.
Цена: полный локальный pass, failure storage блокирует следующий шаг; 4MiB budget ещё требует
измерения на браузерах. После закрытия вкладки без metadata восстановление не обещается.
Владелец: интегратор; пересмотр через месяц после приёмки или при запросе server recovery.

## Confirmation
Все перечисленное pending до реализации.
- tests/upload-file-identity.test.ts: `full_hash_covers_middle_bytes`, `same_bytes_ignore_metadata`, `hash_reads_one_bounded_chunk_and_aborts`; независимый oracle Node crypto; сломать на sample hash/whole-file read.
- tests/upload-resume.test.ts: `resume_v2_rejects_legacy_foreign_and_malformed`, `resume_manifest_requires_complete_parts`, `storage_failures_are_explicit`; сломать permissive defaults/дубликаты/чужой scope.
- tests/upload.test.ts: `create_scope_mismatch_has_no_side_effects` (auth A/expected B →409, transaction/claim/quota/S3/sign=0), `create_scope_schema_and_legacy_compatibility` (malformed→422, same-scope и отсутствие поля допускаются); Complete ownership regression остаётся 404. Нулевая transaction проверяется запрещённым pool/connect/query и storage spies; это не отдельное доказательство SQL-счётчиков.
- tests/browser/upload-lifecycle.test.ts: `stale_cookie_scope_blocks_create_and_refresh` (UI A/cookie B, key-only/с videoId, refresh после403; original File/manifest, network после409=0), `pause_reselect_requires_separate_continue`, `resume_uses_same_key_and_missing_parts`, `storage_failure_blocks_complete`, `legacy_or_lost_cache_never_autostarts`, `new_upload_requires_explicit_intent`, `admitted_repeat_keeps_actual_stage`.
Метод: RED/GREEN и targeted mutation с настоящим File/await/network counters; не source-only.
Успех: все байты покрыты, memory reads bounded, неверный cache не исполняется, один key/video
при штатном resume; success admitted не создаёт новый upload. Owner проверки: независимый QE.
