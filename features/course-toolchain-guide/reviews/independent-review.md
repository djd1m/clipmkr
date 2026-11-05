# Независимое ревью памятки курса

Дата: 05.11.2026. Роль: `qe-primary`; family: `owner-exception` по разрешённому владельцем cross-model исключению. Назначенная модель: `gpt-6-astra`, effort `xhigh`; автор по плану — `gpt-6.1-sol high`. Новая сессия без истории автора; отдельный транспортный ID сессии и аттестация модели инструментами не предоставлены. Другие агенты не запускались.

QE-VERDICT: A

Вердикт: **clean**. Подтверждённых нарушений FR-1…FR-6 не обнаружено; условий исправления нет. Это оценка учебного Markdown, не допуск приложения или закрытие host gate.

## Входы и метод

Сначала прочитаны AGENTS.md, docs/review-policy.md, 01_requirements.md, 02_reuse_inventory.md и 06_implementation_plan.md этой задачи. Затем самостоятельно найден единственный EXPECTED_CODE_TARGET: `docs/course/dz-feature-adr-openspec.md`, прочитаны его дельта/proposal, применимые CLAUDE.md, core-cjm, матрица моделей и исходные требования примеров. Авторские handoff/checks/отчёты успеха не использованы.

Применены как reference: закреплённый feature-adr `modules/08-qe.md`, модули требований/плана; `/home/product-studio/.agents/skills/studio-extended-qe/SKILL.md` и его testing/extended-qe документы. Проверка ориентирована на риск ложных возможностей, ложных статусов, drift требований и неисполняемых примеров. AQE runtime не запускался.

## Покрытие требований

| FR | Результат и самостоятельно проверенное основание |
|---|---|
| FR-1 | PASS: русский Markdown; строки 9–50 различают назначение, момент применения, результат и ограничения трёх инструментов. |
| FR-2 | PASS: строки 15–17, 54–93 признают пересечение; CLI не создаёт согласование/E2E. Одна владельческая дельта, связанные FR и проверка расхождений описаны явно. |
| FR-3 | PASS: строки 114–159 разбирают автоссылку, повторную регистрацию и перенос существующего Clipmkr, роли всех трёх инструментов и доказательства результата. Предложения отделены от реализации/приёмки. PartnerService и attribution обнаружены в текущем коде; требования blogger/cloud и core-cjm прочитаны как контекст, их прежние заявления об успехе не приняты за доказательство. |
| FR-4 | PASS: версии пакетов совпали с package.json, package-lock.json и pinned install; команды независимо выполнены или сверены по help. Teach показан как неисполняемый учебный образец; команд деплоя и секретов в памятке нет. |
| FR-5 | PASS: последовательность, ошибки и ограничения есть; проверены все 19 относительных Markdown-ссылок целевого документа, 19/19 ведут к файлам, фрагментных anchors нет. В требованиях01, reuse02, плане06 и OpenSpec-файлах этой задачи дополнительных Markdown-ссылок нет. |
| FR-6 | PASS: feature-adr уже хранит требования и не требует OpenSpec; capabilities отделены от feature-папок. Добавочная польза, стоимость дублирования и drift раскрыты без обещания автоматической пользы. Отсутствие openspec/specs подтверждено filesystem и list. Точный spec path, заголовки requirement/scenario и SHA-256 совпали; mapping FR-1…6 → один общий requirement/scenario честно обозначен many-to-one, детализация остаётся в FR. |

## Команды и наблюдения

Использованы только Node `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node` (`v22.23.4`) и бинарники из `/tmp/clipmkr-public-entry-20261105/node_modules`; старый `/tmp/node_modules` не использовался. npm scripts `dz`/`openspec` сверены с package.json; оба `npm run … -- --version` выполнены из pinned install. Для help и guide change вызван абсолютный pinned bin через Node, cwd — проверяемая рабочая копия, чтобы не подхватить старый родительский bin. Телеметрия OpenSpec отключена.

| Проверка | Фактический результат |
|---|---|
| dz --version; npm run dz -- --version | exit 0, `0.8.58` |
| dz recall --help; dz teach --help | exit 0; общий help содержит показанные --project, --limit, --type lesson-learned, --no-mirror |
| Пакет feature-adr | `1.5.25` в manifest установленного пакета, package.json и lockfile |
| openspec --version; npm run openspec -- --version | exit 0, `1.15.0` |
| openspec --help | exit 0; отдельного верхнеуровневого apply нет, instructions поддерживает apply; archive описан как обновление основных specs и архивирование |
| openspec list --changes --json | exit 0; guide найден, `no-tasks` |
| openspec list --specs --json | exit 0, `specs: []`; каталог openspec/specs отсутствует |
| openspec show course-toolchain-guide --type change --json | exit 1, `Change must have a Why section` |
| openspec status --change course-toolchain-guide --json | exit 0, `isComplete: false`; design отсутствует, tasks blocked |
| openspec validate course-toolchain-guide --type change --strict --no-interactive | exit 0, change valid |

Отрицательный результат show и незавершённый status точно воспроизвели заявленные в памятке ограничения. Это не скрытый успешный workflow: описание прямо предупреждает об этих результатах. Исправление proposal/schema не является условием приёмки данного учебного документа.

## Привязка к host и anti-drift

До содержательного формального ревью самостоятельно вычислены все 6 SHA-256; **6/6 совпали**. Повторная проверка перед сохранением также 6/6. SHA-256 компактного JSON manifest совпал с revision.

Nonce: `c11421ed-0318-4200-84e4-56e2555bdaae`.
Revision: `4969b522d57283e3be840be7afd7e25fc39750cb80b2ab6ec7f57fe16bd4726b`.

| Артефакт | Измеренный SHA-256 |
|---|---|
| `docs/course/dz-feature-adr-openspec.md` | `6f029f1dd40c760789d6964ff0bb6615083599b6e864a646c8207bc5ce3ae057` |
| `features/course-toolchain-guide/00_complexity_assessment.md` | `87a7d66167f49a636b20dfdef612e645fdd0578d44742c75855d6088e4515f77` |
| `features/course-toolchain-guide/01_requirements.md` | `be2b62cb0d0410654c4baaabe4eafd707708dfe2af5b503f5250e1d24d70445b` |
| `features/course-toolchain-guide/06_implementation_plan.md` | `2150c0eb1adb2b4a044b52190bb1023fa0d2e0f6c9fb194f2afe7cec92fee73b` |
| `openspec/changes/course-toolchain-guide/proposal.md` | `c2049a56e7fd0479441d37590f907935859fec982c3fa15027cfb5625ea4039e` |
| `openspec/changes/course-toolchain-guide/specs/course-guide/spec.md` | `a9cdc21f30095eabe55a0a3f71dc3253481b7a84d71e4474f7170360ac8e8af5` |

Code/spec anti-drift: содержимое памятки сопоставлено с каждым FR, точным spec и текущими результатами CLI; противоречий в проверенном scope не обнаружено. Hash удостоверяет байты, не согласование или подлинность reviewer. Дополнительные источники вне шестифайлового manifest прочитаны в этой копии, но host revision их не связывает.

## Ограничения и передача

Не исполнялись teach, sync, archive, deploy, операции приложения/БД/Cloud, UI/E2E, платёжные или нагрузочные тесты; recall хранилища также не запускался — проверялся help. Не проверялись успешность исторических gates/приёмок, доступность Cloud, фактический перенос или сохранение урока. Markdown renderer не запускался. Никаких выводов о рабочем продукте из этого ревью не следует.

Новых подтверждённых рисков в полном документном scope не выявлено. Требования, памятка и продуктовый код не изменялись; коммиты/push не выполнялись. Собственная запись clean сохраняется под заданным flock с пустыми conditions/verifications и сохранением остальных полей envelope. Подготовка/оценка host gate остаётся координатору.
