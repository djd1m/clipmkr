# Переиспользование и наблюдаемый дефект

Проверено чтением исходников на a04a28f. Интеграционные проверки нового поведения не выполнялись.

## Наблюдение

Приёмка 05.11: video done, clips_done1/clips_total2, один clip done и один failed после двух upload timeout.
На реальном экране подпись «Клипы готовы · 1 из 2», предупреждение частичного результата и доступный готовый клип;
кнопки восстановления нет. Приватный published-ready.private.png изучен как контекст; в Git не копируется
(на нём реальный человек/медиа). Макет использует вымышленные названия и пустой media-placeholder.
Диагностический повтор native renderClip + renderStorage второго клипа с own-key прошёл;
это не исправило canonical результат. Причина S3 timeout не установлена и не входит в это изменение.

| Владелец | Существующий механизм | Вывод для минимального изменения |
|---|---|---|
| apps/web/src/server/video-retry.ts assertRetryable | Только status failed, FILE_FAILURES, object_key/actual_bytes | Узко разрешить terminal partial done; не разрешать произвольный done |
| VideoRetryService.retry | account/video locks, owned active nondeleted query, transcript/clips SELECT | Сохранить guards; authoritative clips и active jobs должны подтвердить partial состояние |
| VideoRetryService.retry | stage stt/select/render; pending status!=done | Для partial требуется transcript, все clips terminal и хотя бы один failed; тогда существующий render pending путь подходит |
| packages/db/src/attempts.ts leaseAttemptTx | Новая series/fence; UPDATE clip только status<>done; до2 попыток на series/clip | Готовый сосед не изменяется, повтор получает новую штатную серию |
| packages/db/src/render.ts publishRenderResult/updateRenderProgress | Immutable contract, fenced publish, aggregate done при любом готовом результате | Переиспользовать; status enum и worker не меняются |
| apps/web/src/server/screen.ts presentVideo | next_action только для status failed | Вернуть existing retry только допустимому partial result; header/status должны честно показывать 1/2 |
| VideoDetail.tsx ProgressPanel/retry | next_action=retry, busy, rpc video.retry, refresh/poll | Сохранить кнопку/endpoint/занятое состояние; success early return сейчас скрывает кнопку даже при новом next_action |
| VideoDetail.tsx ClipCard/selector | Player/скачивание доступны для done, незавершённый недоступен | Сохранить готовый player; существующий retry относится ко всем failed клипам записи, не к готовому клипу |
| packages/db/src/credits.ts reserveVideoCreditsTx | При credits_v1 последний charge reserved ИЛИ settled → возврат до новых grant/allocation/update | Сохранить существующий reserve; проверить settled и reserved |
| finalizeVideoCreditsTx | Первый usable partial result переводит reserved→settled, не refund | Готовый результат не возвращает и не расходует оплату повторно |

Последние две строки доказывают существующую ветку «за эту запись — один раз» для settled/reserved,
но не доказывают новый retry через UI: тот сейчас запрещён. Требуется интеграционный тест с нулевым
остатком и истёкшим grant. При released/отсутствующем charge обещание не применяется автоматически;
authoritative guard должен отказать partial retry без нового списания, если одноразовая оплата не подтверждена.
Legacy и owner-exempt сохраняют существующую политику; текста о списании кредитов у них не должно быть.

## Реальные кандидаты тестов

- tests/progress-screen.test.ts — presenter + ProgressPanel и отсутствие misleading «всё готово».
- tests/progress-screen.integration.test.ts — права, готовое/неготовое скачивание, SELECT-представления.
- tests/credit-packages.integration.test.ts — реальные транзакции, settlement/reserve и гонки.
- tests/browser/video-screen.test.ts — существующий браузерный путь; до реализации проверить подходящие helpers.
- При необходимости tests/partial-render-recovery.integration.test.ts — выделенный сценарий сервиса, только если существующая suite не покрывает атомарность.

Новые сервис, endpoint, очередь, storage adapter, ручной SQL repair и transport-fallback не нужны.
Поиск проектов1–8/OSS для нового модуля не требуется: необходимый runtime-путь уже существует внутри Clipmkr.
Переиспользуется текущая нейтральная зелёная палитра и layout «Кабинет» из globals.css,
утверждённые docs/design/2026-11-04-owner-choice.md.
