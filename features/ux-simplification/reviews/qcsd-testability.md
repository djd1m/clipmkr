# QCSD ideation: независимая проверка тестопригодности

**Вердикт своей роли: CONDITIONAL.** UXT-001 требует уточнить наблюдаемое срабатывание upload navigation guard на новой ссылке аккаунта. Это дефект полноты Confirmation, а не доказанный дефект будущей реализации. Общий verdict и закрытие convergence определяет координатор; этот отчёт не разрешает Step7.

Роль `qcsd-testability`, family `owner-exception`, отдельная сессия без истории кодирования. Запрошены `gpt-6.1-terra xhigh`, архитектура по заданию — Astra. Независимого подтверждения провайдером фактических model ID/effort эта сессия не предоставляет; не выдаю запрошенное за аттестованное. Оценены только testability/AC и соответствующие test ideas, без подмены пяти других ролей. Флаги HAS_UI/HAS_SECURITY/HAS_UX=true.

## Зафиксированные входы и границы

- `implementation-design-inputs.sha256`: собственный SHA-256 `19be12bbca56f2ae07215425fe8894391815c68c7477fe9c9aea2cea9b8bcc92`; независимая `sha256sum -c`: 68/68 OK. Это проверка содержимого файлов, не проверка качества дизайна.
- HTML `docs/design/2026-11-05-ux-simplification.html`: собственный SHA-256 `a85b3f073a335871e421ea2079269fa19c71f42a263d7b0bd17ae30469c50e68`; approval `owner-approval.md`: `15441d0e685f4eb6cf32d7b9b3f61fe7eaada763857858d87a5e8ac967c7efcc`. Прямое согласование зафиксировано в owner-approval.md:31–42.
- Native host `features/ux-simplification/.fa-state/review-convergence-ideation-host.json`: nonce `d7e7f78a-02d9-49b8-b3f9-69d38439b5a0`; все семь path/digest из snapshot самостоятельно перечитаны и совпали. SHA-256 от компактного JSON самостоятельно перемеренного manifest = host revision `98cdb00fd3cb95ce461cad4662780a8c5f7695558d167cfe87210cdaa675c008`. Host не изменялся и evaluate не вызывался.
- Порядок: AGENTS/CLAUDE, model-matrix, review-policy, core-cjm, требования/approval, затем reuse inventory, ADR-001–003, domain, architecture, proposed root06, выборочные native source/tests. Действующая спецификация — `01_requirements.md`, SHA `5227676066e361027801a8b2c0ca62cbb29ef3a012502540e9e406c329850c32`. Старые verdict и completion-отчёты не служили доказательством.
- Прочитаны закреплённые feature-adr module 03.5 и reference protocol, `/home/product-studio/.agents/skills/requirements-validator/SKILL.md` и scoring rubric, `studio-extended-qe` и его process/testing документы. Применены анализ требований, граничные случаи, regression и отрицательные контроли как методы; AQE runtime и test execution не запускались.

## Находка UXT-001 — HIGH, structural

**Сценарий и evidence.** `01_requirements.md:22,35` требует отдельный header Account Link и сохранение upload navigation guard на новых ссылках; `03_adr/001-place-context-in-existing-pages.md:40–47` требует guard, но Confirmation перечисляет routes/auth/ownership и не задаёт наблюдаемое срабатывание на новом переходе во время активной передачи. `05_architecture.md:95,182` и предлагаемый `06_implementation_plan.md:29,42–51` отдельно упоминают guard, существующий upload-lifecycle и обычную навигацию A10, не связывая их одним сценарием.

Текущий `apps/web/src/app/upload/Uploader.tsx:34–38,55–68` ловит document click только при живой попытке и условно останавливает переход; `tests/browser/upload-lifecycle.test.ts:25–42,187–195` использует fixture с искусственным `#away` и подменённым Next Link/router. Эти тесты полезны для существующего guard, но не показывают совместную работу будущего header Account Link, настоящего перехода Next и смонтированного uploader. Зелёные проверки A10 в idle и старый fixture могут пройти, даже если новый путь обходит guard. Это контрпример к достаточности плана, не воспроизведённая поломка.

**Mitigation.** Добавить в ADR-001/архитектуру связанный Confirmation для actual Header + Uploader + Next route и включить его в будущий acid corpus. Зафиксировать наблюдения: активная попытка реально достигла задержанного PUT; клик/клавиатурная активация Account вызывает confirm; dismiss сохраняет URL и продолжающуюся передачу, accept даёт один переход и не допускает скрытый complete; при idle предупреждения нет. Отдельно сохранить beforeunload и разрешённые hash/modifier случаи существующей suite. Получить текущие реальные результаты после реализации, без предположения что fixture = production integration.

**Confirmation:** удаление/инверсия защиты document click или обход guard новой ссылкой → тест `account_link_active_upload_guard` обязан упасть из-за отсутствия confirm либо изменения URL/неверного lifecycle; без фактического события confirm это не TRIGGER. Применять в безопасных локальных фикстурах, затем на разрешённом опубликованном UI без реальных приватных медиа.

## Десять принципов тестопригодности

Оценки экспертные для будущей проверки дизайна, 0–100, равный вес; не покрытие кода и не результаты тестов. Среднее 74,5/100 ≈ **75/100**, условная зона module 03.5.

| Принцип | Балл | Обоснование |
|---|---:|---|
| Наблюдаемость | 73 | DTO/actions, DOM identity и счётчики запросов наблюдаемы; UXT-001 не связывает активную передачу с новой ссылкой. |
| Управляемость | 70 | Доступны предложенные fixtures и задержки; реальные provider/SSR состояния и нужный runner пока не доказаны. |
| Декомпозиция | 80 | Отдельные presentation pages, существующие state owners и server boundaries позволяют локальные проверки; интеграция остаётся отдельной. |
| Простота | 78 | Один набор handlers и без новых API/DB/pkg; 21 семейство и зависимые состояния усложняют охват. |
| Стабильность | 72 | Зафиксированы HTML, inputs и nonce; будущие правки меняют snapshot и требуют переоценки. |
| Информация | 75 | ADR/DDD/матрица описывают контракты; настоящий recovery retry и связанная end-to-end приёмка ещё не установлены. |
| Коммуникация | 80 | FR и proposed A1–A10 названы, но не каждое комплексное требование разбито на автономные AC. |
| Связь с прошлым | 82 | Изученные upload-lifecycle и video-screen служат исходной базой; их fixture/изолированные проверки имеют предел. |
| Время | 55 | План содержит последовательные этапы и gates, но бюджета на 21 семейство/браузеры/ручную приёмку нет. |
| Ответственность | 80 | В ADR-001:48 и ADR-002:43 названы автор и независимый QE; фактические выполнение/приёмка не подтверждены. |

## AC completeness и Criterion scenarios

Единица счёта здесь — семь укрупнённых FR, а не отдельные атомарные AC: 6/7 = **86%** имеют в просмотренном proposed корпусе различимые сценарии для ключевой границы; FR-4 условен из-за UXT-001. Это оценка плана, не измеренное покрытие реализации; внутри групп остаются зависимости и непроверенные ветви. Порог модуля 03.5: 50–89% = CONDITIONAL. Критерии процитированы кратко из `01_requirements.md:19–25`; именованные сценарии ниже связывают каждый FR с проверяемым намерением.

| AC/FR | Текст AC и именованный сценарий | Статус проекта теста |
|---|---|---|
| FR-1 | «Матрица root05 без пропусков» → `family_matrix_evidence`: 21 строка, ревизия, PASS либо gap, нет подмены source read на browser. | Достаточно как правило учёта; фактических results нет. |
| FR-2 | «picker не отправляет», «file limit/cost видимы» → A1 `explicit_start`: выбор файла без запроса, затем явный старт; server boundary отдельно. | План есть, без реального исполнения. |
| FR-3 | «не теряют mounted draft/player» → A4/A5 `draft_and_player_lifecycle`: A→B→A и poll при dirty music/CTA; compare node/src/time, apply отдельно. | План есть, требуется реальный браузер. |
| FR-4 | «Account из отдельного header Link», «Guards серверные» и общая граница сохранения upload guard → A7/A10 + `account_link_active_upload_guard`. | **Неполно:** A10 не связывает активный upload с переходом; UXT-001. |
| FR-5 | «Hidden invalid раскрыть+фокус, mutation не отправлять», «Retry только server next_action» → A2/A3/A6 `invalid_and_recovery`: invalid CTA/limit, запрет запроса; retry только при server permission; consent сбрасывается на payload change. | План есть; настоящий partial retry — отдельная незакрытая backend зависимость. |
| FR-6 | «320/390/1440, 200% text zoom», сохранённые preferences → A9 `layout_preferences_matrix`: обе темы/layout, длинный контент, отказ persistence. | План есть; отсутствие overflow не означает WCAG pass. |
| FR-7 | «одинаковые state/theme/layout/width» → A10 `approved_scene_routes` и A9 `visual_negative_controls`: сравнить settings/account и stats как самостоятельные экраны; blue/hidden fourth/clipped terms должны ломать oracle. | План есть; screenshot/comparison ещё не выполнены. |

INVEST/SMART для этого набора: ценность и релевантность ясны; декомпозиция и оценка сроков частичны из-за крупного объёма; измеримые thresholds для ширин/мутаций и boundary-состояний присутствуют, календарного SLA на сценарии нет. AC существующие и процитированы, Criterion scenarios выше даёт ненулевую трассировку; это не заменяет отдельную декомпозицию всех подусловий до исполнения. Growth bonus не оценивался: применимость отдельного growth-seed в предоставленном контуре не установлена. Security relevant: конкретные роли/ограничения в `01_requirements.md:22,29–34` присутствуют; независимый security verdict вне роли.

## Discriminating test ideas: что должно падать

1. **Unit/component:** при `next_action=null` и одном ready клипе retry отсутствует; при `next_action=retry` появляется и вызывает только существующий `video.retry` по нажатию. Мутация вывода retry по числу готовых вместо server action ломает первый случай; отдельно `upload`/`tomorrow` и silent/failed. Это не доказывает отсутствие повторного STT/списания.
2. **Browser/component:** загрузить отрицательные значения CTA и limit 1/1441/2.5 в закрытые details, нажать старт/save: раскрытие, реальный focus на invalid, 0 сетевых мутаций; удаление custom validation или focus должно ломать тест. Valid/null отдельно обеспечивает, что guard не блокирует всё.
3. **Browser/component:** dirty draft клипа A, выбор B, два полла и возврат A; проверить identity connected video и input, controlled currentTime/src, отсутствие setMusic до apply; перестановка key на poll time должна падать. Смену опубликованной версии и failed rerender проверять отдельно.
4. **Browser/component:** согласие на A, затем имя/состав/preselect/доступность/hash; create заблокирован до новой галочки, одинаковый poll не сбрасывает согласие; busy предотвращает повторную мутацию. Удаление любого reset должно обнаруживаться отдельным input case.
5. **Integration/E2E после реализации:** UXT-001 на настоящем Account Link; direct `/dashboard/partner` anonymous/non-blogger/owner без blogger flag не выдаёт stats; blogger dashboard auto-link и stats all-time, в stats ноль ensurePersonalLink. Сохранить legacy non-personal и проверку foreign-code по прежнему контракту.
6. **Checkout:** account A с задержанным ответом после B mount не меняет навигацию B; personal TEST eligibility сохраняется при разных sales/catalog режимах, цены/windows приходят из сервера. Подмена server eligibility на UI flag должна ломать тест. Отдельные реальные TEST provider и webhook проверки — в соответствующем разрешённом контуре.
7. **Визуальный оракул:** зафиксировать identical approved scene/state/theme/layout/width и сверять реальный React с HTML; account и stats отдельно. Внедрить синий accent, скрытый четвёртый clip и обрезанные финансовые условия; каждый negative control должен быть обнаружен. Данные/таймеры прототипа не считать функциональным контрактом.

## Ограничения доказательства и anti-drift

Root06 — предложенный план, не успешный отчёт. Проверены bytes входов и ограниченные исходники; изменённый UI ещё отсутствует и его отсутствие не считается дефектом. Не выполнялись app, браузер, реальные тесты, DB/S3/provider, инфраструктура, deploy или native gates. Не заявляются WCAG pass, UI E2E, UMUX, runtime-работоспособность, независимый provider-model attestation или code/spec соответствие будущей реализации. После изменений нужны повторное сравнение кода со спецификацией, исполненные discriminating tests/QE, настоящий convergence и K1/K2/plan checkpoints; затем предусмотренная владельцем ручная приёмка.
