# Step 7 — изменения кода fix-namecheck-private-sources

Автор: запрошенная модель `gpt-6.1-sol high`, исходная авторская сессия; serving model — `NOT_ATTESTED`. Это фактический артефакт этапа, не квитанция checkpoint или независимой приёмки.

## Манифест

Изменены два существующих файла реализации и тестов:

| Файл | Изменения |
|---|---|
| `patches/dz-name-check-app-source.patch` | Согласованы valued flag `--source-root`, help/known-flags и consumer; default scope включает tests. Добавлены статический Python AST, ограниченное чтение и aggregate отказ при неполноте. Native с explicit root использует общий бюджет и измеряет оба scope; legacy native без нового флага сохранён. Build/dependency exclusions применяются только к каталогам. Существующий monotonic start перенесён перед начальным default/native discriminator. |
| `tests/feature-adr-paths.test.mjs` | Изолированная копия actual candidate CLI, проверка pristine/known-old/already-candidate и отказ unknown bytes; сохранены K1/K2/default controls. Сохранены regression, positive/fault и mutation-проверки NCQE-01/02; добавлены delayed-discriminator, sibling/boundary и timing-mutant проверки NCQE-03. |

Точные SHA256 текущих исходников:

- Patch: `b804a82aee8ec3c5821a42c0c9a1dae9380a20df94182ac3e5600929a869ce9a`.
- Test: `13de66c1f801f90a5dbd716ef69f0a394a0e4edd9f0cb968f0368c318d7f0267`.

Переиспользованы collector/consumer, `optionLists`, `exportedNamesIn`, pure `decideNameCheck`, canonical command inventory и его fallback, установленный K2 checker и Python stdlib AST. Новых modules/exports/commands/dependencies/worker/API нет. Этот отчёт — стандартный выход Step 7, не третий implementation target и не изменение требований или scope.

## Проверки и условия QE

Сохранённый финальный прогон `node --test tests/feature-adr-paths.test.mjs` на Node 22.23.4: exit0, **22/22**, skips0; внешнее измерение — **141.113 с**. Прежние 15 targeted mutants сохранены; добавлен один timing mutant с точным false-FREE diagnostic. Все 16 различены конкретными assertions; полный mutation score не заявлен. После последнего source edit выполнен именно этот полный прогон. При добавлении отчёта тесты повторно не запускались: source hashes проверены до и после записи.

На предыдущем snapshot originating reviewer верифицировал NCQE-01/02; их logic, tests и mutants сохранены. Автор заявляет исправление NCQE-03: единственный существующий monotonic start теперь охватывает initial default lookup. На отклонённых bytes настоящий lookup с controlled10020ms задержкой давал FREE; финальная maintained regression с marker даёт elapsed-limit/exit2. Ordinary default FREE/TAKEN сохраняются. Default, explicit-extra и native-extra прошли управляемые границы9999/10000ms; legacy native без флага не ужесточён. Обратный перенос start в timing mutant возвращает false FREE и ломает oracle. Это controlled delay/clock fault, не benchmark рабочего filesystem.

Независимое закрытие NCQE-03 и проверка текущей дельты ожидают originating reviewer после root freeze. Public08/native lineage не переписывались; actual checkpoint/native begin-repair принадлежат root.

## Code/spec anti-drift и ограничения

Проверено совпадение всех 10 нормативных hashes: требования, reuse inventory, ADR, архитектура, план и OpenSpec не изменены. Ledger revision 2: `65442de55d8ffe60d6d27ce593004b053b9a1d5bf4c6a5f6037d75276f2126ba`. Pure decision и общий стек сохранены. Новых требований или исключений для бюджета native с новым флагом нет.

JS остаётся статическим declaration reader, Python учитывает module-owned def/async def/class без исполнения исследуемого кода; dynamic aliases не доказаны. Синхронный syscall не прерывается scanner: поздний результат отвергается, hard interrupt SLA не заявлен. Файловая система не даёт атомарный общий snapshot.

Исполнение — только temp CLI и локальные controlled tests. Shared installation: **NOT_RUN**; actual private K1: **NOT_ESTABLISHED** до отдельной reviewed installation. Приложение, main recovery и runtime этим блоком не изменялись; установка, deploy и независимая приёмка не объявляются выполненными.
