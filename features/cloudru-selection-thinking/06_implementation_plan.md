# План S: одно поле в Cloud.ru request

Inputs read: 00_complexity_assessment.md, 01_requirements.md, 02_research.md, provider.ts, cloudru-provider.test.ts. 03_adr и05_architecture: N/A поTierS, файлов/исполнения не утверждается. Planner Astra, coder Sol, новый независимый code-reviewer согласно repo policy. Product code ещё не изменён.
Goal: existing Cloud.ru request отключает reasoning подтверждённым параметром; OpenRouter и validation/error/lifecycle семантика сохраняются. Два code targets, новых modules/exports нет: K1 обоснованно N/A. Source probes — diagnosis, не completion.

## Tasks
### TASK-1: Нативные gates и контекст — FR-1, FR-2, AC-2
До кода: project-pinned native K2 --tier=S --require-requirements, literal check-code-targets, actual dz plan checkpoint и build-coder-context --tier=S. Success: actual exit0, никаких compatibility adapters/UI exceptions. Product files не менять на этапе планирования. Сохранить results/hashes и literal context приватно; source targets ровно два ниже.
### TASK-2: Regression RED и минимальный payload fix — FR-1, FR-2, AC-1
Depends:TASK-1. Files: tests/cloudru-provider.test.ts и apps/worker/src/llm/provider.ts. В existing request-capture тестах проверить cloudru.chat_template_kwargs deepEqual {thinking:false}; отсутствие этого ключа у OpenRouter; отсутствие новых token caps/vendor options в обеих ветвях. Расширить существующие случаи request contract/OpenRouter payload без новой test инфраструктуры; новый отдельный test case нужен только если существующий seam не выражает оба утверждения. Сначала RED на текущем body, затем добавить ровно chat_template_kwargs:{thinking:false} в существующий cloudru spread. Success: GREEN exact payload; no new function/export/module или другие runtime изменения.
### TASK-3: Ошибки и соседний provider — FR-2, FR-3, AC-2
Depends:TASK-2. Files: existing tests/cloudru-provider.test.ts. Run `npm test -- tests/cloudru-provider.test.ts`; сохранить действующие malformed/null/length/refusal/invalid-schema/429/503/transport/caller-abort/600000vs240000ms cases. Run `npm run typecheck --workspace=packages/shared`, `npm run typecheck --workspace=apps/worker`, `npm run build --workspace=packages/shared`, `npm run build --workspace=apps/worker`, `npm run lint`; если зависимости требуют предсборки, использовать действующий workspace порядок. Success: actual commands exit0; emitted request count1, parser/validator и timeout logic без diff. Это regression contract, не реальный provider PASS.
### TASK-4: Независимая проверка и реальный replay — FR-1, FR-2, FR-3, AC-1, AC-2, AC-3
Depends:TASK-3. Новый reviewer читает требования/план, затем сам source/tests; code-critic+extended QE contract/negative/fault review. Root запускает actual uncapped worker replay на existing private transcript с прежним prompt/validator; никаких production max_tokens4096. Записать provider response/usage/reasoning counts/duration/accepted fragments/job terminal outcome и exactsource/image в приватное evidence. Если реальный outcome не достигнут, code-level result и runtimeFAIL/UNEXECUTED различаются. Полный render/play/download/90/120/payment acceptance не выводится из короткого selection proof.
### TASK-5: Anti-drift и доставка — FR-2, FR-3, AC-2, AC-3
Depends:TASK-4. Сверить final diff: runtime ровно одно поле в Cloud.ru-only ветви, второй файл — meaningful regression. Actual results и ограничения в08; маленький verified commit/push координатором. App/worker update только в уже разрешённом test target с сохранением данных; full UI redesign остаётся ожидающим своего допуска. Cloud после owner manual acceptance по действующему порядку, production/DNS не переключать.

## Порядок и риски
TASK1→2→3→4→5; один coder для двух файлов, root runtime и отдельный reviewer. Повторить recall перед stage; первый Node22 recall сообщил UNREADABLE; после root rebuild addon повторный recall exit0 без warnings,0matches. Исходное предупреждение сохранено в00. No external research/runtime install needed: реальные provider probes и existing request boundary дают достаточный candidate. Внешний vendor может игнорировать поле/менятьповедение: только actual uncapped replay подтверждает интеграцию, existing600s timeout остаётся страховкой. Секреты и transcript внеGit.

## Amendments
None. Initial narrow repair; новый QC finding, если возникнет, добавляется с конкретным test binding.

EXPECTED_CODE_TARGETS:
- apps/worker/src/llm/provider.ts
- tests/cloudru-provider.test.ts
