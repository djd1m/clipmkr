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
