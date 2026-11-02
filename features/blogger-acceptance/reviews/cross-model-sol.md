# Независимое cross-model ревью восстановления complete

Дата: 02.11.2026. Проверяющий: `gpt-6.1-sol`. Отдельная сессия, `fork_turns=none`, без coding-контекста. Автор исправления, по метаданным задания: `gpt-6.1-terra`. Выводы автора, старые ревью, отчёты 08*, measurements и incident не использовались.

Объект: финальные `apps/web/src/server/video.ts` и `tests/upload-fix.integration.test.ts` из `/tmp/clipmkr-complete-recovery-20261102`. В момент проверки совпадают с файлами `/home/clipmkr`.

SHA-256:

- `video.ts`: `c98d41585b7b95c2dc1b0cdf3e3e625ca56cf10b69bf483afefc3a1e4a23b6e7`.
- `upload-fix.integration.test.ts`: `54c5066c722052a7f2159cddda859405fa14b7e5718db7e0da239685bd76caaa`.

## Подтверждённый дефект

### P2 — повтор complete теряет подтверждение после отказа уже начатой обработки без маркера публикации

Место: `apps/web/src/server/video.ts:32–33`, вызов на строке137 и отказ на строке139. Причина неполного маркера — строка182. Нормативное требование: AM-12 в `features/blogger-acceptance/06_implementation_plan.md` — потеря ответа complete не блокирует форму для уже принятой записи после ухода из queued, включая гонку с первым complete.

Возможна последовательность:

1. `complete` успешно проверяет файл и фиксирует `queued`.
2. Публикация запускает worker; тот успевает выполнить `acceptProbe` и перевести видео в `transcribing` до UPDATE строки182.
3. Этот UPDATE не устанавливает `upload_enqueued_at`, поскольку фильтруется по `status='queued'`. Маркер навсегда остаётся NULL.
4. Worker позднее завершает обработку с `stt_failed` (также возможны другие отказы после начала обработки). Это уже принятый файл; первичного отказа complete по `too_large`/`not_media` не было.
5. После потери первого ответа пользователь повторяет complete. `admitted` больше не распознаёт запись: статус `failed` не входит в четыре перечисленных, маркер NULL. Ответ — `409 conflict`, «Загрузка уже завершена».

Следствие: предусмотренный повтор в Uploader не переводит пользователя к карточке принятой записи с фактическим результатом обработки. Форма остаётся с ошибкой завершения. Восстановление зависит от времени повторного запроса: до отказа в transcribing оно успешно, после отказа — уже нет.

Воспроизведено отдельно на реальном PostgreSQL в синтетической `*_test` БД, собственной случайной схеме. Repro использует настоящий `VideoService.create/complete`, `ensureInitialAttempt`, `acceptProbe(120)` и `failTranscription(stt_failed)`; сеть S3 и callback enqueue изолированы. После первого complete подтверждён `{status:'transcribing', upload_enqueued_at:null}`; после настоящего `failTranscription` повтор вернул:

```json
{"status":409,"code":"conflict","message":"Загрузка уже завершена"}
```

Проверка ожидаемого подтверждения завершилась RED; на повторе отсутствовали вызовы storage и enqueue. Repro: `/tmp/clipmkr-sol-repro/repro.test.ts`, config `/tmp/clipmkr-sol-repro/vitest.config.ts`. Никаких изменений в candidate или основном репозитории не внесено.

Тест `worker advances before publication marker and retry acknowledges` в `tests/upload-fix.integration.test.ts:140` останавливается на transcribing; матрица на строках113–116 проверяет failed только с установленным маркером. Поэтому существующие тесты не обнаруживают указанный переход. Отрицательный случай failed/stalled без маркера на строках170–171 сам по себе не устанавливает, что ранее не было принятой попытки; при исправлении нужно различать такую запись и реально принятую обработку, сохранив первичные отказы файла, 404 и отсутствие повторных расходов.

Направление исправления: сохранять или восстанавливать устойчивое доказательство приёма независимо от текущего статуса worker; не использовать только текущий этап и необязательный маркер, запись которого пропускается при штатной гонке.

## Самостоятельная проверка

- `node node_modules/vitest/vitest.mjs run tests/upload-fix.test.ts tests/upload.test.ts`: выполнено 17 тестов, все успешны.
- На предоставленном синтетическом PostgreSQL: `vitest run tests/upload-fix.integration.test.ts` по candidate — выполнено 14 тестов, все успешны, без пропуска suite.
- Отдельный repro описанного сценария — один тест, ошибка на ожидании ack вместо фактического409. Использовались тот же candidate и тестовая инфраструктура; созданная схема удалена в finally.

Общий вердикт приёмки не выставляется: один подтверждённый дефект AM-12 остаётся. Других подтверждённых дефектов в проверенном объёме не найдено.

## Входные документы и границы

Сначала прочитаны `/home/clipmkr/AGENTS.md`, `docs/review-policy.md`, `docs/acceptance/core-cjm.md`, `features/blogger-acceptance/01_requirements.md`, `03_adr/001-account-policy.md`, `05_architecture.md`, `06_implementation_plan.md` (включая AM-12), требования и план `features/prevent-upload-navigation`, proposal/spec обоих соответствующих OpenSpec changes. Затем самостоятельно изучены candidate, Uploader, upload-handler/contract/runtime, queue-runtime, queue transport, attempts, probe, transcription и watchdog. Корневой CLAUDE.md использован для локальных правил; ссылки на старые отчёты из него не открывались.

Это узкое code/test ревью AM-12 и сохранения upload-контрактов. Реальные провайдеры, пользовательские загрузки, настоящие БД/серверы и секреты не читались и не вызывались. Реальный опубликованный UI/CJM, 120-минутная нарезка, настоящая оплата и трёхролевой сценарий не проверялись; отсутствие этих доказательств не названо дефектом данного исправления. Полный build/typecheck и браузерные тесты в этой независимой сессии не запускались.
