# ADR-003: Показывать только подтверждённые байты передачи

## Status
Proposed; отдельное решение для настоящего upload/pause экрана. Требует runtime regression после реализации.

## Context
Согласованный mockup6f45ee0a показывает файл/байты/% и pause. Существующий fetch uploadParts возвращает полный массив лишь после batches. v2 strict manifest.parts означает исключительно полный ordered набор для Complete fast path. Частичные байты/проценты не должны превращаться в ложное «готово» или скрытый Complete.

## Decision Drivers
D1 high: truthful real bytes/% без fake in-flight timer. D2 high: same fetch/S3 URLs/idempotency/abort/parallelism. D3 high: v2 storage safety и explicit Continue. D4 medium: bounded progress state, без новой API/library.

## Considered Options
A. Timer/fixed37%: просто и похоже на макет; отвергнут — ложные данные.
B. Новый XHR uploader/новая partial-v3 resume schema: granular progress/durability; отвергнут — лишний transport/security migration.
C. Не показывать progress: минимально; отвергнут — снова исключает согласованный flow.
D. Existing fetch с optional acknowledged-bytes observer и явным known/unknown состоянием: выбран.

## Decision
1. uploadParts сохраняет fetch, concurrency3, retry/expiry refresh и Complete contract. Добавить optional последний callback confirmedBytes. Initial completed_parts и каждый успешный PUT с ETag обновляют существующий Map по part_number; байты=sum(min(partSize,file.size-(n-1)*partSize)) по уникальным валидным номерам1..ceil(size/partSize). Last tail считается точно; retries/refresh не удваивают. Percent=floor(confirmedBytes/size*100), bounds0..100; только confirmed ETags, никогда объём поставленного в очередь тела.
2. Callback вызывается после signal/fence checks; Uploader принимает его лишь при alive(current). Late PUT after pause/unmount/account change не меняет UI/cache/новую попытку. Observer не инициирует network/storage. После refresh учитывается server completed_parts с прежним key/receipt; signature refresh не сбрасывает подтверждённые части.
3. Uploader хранит ephemeral progress(kind unknown/current/lastObserved,bytes,total) в том же owner. Перед create нового intent unknown; после valid server receipt known0 или confirmed server parts. Pause сохраняет lastObserved и подпись «Подтверждено в последней попытке», очищая File/input как прежде. Hash/reselect не делает create и не выдумывает новые bytes.
4. Reload с неполной v2 записью: progress UNKNOWN, текст «Объём подтверждённой передачи уточним после продолжения», indeterminate/без aria-valuenow. После отдельного Continue идёт прежний create reconciliation и становится known. Без File/manifest recovery остаётся недоступным; explicit new intent предупреждает о другом слоте. Полный валидный parts manifest позволяет known100% даже при unknown Complete result; это ещё не обработка.
5. Не сохранять partial parts в существующем v2.parts и не добавлять UI sidecar/session schema. Existing durable key→receipt→full parts→Complete barriers остаются. При неизвестном исходе Complete сохранился тот же manifest/key и настоящий warning «сервер мог начать обработку». UI никогда не меняет processing stage из процента100.
6. Transfer/pause panels показывают настоящее filename/total/current known bytes и отдельную status/live region. Processing показывает текущие серверные ribbon/stage/no-response/error; время окончания неизвестно, indeterminate progress где точного значения нет. Не копировать demo skip-to-processing control.

## Rationale
D исполняет утверждённый flow без переписывания recovery transport. Unknown после reload — честное представление доступных данных, не исключение pause/progress экрана. Более точный in-flight progress не нужен для текущего согласованного результата.

## Consequences
Positive: реальные counters и pause state; no unsafe schema migration. Negative: updates ступенями по подтверждённым частям; неполный прогресс после hard reload до Continue неизвестен. Это явно показано пользователю. Follow-up ADR: только если позже требуется durable partial progress.
After-action Review: root+upload reviewer на stage и через месяц после принятия.

## Confirmation
Method: tests/upload-browser.test.ts and tests/browser/upload-lifecycle.test.ts; unequal tail, accepted-before-resume, out-of-order ack, duplicate/403 refresh, pause/late callback, reload unknown/full-known, explicit Continue.
Monitoring: mutation count queued bytes/double count/stale callback/partial manifest shortcut must RED; final ordinary Complete once on full durable manifest.
Success metric: 0<=bytes<=size, exact sum unique acknowledged part spans, no early Complete, same key/File/account scope/guard semantics; both browser engines native reload guard unchanged.
Owner: future implementer + independent upload/fleet reviewer.
Load-bearing property: progress is observational and cannot alter upload completion authority.
