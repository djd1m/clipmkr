# Шесть проектов: дизайн, компоненты, аудит и опрос

Срез GitHub REST/README/licensefiles: 05.11.2026, около 17:35 UTC. Все шесть repositories не архивированы. Stars отражают внимание. Ни push, ни один свежий commit не доказывают регулярную поддержку/SLA. Source-path commit ниже относится к указанной части репозитория, не называется последним функциональным изменением всего проекта. Установка и сравнительный benchmark не выполнялись.

## Impeccable — дизайн-процесс

[Repo](https://github.com/pbakaus/impeccable), [Apache-2.0 LICENSE](https://github.com/pbakaus/impeccable/blob/main/LICENSE). **103 669 stars**. Проверенный кодовый commit `978e5531` от 05.11 в `crates` меняет hook; релиз [cli-v4.8.0](https://github.com/pbakaus/impeccable/releases/tag/cli-v4.8.0), 26.10.2026. Последний main commit синхронизирует generated reference, поэтому его нельзя выдавать за новый UX-алгоритм.

**Найден в трендах aicoding.space 30.10.** Это design skills/audit/critique для coding-agent, не React-компоненты и не human survey. Подходит для проверки иерархии, состояний, responsive и перегруза optional controls, сохраняя Next/React/CSS. Ресурсы: действующий агент и model calls; код/скриншоты могут попасть в его контекст. Hooks не устанавливать автоматически. Авторский вывод: лучший первый процессный кандидат, но модельный critique score не калиброван в UMUX-Lite.

## Radix Primitives — поведение доступных компонентов

[Repo](https://github.com/radix-ui/primitives), [MIT LICENSE](https://github.com/radix-ui/primitives/blob/main/LICENSE). **19 471 stars**. Source-path `packages/react`: последний commit `06d51305`, 14.10, только formatting; следующий `d715acbf`, 14.10.2026, исправляет dismissable-layer. Latest GitHub release endpoint вернул 404; это не доказательство отсутствия npm-релизов.

**Дополнительный аналог.** React/TypeScript headless primitives можно брать по одному: dialog, popover, select, focus/keyboard. Native button/details сначала проверить на достаточность. Тема/контраст/копирайтинг/композиция остаются ответственностью Clipmkr; библиотека не гарантирует доступность итогового экрана. Нет обязательного нового backend; цена — зависимости, bundle и integration tests. Данные обычно остаются в приложении; реальные потоки и telemetry проверять перед внедрением. Вывод: точечный кандидат, не повод переделать весь кабинет.

## shadcn/ui — готовые React-блоки с владением кодом

[Repo](https://github.com/shadcn-ui/ui), [MIT LICENSE.md](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md). **127 429 stars**. Commit `15f59b41`, 27.10, в `packages/shadcn/src` меняет MCP SDK; релиз [shadcn@4.23.0](https://github.com/shadcn-ui/ui/releases/tag/shadcn%404.23.0), 27.10.2026. Main 04.11 меняет registry data, не новый runtime-компонент.

**Дополнительный аналог.** Компоненты/blocks и copy-source модель подходят React/Next, но требуют сверки конкретного registry, выбранной primitive-base и CSS/Tailwind dependencies. В проверенном Clipmkr web package этих библиотек нет; нельзя назвать их уже переиспользованными. Native CSS/tokens приоритетны; переносить только доказанно нужный блок. Цена — адаптация/сопровождение собственного скопированного кода, не обязательная SaaS-подписка. Registry/source review важнее красоты demo. Это материал реализации согласованного UX, не human usability evidence.

## axe-core — автоматическая доступность

[Repo](https://github.com/dequelabs/axe-core), [MPL-2.0 LICENSE](https://github.com/dequelabs/axe-core/blob/develop/LICENSE). **7 764 stars**. Кодовый `lib` commit `cf9d7a19`, 04.11, исправляет target-size rule; релиз [v4.14.0](https://github.com/dequelabs/axe-core/releases/tag/v4.14.0), 05.10.2026. Текущий develop HEAD 05.11 — lockfile update, отдельно от code change.

**Дополнительный аналог, native reuse первым:** в Clipmkr уже объявлен `@axe-core/playwright@4.11.0`; исследование не предлагает безусловное обновление. Проверять обе темы, ошибки/loading, keyboard/focus и expanded controls в настоящем браузере. Движок находит часть a11y-проблем; clean scan не означает WCAG certification, понятность форм или максимальный UMUX. Browser CPU/trace storage, без обязательной модели/сервиса. DOM и отчёты могут содержать пользовательские данные — private/redacted evidence. Сопутствующие dependencies имеют собственные лицензии.

## SurveyJS Form Library — два вопроса реальным людям

[Repo](https://github.com/surveyjs/survey-library), [MIT LICENSE](https://github.com/surveyjs/survey-library/blob/master/LICENSE). **4 921 stars**. Кодовый `4678c2ae`, 05.11, исправляет survey-core file question; релиз [v3.2.4](https://github.com/surveyjs/survey-library/releases/tag/v3.2.4), 03.11.2026.

**Дополнительный аналог.** JSON-defined survey-core/React renderer позволяют собрать два seven-point rating items и отправить ответы в выбранное хранилище без SurveyJS backend. В [исходнике rating](https://github.com/surveyjs/survey-library/blob/master/packages/survey-core/src/question_rating.ts) проверены rateMin/rateMax/rateStep; seven-point конфигурацию и export ещё нужно испытать. Это не готовый валидированный RU UMUX template. Для двух вопросов существующая простая форма/ручной export может быть дешевле библиотеки. Не распространять MIT core на отдельные Creator/Dashboard/PDF продукты: их условия изучать отдельно. Ответы, согласие и хранение — исследовательский контур, без реальных account identifiers в public logs; никакой auto-score от AI-personas.

## Formbricks — отдельный исследовательский сервис

[Repo](https://github.com/formbricks/formbricks), [root LICENSE](https://github.com/formbricks/formbricks/blob/main/LICENSE), [EE LICENSE](https://github.com/formbricks/formbricks/blob/main/apps/web/modules/ee/LICENSE). **13 217 stars**. Кодовый `apps/web` commit `fa0546bd`, 05.11; релиз [6.1.4](https://github.com/formbricks/formbricks/releases/tag/6.1.4), 05.11.2026. RESTlicense NOASSERTION объясняется смешанными scope, а не отсутствием прочитанного licensefile.

**Дополнительный аналог.** Next/React/TypeScript stack знаком, но отдельные app/storage/SDK и сопровождение тяжелее двух вопросов. Core в основном AGPLv3, перечисленные SDK/UI packages MIT, EE code имеет отдельные коммерческие условия — весь repo не объявляется MIT/единым OSS. Link/in-app surveys подходят сбору human responses, не доказывают валидность перевода/расчёта. Self-host требует ресурсов/администрирования; hosted/enterprise costs отдельно. В survey могут уйти ответы и context metadata; не подключать SDK к production ради данного исследования. Вывод: рассматривать только при регулярной программе исследований.
