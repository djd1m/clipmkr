# Маршрутизация Zoom screen + face

Task kind: feature

Дата: 11.11.2026. База `e66d9addfad16e1b6dcd7bd07bf06c5abb1343f1`.
Авторский подготовительный пакет; checkpoints ещё не объявлены выполненными. Пересчёт архитектора11.11.2026 после explicit lazy seed-analysis:40 concrete targets, score16, **XL по quick decision tree30+ editable files**, консервативный выбор принят root. Это не выполненный router checkpoint; прежний L14 ниже сохранён как исходная оценка.

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

## Пересчёт после конкретной архитектуры

| Измерение | Баллы | Основание |
|---|---:|---|
| Файлы |4|40 targets в draft06, включая production, thin wiring, тесты и guards;26 existing +14 new по статической сверке путей |
| Домены |3|presentation, render execution, quota/access state |
| Интеграции |1|новых services/queues/ML/dependencies0; native FFmpeg HTTP использует прежний S3 |
| Breaking/поведение |2|аддитивно, но новый queue message требует worker-before-web rollout |
| Модели |3|dependent seed cache + layout intent + published layout value |
| Сквозные свойства |3|ownership/idempotency/data сохранность и failure/degradation |
| **Всего** |**16**|score соответствуетL; decision tree30+ files даётXL; root принял консервативную полную маршрутизацию |

Искусственный worker Range proxy/новый network subsystem отвергнут координатором; hard малый byte cap не является требованием.40 targets остаются после его удаления. Нельзя уменьшить count исключением обязательных тестов/тонких bindings или слиянием несвязанных modules. После реализации сверить actual diff; это не обещание изменить каждый target без необходимости.

## EDITABLE и READONLY scope

`scope-inventory.json` фиксирует **EDITABLE40**:26 существующих файлов с планируемой правкой и14 новых. Отдельно **READONLY19**:9 pinned baseline dependencies,1 общий server-only helper под ownership Original и9 existing regression test files. Эти READONLY paths не входят в40 и не увеличивают file score; остальные исследовательские чтения также не считаются модификациями. Shared leaf `packages/shared/src/server/original-source.ts` создаёт Original, Zoom только импортирует его.

Расхождение правил показано явно: сумма16 даётL; отдельный dimension4 означает минимумL; quick decision tree для40 editable files даётXL. Принято более консервативноеXL, без выдуманного score20 и без изменения обязательных MADR/DDD/C4/QCSD/fleet этапов.

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
