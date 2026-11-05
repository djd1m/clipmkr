# Частично готовая запись: повторить незавершённый монтаж

Предлагается разрешить существующий `video.retry` для терминальной частично готовой записи,
сохранив готовые клипы и действующий одноразовый кредитный расчёт. Сейчас `video.status=done`
при одном готовом клипе блокирует retry и скрывает кнопку.

Дельта: specs/render-recovery/spec.md. Исполнение и решения: features/partial-render-recovery/.
Статус: макет согласован владельцем, FR-1–6 приняты root; design R2 proposed для focused QCSD recheck.
Actual binding — features/partial-render-recovery/owner-approval.md. Код/выпуск требуют M-гейтов.

R2 сохраняет original partial finished_at/expiry и месячную активность блогера, добавляет
existing retention lease admission, общие guards для done/failed-with-ready и точную границу
watchdog до/после30мин. Scope M11: шесть native production targets и шесть existing test files.
Новых схем/таблиц, storage policy, цены или first-activation metric нет. Законное истечение
доступа во время retry допускается; ready объект не воскрешается и срок не продлевается.

Дополнение владельца05.11.2026: выбран вариант «Да» для активности по хотя бы одному
готовому клипу, включая ранее исключённые исторические failed-with-ready. Исторические
месячные показатели могут увеличиться; retry сам по себе не меняет исходный месяц.
Источник — features/partial-render-recovery/owner-approval.md. Это явная дельта
требований; R2-design и независимые receipts требуют перепривязки и повторной проверки.
Код/БД не изменены; перенос на рабочий VPS остановлен отдельно.
