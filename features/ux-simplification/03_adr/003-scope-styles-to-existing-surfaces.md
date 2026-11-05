# ADR-003: Ограничить стили существующими UI-поверхностями

## Status
proposed — 05.11.2026; обратима до реализации; exact HTML уже APPROVED, пересмотреть при росте targets >25 либо новых shared abstractions. Feature-local ADR; review/gates PENDING.

## Context
FR-1/6/7 и NFR из canonical01 требуют 320/390/1440, 200% text zoom, dark/light, workspace/studio. Один `globals.css` обслуживает также auth, recovery, public share, support/legal. Новый layout нельзя реализовать глобальной заменой всех button/details или новой палитрой.

## Decision Drivers
- D1 (высокий): ограничить CSS blast radius, сохранить роли цвета и предпочтения.
- D2 (высокий): совпадение DOM/focus/visual order и читаемость ошибок.
- D3 (средний): минимум targets, без packages/framework изменений.

## Considered Options
| Вариант | Плюсы | Минусы | D1 / D2 / D3 |
|---|---|---|---|
| A. Правка scoped existing rules | Текущие tokens, простая интеграция | Требует контроля cascade в большом файле | высокий / высокий / высокий |
| B. Новые CSS modules для всех целей | Явная инкапсуляция новых стилей | Массовый перенос классов и две конкурирующие системы | высокий / высокий / низкий |
| C. Общие element rules | Мало селекторов | Меняет preserve-семейства и опасные кнопки | низкий / средний / высокий |

## Decision
Выбран A: `apps/web/src/app/globals.css` — только правила существующих `.workspace-shell` и конкретных `.workspace-upload`, `.workspace-ready`, `.workspace-settings`, `.personal-link-panel`, `.packages-screen` и двух page roots account/partner под `.workspace-shell`; owner root получает локальный класс в `BloggerAdmin`, если текущий `.stack` недостаточно специфичен. Не менять глобальные `button/input/details/summary`, `:root` palette/font tokens и support/legal selectors. Existing variant `:root[data-workspace-layout=studio]` сохраняется, палитра берётся из CSS variables.

Компонентная структура одинакова для обоих layouts и themes. Не дублировать React tree ради desktop/mobile или studio; layout переключается существующими document attributes. `WorkspaceSettings`/`WorkspacePreferenceSync` и `apps/web/src/lib/workspace-layout.ts` остаются источником preferences: workspace по умолчанию, сохранённые studio/theme, SSR cookies, soft refresh и notice при невозможности сохранения.

Player и download идут в DOM в том же порядке, что визуально. Не использовать CSS order/display:contents для перестановки критических ошибок отдельно от CTA. Hidden UI выключен из tab order через native закрытый details/существующее скрытие карточки; summary и управление доступны клавиатурой. Никаких общих max-height/overflow:hidden, обрезающих условия, четвёртый клип или длинный URL. Вложенные details не прячут error/busy summaries снаружи.

## Rationale
D1: A сохраняет существующую систему и ограничивает blast radius; D2: структура переносит смысл, CSS отвечает за геометрию; D3: новые modules/library не нужны. B стоит рассмотреть при самостоятельном большом redesign, C нарушает границы preserve-семейств.

## Consequences
Плюс: не нужен layout provider и packages. Минус: globals.css уже велик; правка только существующих scoped sections, без нового общего диспетчера. Принцип code-impl о god objects применяется как запрет роста ответственности, а не требование переписать весь CSS. Нужны проверки specificity и untouched screens. Follow-up ADR не нужен; after-action — архитектор/UI-автор спустя месяц после приёмки.

## Confirmation
- Метод: DOM + computed styles + визуальное сравнение одинаковых theme/layout/width/state с согласованным proposal.
- Несущие свойства: сохранённый layout/theme не сброшен; UI вне выбранных surfaces не деградировал; смысловой DOM order, focus и сообщения доступны.
- Автоматические проверки: `tests/workspace-presentation.test.ts`, `scripts/workspace-presentation-local.mjs`, `scripts/check-workspace-presentation.test.mjs`, будущий `tests/browser/ux-simplification.test.ts` — `scoped_css_and_preserved_routes`.
- Метрика: нет горизонтального overflow при 320/390/1440 и 200% text zoom; сохранены существующие target sizes/focus-visible; 0/1/4 объектов и длинные тексты не обрезаны; значения SSR/document preferences совпадают после soft refresh и reload по действующему контракту.
- Мониторинг: screenshot/keyboard regression перед поставкой, owner walkthrough на clipmkr.ru; ответственные Sol и отдельный QE. Здесь NOT RUN, WCAG compliance не заявляется.
- Given studio/light и dirty draft, When theme/layout переключены и settings закрыт, Then draft и player node прежние, account Link доступен с клавиатуры. HIGH риск глобального CSS смягчён scoped rules и regression всех 21 семейств.
- Негативные контроли будущего visual oracle: заменить зелёный акцент синим, скрыть четвёртый клип, обрезать условия — проверки обязаны различить нарушения. Dependency-down/cookie denial оставляет notice о несохранённом выборе; не подменять это успешным persistence.

## R2: boundaries самостоятельных сцен и видимых последствий

UXQ-001/002, UXU-001/002/003, UXA-001: scoped account-grid содержит оформление/доступ и баланс/помощь; stats содержит personal card **перед** счётчиками; owner report — отдельная main scene без формы назначения, не раскрытый details под ней. Скрытая owner scene не остаётся в accessibility tree/tab order; draft хранится в BloggerAdmin, CSS не имитирует независимый экран одной прокруткой. Snapshot oracle обязан различать эти композиции на390/1440, обеих themes/layouts; остальные320/zoom проверки сохраняются.

Results h1 `tabIndex=-1` всегда видим вне clips/guest conditions; focus-visible не обрезать overflow и не прятать при zero clips. Блок последствий music/CTA расположен до соответствующей кнопки, с читаемым контрастом, без collapse по busy/failed и без fixed-height обрезки. Это не новая палитра и не изменение frozen HTML.

Дополнительные Confirmation: `account_screen_native_data`, `stats_personal_card_exact_scene`, `owner_report_approved_screen`, `guest_close_last_trigger_focus_result_heading`, `music_and_cta_consequences_visible` в `tests/browser/ux-simplification.test.ts`; scoped geometry/palette — существующие два workspace harness targets. Negative controls inline-report, hidden personal-card, hidden warning и removed h1 focusability должны быть различимы. NOT RUN; самостоятельное closure остаётся исходным reviewers.
