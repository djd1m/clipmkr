# Проверка плана исправления QE-TEST-001

Дата: 06.11.2026. Статус: **ПЛАН ОГРАНИЧЕННОГО ИСПРАВЛЕНИЯ ПРИНЯТ**.

Роль: originating independent reviewer `qe-primary`, `gpt-6-astra xhigh`, сессия `/root/test_notice_independent_qe`; автор `gpt-6.1-sol high`. Это focused rework planning review существующего замечания, **не новый fresh planner запуск**. Рецензент не писал код и не менял 00/01/02/06/OpenSpec. Замечание HIGH structural QE-TEST-001 остаётся открытым; собственный прежний QE receipt не изменён.

Проверены фактические правки 00/01/02/06, OpenSpec и exact revision, сравнением с самостоятельно сохранённым снимком до поправки. Повторно проверено, что исходные шесть runtime/test файлов совпадают с прежним QE manifest, а dashboard/page.tsx и PartnerPanel.tsx пока имеют пустой git diff. Это принятие плана **до source patch**, а не ретроспективная подпись.

## Решение и пределы

AM-1/TASK-3R устраняет именно выявленный пробел: предупреждение добавляется внутри уже существующего details «Партнёрская программа», после summary и до legacy PartnerPanel в `!personal` ветке. Используется уже доступный server config и тот же `payments.mode === 'live' && payments.testMode`; текст включает TEST, отсутствие реальных списаний и учебный характер выручки/расчётов. Блогерский summary не показывает денежных сумм и не получает общего баннера.

S, score 7 сохраняется: один дополнительный простой JSX render site, прежние данные, API, auth, billing, CSS, компоненты и handlers; новой архитектуры, ADR, миграции или пользовательского решения не возникает. Письменный scope — 7 файлов (5 runtime + 2 существующих test-файла). PartnerPanel включён в EXPECTED_CODE_TARGETS как **только измеряемая неизменяемая семантическая зависимость**, не разрешение его редактировать. Его SHA-256 проверен: `27a56b2d93af2a95b4c932f61170571041392ee2e54a87899031d0e4921a396e`.

План тестов достаточен для этого исправления: actual Dashboard SSR, four-mode matrix live/test, live/non-test, off/false, off/true; проверка расположения внутри того же details перед различимым legacy panel marker; отрицательный blogger summary; реальный RED до изменения JSX, GREEN после, различающие удаления notice и live guard. Неизменность monetary renderer проверяется checksum/diff. Моки панелей допустимы для проверки серверного размещения; они не доказывают опубликованный платежный CJM и не заменяют сохранённое собственное доказательство реального legacy renderer.

**Разрешено перейти к реальным recall/K1-K2/context/checkpoint/admission согласно применимому процессу и затем к ограниченной реализации TASK-3R после успешных обязательных проверок.** Эта записка не утверждает, что такие команды уже выполнены, и не заменяет их. После source freeze нужны подготовка нового QE snapshot, настоящий author handoff и собственная проверка QE-TEST-001 originating reviewer с сохранением исходного смысла условия. Выпуск на этом шаге не разрешается.

## Измеренные документы

| Файл | SHA-256 |
|---|---|
| `features/test-notice-context/00_complexity_assessment.md` | `39bebda9899ec706beefd374d41a07674445a0ae8077a7c8cb47e835b928c9a9` |
| `features/test-notice-context/01_requirements.md` | `56ab2478ed3903c50d8ee992717a47bfdc47969d918b6b6cc50ec4f7f89ab38c` |
| `features/test-notice-context/02_reuse_inventory.md` | `a6dafde3ea9704fa48616f17c2054f0f727602d01579ac88877364545d592a33` |
| `features/test-notice-context/06_implementation_plan.md` | `e6e93512a1d499cb13433dd2249196cce5fab952b46733d4f399bea81110b2f1` |
| `features/test-notice-context/requirements-revision.json` | `8b19ab9c9d0b55e8668e5d3bb0c4d39ca05e7bb9ba7905df231dc87421bf9c45` |
| `openspec/changes/test-notice-context/specs/contextual-test-notices/spec.md` | `029052958d2e42d38774d6863387eb61cb73572bd7803da0133b4aa362f61ba7` |

OpenSpec revision независимо совпал с requirements-revision.json: `029052958d2e42d38774d6863387eb61cb73572bd7803da0133b4aa362f61ba7`. Противоречий между уточнёнными требованиями, reuse, AM-1 и TASK-3R не выявлено. Старые исходные receipts/первый отказ валидатора остаются историей; никакая квитанция успешного QE или закрытия condition здесь не создаётся.
