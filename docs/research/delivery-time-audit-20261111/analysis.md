# Аудит времени поставки — 11.11.2026

Статус: точечные уточнения подготовлены для focused review. Срез данных 11.11.2026 17:43:26 UTC.
Область: Original source watch/download и Zoom 03/01/02. Main: `165260c`.
Изменены только этот анализ и `measurements.json`; приложение, ресурсы и планы не тронуты.

**Оценка 5–7 часов не доказана измерениями.** Она может оказаться реалистичной,
но сейчас это сумма экспертных диапазонов плюс неопределённый ремонт, а не прогноз
на основе скорости завершённых сопоставимых задач. Для Zoom кода ещё нет.
Данные не доказывают ни «модель бездействует», ни «проверки занимают полтора часа».
Устранимы прежде всего ошибки вызова, поздняя диагностика fixture/GC и объём
передаваемого контекста. Реальные дефекты и обязательные проверки исключать нельзя.

## Измерения

## Что именно измерено

`measurements.json` содержит 28 author-run durations, 19 независимых command durations,
таймлайн checkpoints, SHA входов и ограничения. Для каждого приватного доказательства
сохранены только basename, SHA и разрешённые агрегаты; приватное содержимое не скопировано.
Duration берётся из последнего итогового блока файла: дубли печати не суммируются.
Сумма известных author-run wall: **1704,898 с (28 мин 25 с)**;
независимых команд: **125,905 с**. Это суммы времени команд, **не CPU и не elapsed поставки**.
Не все команды имеют terminal duration, поэтому это неполный набор, не полный расход.

| Категория / операция | Наблюдаемое время | Перекрытие и критический путь | Возможная экономия / уверенность |
|---|---:|---|---|
| Implementation Original + локальная проверка | 37 мин 33 с: старт сессии16:39:30 → frozen report17:17:03 | Внутри код, чтение, диагностика и тесты; чистое coding=null. SOURCE начал подготовку параллельно | null; деление на чистые категории не измерено |
| Testing: пять долгих FAIL stream runs | 692,01 с суммарного runner wall | Изменялись код/fixture; не формальные повторения. Часть окон перекрывается с другими suite | null; короткая диагностика до следующего125с запуска могла сократить ожидание, medium |
| Testing: окончательный stream contract | 130,63 с; 13/13 | Marker125001мс, abort→close7мс. Legacy negative control в том же окне | 0 от удаления125с oracle; high |
| Testing: interrupted browser baseline | 327,039 с; exit130 | Missing usePathname export, реальный baseline fixture blocker | От0 до327,039с command wall до вычета smoke; не доказанная экономия критического пути, medium |
| Testing: approved browser regression | 477,58 с; 2FAIL/92PASS | Непройденный обязательный regression gate:2FAIL baseline UX fixture по SOURCE evidence; регрессия продукта не доказана | null; успешного общего результата ещё нет |
| Review: native SOURCE prepare→evaluate | 17 мин 33 с;17:17:24→17:34:58 | Параллельно author regression и release prep. Четыре HIGH условия, gate не CLOSED | null; убрать этот review значит потерять реальные findings |
| Coordination: wrong-cwd amendment→corrected | 30,164 с по mtime | Ложные7 file-missing исчезли; корректный вызов8/8 | null; интервал не равен работе, но дефект устраним, high |
| Context: Zoom prompt-limit→complete | 439,627 с по mtime |17:30:37→17:37:57; другие агенты работали. TASK-0 всё равно блокировал код | null; заранее компактные inputs предотвращают отказ, high |
| Docs / повторные чтения / ручное оформление | null | Нет надёжной категории effort. Число tool calls/коммитов не измеряет чтение/мышление | null; сокращать дубли, сохраняя обязательные поля |
| Delivery preparation + ops review | 9 мин29с:17:18:24→17:27:53 | Объединение окон двух сессий; параллельно SOURCE. Runtime ещё не доставлен | null; перекрытие уже используется |

CPU, чистое время мышления, доля простоя, точная длительность оставшейся поставки —
**null**. Ни mtime, ни промежуток без tool call этого не измеряют.

## Почему объявленный срок расходится с тем, что видно

1. **Смешаны remaining ETA и первоначальный бюджет.** Original00: implementation45–75,
   checks45–90мин; текущая устная оценка45–75мин уже про ремонт+проверку+поставку.
   Zoom00: implementation60–120; финальный06:110–180+60–100+QE/delivery30–60 =
   **200–340мин после gates**, TASK-0 и приёмка владельца отдельно. Поэтому5–7ч нельзя
   выдавать за измеренный общий критический путь. Нужна одна актуальная оценка от текущего состояния.
2. **Zoom — не три CSS-компоновки.** EDITABLE40 (26 existing+14 new), READONLY19;
   migration032, durable layout intent, cached seed, ownership, quota/idempotency,
   worker fencing, реальный FFmpeg и сохранение прежнего MP4. Дизайн содержит3 цикла
   QCSD с реальными structural corrections. Есть зависимость от accepted Original seam.
3. **Original оказался сложнее happy path.** GC/request lifetime и cancel legacy body
   обнаружены реальными долгими FAIL; fixture имел trusted proxy/DB shape/native port
   ошибки. Независимый SOURCE затем нашёл HTTP error→ложный codec verdict,
   stale resume→autoplay, нечитаемые light-theme состояния и незакрытый browser regression.
   Это подтверждённые дефекты, а не повод объявить все повторы бесполезными.
4. **Настройка инструментов повторно давала ложную работу.** Global Node не читал
   SQLite; canonical Node22 recall с `/home/clipmkr/.dz` сработал. Отдельно wrong-cwd
   amendment дал false file-missing. `npm --prefix` меняет cwd lifecycle-скрипта:
   дефект относится к invocation/root-config resolution, не к скорости runner/тестов.
5. **Контекст разросся до отказа сборки контекста.** `check-code-targets` дал admitted;
   отдельный `build-coder-context` получил `prompt-limit`, после уплотнения — complete.
   Это устранимый дефект размера входа, не обязательный
   архитектурный этап. Уплотнять до лимита следует до передачи, сохраняя requirements,
   ADR Decision/Confirmation и план по каноническому helper.

## Что сделать сейчас, по ожидаемой пользе

| Действие | Эффект и предел доказательства | Статус полномочий |
|---|---|---|
| Перед следующим долгим run воспроизвести конкретный FAIL коротким targeted probe; после GREEN выполнить обязательный affected/125с oracle | GC probes заняли1,3–2,4с против135–154с долгих FAIL. Экономия минут возможна, точное число неизвестно; короткий probe не закрывает long-stream contract | Рутинная перестановка диагностики |
| До общего browser regression проверить mounted entry/navigation export и изменённые locators коротким существующим smoke | Предотвращает повтор ожидания сотен секунд из-за fixture; не предсказывает runtime успех всего suite | Рутинно, один smoke при реальном риске fixture |
| С начала вызывать pinned Node22/CLI с явным cwd execution worktree, а recall с canonical `--project /home/clipmkr` | Убирает повтор SQLite fallback и root-path false FAIL. `--project` не гарантирует правильный cwd каждого вспомогательного процесса | Рутинное исправление вызова; политику gates не менять |
| Один общий regression на frozen source; после локального ремонта только affected checks, если нет названного широкого риска | Это уже правило владельца11.11 и Zoom06. Не обещать экономию там, где run был FAIL или bytes изменились | Рутинно в рамках обязательных gates |
| Не пересобирать одни и те же реальные build inputs; перед повтором указать изменившиеся inputs | Есть4 build logs16:56–17:12, но код менялся: ни один пока не доказан лишним. Reuse допустим только при точном соответствии inputs/артефакта; экономия=null | Рутинно при доказанной неизменности, без новой cache-инфраструктуры |
| Сократить ручные пересказы evidence: один manifest/run result, отчёт с ссылками и явной дельтой | Не дублировать полные inventories/SHA в каждом сообщении. Канонические полные requirements/context и native receipts сохраняются | Рутинно; не переписывать закрытые исторические receipts |
| Проверить возможность отделить чистую geometry/compositor работу Zoom от принятия Original UI | Потенциально сокращает последовательность Original→Zoom; текущий TASK-0 запрещает ранний код всей фичи. Время перекрытия не измерено | Нужен root amendment dependency graph + genuine K1/K2/GO; до него не кодить |
| Сохранить native reuse, не начинать новое OSS-исследование без capability gap | Original использует AWS SDK/native media/React и существующий streaming; Zoom FFmpeg/OpenCV/YuNet/render pipeline. Новый proxy/сервис уже отвергнут | Рутинно. Новая библиотека сейчас не имеет доказанного выигрыша |

**Не подтверждено:** что4 сборки избыточны; что все независимые роли дублируют друг
друга; что idle составляет какой-либо процент; что native music/CTA уже обеспечивают
durable request-key replay нового layout intent; что можно безопасно убрать seed/intent.
Нельзя обещать выигрыш в часах, просто считая число документов, файлов или агентов.

## Границы сокращения

Сохраняются genuine feature-adr/native closure, независимая проверка исправленных
SOURCE conditions, code/spec anti-drift, доступ/изоляция/private media, реальные
PG/S3/Range proof, повторное начисление/списание, migration/data preservation,
guards/mutation anchors, один общий финальный regression и требуемая UI приёмка.
Skip/no-match/CANNOT_ISOLATE не считаются прохождением. Сокращение scope, требуемых
review roles или rollout порядка — явное изменение политики/плана; это не скрытая
оптимизация. Изменение кода во время проверяемого snapshot не предлагается.

## Доказательства и ограничения

Публичные входы: `features/original-video-access/{00,01,03.5,05,06,08}*` в
`/home/clipmkr-original-video`; `features/zoom-screen-focus/{00,01,05,06}*`,
`scope-inventory.json` и `02_reuse_inventory.md` в `/home/clipmkr-zoom-screen-focus`.
Exact SHA основных входов и private basename+SHA — в `measurements.json`.
Native SOURCE: prepare17:17:24.827, evaluate17:34:58.287; результат не закрыт.

Git26.10–11.11 изучен как последовательность поставок, не как табель времени.
Примеры11.11: `9312564` (оферта08:57)→`8ea82da` (публикация09:08);
`e29c8bf` (код регистрации15:24)→`638790f` (merge15:25)→`59361e0` (поставка15:44).
Промежутки11/20мин не доказывают длительность кода, checks либо deploy;
в них могли идти другие задачи. Коммиты `e66d9ad`, `1a7f17f`, `2b61ade`
фиксируют развитие текущего scope/макетов, но не успешную реализацию.

Внешние сервисы, тесты, браузер, Docker, DB/S3 и network не запускались.
Независимый causal review этого аудита выполняется отдельно. `dz teach` не выполнен:
подтверждённые уроки передаются root после ревью. До этого выводы не являются
изменением принятого плана или выполненным gate.

