# Источники, способ чтения и ограничения

Проверка 05.11.2026 около 17:07 UTC, без authentication. Ни paid API, ни browser actions на Clipmkr не запускались. Поисковая выдача использовалась для discovery; карточки опираются на первичные repositories/docs/API. Пересказ краткий, прямые цитаты не используются.

## aicoding.space: actual machine layer

| Источник | Наблюдение |
|---|---|
| [Главная](https://aicoding.space/) → [llms.txt](https://aicoding.space/llms.txt) | HTML содержит официальный `rel=describedby`; llms перечисляет read-only JSON/MCP/A2A endpoints |
| [Индекс контента](https://aicoding.space/agent/content-index.json) | 34 GitHub-статьи за 07.10–05.11.2026; количество относится к этому snapshot, не ко всем публикациям интернета |
| [Полный текст](https://aicoding.space/llms-full.txt) | Прочитан; searched synthetic/persona/user/simulation, TinyTroupe, UXAgent, browser-use и названия shortlist |
| [Agent card](https://aicoding.space/.well-known/agent-card.json), [описание API](https://aicoding.space/api/), [MCP](https://aicoding.space/mcp) | Public MCP POST initialize/tools-list/search_site реально выполнены; обязательны JSON Content-Type и Accept JSON+SSE. Agent card описывает A2A; A2A здесь не вызывался |
| [agent-desktop 04.11](https://aicoding.space/blog/github-ai-llm-2026-11-04/#repo-vercel-labs-agent-desktop) | Точное название vercel-labs/agent-desktop, Rust/Apache-2.0 и historical trend observation |
| [CUA 07.10](https://aicoding.space/blog/github-ai-llm-daily-2026-10-07/#otobrannye-repozitorii), [machine units](https://aicoding.space/agent/units/github-ai-llm-daily-2026-10-07.json) | Unit p30 прямо называет trycua/cua; это computer use, не персона/люди |
| [Lightpanda 02.11](https://aicoding.space/blog/github-ai-llm-2026-11-02/#repo-lightpanda-io-browser), [machine units](https://aicoding.space/agent/units/github-ai-llm-2026-11-02.json) | Точное имя lightpanda-io/browser; значения stars на дату статьи не подменяются сегодняшними |
| [video-use 26.10](https://aicoding.space/blog/github-ai-llm-2026-10-26/#repo-browser-use-video-use), [machine units](https://aicoding.space/agent/units/github-ai-llm-2026-10-26.json) | Подтверждён видеоредактор, исключён из user-QA shortlist; одноимённый owner не означает тот же repository |

web-tool первоначально не смог открыть aicoding.space; обычные public HTTPS GET через curl и документированный MCP POST успешны. Authentication/access restrictions не обходились. MCP search TinyTroupe/UXAgent вернул пустые results,  поиск по текущему fulltext не дал их имён. Это отрицательное наблюдение ограниченного корпуса, не доказательство отсутствия любых synthetic-user проектов в истории портала. Радар отдельно маркирует unsigned research, его упоминания не считаются GitHub trend evidence.

Контроль retrieval bytes: llms.txt SHA256 `2b7324e95591b99831c5f2d5c823497fb79ff18190bfda34f4635f4e402503a2`; content-index SHA256 `b329f9dd89308f931edaef9797d425655ba48cd4ea8a6730e7ca217a5fc241be`; llms-full SHA256 `82c7b037503219361d5ef99e383e919e57009da22def6bd055dfda07321e6ad9`. Это hashes полученного snapshot; сайт не обещает неизменности этих адресов. Локальные public response snapshots доступны исследователю в `/tmp/aicoding-public-*`, в Git полный чужой корпус не копируется.

## Первичные карточки и текущие metadata

Stars/forks/push/archive в карточках прочитаны непосредственно из GitHub REST `GET /repos/{owner}/{repo}` 05.11.2026. Push — признак repository activity, не гарантия поддержки продукта. Main/master docs изменяемы; версии перед пилотом нужно заново закрепить.

| Проект | Primary README/repo | Metadata | Дополнительное первичное evidence |
|---|---|---|---|
| agent-desktop | [README](https://github.com/vercel-labs/agent-desktop#readme) | [API](https://api.github.com/repos/vercel-labs/agent-desktop) | [LICENSE](https://github.com/vercel-labs/agent-desktop/blob/main/LICENSE): Apache-2.0; loop находится снаружи driver |
| CUA | [README](https://github.com/trycua/cua#readme) | [API](https://api.github.com/repos/trycua/cua) | [Licensing inventory](https://github.com/trycua/cua/blob/main/legal/LICENSING.md): MIT/FSL scope и отдельные components |
| Lightpanda | [README](https://github.com/lightpanda-io/browser#readme) | [API](https://api.github.com/repos/lightpanda-io/browser) | [LICENSE](https://github.com/lightpanda-io/browser/blob/main/LICENSE): AGPL; README No graphical rendering engine и default telemetry |
| Stagehand | [README](https://github.com/browserbase/stagehand#readme) | [API](https://api.github.com/repos/browserbase/stagehand) | [package.json](https://github.com/browserbase/stagehand/blob/main/package.json): workspace 4.0.0; README local-browser path |
| Browser Use | [README](https://github.com/browser-use/browser-use#readme) | [API](https://api.github.com/repos/browser-use/browser-use) | [CLOUD.md](https://github.com/browser-use/browser-use/blob/main/CLOUD.md): hosted Cloud не OSS, local library отдельно |
| UXAgent | [README](https://github.com/neuhai/UXAgent#readme) | [API](https://api.github.com/repos/neuhai/UXAgent) | [pyproject](https://github.com/neuhai/UXAgent/blob/master/pyproject.toml): MIT declaration; [root files](https://api.github.com/repos/neuhai/UXAgent/contents) без LICENSE; [paper v3](https://arxiv.org/abs/2504.09407v3) |
| TinyTroupe | [README](https://github.com/microsoft/TinyTroupe#readme) | [API](https://api.github.com/repos/microsoft/TinyTroupe) | [Responsible-AI FAQ](https://github.com/microsoft/TinyTroupe/blob/main/RESPONSIBLE_AI_FAQ.md), README disclaimer/experimental API |

## Наблюдение и вывод автора

**Наблюдалось:** portal membership трёх execution/infrastructure проектов, source descriptions, licenses/declarations, metadata и заявленные интерфейсы. **Не запускалось:** install/build/tool compatibility, воспроизводимость чужих tests, Clipmkr live paths, provider costs и performance. Browser/LLM output privacy требует собственного подтверждения; декларация README не является аудитом.

**Вывод автора:** Stagehand ближе к существующему TS QA, Browser Use — запасной browser driver; UXAgent ближе к persona-usability research, TinyTroupe — к моделированию мнений/сценариев. Это оценка применимости, не сравнительный benchmark. Не доказаны representative human population, соответствие synthetic feedback людям, снижение затрат или рост обнаружения дефектов. Изменений продукта/зависимостей этот набор документов не разрешает.
