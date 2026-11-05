# Карточки проектов

Срез 05.11.2026 около 17:07 UTC: публичные GitHub REST metadata и текущие README. Stars — внимание, не качество. `pushed_at` может относиться к любой ветке и не доказывает исправление открытых проблем/SLA; все семь repositories имеют `archived=false`. Поддержка конкретного Clipmkr-сценария не проверена. [Точные источники](sources.md).

## Другие execution-инструменты из трендов

Эти два проекта приведены кратко как контекст. Основные пять карточек ниже: Lightpanda, Stagehand, Browser Use, UXAgent и TinyTroupe.

### agent-desktop

**Найден в трендах aicoding.space 04.11.2026.** [Primary repo/README](https://github.com/vercel-labs/agent-desktop), [metadata](https://api.github.com/repos/vercel-labs/agent-desktop). Rust, CLI/C library, OS accessibility; Apache-2.0. 16 469 stars, 1 151 forks;  push 05.11.2026 06:31 UTC.

Это драйвер действий для внешнего агента: читает accessibility tree, отдаёт element refs, выполняет click/type; своей LLM и модели людей нет. Поддерживаются macOS/Windows/Linux, но конкретные поверхности/permissions нужно проверять. Ресурсы: отдельный разрешённый desktop и агент; inference оплачивается выбранному провайдеру, сам driver — OSS. Snapshots/clipboard могут содержать private данные. **Вывод:** резерв для native file/download dialogs; не нужен как первый дополнительный слой обычного web QA и не измеряет, поймёт ли человек интерфейс.

### CUA

**Найден в трендах aicoding.space 07.10.2026.** [Repo](https://github.com/trycua/cua), [metadata](https://api.github.com/repos/trycua/cua), [лицензии компонентов](https://github.com/trycua/cua/blob/main/legal/LICENSING.md). Rust core, Python/TypeScript SDK и computer-use компоненты. 31 803 stars, 2 366 forks;  push 05.11.2026 17:01 UTC.

SDK/Driver/Lume в основном MIT; Spaces и Driver Bench сейчас FSL-1.1-MIT, отдельные расширения имеют другие условия. Root MIT badge не делает все компоненты OSS. Есть deprecated packages без дальнейших fixes — выбирать актуальный компонент, не старую команду из обзора. Нужны desktop/VM ресурсы и внешний агент/model; hosted services и inference оплачиваются отдельно. Обрабатываются desktop screenshots, input и сессии. **Вывод:** зрелость инфраструктуры и benchmark не доказывают поведение пользователей; для Clipmkr пока избыточно, переезд инфраструктуры не предлагается.

## Lightpanda

**Найден в трендах aicoding.space 31.10–02.11.2026.** [Repo](https://github.com/lightpanda-io/browser), [metadata](https://api.github.com/repos/lightpanda-io/browser). Zig, AGPL-3.0. 41 391 stars, 2 041 forks;  push 05.11.2026 16:47 UTC.

Headless browser с DOM/JS/CDP и agent-интерфейсом; это execution substrate, а не population simulator. README прямо указывает отсутствие graphical rendering engine; PNG/text export не равен Chromium rendering или video playback. Заявления автора об экономии памяти/скорости не измерены на Clipmkr. Есть default usage telemetry с настройкой отключения; cookies/page data требуют изоляции. Deterministic scripts не требуют LLM, agent-mode оплачивает выбранный inference. **Вывод:** возможен поздний DOM/performance эксперимент; для layout/theme/captions/video оставить реальные Chromium/WebKit. Условия AGPL оценивать для выбранного способа использования, не давать общее юридическое заключение.

## Stagehand

**Дополнительный аналог.** [Repo/README](https://github.com/browserbase/stagehand), [metadata](https://api.github.com/repos/browserbase/stagehand). TypeScript SDK, MIT. 25 956 stars, 1 811 forks;  push 05.11.2026 10:11 UTC. Текущий workspace README/API относится к v4; старые v2 examples нельзя считать актуальным контрактом.

Natural-language observe/act/extract сочетаются с явными browser actions и schema output. Это task/browser agent; personas и критерии usability придётся задать отдельно. Есть local-browser путь: hosted Browserbase не обязателен, но LLM/API, browser RAM и хранение traces имеют стоимость. DOM/страница передаются модели; секретные поля заполнять детерминированно вне model prompt и проверять redaction, не обещать абсолютного отсутствия утечек. **Вывод:** первый кандидат небольшого внешнего QA harness рядом с существующим TypeScript/Playwright; не drop-in замена тестов, совместимость с нашим browser/session API ещё не установлена.

## Browser Use

**Дополнительный аналог.** [Repo/README](https://github.com/browser-use/browser-use), [metadata](https://api.github.com/repos/browser-use/browser-use), [OSS/Cloud граница](https://github.com/browser-use/browser-use/blob/main/CLOUD.md). Python, MIT library; 120 114 stars, 13 400 forks;  push 05.11.2026 09:04 UTC.

Готовый browser task agent, custom tools и model choice; человеческие persona population/репрезентативность не встроенное доказательство. Локальные library/browser доступны отдельно от коммерческого hosted Cloud, который сам не OSS. Текущие library/CLI требования различаются; версию и Python pin проверять перед пилотом. Нужны browser ресурсы и model tokens; локальная модель переносит цену в hardware. Cookies, screenshots, page contents и logs — чувствительные данные. **Вывод:** сильный запасной исполнитель, если TS-кандидат не даёт нужного browser control; Python оставить внешним QA tooling, не новым backend Clipmkr.

## UXAgent

**Дополнительный аналог, наиболее близкий по задаче.** [Repo/README](https://github.com/neuhai/UXAgent), [metadata](https://api.github.com/repos/neuhai/UXAgent), [pyproject](https://github.com/neuhai/UXAgent/blob/master/pyproject.toml), [paper v3](https://arxiv.org/abs/2504.09407v3). Python, Playwright/Chromium, persona generator/browser connector, batch runner/result viewer. 118 stars, 36 forks;  последний push 05.11.2025, то есть год назад. README/pyproject объявляют MIT, но REST license=null и отдельный LICENSE в root не найден; до переноса кода подтвердить условия конкретного revision.

Persona задаёт intent/background, число сессий/concurrency/max_steps; вывод включает trace/log/screenshots/metrics. Встроенные примеры в основном shopping, адаптация upload/download/owner RPC ещё не доказана. Python/LLM API + browser на persona; batch умножает цену и private logs. **Вывод:** отдельный research trial после проверки воспроизводимости/лицензии, не первый production QA dependency. Авторы paper исследовали подготовку UX-study и оценку 16 UX-researchers; это не доказательство совпадения поведения с нашими ordinary/blogger пользователями.

## TinyTroupe

**Дополнительный аналог.** [Repo/README](https://github.com/microsoft/TinyTroupe), [metadata](https://api.github.com/repos/microsoft/TinyTroupe), [responsible-AI FAQ](https://github.com/microsoft/TinyTroupe/blob/main/RESPONSIBLE_AI_FAQ.md). Python/Jupyter, MIT; 7 639 stars, 693 forks;  push 23.10.2026 17:14 UTC.

TinyPerson/TinyWorld моделируют personas, разговоры, цели и группы; проект экспериментальный, API меняется. Есть средства сравнения с empirical data, но валидация на Clipmkr не проведена. Это не готовый browser runner для реальной загрузки/платёжного webhook. Нужны model calls на участников/шаги; OpenAI/Azure paths и experimental local support не гарантируют совместимости с нашими providers. На вход могут попадать предложения продукта и persona data — использовать вымышленные/обезличенные материалы. **Вывод:** опциональная генерация UX-гипотез/сценариев, которые проверяются в browser и с людьми; не использовать synthetic opinions как измеренную конверсию.
