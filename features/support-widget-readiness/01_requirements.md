# Требования: первое представление аккаунта в native Libredesk
Статус: подготовлено автором по root brief; независимый planner review и GO ожидаются. Base ac83c7f, опубликованный runtime 58e72ab с сохранённым close-fix.

## Требования
- FR-1 MUST: на холодном первом явном identify готовность означает native WIDGET_LOADED от канонического iframe, ожидаемого source и origin; существующий setUser вызывается только после этого. Browser fixture до исправления должна показать потерю первого SET_JWT_TOKEN, после — один exchange с первого нажатия.
- FR-2 MUST: чужой source/origin, неверный type, iframe без ready и простая DOM insertion не дают ready; нет handshake — прежний общий 8-секундный timeout и fallback. Listener/observer/timer очищаются на resolve/reject. Повторное использование того же подтверждённого iframe не ждёт уже прошедший сигнал; replacement iframe обязан пройти собственный handshake.
- FR-3 MUST: после холодного A→full navigation→штатный logout A при SDKundefined→login B→anonymous open без opt-in виджет не должен читать identity/history A или отображать их пользователю B. Native logout вызывается при первом доступном API bootstrap ДО первоначального SESSION_DATA/VUE_APP_READY cookie read. Для уже существующего native iframe anonymous reset завершается на child до show; stale ACK старого SET_JWT_TOKEN не считается доказательством очистки. Допустим минимальный native logout→destroy existing iframe→fresh bootstrap→canonical WIDGET_LOADED, без удаления remote истории. Explicit verified opt-in, SSR без SDK/JWT, anonymous без JWT, epoch cancellation, fail-closed cleanup, clear-before-authority controls, normal hide-only close/reopen, draft и focus сохраняются. Native settings/key/config не менять.
- FR-4 MUST: проверка реального React SupportPanel в локальном браузере с отдельным cross-origin child listener, отложенным после attachment; 1440/390, cold identified/anonymous, warm reopen, focus/logout identity cleanup. Unit negatives и таймаут не заменять DOM-only mock подтверждением.
- FR-5 MUST: минимальный diff существующего loader и fixtures без нового UI/layout/labels, dependencies, service, provider, custom chat или auth architecture. Автор передаёт frozen code/doc hashes и реальные команды; независимый review/QE и выпуск выполняет root.

## Контракты, потребители и границы
loadSupportWidget: Promise<WidgetAPI>, два потребителя SupportPanel identified и openAnonymousSupport. Единственный app loader widget.js найден в support-client.ts; иные app-native bootstrap не найдены. Existing privacy tests tests/support-widget-ui.test.ts; browser close tests tests/browser/support-chat-closure.test.ts. API/session, server JWT, grants и configured native key остаются прежними.

Использовать официальный WIDGET_LOADED protocol, не приватное widgetLoaded поле экземпляра: глобальная API shape может не раскрывать поле. Учёт готовности — только наблюдённый canonical iframe (WeakSet); обычное hide-only close/reopen сохраняет iframe/readiness/draft. При anonymous identity reset прежний iframe может быть уничтожен штатным native destroy и заменён новым; новый canonical iframe обязан пройти собственный handshake.

Решаем потерю сообщения до child listener. Статус пока появляется после setUser; remote async ACK не подтверждается. Настоящий native two-account QA выполняется root отдельно; локальный fixture не объявляется реальным vendor E2E.

UI mock approval не требуется для этого diff: новые visuals/controls/copy отсутствуют. Вопросов scope нет; code entry ожидает явный root GO после чтения 01/06 и настоящих gates.

## R2: подтверждённое первичное evidence и новые acceptance cases
Root actual owned QA source58 подтвердил cold privacy leak, не гипотезу: proof /root/.config/clipmkr/libredesk-completion-20261111/qa-fixtures/cold-switch-privacy-r2/proof.private.json, SHA256853e4f4e6c4a32a4f8836946b94070b0bbb679c724c67592f0073aed7d05eeb7. Без новых messages/manual cookies/JWT: у B consentfalse, native auth/me и история A. Root containment mode disabled — отдельная runtime operation, не решение кода этой feature.

R1 QER-1 сохранена: origin/type negative assertions до await microtask не дискриминируют удаление guard. R2 добавляет await перед каждым negative assertion; current implementation GREEN, source/origin/type guard removals должны дать RED. R1 event5898fa6a4cdcfa80c0e0a21a30d7f32155fbd34285e8689939f9d39cb58338c3 seq2 остаётся history.

R2 browser fixture моделирует настоящий persisted host vendor cookie/session A и delayed child; никаких настоящих credentials. Проверить cold/warm anonymous до child auth/history GET и до show, pending old identity work, missing ready, throwing/rejected reset, authority epoch cancellation. Исправление не сбрасывает cookies вручную и не подменяет app/server auth. Требуется root review amended01/06 и GO до app/test edits.
