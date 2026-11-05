# Синтетические пользователи для QA Clipmkr

Проверено 05.11.2026, около 17:07 UTC. Это исследование и предложение пилота; ничего не установлено и не запускалось против Clipmkr.

Практичный первый шаг — сохранить существующие Playwright/HTTP/PG проверки и добавить ограниченный эксперимент с **Stagehand как браузерным исполнителем**. Он ближе к TypeScript-стеку Clipmkr. **UXAgent** наиболее прямо отвечает идее «синтетический пользователь исследует интерфейс», но его код заметно менее популярен и давно не получал push. **TinyTroupe** полезнее для выработки гипотез о потребностях и сценариях, чем для доказательства работающей загрузки или оплаты. Это авторский вывод из источников, а не результат сравнения инструментов на нашем продукте.

## Что действительно найдено на aicoding.space

Официальный machine layer обнаружен через `rel=describedby` главной: [llms.txt](https://aicoding.space/llms.txt), [content-index](https://aicoding.space/agent/content-index.json), [полный текст](https://aicoding.space/llms-full.txt). Public MCP `initialize`, `tools/list`, `search_site` реально ответили без authentication. Поиск и чтение охватили 34 GitHub-статьи текущего индекса за 07.10–05.11.2026. Это ограниченный опубликованный корпус, не вся история GitHub Trending.

| Проект | Происхождение | Что даёт Clipmkr |
|---|---|---|
| [agent-desktop](project-cards.md#agent-desktop) | Найден в [трендах 04.11](https://aicoding.space/blog/github-ai-llm-2026-11-04/#repo-vercel-labs-agent-desktop) | Desktop accessibility driver для агента; дополнительная проверка native dialogs, без модели человека |
| [CUA](project-cards.md#cua) | Найден в [трендах 07.10](https://aicoding.space/blog/github-ai-llm-daily-2026-10-07/#otobrannye-repozitorii) | Computer-use среда/инструменты оценки; тяжелее необходимого browser QA |
| [Lightpanda](project-cards.md#lightpanda) | Найден в [трендах 02.11](https://aicoding.space/blog/github-ai-llm-2026-11-02/#repo-lightpanda-io-browser) | Быстрые DOM/agent операции; без графического движка, не основной UI/video oracle |
| [Stagehand](project-cards.md#stagehand) | Дополнительный аналог; упоминание в просмотренных трендах не установлено | TypeScript browser actions с детерминированными проверками результата |
| [Browser Use](project-cards.md#browser-use) | Дополнительный аналог | Готовые Python browser agents, требует отдельного tooling окружения |
| [UXAgent](project-cards.md#uxagent) | Дополнительный аналог | Persona generation + реальный browser + исследовательский просмотр результатов |
| [TinyTroupe](project-cards.md#tinytroupe) | Дополнительный аналог | Persona/world simulation и гипотезы о UX; browser CJM сам по себе не доказывает |

В трендах 26.10 действительно есть [browser-use/video-use](https://aicoding.space/blog/github-ai-llm-2026-10-26/#repo-browser-use-video-use), но это инструмент редактирования видео. Его нельзя выдавать за упоминание `browser-use/browser-use` или за готовый user-QA продукт. Прямого persona-usability симулятора в просмотренном корпусе не подтверждено; отсутствие совпадения не доказывает отсутствие проекта в других выпусках.

## Что считать результатом

Браузерный агент умеет выполнять задачу; persona-промпт меняет его поведение, но не делает его репрезентативным человеком. Human-population simulator моделирует ответы/взаимодействия, но не обязательно нажимает кнопки продукта. Benchmark оценивает агента на своём наборе задач; его высокий score не означает приёмку Clipmkr. Даже [UXAgent paper](https://arxiv.org/abs/2504.09407v3) позиционирует систему как помощь при подготовке исследования с людьми.

Рекомендуемый [план пилота](clipmkr-pilot-plan.md) разделяет функциональный oracle, поисковый UX-прогон и последующую человеческую проверку. Ни один из них не заменяет два других. Полные [карточки](project-cards.md), [реестр источников и ограничений](sources.md).
