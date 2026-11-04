# Независимое ревью и расширенный QE: Cloud.ru selection thinking

Дата: 04.11.2026. **SOURCE GO только для ограниченного тестового развёртывания и настоящего replay.** Подтверждённых BLOCKING/HIGH/MEDIUM-дефектов в проверенном diff не найдено. Реальная интеграция, terminal worker outcome и полный CJM: **PENDING / NOT RUN этим reviewer**. Этот отчёт не разрешает публикацию на Cloud.ru, production/DNS, не закрывает ручную приёмку владельца и не является native checkpoint receipt.

## Идентичность и независимость

- Отдельная сессия: `/root/provider_fix_qe`. Запрошенная модель проверки: `gpt-6-astra`, reasoning `xhigh`; запрошенная модель автора по dispatch: `gpt-6.1-sol high`. Runtime attestation моделей отсутствует: это запись запрошенных настроек, а не доказательство фактических model IDs.
- Сначала прочитаны только `AGENTS.md`, `docs/model-matrix.md`, `docs/review-policy.md`, feature `00_complexity_assessment.md`, `01_requirements.md`, `02_research.md`, `06_implementation_plan.md` и точные OpenSpec refs. Код открыт лишь после отдельного приглашения координатора с frozen hashes. Авторские PASS/отчёты не использовались как входное доказательство.
- База: `ee7b30903c89286e9a1c36b2ca8da4bb073fb1c7`. Candidate — два незакоммиченных файла поверх этой базы, поэтому новый commit SHA не заявляется.
- `apps/worker/src/llm/provider.ts`: SHA256 `527f61fe1678c7e30412bc62eed51a7d7afe539be0ab9de197d308018aad12bc`.
- `tests/cloudru-provider.test.ts`: SHA256 `911dd722c988f943b030efceb23f8f3243949e66eda8741d791e54911b4688f9`.
- Оба source hashes совпали до и после проверки. Production/worktree source не мутировался; шесть мутаций исполнялись только в отдельной временной копии tracked baseline с наложенными двумя candidate files.
- `openspec/changes/cloudru-selection-thinking/proposal.md`: SHA256 `224ae1d5c86003f46bab1e5aa72abb4426ca50290be15ddb719b54ddf8e1d0e6`; `openspec/changes/cloudru-selection-thinking/specs/cloudru-selection-thinking/spec.md`: SHA256 `f5120d4c84c382b751feb3b4fa34444b4129d7f388a583a51c794594480792b3`. Оба сверены с `01_requirements.md`.

Применены `code-critic` для read-only анализа и `studio-extended-qe` для отдельно порученных reviewer тестов. Навыки взяты из `/home/product-studio/.agents/skills/`; pinned contract-testing, risk-based-testing, mutation-testing, chaos-engineering-resilience и evidence discipline brutal-honesty-review — из `/home/product-studio/vendor/agentic-qe/`, revision `c0ddcf3fc07fcea0d1b37f41ad65372b3de7ce69`. SHA256 всех пяти SKILL.md проверены по `UPSTREAM.json`. В Clipmkr нет этого vendor snapshot и двух указанных skill-документов `architecture/testing.md`/`docs/process/extended-qe.md`: прочитаны их Product Studio originals, а конкретные проверки взяты из Clipmkr requirements и `.claude/rules/testing.md`. AQE runtime/Pact/Stryker/fleet не запускались и не устанавливались. Неизменяемый vendor run-history не редактировался; результаты мутаций сохранены отдельно.

## Рост god-object (BLOCKING)

Нарушений нет: runtime diff — один дополнительный JSON field внутри существующего `createSelector`, `provider.ts:42`; файл 74 строки. Новых функций, модулей, exports, конфигурации и ответственности нет.

## Безопасность (BLOCKING / HIGH)

Нарушений в diff не найдено. Endpoint, авторизация, redirect policy и отправляемый transcript/prompt не меняются. Новых логов, секретов, внешних адресатов, retries и provider fallback нет. Тесты используют синтетические ключи.

## Архитектура (HIGH / MEDIUM)

Повторно используется действующий request boundary; параллельного клиента или transport path не добавлено. `chat_template_kwargs: { thinking: false }` находится только в Cloud.ru arm условного spread. OpenRouter arm побайтово не изменён.

## Антипаттерны

Новых defensive swallow, ручных retries, блокирующего I/O, env knobs и дублирования реализации нет. Существующие обработчики ошибок и `finally` не изменены.

## Типы и контракты

FR-1/FR-2 реализованы: точное JSON-поле и boolean false; отсутствие дополнительных token limits, vendor thinking options, смены модели, deadline или prompt. В request-capture проверяются фактически отправленные JSON bodies, их точные top-level keys, Cloud.ru значение и OpenRouter отсутствие поля. Тест не читает source substring для доказательства нового контракта.

## Пограничные и отказные случаи

FR-3 проверен существующим provider suite: malformed JSON/envelope, `content=null`, refusal, `finish_reason=length`, invalid fields/candidate filtering, HTTP 429/503, сетевой отказ, один вызов, отмена во время headers/body, поздний JSON после отмены и разные пределы 600000/240000 ms. Provider suite применяет fake clock к deadline, а transport suite выполняет реальные localhost HTTP запросы: задержанные headers/body, маленький transport cap с отказом, больший с успехом, caller abort, dispose ровно один раз и отсутствие открытых sockets после завершения. Действующее ограничение и cleanup сохранились на candidate bytes.

## Качество тестов и фактический QE

Среда reviewer: Node `v22.23.4`, binary `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node`, Vitest `3.2.7`. Системный Node24 для проверок не использовался.

Команда на candidate worktree:

```sh
PATH=/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin:$PATH npm test -- tests/cloudru-provider.test.ts tests/cloudru-transport.test.ts
```

Наблюдение: exit 0, **2 файла / 24 теста PASS без пропусков** (21 provider + 3 transport), 7.08 s. `git diff --check`: exit 0.

| Требование → риск | Сценарий и команда | Наблюдение | Ограничение |
|---|---|---|---|
| FR-1/AC-1 → отсутствующее или ошибочное поле | Request-capture в provider suite; отдельные remove/rename/invert/vendor mutants | Candidate 21/21; каждый mutant ломает assertion `tests/cloudru-provider.test.ts:93` | Проверяется сформированный request, не семантика реального Cloud.ru |
| FR-2/AC-1 → поле у соседнего provider или лишний token cap | OpenRouter capture и точный набор keys; leak/cap mutants | Падения на строках 106 и 94 соответственно | OpenRouter live вызов не выполнялся |
| FR-3/AC-2 → ослабление rejection/одного запроса/deadline | Provider suite из команды выше | 21/21, negative cases включены | Deadline тестируется детерминированными часами |
| FR-3/AC-2 → timeout/abort/cleanup transport | `tests/cloudru-transport.test.ts` из команды выше | 3/3; реальные localhost sockets и driver | Локальные faults не подтверждают доступность remote provider |
| FR-3/AC-3 → mocks скрывают реальный failure | Actual uncapped worker replay на том же source/image | **PENDING**, reviewer не запускал | Без этого нет provider PASS или feature completion |

Мутации исполнялись в `/tmp/clipmkr-provider-independent-qe-20261104-05hlchos/snapshot`; manifest и полные stdout/stderr: `/tmp/clipmkr-provider-independent-qe-20261104-05hlchos/results.json` и соседние `*.log`. Команда каждого прогона: `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node scripts/test.mjs tests/cloudru-provider.test.ts`. Запускался весь provider file без test-name filter.

| Вариант | Actual exit / результат |
|---|---|
| Candidate до мутаций | 0; 21/21 PASS |
| Удалить `chat_template_kwargs` — точное runtime содержимое baseline | 1; 1 expected assertion FAIL, 20 PASS |
| Переименовать в `chat_template_kwarg` | 1; 1 expected assertion FAIL, 20 PASS |
| Заменить `thinking:false` на `true` | 1; 1 expected assertion FAIL, 20 PASS |
| Заменить поле на vendor `thinking:{type:'disabled'}` | 1; 1 expected assertion FAIL, 20 PASS |
| Добавить Cloud.ru поле в OpenRouter arm | 1; 1 expected assertion FAIL, 20 PASS |
| Добавить `max_tokens:4096` | 1; 1 expected assertion FAIL, 20 PASS |
| Восстановленный candidate | 0; 21/21 PASS |

Логи проверены: красное вызвано нужными assertions, а не инфраструктурной ошибкой. Шесть выбранных мутантов обнаружены; общий mutation score проекта не вычислялся. Отсутствующие CI manifests `.gitlab-ci.yml`/`.github/workflows` не позволяют подтвердить remote pipeline inclusion; локальный Vitest include `tests/**/*.test.ts` и проектный npm wrapper действительно собирают оба файла.

## Процесс и незавершённые условия

- TASK-1: native K2/check-code-targets/plan checkpoint/coder context находятся у координатора; reviewer не проверял их private receipts и не маркирует их PASS.
- TASK-2: минимальный fix и meaningful regression подтверждены независимым чтением, GREEN и actual baseline/wrong-key RED.
- TASK-3: focused provider/transport проверены reviewer; workspace typecheck/build/lint и полный набор тестов не исполнялись этим reviewer, результаты автора не засчитывались.
- TASK-4: независимая source review и локальный contract/negative/fault/mutation QE выполнены. Настоящий uncapped worker replay **PENDING**.
- TASK-5: code/spec anti-drift выполнен для названных hashes. Commit, зеркала, deployment, image identity и runtime outcome — работа координатора, здесь не засчитаны.

Полное завершение не заявляется. Для AC-3 нужны duration, finishReason, usage/reasoning tokens, accepted fragments и terminal job outcome фактического uncapped worker с привязкой к source/image. Ограниченный probe с token cap не удовлетворяет этому условию.

## Безопасность выпуска

SOURCE GO означает отсутствие найденных препятствий в двух проверенных файлах для разрешённой тестовой копии после остальных обязательных checks. Это не production GO. Изменение не гарантирует latency ниже прежних 600 s; remote provider может не выполнить ожидаемую семантику, что устанавливается фактическим replay. Данные тестового стенда сохраняются; порядок ручной приёмки владельца перед Cloud.ru остаётся обязательным.

## Предложения (LOW)

Нет: косметические изменения для этого bounded fix не требуются.

## Вопросы координатору

Нет вопросов, блокирующих source review. Координатор должен отдельно дописать фактические gates/checks и runtime evidence, не изменяя смысл независимых наблюдений этого отчёта.

## Пропущенные проверки и пределы

Реальный Cloud.ru/OpenRouter, production, полный upload→render→play/download, 90/120 минут, оплаты и кабинет блогера не проверялись: это отдельные интеграционные/продуктовые условия. Concurrency/DB/schema/restart/delete sweep не расширялся: diff не меняет эти пути. Build/typecheck/lint и весь репозиторный integration suite остаются отдельными обязательствами координатора, а не доказанными здесь фактами. Выбранные faults локальные; никаких production chaos или paid provider calls reviewer не выполнял.

WORK_UNIT_ID: cloudru-selection-thinking-independent-qe-20261104
TRACE_PATH: /tmp/clipmkr-provider-independent-qe-20261104-05hlchos/results.json
Status: completed

## Дополнение координатора перед тестовым развёртыванием

Исходное независимое заключение выше SHA256 `79a4ab576f2aceeeb6acb41ed593a8cdc89d8762c785393208ef54426734b33d` до дополнения. Авторская сессия `/root/mockup_ui_author_a`, requested `gpt-6.1-sol high`, сообщила фактические RED→GREEN и59/59 focused provider/transport/selection/order без пропусков; shared/worker typecheck и build, lint и diff check завершились exit0. Это результаты автора, не повторное независимое исполнение. Независимая Astra проверила24/24 и6 выбранных мутаций, как описано выше.

Координатор подтвердил нативный S K2 exit0, supported plan checkpoint и полный coder context; K1 N/A для двух существующих файлов без новых модулей/exports. Повторный actual source admission после кода exit0, manifestDigest `8410485dc7a3b43a52ed731977a6409797f1704dee0650a97370917fad985e75`. Diff содержит только одно поле Cloud.ru request и assertions request contract. Нативные проверки UI-фичи и ожидаемое исключение владельца остаются отдельными.

На момент этого дополнения образ, uncapped deployed replay, terminal job, render/play/download ещё PENDING. Коммит не является заявлением о завершении этих проверок.
