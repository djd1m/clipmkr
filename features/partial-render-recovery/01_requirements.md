# Требования: восстановление частично готовой записи

Статус: **UX/макет согласован владельцем, FR-1–6 приняты root; design R2 proposed для повторного QCSD**.
Actual approval: [owner-approval.md](owner-approval.md). Приложение не изменено; M-гейты не объявлены пройденными.
База a04a28f73db10745536a28518e9a7e52b6073cc2; branch fix/partial-render-recovery-20261105.
User-facing delta: `openspec/changes/partial-render-recovery/specs/render-recovery/spec.md`,
SHA256 `48c10e54e0a819dfdc9956c504cfbeff421b91c09037ea7549dc1b623216f1cd` (design R2, 05.11.2026).
Изменение этой дельты требует обновления привязки и повторного anti-drift.

## Участники

Владелец записи повторяет только незавершённый монтаж. Владелец продукта согласует макет/требования
и принимает тестовую копию. Архитектор gpt-6-astra xhigh и независимый QE отдельной сессии
по docs/model-matrix.md проверяют риски; текущий комплект не выдаётся за их заключение.

## Функциональные требования

**FR-1 MUST — существующий UI повтор для terminal partial.** Given собственная active/nondeleted запись
со status done либо failed, один done и один failed клип, сохранённые source/transcript, нет active attempts;
все ready имеют object_key и доступны по canonical clipExpiry, original finished_at сохранён;
When открывается страница; Then видны «Готов 1 из 2 клипов», доступный готовый клип и одна существующая
кнопка «Повторить», относящаяся только к неготовому монтажу; полный успех2/2 кнопку не показывает.
Для N клипов отображаются реальные количества; пример1/2 не хардкодится.

**FR-2 MUST — штатная новая серия только failed монтажа.** Given FR-1; When video.retry принят;
Then существующий VideoRetryService создаёт новую series/fence и attempts только для failed клипов;
не создаёт STT/select, не вызывает LLM/STT. Готовые clip id/status/render_fence, keys, bytes,
contract, link, score сохраняются самим retry. Original finished_at не сбрасывается и не заменяется
повторным terminal timestamp; прежняя retention/explicit expires_at продолжают действовать.
До их законного истечения просмотр/скачивание доступны; истечение во время retry допускает штатный
отказ чтения/очистку, без resurrection, продления или pin expires_at. Уже истёкший/очищенный ready
либо missing original anchor →409 до mutations. Новый upload source не требуется.

**FR-3 MUST — один расход за уже оплаченную запись.** Given credits_v1 с latest settled
или reserved charge; When partial retry; Then сам retry не меняет charge/cycle/state,
allocations и grant balances, даже при balance0/expired grants. Для settled также нет
финансовых изменений при дальнейших terminal callbacks. Для reserved допускается ровно
штатный первый settlement того же charge/allocations (reserved→settled и уменьшение
reserved_seconds), без нового reserve/cycle/debit/refund; duplicate finalize — no-op.
Given отсутствующий/released charge обычного credits_v1; Then409 до reserve, без побочных
эффектов. Legacy/owner exempt сохраняют текущие правила, без ложного credit copy.
Это уточнение root 05.11.2026 после чтения reserveVideoCreditsTx/finalizeVideoCreditsTx к
согласованному «без повторного списания»; владельцу не приписывается новая политика.

**FR-4 MUST — authoritative guards.** Given чужая/несуществующая/soft-deleted запись либо erasing/inactive
аккаунт; When retry; Then текущие404/403 правила входа и единый404 ресурса соблюдаются, attempts/queue/credits
не меняются. Given fully done, неterminal, неконсистентные counters/clip rows, missing DB source pointer/actual_bytes/transcript,
или active running/deferred attempt (включая rerender); Then409 без побочных эффектов. Presenter не авторизует серверную операцию;
состояние перепроверяется под account→video locks по фактическим clip/job rows. Для partial
каждый failed clip связан current render_fence с terminal failed non-rerender job; counters
совпадают с actual done/failed/total, все clips terminal. Проверяется собственный active
account во всех billing modes; stale presenter не разрешает mutation.
Partial admission также требует незанятый existing retention lease: nonblocking shared xact
lock того же key50921012; false→409 без mutations. Он исключает retry сквозь уже выбранную
очистку; после освобождения lease keys/expiry перечитываются. Сеть под SQL locks не добавляется.
Ветка определяется фактическим наличием done clips ДО старого failed fallback: любой terminal
failed-with-ready проходит те же partial guards. Zero-ready failed сохраняет прежний retry pipeline.

**FR-5 MUST — повтор/гонки и восстановление доставки.** Given два одновременных retry, второй запрос
после первого успешного commit либо повтор после потери ответа; Then одна новая series, один render-job
на failed clip, готовый сосед сохранён; второй ответ conflict либо существующий эквивалент без дубликата.
Enqueue failure не откатывает authoritative DB-attempt. При первом успешном watchdog tick до
просрочки 30 минут по video.updated_at повторяется доставка той же identity/fence. На точной
границе native strict `<` ещё не terminalizes; позже watchdog сначала закрывает video/неготовые
clips/active non-rerender attempts отказом, не доставляет закрытую attempt. Ready и финансовые
правила FR-2/3 сохранены; допустим следующий явный retry через общие partial guards.
Устаревшая worker-попытка не публикует результат через fence. Лимит2 попыток внутри новой серии сохраняется.

**FR-6 MUST — понятный статус после действия.** When нажата «Повторить»; Then existing busy «Запускаем…»
исключает повторный клик до ответа; после ответа/refresh/poll виден текущий монтаж оставшихся,
готовый player не заменяется и скачивание работает до законного expiry. При ошибке понятный отказ без ложного успеха;
после2/2 — обычный полный успех без retry. Перезагрузка читает серверное состояние.

**FR-7 MUST — активность по фактически полученному результату.** Решение владельца
05.11.2026 — вариант «Да», exact source в owner-approval.md, дополнение по месячной
активности. Считаются уникальные привлечённые пользователи, получившие хотя бы один
готовый клип за месяц, включая старые записи с частичной ошибкой, которые прежний
отчёт мог пропускать. Исторические месячные показатели могут увеличиться; это
согласованное изменение ранее исключавшего такие записи множества. Нельзя заявлять
полную неизменность прежних числовых итогов. Это не метрика только первой активации.
Retry исторического результата A в B не
удаляет активность из A и не создаёт B; отдельная новая готовая запись в B учитывается в B.
Для исторически usable video отчёт использует прежний finished_at и наличие done clip также
во временном rendering/failed. Existing activated_at и growth timestamps самим retry не меняются;
для pending attribution первое штатное pending→activated при последующем terminal разрешено.
Переход на first-activation metric не допускается. Для старого watchdog-failed-with-ready,
существовавшего до изменения, отдельный regression scenario проверяет включение
в исходный месяц и distinct без удвоения; во время retry и после success/failure
история не исчезает и не переносится. Платежи, выручка и credits этим FR не меняются.
Точные ревизии OpenSpec и owner decision: owner-statistics-inputs.sha256.

## Нефункциональные требования

Текущая композиция «Кабинет» и обе палитры, существующие css tokens, mobile390 и desktop1440,
клавиатура и текст200% без горизонтальной прокрутки. Сохранность готового результата важнее повторной сборки.
Не менять S3 transport/timeouts/IfNoneMatch/contract, enum, квоты и цены; не добавлять endpoint, таблицы или зависимости.
Проверки выполняются на реальных транзакциях PostgreSQL в изолированном fixture; S3 live proof отдельный.

## Границы и зависимости

Требуется уже сохранённый исходник, transcript, clip rows и штатная очередь/watchdog. Восстановление через
существующий video.retry; произвольный direct DB repair и canonical диагностический PUT запрещены.
Причина S3 timeout, новый failure enum, автоматические дополнительные retries и редизайн — за рамками.
DB pointer/actual_bytes — admission metadata, не proof существования S3 object. По уточнению
root физический GET остаётся штатному worker: исчезнувший объект даёт canonical failure только
неготового монтажа, не повреждая ready сосед. Новый HEAD под locks/storage client не вводится.

## Открытые решения и допуски

1. Владелец согласовал показанный partial mockup; root принял FR-1–6. Exact HTML/PNG binding
   в owner-approval.md; изменение макета требует новой привязки, готовый результат не переосмысляется.
2. Initial QCSD выполнен тремя независимыми ролями. При originating R2 recheck четыре
   исходных условия подтверждены на уровне дизайна; RISK-02 оставался открытым.
   Новое решение владельца санкционирует историческое включение, но требует
   обновления дизайна и originating recheck; оно не закрывает gate автоматически.
   Исторические R2 receipts не распространяются на новую ревизию. Code/plan gates не подменяются файлами.
3. 06 остаётся draft outline: отдельная планирующая модель после QCSD и K1/K2 до appcode.
4. После реализации нужны независимое cross-model QE, code/spec anti-drift, тестовая VPS194.85.249.105/clipmkr.ru/UI приёмка;
   затем ручная приёмка владельца и только после неё доставка того же артефакта на Cloud.ru.
