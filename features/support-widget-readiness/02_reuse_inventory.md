# Переиспользование и доказательства

- apps/web/src/lib/support-client.ts: существующие loadSupportWidget, clearSupportIdentity, closeSupportWidget; расширяется loader, новые exports не нужны.
- apps/web/src/app/support/SupportPanel.tsx: два действующих пути уже await loader и защищены epoch; не менять компонент.
- tests/support-widget-ui.test.ts: существующий тест asynchronous iframe readiness расширить native message boundary и falsifiers.
- tests/browser/support-chat-closure.test.ts: существующие React/Vite/Playwright и cross-origin local HTTP fixture сохраняются, добавить реальный WIDGET_LOADED для совместимости.
- tests/browser/support-widget-readiness.test.ts: отдельный behavioral cold fixture на тех же maintained dependencies; K1 нового модуля до кода.
- Served SDK bounded inspection: VUE_APP_READY→SESSION_DATA, WIDGET_LOADED→handleWidgetLoaded, setUser немедленно postMessage без очереди. Source private path указан root; содержимое JWT/session не читать/не сохранять в repo.

Source guards/anchors: source close-control/CSS guard tests/support-widget-ui.test.ts не меняется; privacy/epoch unit guards сохраняются. Baseline SHA ac83c7f, actual deployed 58e72ab; исторические close receipts не изменять. Отдельных pinned widget-source SHA контракта в app нет. Новых packages/копии SDK не требуется.

## Закреплённое первичное evidence
Actual served SDK private source: /root/.config/clipmkr/support-chat-close-20261111/vendor-widget.private.js, SHA256 6ae92d2ba1e8b0ffedd32089cc415dd3d774271281bdafc3655110a868cc0782, 29345 bytes. Исследованы только bounded участки handleMessage, handleVueAppReady, handleWidgetLoaded, setUser и public API tail. Копия SDK в Git не добавляется.
Cold-vs-warm diagnostic: /root/.config/clipmkr/libredesk-completion-20261111/qa-fixtures/native-auth-ready-diagnostic.private.json, SHA256 1e0a3c333c72c2bd3343bf17629e8a4ebcb0644ae445ed694c36f943b9890a5b; исходный runtime/source 58e72ab (root evidence), feature base ac83c7f. Readonly consumers SupportPanel.tsx и tests/support-ui.test.ts включены в native measurement.

Root 11.11.2026 передал фактическое чтение /etc/clipmkr/backup/runtime-binding.json: helpdesk image sha256:e7aa3bac149323d21e8e130adc8d9dd83b2c4fc85f83bb3b08b544ffa3c7d201. Автор получил это свидетельство в 13:24 UTC (clock13:24:27), самостоятельно runtime binding не читал. Static SDK hash остаётся6ae92d2…; это pin primary evidence, не результат native QA новой ревизии.

## R2 native reset evidence
Подтверждённый leak: cold-switch-privacy-r2/proof.private.json SHA853e4f4e6c4a32a4f8836946b94070b0bbb679c724c67592f0073aed7d05eeb7 и findings.ru.md прочитаны; действительные app logout/login и B session с A native identity/history. Readiness-only не закрывает.
Private child asset actual-widget-index-XRlCU5Ae.js SHA43a865dd62c2eaac74faeba4b77875c69ced6c4f1aa7efc870939c6a42a19817. Bounded inspection: CLEAR_SESSION clears session/conversations/drafts и вызывает p→WIDGET_LOADED; SESSION_DATA/SET_JWT_TOKEN также finally p. ACK без correlation ID, поэтому одноразовый stale WIDGET_LOADED нельзя интерпретировать как подтверждение конкретного warm reset. Public SDK logout синхронно удаляет host session/visitor cookies, post CLEAR_SESSION; destroy снимает старый message listener/removes frame; remote delete не вызывает.
Reuse: выделить имеющуюся native очистку из clearSupportIdentity без изменения event/epoch callers; официальный logout+destroy, затем существующий script/iframe handshake. Новых services/dependencies/cookie manipulation/auth mechanisms не требуется.

R2 root bounded source confirmation: destroy() не удаляет window.Libredesk и не сбрасывает __libredeskWidgetLoaded. Public window.initLibredesk(settings) замкнут на native constructor и позволяет создать fresh instance после explicit удаления retired old global reference. Переиспользовать этот public entrypoint; private flags/script copy не менять. Инициализацию старого instance без iframe не destroy: его async fetch/settings→createElements ещё может завершиться позднее.
