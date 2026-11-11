# Маршрутизация Zoom screen + face

Task kind: feature

Дата: 11.11.2026. База `e66d9addfad16e1b6dcd7bd07bf06c5abb1343f1`.
Авторский подготовительный пакет; tier и checkpoints ещё не приняты координатором/владельцем.

| Измерение | Баллы | Основание |
|---|---:|---|
| Файлы | 3 | Примерно 18–24 runtime/test-файла; документы считаются отдельно |
| Домены | 3 | Выбор оформления, durable render intent/API, worker/media |
| Интеграции | 1 | Новых нет; FFmpeg/OpenCV/YuNet уже используются |
| Breaking/поведение | 2 | Аддитивный режим; существующий podcast и опубликованный MP4 сохраняются |
| Модели | 2 | Версионируемая конфигурация компоновки существующего clip; миграция ещё проектируется |
| Сквозные свойства | 3 | Ошибки/деградация и доступ/идемпотентная пересборка пересекают UI/API/worker |
| **Всего** | **14 → L** | Также 2–4 домена требуют минимум L по decision tree |

Активные этапы: 0 → 1 → [2,3] → 3.5 → [4,5] → 6 → K1/K2 → 7 → 8 → 9.
Ни один этап исполнения/успешный checkpoint этим файлом не объявлен пройденным.
Шаг 6 — отдельный планировщик gpt-6-astra xhigh; QCSD — три независимых настоящих агента,
назначаемые координатором. Автор макета/кода: gpt-6.1-sol high. Финальное review/QE — другая
модель в новой сессии по `docs/model-matrix.md`. Прежние авторские выводы QE не передаются.

## Бюджет (оценка, не обещание срока)

Требования/reuse 20–30 мин; ADR/архитектура/план/QCSD 40–70 мин;
реализация 60–120 мин; проверки/независимое QE 45–90 мин;
поставка на тестовую копию/ручная приёмка отдельно, время владельца не прогнозируется.
Это выше ориентировочных 2 часов router из-за реального media и durable rerender.

## Actual recall

Из `/home/clipmkr` выполнен pinned `npm run dz -- recall 'Zoom screen share browser crop framing rerender' --project /home/clipmkr --json --limit 8`
с Node22 `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin`; exit0, записи получены.
Первый запуск на Node24 дал SQLite native-module warning и JSON fallback; он не считается
полным чтением canonical store. Ничего в store не сбрасывалось.

Применимые результаты: `teach:96ab0dae7d427961` (экран/масштаб/реальное медиа),
`teach:7b299221ce38b4f8`, `teach:72dc09ec0bc1fff6` (closed advanced, draft и mounted identity),
`teach:dfbc5d28641e8c8e` (перегрузка UI, макет не является приложением).
Режим reference с pinned QE protocols; AQE runtime не устанавливается.
