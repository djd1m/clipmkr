# Закрытие Libredesk — узкие требования S

Статус: root/Astra planner review pending; CODE NOT RUN. Владелец11.11.2026 просит доделать Libredesk. Это отдельный close-fix; история/verified identity проходят текущий read-only gap audit, не объявляются починенными этим S diff.

- FR-1 MUST: при clearSupportIdentity/cleanup/focus/account switch/unmount native widget синхронно скрывается до n5:support-clear и удаления close controls; после очистки видимого iframe без управления нет.
- FR-2 MUST: обычное явное закрытие остаётся hide-only, сохраняет conversation/draft, возвращает фокус; повторное открытие existing chat не получает дополнительный logout только из-за этого исправления.
- FR-3 MUST: existing logout/epoch/consent/account guards и fail-closed SDK cleanup не ослабляются; hide failure использует существующий failure cleanup, не превращается в success.
- FR-4 MUST: existing button, native hide, normal reopen и parent Escape при активном listener работают на1440/390. Нельзя перехватывать cross-origin iframe keydown обходом origin или добавлять новые UI/SDK.
- FR-5 MUST: regression исполняет настоящий React SupportPanel, браузерный iframe focus→parent focus→clear и независимую DOM visibility; baseline должен дать видимый orphan, исправление — hidden iframe до reset. Одних vi.fn/regex недостаточно.

Переиспользование: clearSupportIdentity, closeSupportWidget, actual stock Libredesk.hide и текущие controls/styles. Runtime2af00157/source717b55d совпадают по relevant paths; read-only RCA12:08UTC сохранён приватно. Никаких endpoint/dependency/env/service/data writes. Approval конкретного нового UI не требуется, поскольку visual controls не меняются. Source authorization — только после review этого плана и настоящих K1/K2/admission/context.
