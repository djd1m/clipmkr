# ADR-001: Сохранять единое дерево и согласовывать preferences в живом Document

## Status
proposed после Q/R/T; formal snapshot/convergence pending. Обратимо до реализации;
пересмотреть при cross-device sync/новых React roots или полном UX результата.
Имя файла соответствует pinned convergence pathsFor: NNN-slug.md; ID остаётся ADR-001.

## Context
SSR cookie недостаточно для Next15.5.25 persisted layouts/router cache/BackForward.
ThemeToggle сейчас useState(initial), LimitsPanel refresh каждые30s/focus, Uploader имеет
cleanup abort. Новое preference должно пережить эти soft updates и denied cookie в пределах
одного живого документа. Две React ветки сбросят File; новый provider/API/БД не нужны.

## Decision Drivers
1. Один активный Uploader/плееры и отсутствие toggle-induced requests — high.
2. SSR без flash, persisted route и denied cookie согласованы — high.
3. Минимальные edits действующих блоков — high.

## Considered Options
| Вариант | Сильная сторона | Цена/ограничение |
|---|---|---|
| Две React ветки + provider | Свободный разный UX | Remount/новое владение File, избыточно |
| Только cookie + useState(initial) | Мало кода | Cached routes/refresh/denied cookies могут рассогласовать controls/DOM |
| Единый DOM + document store/синхронизация (выбран) | Стабильный React и same-document fallback | Маленький browser store/cleanup observers надо проверить |
| DB/localStorage sync | Cross-device либо длительное browser storage | Новая интеграция/flash/не заданный владельцем контракт |

## Decision
Один pure+browser module apps/web/src/lib/workspace-layout.ts без React/server imports.
Парсер workspaceLayoutFromCookie: только ровно один byte-exact studio разрешает studio,
прочее workspace; не decode/trim значения. workspaceLayoutCookie также только закрытый enum,
n5_workspace_layout=workspace|studio; Path=/; Max-Age=31536000; SameSite=Lax; Secure.
Существующие themeFromCookie/themeCookie сохраняются. Auth cookie/session и account gates
не интерпретируются preference модулем. Preference общая browser, не account capability.

В том же модуле маленький store, инициализируемый только в browser и привязанный к текущему
Document через WeakMap<Document,...>. Никакого shared SSR state/глобального provider.
Exports: WorkspaceLayout, WORKSPACE_LAYOUTS, WORKSPACE_LAYOUT_COOKIE, DEFAULT_WORKSPACE_LAYOUT,
workspaceLayoutFromCookie, workspaceLayoutCookie, DocumentPreferences,
getDocumentPreferences, subscribeDocumentPreferences, updateDocumentPreferences,
attachDocumentPreferenceSync. Snapshot объект immutable, меняется только по явному изменению
preferences/persistence result; subscribe cleanup. До создания browser store SSR не читает DOM.

Root Layout читает сырой Cookie для обоих preferences, ставит data-theme/data-workspace-layout;
в body добавляется один стабильный WorkspacePreferenceSync (export из WorkspaceSettings.tsx),
как sibling существующих children. Sync не оборачивает children и не меняет их key.
SSR initial values у Settings/ThemeToggle — getServerSnapshot useSyncExternalStore; в client
getSnapshot берёт document store, игнорируя stale cached initial props после первой инициализации.
Первое browser snapshot нормализует SSR html attributes; оно не подменяет серверный default
localStorage. При hard reload создаётся новый Document/store из актуального SSR cookie/default.

WorkspacePreferenceSync в layout effect подключает один bounded MutationObserver:
(1) attributes data-theme/data-workspace-layout на html; (2) content/замена только meta
name=theme-color/color-scheme в head. Любая Next/RSC/cache запись устаревшего SSR значения
в живой DOM возвращается к каноническому store до paint; equality-check исключает цикл.
При новых initial props sync применяет existing store, не переинициализирует его. Cleanup
отключает observers; StrictMode mount/cleanup не дублирует listeners. Observer не наблюдает
весь body/формы, не вызывает сеть и не захватывает фокус.

Settings и ThemeToggle подписаны через useSyncExternalStore; у ThemeToggle больше нет
независимого useState(initial), которое могло устареть. Клик вычисляет next из текущего
snapshot, синхронно обновляет store→html/meta→подписанные controls; затем write одной cookie
в try/catch и точный readback имени/единственного значения. Silent no-op и throw различаются
от persisted; в Settings role=status «Выбор действует в этой вкладке; сохранить не удалось».
ThemeToggle вне Settings сохраняет доступный status отказа. Cookie write не меняет вторую cookie.
Store остаётся каноническим до hard reload даже при denied cookie, soft route/refresh/focus.
Нет router.refresh/push/fetch/server action при toggle; нет записи browser preference в аккаунт.

DashboardLayout/UpgradePage передают request-scoped initial enums, статический .workspace-shell
вокруг прежних nav/main; настройки — sibling children. Erasure/auth/owner/SignOut порядок прежний.
Прежний Server Dashboard children и единственный Uploader остаются на стабильном месте.
VideoDetail/ClipCard/UpgradeScreen не менять; их local state сохраняет общий DOM+keys.

Первый инкремент переносит геометрию из таблицы FR-1, не literal hero/listbox/демо-данные.
Отсутствие нового preview state и перенос существующего CTA — coordinator implementation proposals,
не owner-steer. Presentation edit Uploader только после recovery L integration, без изменения hooks/
transport/schema/guards. Если не требуется для принятого shell-scope, не делать его ради «полноты».

Палитра: новые workspace tokens в обоих root-блоках; точные нейтрали только surfaces/fields.
В .workspace-shell явно задать background/color и все aliases: paper/surface/surface2/ink/muted/
line/hover/upload/upload-line/field-bg/running-bg/running-line/running-fg/select-arrow. Не рассчитывать,
что унаследованный вычисленный --field-bg сам пересчитается от локального surface. Поля/стрелка
используют scoped токены; literal dataURI только в root token blocks. Html/body:has(shell) задают
нейтральный фон и цвет текста для внешних banner/SupportLauncher с проверкой их контраста.
После ухода из shell aliases не действуют. THEME_COLOR/public root paper прежние; небольшое
отличие адресной панели — техническое упрощение этого инкремента, не отдельное решение владельца.

## Rationale
CSS data attribute сохраняет React identity. Document store согласует независимые widgets
при cached navigation и не теряет denied-cookie выбор из-за существующего refresh.
Strict cookies дают SSR initial state без нового persistence механизма. Нужные DOM observers
локальны к attributes/meta, а не новая state-management инфраструктура.

## Consequences
Плюсы: прежние операции и состояния, SSR, четыре сочетания, honest denied-cookie fallback.
Цена: store/subscriptions/observers и замена локального theme state требуют browser evidence;
same-document choice не гарантирован после hard reload при запрещённой cookie.
Никаких cross-device/hero UX обещаний. Владелец решения: интегратор, пересмотр при расширении.

## Confirmation
Все проверки будущие; raw QC не закрывает convergence.
- tests/workspace-presentation.test.ts: `layout_cookie_rejects_ambiguous_input`, `cookie_writers_keep_closed_sets`, `document_snapshot_preserves_same_document_choice`.
- scripts/check-workspace-presentation.test.mjs: `ssr_layout_matches_saved_preferences`, `next_cached_routes_and_refresh_keep_preferences`, `blocked_cookie_keeps_current_document`, `layout_switch_preserves_active_upload`, `playing_clip_survives_layout_switch`, `toggle_requests_have_only_named_causes`, `checkout_state_survives_toggle`, `settings_keyboard_and_reflow`, `scoped_palette_and_contrast`, `existing_access_gates_are_unchanged`.
Метод: actual Next/browser phase assertions с fixture preconditions, оба engines; targeted
mutations permissive cookie, stale initial state, remount, refresh/checkout on toggle.
Успех: наблюдаемые controls/DOM/meta согласованы; нет toggle-induced business request в
перехваченном browser scope; непроверенные backend расходы/права не объявляются доказанными.
