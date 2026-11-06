# Step 7 — изменения fix-namecheck-private-sources

Запрошенный автор — `gpt-6.1-sol high`. Serving model и идентичность исходной авторской сессии — **NOT_ATTESTED**. Это фактический отчёт этапа, не checkpoint или разрешение установки.

## Существующие targets и текущая дельта

| Файл | Фактическое состояние |
|---|---|
| `patches/dz-name-check-app-source.patch` | Сохраняет reviewed collector/consumer, valued source-root, static Python AST, aggregate budgets, native+extra counters, directory-only exclusions и timer перед discriminator. В этом lint repair **не менялся**. |
| `tests/feature-adr-paths.test.mjs` | Убрано дублирование fixture lifecycle, запуска subprocess, file/hook cases и mutation wrappers. Общая resource table сохраняет прежние имена/объёмы fixtures; strict metadata assertions и discovery runner сохраняют прежние oracles. Все22 самостоятельных test titles и их порядок сохранены. |

Точные SHA256 текущих bytes:

- Patch: `b804a82aee8ec3c5821a42c0c9a1dae9380a20df94182ac3e5600929a869ce9a`.
- Test: `c820ae6a29db3cf6b351d8207d239a4a4ac68f5a68bcc4a2fb0c4228e4238bb6`.
- Исполненный candidate CLI: `a6dcabe4f78f799c9251bccf8f78ec323d4e1689fe99c28feb99b46ef53b2b0a`.

Переиспользованы прежние fixture/run/verdict/prepare, pure decision и declaration parser, canonical K2 checker и readonly dependencies. Новых repo modules, public exports/commands/API, worker, framework или dependencies нет. Отчёт — стандартный Step7 output, не новый implementation target и не изменение требований.

## Фактические проверки на последних source bytes

Исходный `node scripts/lint.mjs` воспроизведён: **exit1**, «tests/feature-adr-paths.test.mjs: больше 500 строк»,644 по `source.split('\n').length`. После structural refactor:499 физических строк/500 по той же формуле; настоящий неизменённый lint — **exit0**, «Статические правила: ошибок нет». Scoped `node --check tests/feature-adr-paths.test.mjs` — exit0.

Финальный `node --test tests/feature-adr-paths.test.mjs`, Node22.23.4: **exit0,22/22,skipped0,cancelled0,todo0**, stderr пуст; внешнее измерение **142.181 с**. Прогон выполнен после последнего source edit; hashes до/после совпали.

До final checks выполнены авторский code-critic и parity map всех22 titles/scenarios и16 mutants. AST-сверка сохранила19 replace-пар и12 fault templates; неразрешённых identifiers нет. Это supporting audit, а не замена реального CLI.

С сохранёнными исходными receipts совпали **147 CLI argv/exit/executable hashes**, **10 K2 commands/targets/exits**,144 fixture JSON outputs и bytes всех16 meaningful mutants. Допустимых колебаний remaining-budget reason в этом сравнении не было. Два actual-repo ответа сохраняют результаты/selection/exclusions; изменение их bytes точно равно изменению размера test. Каждый из16 mutants дал syntax0 и конкретное нарушение прежнего behavioral oracle; полного mutation score не заявлено. Для leak mutant общий wrapper дополнительно проверяет syntax перед oracle.

Сохранены real kernel EACCES при uid!=0, Python side-effect/sentinel controls, controlled10020ms delays и markers,9999/10000 boundaries, native legacy/newflag semantics, default actual-repo compatibility с11 shell exclusions, FREE positives/refuse-all и canonical K2 positive/negative controls. Задержки управляемые, не benchmark filesystem.

## Статус review и anti-drift

Исторические originating verifications/closure NCQE-01/02/03 относятся к прежним patch `b804a82aee8ec3c5821a42c0c9a1dae9380a20df94182ac3e5600929a869ce9a` и test `13de66c1f801f90a5dbd716ef69f0a394a0e4edd9f0cb968f0368c318d7f0267`. Они не объявляются приёмкой новых test bytes. **Новая structural delta — review pending; законный дальнейший route определяет root.** Новый native cycle/reset/обход ceiling не выполнялись и не заявлены. Public08/native lineage и прежние author assessments сохранены.

Все10 нормативных hashes и18 shared input/dependency hashes совпали. Требования, reuse inventory, ADR, архитектура, план и ledger не менялись. Ledger revision2: `65442de55d8ffe60d6d27ce593004b053b9a1d5bf4c6a5f6037d75276f2126ba`. Лимиты, selection, exclusions и pure decision не менялись. Изменения только в existing test, этом factual report и новых private evidence.

## Ограничения

Static JS/PY не доказывает dynamic bindings; исследуемый Python не исполняется. Scanner не прерывает sync syscall, но отвергает late return; файловая система не предоставляет атомарный общий snapshot. Эти ограничения не ослаблены lint repair.

Исполнение только actual candidate temp CLI и локальные controlled tests; общая установка readonly. Shared installation — **NOT_RUN**, actual private K1 — **NOT_ESTABLISHED**. App/E2E/main recovery/runtime/deploy и внешние операции не выполнялись. Независимая приёмка новых bytes не заявлена.
