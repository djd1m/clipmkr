# План S: закрытие native widget при identity cleanup

Статус: транскрипция root/Astra planner contract, его review pending. CODE NOT RUN. Требования:01_requirements.md; source base717b55d, runtime2af00157 (relevant code identical). Inputs read:01_requirements.md;02_reuse_inventory.md; существующие support-client/SupportPanel/tests. 03_adr и05_architecture отсутствуют по S: новых архитектурных решений нет.

## Goal state
Identity clear синхронно скрывает штатный widget до удаления controls; privacy/logout и отдельное normal hide-only close сохраняются. Применить минимальное изменение existing helper, не менять UI-layout/компонент и не решать историю под видом close.

## Tasks
- TASK-1 FR-1 FR-3: реальный K1 для нового test module; strict S K2, code-target admission и полностью прочитанный literal coder context. При неуспехе code entry остановлен.
- TASK-2 FR-1 FR-5: добавить browser regression в tests/browser/support-chat-closure.test.ts на реальном SupportPanel/Vite и изолированном cross-origin iframe с independent native-shaped DOM visibility. Отдельный pre-fix snapshot/helper должен дать behavioral RED orphan после настоящего focus-return; не DOM/source regex oracle.
- TASK-3 FR-1 FR-2 FR-3: минимально дополнить существующий clearSupportIdentity штатным синхронным hide перед logout/clear-event; переиспользовать existing cleanup и closeSupportWidget при необходимости. Отдельное explicit close не менять. В tests/support-widget-ui.test.ts проверить hide→logout→clear, failure cleanup и hide-only explicit path.
- TASK-4 FR-2 FR-3 FR-4 FR-5: targeted support unit/browser checks на stable final snapshot,1440/390, normal close/reopen, parent Escape, focus clear и unmount/account cleanup; измерить no-orphan invariants и отсутствие лишнего logout на обычном reopen. Типизация затронутых участков, git diff --check. Без full build/npm test/shared dist.
- TASK-5 FR-1 FR-2 FR-3 FR-4 FR-5: авторский handoff source+doc hashes, команды/исходы/лимиты; root готовит native independent SOURCE QE и review history. Автор не делает native prepare, commit/push/runtime apply. После source changes на следующей ревизии root выбирает окончательный source base.

## Порядок и проверки
TASK-1→TASK-2→TASK-3→TASK-4→TASK-5. Browser harness использует existing Vite/Playwright dependencies и отдельные local ports; никаких Telegram/Libredesk conversation POST. Пример stock SDK hide уже доказан live read-only; faithful iframe fixture не объявлять новым live vendor E2E. Не подключать main/Wm .next/dist и не менять исходники во время прогона.

## Риски и ограничения
Hide missing/throw должен сохранить прежнюю fail-closed semantics; actual served SDK поддерживает hide/destroy, это проверено первичным source. Проверить неопределённый cleanup без обещания remote logout/history deletion. Cross-origin Escape внутри vendor iframe и восстановление старой истории не входят в исправление; отдельно явно отразить audit gaps. Новые visual controls/новая architecture требуют root решения.

## Amendments
Нет.

EXPECTED_CODE_TARGETS:
- apps/web/src/lib/support-client.ts
- tests/support-widget-ui.test.ts
- tests/browser/support-chat-closure.test.ts
