# Первый инкремент рабочей оболочки

Proposed change workspace-presentation: Кабинет/Монтажная, независимые browser preferences,
нейтральные scoped токены на действующих блоках. Это ограниченный инкремент, не полное
совпадение UX трёх экранов/hero-listbox/всего восьмиэкранного макета.

Начальный Кабинет/отдельная тема/сохранение текущего состояния — требования владельца.
Оставить ClipCard вместо нового hero и передвинуть существующий CTA — coordinator implementation
proposals внутри минимального инкремента. Владелец не говорил запрещать hero/listbox или ставить
кнопку конкретно перед параметрами. Отдельный upload→pause/reselect→processing→clips уже approved;
transport recovery L — другая фича, интегрируется раньше единственного presentation hunk Uploader.

Новое решение ADR-001: strict cookie+SSR, один browser snapshot на живой Document и sync
с сохранёнными Next layouts/cache/refresh. Soft navigation и denied cookies сохраняют UI,
hard reload читает saved/default. Никаких provider/DB/API/packages/нового тестового стека.
Техническая геометрия первого инкремента и сохранённый порядок блоков определены в FR-1.

QC quality/risk/testability дали CONDITIONAL на прежние байты. Их17 условий интегрированы
автором с traceability, но raw reports не closed convergence. Formal snapshot/own reviewer
verification идёт после интеграции. ADR файл 03_adr/001-workspace-preferences.md соответствует
реальному pinned pathsFor; ID сохраняется, checker не изменяется.

Delivery только existing 77.83.87.178 clipmkr-stage-20261028, данные/volumes/config сохраняются.
Public DNS/access готовится, готовый URL не выдумывается. No auto seed/container/paid calls.
Новая версия на Cloud только после реальных stage checks и ручной приёмки владельцем.
