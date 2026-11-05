# ADR-001: Сохранить самостоятельные экраны аккаунта и статистики

## Status
proposed — исправленная авторская редакция 05.11.2026; exact HTML **APPROVED** по owner-approval.md, вопрос `call_f0a94c16c93f49b38617215d46b23b7a`. Архитектурное review/QCSD/K1/K2 остаются PENDING. Технические пути обратимы до реализации; экранный intent уже утверждён и повторного approval не требует. Feature-local ADR, не замена docs/ADR.md.

## Context
Первоначальное предложение этого ADR заменить отдельные account/stats состояния длинными inline details отклонено координатором как mockup drift. Это исправление авторской ошибки, не новый запрос изменить макет. Источник — согласованный HTML SHA `a85b3f073a335871e421ea2079269fa19c71f42a263d7b0bd17ae30469c50e68`, функции `header`, `settings`, `referral`, `stats`. State/CSS направления ADR-002/003 сохранены. FR-1/2/4/5/6/7 и актуальный OpenSpec обязательны.

## Decision Drivers
- D1 (высокий): самостоятельные экраны и навигация согласованного макета.
- D2 (высокий): существующие auth/role/ownership, один владелец handlers/state.
- D3 (средний): минимальный diff без нового API, modal manager, store или библиотеки.

## Considered Options
| Вариант | Преимущество | Цена | D1 / D2 / D3 |
|---|---|---|---|
| A. Два тонких SSR wrappers | Отдельные URL/состояния, прямой вход и back, существующий layout | Два новых page файла, route/auth проверки | высокий / высокий / высокий |
| B. Inline details всего dashboard | Мало файлов, сохраняет mounted дерево | Нарушает согласованную композицию, отклонён | низкий / высокий / высокий |
| C. Client screen/modal manager | Отдельный вид без route перехода | Новый navigation/state слой и focus management | средний / средний / низкий |

## Decision
Выбран A. Новые **presentation pages**, не backend services:
- `apps/web/src/app/dashboard/account/page.tsx`, default `DashboardAccountPage`, URL `/dashboard/account`.
- `apps/web/src/app/dashboard/partner/page.tsx`, default `DashboardPartnerPage`, URL `/dashboard/partner`.

Source inventory: этих каталогов/страниц, route strings и символов в app/server сейчас нет. `/dashboard` содержит page/layout/error, bloggers и videos; конфликт с dynamic/catch-all sibling не найден. Это source inspection, **не K1**; оба page basename/exports/routes остаются в будущей проверке имён.

`dashboard/layout.tsx::DashboardLayout` сохраняет existing session/erasure boundary и shell. Каждая page использует `server/page-account.ts::pageAccount` для server identity; никакого account_id из query. Account wrapper читает прежние `requestTheme`/`workspaceLayoutFromCookie` и рендерит один `WorkspaceSettings` в узком page presentation, существующие AccountDeletion/SignOut/verify/support и back `/dashboard`. Header имеет отдельный Link «Аккаунт», не встроенный settings disclosure; второй экземпляр account controls из dashboard убирается. Сохраняются native secondary disclosures внутри самого account screen, включая опасное удаление с видимыми последствиями перед подтверждением.

Partner wrapper использует `getBloggerPolicy` как действующий источник роли: для вошедшего non-blogger — `notFound()`, без запросов чужих данных; без сессии — прежний auth redirect. Owner без blogger-флага не получает чужую статистику, его управление остаётся `/dashboard/bloggers`. Существующая non-personal партнёрская форма обычного аккаунта на dashboard не удаляется и не получает новых прав. Resource private404 для медиа/auto-link сохраняется; existing исключение `PartnerService.dashboard` (foreign code →403) не переопределяется presentation-route и не выдаётся за новый общий404 API.

`PartnerPanel` получает узкий presentation discriminator, например `legacy | summary | statistics`: default legacy сохраняет остальных callers. Summary на dashboard показывает auto-link/loading/error/blocked/copy и Link «Статистика» на `/dashboard/partner`. Statistics показывает существующие `PartnerSummary`, фильтр/коды/ошибки на самостоятельном экране, с back `/dashboard`; период — «за всё время». Один и тот же компонент/handlers, не два service hooks. Statistics читает existing `partner.dashboard` напрямую и **не запускает ensurePersonalLink**, не зависит от personalLink state; summary сохраняет прежний ensurePersonalLink. Поиск дополнительных кодов/форм не расширяет текущие personal/non-personal permissions. Ни monthly reward API, ни копии auto-link generator.

Header сохраняет отдельные «Новая запись», «Мои записи», owner «Блогеры», баланс→существующий `/upgrade?from=partner_dashboard`, «Аккаунт». Не добавлять статистику всем ролям в header: её вход расположен у blogger card как в proposal. Текущие public routes не переименовываются. Share остаётся contextual в `VideoDetail`: player→download→«Ещё», одна GuestPacks и одна video-level CTA, existing ClipMusicChoice; modal manager не нужен.

## Rationale
D1: два wrappers реализуют утверждённые состояния; уменьшение числа файлов не оправдывает B. D2: данные/guards/handlers остаются существующими, дополнительные страницы не повышают роль. D3: всего22 targets, без нового service/provider. Переиспользование контролов не означает дублирование их одновременно в header и account screen.

## Consequences
Плюс: прямой вход, Back/reload и понятная отдельная задача. Минус: обычный route transition может завершить локальный media/draft scope; он не должен обходить существующий upload navigation guard. Внутри записи poll/settings/disclosure/selection сохраняют player/draft по ADR-002; не вводить скрытый global cache или duplicate controls ради перехода. Theme/layout document preferences живут через навигацию; межстраничный persistence unsaved draft не обещан и не заменяет обязательную сохранность внутри mounted записи.
Проверять direct URL/Back/reload/erasure/non-blogger, отсутствие dashboard формы под account/stats и один экземпляр controls. Follow-up ADR сейчас не требуется; after-action архитектор/UI-автор через месяц после ручной приёмки.

## Confirmation
- Метод: same state/theme/layout/width сравнение с frozen HTML, реальные React/router browser scenarios. Визуальная эквивалентность до этого не заявляется.
- Несущие свойства: самостоятельные account/stats, правильные header/back links, прежние guards и единственные handlers, нет мутации ensurePersonalLink при stats-view.
- Автоматические проверки: `tests/browser/ux-simplification.test.ts` — `dedicated_account_and_stats_routes`, `presentation_route_guards`, `primary_path_and_context`, `share_focus_return`, `critical_errors_visible`; `tests/browser/blogger-cabinet.test.ts` — `hidden_policy_invalid`; `tests/clip-card.test.ts` — player/download/secondary.
- Метрика: 21/21 семейство сопоставлено; account/stats не разворачивают dashboard, ровно один preference/account owner на экране; direct URL non-blogger не отдаёт stats; ноль ensurePersonalLink при statistics; ноль mutations при раскрытии/Back.
- Мониторинг: route/lifecycle/screenshot regression на окончательном diff и owner walkthrough clipmkr.ru. Ответственные Sol и отдельный QE; здесь NOT RUN.
- Given blogger dashboard, When «Статистика», Then отдельный экран/all-time/back, исходный dashboard не раскрыт. Given anonymous/non-blogger, When прямой URL, Then auth redirect/private404 страницы без утечки. Изолированные fixtures не доказывают server integration; оба слоя обязательны.

## R2: уточнение решения по исходным условиям QCSD (не closure)

R1 сохранён Git `7411746`; исходные условия/owners/reports неизменны. Ниже обязательная конкретизация, заменяющая неполные перечисления R1. Exact approval сохраняется; повторно не запрашивается.

### UXQ-001 / UXU-002 / UXS-SEC-001 — read-only personal identity

`PartnerService.dashboard(account)` (`apps/web/src/server/partner.ts:119–123,153`) без code_id возвращает все собственные codes в порядке **c.created_at,c.id**. `ensurePartnerCode` (`server/partner-code.ts:6–12`) находит partner того же account и выбирает **created_at,id LIMIT1**, сохраняя даже blocked. `partner.account_id UNIQUE` (`packages/db/migrations/001_init.sql:75–77`) делает множество одинаковым. Значит первый код именно **нефильтрованного серверного ответа** семантически равен canonical oldest ensure при том же состоянии БД; UI не сортирует и не выбирает «первый active». Tie по created_at разрешает server id order. Это source proof, не выполненный DB-test.

На statistics `PartnerPanel` владеет account-scoped base/unfiltered snapshot отдельно от filtered data. Первый direct/reload запрос всегда `partner.dashboard({})`; base.codes[0] даёт id/code/status/blocked_reason. URL собирается прежним способом из `publicOrigin` prop, который `DashboardPartnerPage` получает из `getScreenRuntime().config.publicOrigin` (как Dashboard), не из query/чужого code/host header. Personal card присутствует **над** счётчиками как HTML `stats()`→`referral()`. Использовать прежнюю разметку/card/copy handler внутри PartnerPanel, не создавать второй auto-link hook.

Filter не меняет canonical ID: хранить base snapshot, передавать `blockedPersonalId` из него в PartnerSummary; filtered codes[0] **никогда** не identity. Для read refresh/filter: сначала актуализировать base unfiltered, затем выбранный filter (если не all); ответы принимаются только для текущей request generation/account/filter, stale responses игнорируются и по возможности abort. Пока свежий base неизвестен/ошибка, personal card loading/error, copy personal отсутствует; при refresh stale identity/status не разрешают copy. При начальной неизвестной identity подавить все code-copy, пока невозможно безопасно различить personal; после base success активная дополнительная ссылка копируется даже при blocked personal. Filter error не заменяет базовый personal статус; показать отдельную ошибку показателей. Не добавлять постоянный poller.

Empty base.codes → честное «Личная ссылка ещё не создана», без synthetic URL/ensure; предложить back «Новая запись», где прежний auto-link flow может создать её. Failed base → явный retry только read. Нет fallback на filtered/active/случайный код или ранее сохранённый код другого account. Active personal → copy + прежний manual clipboard fallback; blocked personal → сообщение/поддержка и **нет кнопки copy** ни в card, ни в PartnerSummary. При blocked не предлагать manual-copy fallback. Direct/reload восстанавливает base чтением; возвращение с dashboard не предпосылка. Legacy non-personal режим и копирование активных дополнительных ссылок сохраняются. Server block после успешного чтения может опередить UI; никакой клиентский snapshot не заменяет серверную проверку применения кода, существующая блокировка не обходится.

Confirmation (все NOT RUN): `stats_personal_identity_readonly`, `stats_blocked_personal_identity`, `stats_personal_card_exact_scene`: несколько codes, одинаковый created_at/разные id с серверным порядком, oldest blocked + later active, фильтр later→all, direct/reload, empty/error/retry/clipboard failure; identity совпадает с existing ensure на том же isolated fixture, **0 ensure RPC на statistics**. Отрицательные контроли: personal=filtered.codes[0] и undefined blockedPersonalId должны дать RED. Same scene/theme/layout/width.

### UXQ-002 — полный account, реальные SSR sources

`DashboardAccountPage` после `pageAccount()`/existing erasure layout собирает **один** экран:
- «Оформление»: WorkspaceSettings/page, existing `requestTheme`, `workspaceLayoutFromCookie`, document preference store.
- «Доступ к аккаунту»: session identity — `pageAccount`/`AuthService.authenticate`; email/verified — существующий read-only `server/support/page-state.ts::supportPageState().account` только если id совпал с pageAccount. AuthService сам email не возвращает. Null/mismatch не превращать в «почта не подтверждена»: данные доступа недоступны, без чужого email/operator claim. Используется только account/mailAvailable projection; support secrets/operator UI не переносить.
- Проверка почты `/verify-email`, «Сменить пароль» → существующий `/forgot` (как support/page.tsx:10); reset выполняется существующим token flow, прямую ссылку с выдуманным token не строить. Mail disabled/error показывается существующим recovery экраном, account не обещает отправку. SignOut прежний.
- «Баланс и помощь»: `readDashboardSummary(account)` (`server/dashboard-summary.ts`) → **LimitsPanel remaining**: credits.available_seconds/reserved_seconds/recovery_seconds/next_expiry, max_source_seconds, uploads/minutes/selections/resets_at, owner_unlimited. Одна панель/refresh30s; числа не брать из HTML. Legacy без credits показывает реальные daily limits; unknown max — «Уточняется», не0/120 по догадке.
- Текущие paid/free/legacy права — existing `readAccountBilling(pool,account)`/effective_plan (как UpgradePage); null billing не «free по умолчанию». Owner unlimited из серверного summary/billing, без покупки по необходимости; file limit/доступность сервиса сохраняются. Package action ведёт в `/upgrade?from=partner_dashboard`, где прежние checkoutAllowedForAccount/catalogOnly/purchaseWindows остаются единственной purchase authority. Это ссылка в каталог, не разрешение checkout.
- TEST — только existing server config `payments.mode==='live' && payments.testMode`; метка не grants eligibility и не обещает TEST всем. Если профиль/summary authority падает до page (в shared layout), действует существующий `dashboard/error.tsx`, не подставной баланс. При частично недоступном optional profile/billing показать неопределённость, retry/reload, без денежных действий здесь.
- Support `/support`, native AccountDeletion с последствиями72h/unchecked confirm; back `/dashboard`. Account scene не включает dashboard uploader/список. Один набор handlers и controls.

Confirmation `account_screen_native_data`: direct/reload ordinary/blogger/owner/legacy/paid/TEST, nonzero reserved, null/failed readers, verified/unverified/unknown email, `/forgot`/verify/support/packages/back, no checkout mutation на account; сравнение с account-grid HTML при одинаковых параметрах. Нулевой резерв/фиктивный email/безусловная TEST eligibility — RED.

### UXU-001 — самостоятельное owner-report состояние без нового route

Один `BloggerAdmin` на `/dashboard/bloggers`, local `view='assignment'|'report'` (default assignment), кнопка «Отчёт за месяц →» и back «← Назначения блогеров». Report scene заменяет рабочую область: в DOM main нет search/assignment form; только report heading, monthMSK, existing Counters/report/errors, code details и оговорка оценки. Все email/policy/minutes/rate/reason/month/report состояния остаются в родительском BloggerAdmin, поэтому back сохраняет assignment draft; query/API/route не добавляются. После переключения focus на видимый h1 с tabIndex=-1; back — original report trigger, fallback search input. Переключение не save/lookup mutation. При busy-save переход в report disabled до ответа, затем доступен; исключено сокрытие pending save. Права существующего BloggersPage/API неизменны; reload возвращает assignment, не обещает восстановить unsaved draft. Confirmation `owner_report_approved_screen`: matched HTML owners/report, отсутствие assignment DOM, month/error/loading/null rate, back+draft+focus.

### UXR-01 / UXT-001 — реальные новые links при active upload

Native guard остаётся в `VideoUploader`: `attempt.current`, `invalidate`/generation/abort, capture anchor click и beforeunload (`Uploader.tsx:34–68`). Actual Header Account Link и PartnerPanel stats Link обязаны быть обычными Next Link→anchor, без программного router.push, обходящего capture. Во время hashing/creating/transferring/savingManifest/completing существующая попытка вызывает confirm. Dismiss: тот же URL/attempt, PUT продолжается, complete не появляется преждевременно. Accept: invalidate до перехода, abort всех незавершённых requests, один переход; late responses не могут вызвать новый complete/navigation/state. Если complete уже отправлен, abort не отменяет решение сервера — результат неизвестен до read/recovery. Idle/accepted без живой попытки — без confirm; same-hash/modifier/download/target semantics сохраняются.

Reload/cross-document Back используют native beforeunload только при живой попытке; dismiss/accept проверяются после user activation там, где браузер предоставляет dialog. **Same-document browser Back не является отменяемым anchor click:** не добавлять history trap/popstate rollback. Он может уйти без confirm; unmount cleanup инвалидирует attempt/abort, поздний ответ отбрасывается. На экране active upload рядом с pause нужен краткий текст: «Назад или перезагрузка могут прервать передачу; для продолжения понадобится исходный файл». Возврат/Reload — новый mounted owner: прочитать account-scoped resume; no auto-start, проверить тот же файл/hash, unknownComplete проверять сервером по существующему протоколу; без session record честно unavailable. Нельзя сообщать accepted/100% processing только по локальным bytes. BFCache/mobile suppression не считать обещанной cancel-защитой; фактическую browser ветку записывать отдельно, неподдержанный dialog — ограничение, не PASS.

Confirmation: `active_upload_new_routes_and_history`, `account_link_active_upload_guard`, existing `active_beforeunload_reload_dismiss_and_accept`: настоящий Next app/router/Header/PartnerPanel/Uploader, удержанный реальный client PUT, mouse/keyboard Account и stats, dismiss/accept/idle, active Back/return/reload/complete-in-flight. Нужен наблюдённый confirm, URL/attempt/network assertions, не существование listener. Отключение capture guard обязано сделать Account/stats dismiss case RED; late response после accept не complete. Fixture fake #away с mocked router не заменяет этот сценарий. Browser/transport fixtures не закрывают S3-provider E2E.
