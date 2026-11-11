# Реализованный S diff

Source base717b55d7e265095541a7b5b5d7f2612026cdf99a, отдельный worktree. Три declared targets; product source frozen после12:36UTC. Main/Wm/runtime/DB/commit/push не менялись.

- `apps/web/src/lib/support-client.ts`: clearSupportIdentity переиспользует closeSupportWidget(null) до logout и clear event. Вложенный finally гарантирует прежний logout даже при отсутствующем/бросающем hide; existing failure cleanup остаётся fail-closed. Explicit normal close не менялся.
- `tests/support-widget-ui.test.ts`: valid SDK fixtures дополнены существующим hide; проверены порядок hide→logout→clear и missing/throwing hide с обязательными logout/destroy/unavailable outcomes. Старые readiness/epoch/privacy checks сохранены.
- `tests/browser/support-chat-closure.test.ts`: новый изолированный Vite/Chromium harness с настоящим SupportPanel и cross-origin iframe. Native-shaped fixture visibility независима от React opened; проверяет реальный focus-return, account change/unmount, existing close/reopen/parent Escape на1440/390. Никаких live provider conversation/API writes.

Документы: actual S00, exact-reviewed01/06, authority, OpenSpec delta+hash binding, author handoff и README. Raw paused DRAFT до изменения00 сохранён приватно. Telegram research/UI перенесены в отдельный paused private draft; не входят в product diff.

Новых exports/commands/dependencies/endpoints/env/services/layout controls нет. Границы: new browser harness — faithful lifecycle fixture, не real vendor/history E2E. Root управляет native SOURCE QE, новой base-интеграцией и поставкой.
