# Независимый source QE: one-time-offer

Проверяющий: `gpt-6-astra xhigh`, новая сессия без контекста кодирования; автор: `gpt-6.1-sol high`. Роль `qe-primary`, `owner-exception` по действующему `docs/review-policy.md`. Дата: 11.11.2026.

## Область и независимость

Сначала прочитаны AGENTS.md, docs/review-policy.md, docs/model-matrix.md, 00/01/02/06 артефакты feature, requirements-revision.json и OpenSpec one-time-offer. Затем исходники и existing tests найдены самостоятельно. Авторские отчёты и чужие ревью не использованы как доказательства.

Область — три текста (§6.3/7.7/7.8), существующий allowlist и обратимость двух файлов. Проверка всей оферты на юридическую достаточность, новый платёжный функционал и runtime-операции не входят в поручение.

## Привязка и фактические проверки

Source verdict: **CLEAN** в границах TASK-1/2/3, без условий. Это допуск проверенных исходных байтов к следующим действиям, не утверждение о завершённой поставке.

- Исходная база `.fa-state/base-ref`: `d192f798eb902a0236d76f02a3a2c5616e7391dd`; HEAD на проверке: `a9a63e6908e9f192102860fbd8852cca3fa931f9`. Оба target-файла в HEAD совпадают с базой; проверена текущая незакоммиченная дельта.
- Native snapshot: nonce `862c60d3-30ea-4bf2-b235-371c8b26c8c0`, revision `a4d6056407dae6205351c7380cbb1ae3e1f1595cf0e9f44786e43a32b0c16d42`. Самостоятельно пересчитаны SHA-256 всех 9 файлов manifest и 3 нормативных источников requirements-revision.json: совпали. Host/история/checkpoints не изменялись.
- `apps/web/src/lib/legal-documents.ts`: SHA-256 `5532718f891b7edee261fef22e3099b6726061ff912f025fb3aba95cc48241de`.
- `tests/artifacts/legal-pages/approved-replacements.json`: SHA-256 `0d0348261be4ef47d639519a276a1f4c818eedeac33a52bce23588a79d5ad523`.

Использованы принципы code-critic и reference-методики studio-extended-qe: change-based regression и requirement→scenario→evidence. Прочитаны pinned `regression-testing` и `qe-requirements-validation`; AQE runtime и его примеры не запускались. Фактические инструменты — Git, Node 22.23.4, TypeScript, Vitest и Python для временного каталога.

| Требование / риск | Самостоятельная проверка | Наблюдаемый результат / граница |
|---|---|---|
| FR-1: неверный текст либо сохранение обещания рекуррентных платежей | Node: загрузка export-объектов через TypeScript, точное сравнение трёх строк с 01_requirements.md; чтение `UpgradeScreen.tsx:92`, `:104`, `:113` | PASS: индексы `[39,52,53]` дословно совпадают; покупка разовая, автоматических списаний нет, следующий пакет приобретается самим пользователем; вымышленный путь «Настройки → Подписка» удалён. Смысл соответствует текущему UI; действующий платёжный backend не изменён и повторно интеграционно не испытывался. |
| FR-2: случайная правка прочего договора/политики | Node assert: сравнение всех export-объектов с выбранной базой; полный `git diff` двух файлов | PASS: 87/62 абзаца; ровно 3 изменённых текста, 84 остальных абзаца и все стили/порядок прежние; `privacyDocument`, `legalOperator`, дата, реквизиты, цены/услуга, возврат/15%, права и §10.2 тождественны базе. После возврата только трёх text-полей весь export-объект тождественен исходному. |
| FR-2: подмена provenance / golden | Byte compare `document-content.json` с `git show <base>:<path>`, сравнение обоих DOCX digest | PASS: fixture SHA-256 `0f3574c95a9a3133c35edda33ebff347d8bc369499d9d439a6f6a2a4bf5cde82`; terms DOCX `c7a240cb691d6eed34dfb0415d82055b5b30b0f1355171e1194097d9348e87f7`; privacy DOCX `901b5dbddabd464c58f016890eae37f09c27fafa2f852de401c17b6c78263867`. Физические частные DOCX не читались; проверена неизменность закреплённой provenance. |
| FR-3: разрешённые замены скрывают лишние изменения | JSON assert: 3→6 записей, первые 3 тождественны базе, все пары document/index уникальны, old сверены с fixture и базой, new с FR-1 | PASS: добавлены только terms 39/52/53; все 6 пар уникальны; исходные old сохранены дословно. |
| FR-4: рендеринг/экранирование/порядок/ссылки | `env -i PATH=/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin:/usr/bin:/bin LANG=C.UTF-8 npm test -- --run tests/legal-pages.test.ts` | PASS 11.11.2026 08:55:21 UTC: 1 suite, **6/6 tests**, 0 failed, 0 skipped; Vitest 3.2.7, 1.32 s. Это SSR/source, не опубликованный браузер. |
| FR-3/4: неполный обратный патч | `git diff --binary <base> -- <два target>`; в отдельном временном каталоге `git apply --reverse --check -`, затем `git apply --reverse -`; byte compare обоих восстановленных файлов с `git show <base>:<path>` | PASS: обе Git-команды exit 0; действительно применён Git-патч обоих файлов, а не симметричная замена строк. Рабочие source-файлы до/после имеют те же байты. |
| FR-3/4: восстановление ломает golden/SSR | Тот же existing legal suite в временной копии после reverse patch | PASS 08:56:08 UTC: **6/6 tests**, 0 failed, 0 skipped, 1.36 s. Временный каталог удалён. |
| Ограничение scope / code-spec anti-drift | `git diff --check`; `git diff --name-only <base> -- apps packages tests scripts package.json package-lock.json Dockerfile docker-compose.yml`; проверка OpenSpec hashes | PASS: whitespace-check exit 0, изменены только два target. Нет новых UI, exports, backend, DB, dependency или runtime-настроек. OpenSpec и точные FR не расходятся с этой исходной дельтой. |

Обратный двухфайловый patch SHA-256: `536fb0eb04f3360a3316bc11e961ebb321e276f13cdc8223202d9fa3a8951b92`. Восстановленный source SHA-256: `257fc8159c015730546d9e672a80aed548f4af989508adace5d29933b8881673`; восстановленный allowlist: `55b2c69c46d819f562d5d2ceacf86b12edd0a69a65013c289306b1d3071722d5`.

Первая попытка запуска тестов восстановленной временной копии остановилась до collection: мой сокращённый `git archive` не включал корневой `tsconfig.base.json`. Это ошибка подготовки QE-копии, не дефект продукта. После включения существующего файла архивирования оба reverse-шага, побайтное сравнение и 6 тестов выполнены заново успешно; source не менялся.

## Находки

Подтверждённых дефектов, новых рисков и замечаний в данной дельте не выявлено. Условия и severity не выдумывались. По code-critic: новая ответственность/архитектура/граница безопасности не добавлена; существующие renderer и golden tests переиспользованы; реальная семантика проверена дополнительно к golden parity. Недостаток доказательств публикации ниже — ожидаемый следующий этап, не source-дефект и не PASS.

## Ограничения и поставка

Это source QE. Публикация, новая сборка, отдельный Git-коммит с точной командой `git revert <code-commit-sha>` и зеркала, фактические 87 видимых абзацев на clipmkr.ru и браузерная проверка desktop/mobile этим отчётом пока не подтверждены. Новый code SHA ещё не существует в проверенном HEAD, поэтому конкретный SHA для revert здесь не выдуман. Юридическая достаточность всего договора и исполнение уведомления по §10.2 не оценивались; прежняя терминология вне трёх абзацев по заданию сохранена. Production env, платежи, письма, webhook, входы, БД и S3 не использованы.

## Отдельная проверка оператора TASK-4

Проведена отдельно после source QE: **APPROVED** для SHA-256 `8df7a08dde4f93d46436dc7efc39383fb40c7696421db4f2a06b092e224efdf6` файла `apply-release.private.py`. Подробный собственный отчёт — `/root/.config/clipmkr/one-time-offer-20261111/operator-review.private.json` (0600), с моделью/сессией, actual hash, проверками и ограничениями. Подтверждённых замечаний нет.

Прочитаны exact bytes 299-строчного оператора; `ast.parse` прошёл без импорта/исполнения. Статически проверены native closed QE→Git commit bytes→immutable image label, drift checks текущих compose/binding/7 контейнеров, неизменные LIVE env/mounts, свежая backup receipt под общим lock, durable pending и отказ повторного входа, единственная web image delta, контроль остальных 6 контейнеров, прежний image+health+binding при rollback без восстановления БД. Runtime входы и секретные baseline JSON не читались. Оператор и production-команды не запускались.

Приватный оператор не является product target или частью native source manifest. Это статическое одобрение указанных байтов, не подтверждение фактической поставки, резервной копии, происхождения сборки либо браузерной приёмки. После любого изменения оператора требуется привязка проверки к его новым байтам; источник и оператор сохраняют отдельные verdict/receipts.

## R2: независимая сверка поставки и статусов

11.11.2026, та же независимая сессия `gpt-6-astra xhigh`. **CLEAN**, без условий и новых находок. Этот раздел обновляет статус поставки после R1: предыдущие упоминания «пока не подтверждено» относятся ко времени проверки исходников до исполнения TASK-4.

Прочитаны настоящий current host, существующая receipt с фактическим author handoff, native history/head и записи checkpoints. R1 сохранён: sequence 2 `evaluate/closed`, 08:57:43 UTC; затем sequence 3 `begin-repair`, 09:04:22 UTC, в том же journal `668902d3-cc1a-42f7-85d3-4eaf46035177`. Текущая привязка: nonce `e5185d86-6426-472a-9e40-2fc49fc91369`, revision `2e98fac2177f53fde5613c3530e3069f9d37048e6f9cc5d26ce85166a72f58cd`. История, host и checkpoints reviewer не изменялись; prepare/evaluate/reset не вызывались.

Самостоятельно пересчитаны все 10 текущих manifest hashes и 3 нормативных OpenSpec hashes. Измеренная дельта — только `docs/BACKLOG.md` и `openspec/changes/one-time-offer/tasks.md`; тексты FR/план/спецификация и оба product hashes остались ровно R1. Прочитаны фактические diff этих двух файлов и отдельно не измеряемая helper историческая заметка `features/yookassa-live-activation/11_autopay-deferred.md` (SHA-256 `8699261c7da8f3d61f78e4a5c07d05f339937c133a005c1a17c48006cf8ad5d2`). Статусная правка последней описывает последовательность отмены автоплатежей и последующей публикации трёх текстов, не новую платёжную реализацию.

| Проверка R2 | Собственное наблюдение | Граница доказательства |
|---|---|---|
| Author delta и журнал задач | Handoff `structural` проверен и принят: дельта меняет утверждения о фактическом исполнении; исходный контракт не меняет. Существующие router/requirements/plan/code/QE receipts согласованы с отмеченными задачами; R1 тесты/reverse подтверждены моей прежней проверкой. | Обновление статусов проверяется как исполнение; прежнее source-only QE не переименовано в проведённый браузер. |
| Отдельный code commit / быстрый возврат | `git diff-tree --no-commit-id --name-only -r 931256429e18ffe597678101e69ac8565321d490` содержит ровно два target. `git show <commit>:<target>` побайтно равен проверенным source/map. В rollback.md указаны именно этот SHA, `git revert --no-commit`, existing legal suite и проверка diff. | Будущие конфликты и отдельное согласование рекуррентных платежей явно сохранены. |
| Три Git | Собственные `git ls-remote --exit-code <remote> refs/heads/fix/one-time-offer-20261111`: github, gitlab и gitverse вернули ровно `931256429e18ffe597678101e69ac8565321d490`, exit 0. | Read-only проверка текущих refs; push reviewer не выполнял. |
| Исходный артефакт и квитанция apply | Самостоятельный SHA-256 `git archive --format=tar 931256429e18ffe597678101e69ac8565321d490` = `4b76e71829f0938d767b45d558eca4d80fc95949a413b0b35dc5ac50cb8a7efa`, совпал с release-manifest. Прочитанный release-apply: applied=true, 09:01:13.936 UTC, точный commit/image, health=ok, прежние env/mounts и остальные 6 identities, bindingUpdated=true, databaseChanges=false. | Runtime-инварианты сверены по квитанции ранее независимо разобранного оператора; новые Docker-инспекции/private baseline reviewer не выполнял. |
| Опубликованные страницы | Собственные анонимные GET `/health`, `/legal/terms`, `/legal/privacy` в 09:06:15 UTC: HTTP 200; health revision ровно `931256429e18ffe597678101e69ac8565321d490`. HTMLParser извлёк все элементы article «Текст документа»: 87 terms и 62 privacy дословно и по порядку совпали с текущим исходником. | Это самостоятельная актуальная HTTP/SSR сверка, без JS, авторизации, POST и записи. |
| Desktop/mobile и backup | Прочитанный published-browser: 4 проверки 390/1440 px, обе страницы HTTP 200, 87/62 exact/visible, overflow=false, blockedWrites=0, без авторизации/JS. Прочитанный backup-after: success/complete в 09:02:07 UTC, primary и secondary с одинаковыми snapshot/manifest IDs. | Проверены содержимое и взаимная согласованность этих квитанций; повторного Chromium, offsite extraction или восстановления не выполнял. |
| Статусы / anti-drift | Прочитаны 10_delivery.md, rollback.md, 08_qe_report.md, README и изменённые журналы. Checklist описывает уже исполненные операции; ручные напоминания остаются pending, автоплатежи deferred; юридическая рассылка, полный аудит, новые оплаты и полный CJM не объявлены выполненными. | Нет новых требований либо расширения области тестирования. |

Использованы только разрешённые четыре приватные квитанции: `release-manifest.private.json`, `release-apply.private.json`, `published-browser.private.json`, `backup-after.private.json`. Compose/containers/baseline с секретами не читались; значения ключей/паролей не извлекались. Повтор source suite не требовался: два target побайтно прежние, а R1 уже содержит 6/6 на новом и восстановленном тексте. Полные build logs и E2E покупки/писем/S3 не проверялись заново; ручная приёмка владельцем этим QE не утверждается.

Собственная `qe-primary` entry обновляется на текущие nonce/revision с сохранением actual author и пустых исходных условий, `authorAssessmentChecked=true`, `deltaVerification.classification=structural`, `implementationVerified=true` на основании проверенных артефактов, Git-привязки, статусов и самостоятельного публичного GET. Новых рисков в этой дельте не выявлено; окончательную native evaluate выполняет координатор.
