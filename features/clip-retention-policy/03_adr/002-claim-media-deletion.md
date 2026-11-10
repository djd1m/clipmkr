# ADR-002: Фиксировать необратимое удаление до обращения к S3

## Status
Подготовлено к независимому checkpoint. Durable claim выбран в рамках поручения; код/runtime ещё не менялись. Иная гарантия восстановления требует нового объёма.

## Context
FR-2, FR-5, FR-6, FR-8 требуют учитывать продление, сохранять историю и не удалять исходники. В `retention.ts` выборка срока и удаление S3 разделены; в короткой транзакции блокируется только video и закрывается rerender. Успешная оплата блокирует account и может произойти между выборкой и S3. После частично успешного удаления и crash простой повтор с новым deadline способен оставить недоступный файл без признака удаления. Это риск по чтению кода, тест пока не выполнялся.

## Decision Drivers
- Удалённые байты не объявлять доступными — high.
- Однозначная гонка принятой оплаты и удаления — high.
- Не держать SQL транзакцию во время сети — high.

## Considered Options
| Вариант | Достоинство | Недостаток |
|---|---|---|
| Сеть под account FOR UPDATE до финального marker | Оплата сериализуется до физического удаления | Длинные транзакции и блокировки; crash между S3 и commit всё равно оставляет двусмысленность |
| Durable logical claim, затем идемпотентный S3 retry | Crash-safe состояния, короткие SQL транзакции, существующий storage adapter | Нельзя отменить claim после commit; граница должна явно входить в контракт |
| Карантин/versioning с восстановлением | Возможность вернуть данные при поздней оплате | Дополнительная стоимость, протокол восстановления и отдельная политика; существенно шире задачи |

## Decision
Выбран второй вариант в текущем `apps/web/src/server/retention.ts`. Добавить clip.deletion_started_at, media_deleted_at. На кандидата повторно прочитать owner/status/deadline после блокировок account FOR NO KEY UPDATE → video FOR UPDATE → clip FOR UPDATE, пересчитать asOf на момент решения под блокировкой (не старый tick timestamp); credits advisory lock использовать в уже установленном порядке там, где он нужен. Убедиться, что deadline истёк и clip не exempt, записать deletion_started_at, закрыть running/deferred rerender, commit. Считать этот commit границей необратимого удаления; точный контракт записан в FR-2/FR-5.

После commit удалить clip prefixes clips/free, clips/paid и thumbs через существующий eraseClipPrefix; только после успеха всех префиксов обнулить ключи и выставить media_deleted_at. При отказе S3/DB ключи и claim сохраняются; следующий проход выбирает claimed независимо от нового deadline. Все чтения/CTA/music/publish отклоняют claimed; stale output не принимается. Новые ready siblings можно чистить независимо от terminal video. Исходный video.object_key и история clip/video/job/score не удаляются этой политикой. Erasure аккаунта остаётся отдельным более сильным путём и обязана чистить новые reminder строки.

## Durable reconciliation поздних PUT (QL-001, RET-RISK-001)
`publishRenderResult` вызывает внешний publish до fenced SQL acceptance; уже начатый PUT может закончиться после первого удаления, а worker — упасть до компенсации. Существующий AbortSignal.timeout(120000) ограничивает ожидание, но не доказывает завершение удалённой операции. Поэтому сохраняется claim и добавляется `clip.media_recheck_at`: при claim due=decision time; claimed строки с любыми keys/media_deleted_at всегда остаются кандидатами. Не требуется менять worker/storage protocol или добавлять сервис.

Существующий hourly retentionTick выбирает due claimed в bounded batch, ORDER BY media_recheck_at,id. Под действующим tick lock до сети переносит due на now+RETENTION_INTERVAL_MS; это обеспечивает очередь без голодания и сохраняет обязанность при crash до/после S3. Сеть удаляет все три префикса, как первоначальный sweep. Ошибка сохраняет claim и следующий due; успех обнуляет keys и устанавливает media_deleted_at через COALESCE. Маркер означает первый успешный sweep в тот момент, а не терминальное исключение из повторов или вечную физическую гарантию. Новая оплата claim/recheck не отменяет. Обязанность исчезает только вместе с Clip при отдельном erasure аккаунта.

Периодический bounded recheck допускает временное существование поздних байтов до очередного sweep; доступа/SQL resurrection нет. При большом backlog полное повторное прохождение дольше часа; due/oldest backlog наблюдаемы, новый SLO не обещается. Этот расход повторных S3 listing принят как минимальная цена crash-safe обязанности без новой платформы. Source/sibling prefixes не включаются.

Confirmation: `retention_late_put_after_delete_crash_is_reconciled` in `tests/retention-policy.integration.test.ts`: удержать PUT barrier, commit claim, завершить первый sweep/marker, отпустить PUT и имитировать crash без компенсации; restart и advance due должны удалить поздний объект. Мутация: исключить media_deleted/null-key rows из recheck → тест падает. Дополнительно отказ recheck и crash после переноса due сохраняют последующее повторение/fair batch.

## Rationale
Durable claim решает неопределённость crash, которую не устраняет одна блокировка вокруг сети. Принятая до claim оплата видна повторному чтению; после claim продление права не возвращает байты. Карантин оправдан только при иной согласованной гарантии.

## Consequences
Плюс: возможен безопасный повтор после любого S3 префикса, история не теряется. Минус: стадия deleting необратима; UI и политика должны объяснять это. Даже media_deleted_at означает успешный ответ adapter, не доказательство отсутствия чужих/скачанных копий или версий вне его контракта. Follow-up ADR: только при требовании восстановления/новой source policy. After-action review: разработчик и владелец через месяц после принятия; проверить oldest claimed и cleanup failures.

## Confirmation
- Method: PostgreSQL controlled race + fault injection memory S3, scoped synthetic S3 acceptance.
- Monitoring: claimed backlog, oldest claimed age, deletion retry/failure counts.
- Success metric: оплата до claim не приводит к storage call; после crash повтор завершает claim; null keys только после всех успешных префиксов.
- Owner: разработчик и независимый QE.
- Load-bearing property: принятая до claim оплата сохраняет клип, claimed никогда не выдаётся и не публикуется заново.
- Required automated check: `tests/retention-policy.integration.test.ts`, `tests/retention.integration.test.ts`, `tests/render.integration.test.ts` (предложены).

## Shift-left
Высокий риск — неверная граница «до удаления»: код ждёт реальных QCSD/K1/K2. Поздний webhook с ранним paidAt не отменяет claim. SQL failure до claim: S3 не вызывается. S3 failure после первого префикса: claim живёт, повтор стирает оставшееся. Load: batch ограничен, обычный watchdog не голодает. Given заблокированный кандидат, When concurrent payment завершается первым, Then claim отклонён и байты не удалены. Given claim committed, When процесс падает после первого DELETE, Then после перезапуска не происходит resurrection. Тестируем без внешней сети; отдельная S3 приёмка только на собственном namespace.
