# Авторская проверка памятки — 05.11.2026

Авторская роль по поручению: gpt-6.1-sol high. Это самопроверка, не независимое QE.
Артефакт: `docs/course/dz-feature-adr-openspec.md` (232 строки).
SHA-256: `6f029f1dd40c760789d6964ff0bb6615083599b6e864a646c8207bc5ce3ae057`.

## Источники и границы

Прочитаны AGENTS.md, CLAUDE.md, локальные правила `.claude/rules`, текущая приёмка
`docs/acceptance/core-cjm.md`, требования/reuse/план этой задачи, матрица моделей,
политика ревью, требования blogger-acceptance и cloudru-release-parity,
материалы выбора оформления и ограничений макета.
feature-adr 1.5.25 прочитан в установленной копии
`/tmp/clipmkr-public-entry-20261105/.agents/skills/feature-adr/SKILL.md`;
studio-extended-qe прочитан как reference only. AQE runtime и агенты не запускались.
Требования и план не менялись. K2 и admission не переисполнялись и не подделывались;
их исходный статус передан координатором, не является новым авторским доказательством.

## Проверенные команды и наблюдения

Для npm/help cwd: `/tmp/clipmkr-public-entry-20261105`.
PATH начинался с `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin`.
Никаких установок, recall/teach на реальных данных или runtime-операций не было.

| Команда | Фактический результат |
|---|---|
| `npm run dz -- --version` | `0.8.58`, exit 0 |
| `npm run dz -- --help` | Общая справка, exit 0; прочитаны применимые строки |
| `npm run dz -- recall --help` | Общая справка с синтаксисом recall, exit 0 |
| `npm run dz -- teach --help` | Общая справка с синтаксисом teach/project/no-mirror, exit 0 |
| `npm run openspec -- --version` | `1.15.0`, exit 0 |
| `npm run openspec -- --help` | Список команд, exit 0; отдельной верхнеуровневой apply нет |
| `npm run openspec -- validate --help` | type/strict/no-interactive подтверждены, exit 0 |
| `npm run openspec -- show --help` | type/json подтверждены, exit 0 |
| `npm run openspec -- status --help` | change/json подтверждены, exit 0 |
| `npm run openspec -- list --help` | changes/specs/json подтверждены, exit 0 |
| `node -p "require('./node_modules/@dzhechkov/skills-feature-adr/package.json').version"` | `1.5.25`, exit 0 |

Поведение OpenSpec на **своей** рабочей копии проверено через тот же закреплённый
исполняемый файл: `node /tmp/clipmkr-public-entry-20261105/node_modules/@fission-ai/openspec/bin/openspec.js <аргументы>`.
Это намеренно не запуск npm из worktree без node_modules: он мог бы выбрать старый `/tmp/node_modules`.
Синтаксис npm-примеров проверен help выше; ниже проверено поведение этого pinned CLI на guide change.

| Аргументы | Фактическое наблюдение |
|---|---|
| `list --changes --json` | guide присутствует, `no-tasks` |
| `list --specs --json` | `specs: []`; каталога openspec/specs в рабочей копии нет |
| `show course-toolchain-guide --type change --json` | exit 1, `Change must have a Why section` |
| `status --change course-toolchain-guide --json` | `isPlanningComplete: false`, `isComplete: false`; design отсутствует, tasks blocked |
| `validate course-toolchain-guide --type change --strict --no-interactive` | exit 0, `Change 'course-toolchain-guide' is valid` |

Ошибка show и состояние status раскрыты в памятке. Proposal не исправлялся:
это вне разрешённых целей автора; координатору передаётся наблюдение, не новая трактовка требований.
Sync/archive/apply и команды деплоя не исполнялись.

## Anti-drift FR-1..FR-6

| FR | Где раскрыт | Авторская проверка и ограничение |
|---|---|---|
| FR-1 | Сравнение и разделы каждого инструмента | Русский Markdown, задача/применение/результат/ограничения |
| FR-2 | dz, границы доказательств, workflow | CLI не создаёт human approval; checkpoint не объявлен E2E |
| FR-3 | Три примера Clipmkr | Автоссылка, повторная регистрация, Cloud; предлагаемые детали не названы принятыми/готовыми |
| FR-4 | Команды и цикл обучения | Синтаксис pinned help; teach/recall приведены как образец и не исполнялись |
| FR-5 | Последовательность, ошибки, источники | Проверены 19 относительных ссылок; независимая проверка ещё требуется |
| FR-6 | Раздел OpenSpec и защита от drift | Требования feature-adr явно названы; автономность без OpenSpec, overlap/цена/capabilities/delta/sync/archive; одна дельта и exact ref/hash/FR mapping |

Фактическая дельта OpenSpec шире конкретных формулировок FR: один requirement/scenario,
а не шесть требований. В памятке это явно указано; локальный requirements-файл даёт детализацию.
Проверенный SHA-256 spec: `a9cdc21f30095eabe55a0a3f71dc3253481b7a84d71e4474f7170360ac8e8af5`.
Hash совпал с требованиями и текстом памятки. Ни hash, ни эта таблица не доказывают acceptance.

## Локальные проверки

Python-проверка: 19 ссылок существуют, парные fences, нет trailing whitespace,
нет skeleton-комментариев, присутствуют FR-1..FR-6, hash spec совпадает.
Поиск паттернов email/HTTP URL/X-Amz/private-key в памятке — ноль совпадений;
дополнительно текст просмотрен: реальных email, секретов, приватных адресов и signed URL нет.
Это ограниченная проверка документа, не security audit репозитория.

`git diff --check` — exit 0. Новый файл пока untracked, поэтому дополнительно выполнен
`git diff --no-index --check /dev/null docs/course/dz-feature-adr-openspec.md`:
диагностик whitespace нет, exit 1 означает наличие различий с пустым файлом.
Markdown проверен структурно и чтением; отдельный Markdown renderer/linter не запускался.

Приложение, БД и Cloud не менялись. Commit/push не выполнялись.
Следующий шаг координатора: freeze и новое cross-model ревью gpt-6-astra xhigh
по исходным требованиям и плану, без подачи авторских выводов как входного доказательства.
