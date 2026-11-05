# Упрощение UI — текущая маршрутизация реализации

Task kind: refactor

05.11.2026. Implementation **L, 14 баллов**, а не research/S gate. Exact HTML APPROVED; архитектура исправлена автором, независимый QCSD запускает координатор. Никаких успешных checkpoints эта оценка не создаёт.

| Измерение | Баллы | Основание |
|---|---|---|
| Files | 3 | 14 existing UI/CSS +2 тонких SSR pages +6 test/harness =22 targets, точный список root06 |
| Domains | 3 | Кабинет/медиа, партнёрство, owner/деньги |
| Integrations | 1 | Новых API/backend/provider integrations нет |
| Breaking | 2 | Перемещение UI действий, два presentation routes, без замены существующих URL |
| Models | 1 | Нет новых persistent models |
| Cross-cutting | 4 | Три роли, focus/consent/media lifecycle, темы/layouts |

Сумма14, override XL dimension даёт минимумL. Верхняя граница25 targets; при расширении пересчитать router и план до кода. Два SSR wrappers не новые backend services. Активны0/1/2/3/3.5/4/5/6/7/8/9; ADR MADR+Confirmation, DDD, QCSD, настоящие K1/K2 и independent QE обязательны. Временной ориентир прежнего L-router120мин не обещание runtime-поставки.

## Статус и происхождение

Историческая research-редакция: Git `a4488b4caf602f093a0cc3393b4903e210cb3989:features/ux-simplification/` (одноимённый файл), [исторический manifest](design-review-inputs.sha256), [исследование](03_reference_research.md), [аудиты](audits/regular.md). Старые receipts неизменны; их hashes относятся к той ревизии, не к текущему implementation пакету. Nested `implementation-inputs/` сохраняется как подготовительный источник, canonical root00/01/02 — текущие execution inputs.

Exact approval и OpenSpec hashes — root01; решения/state/CSS — ADR/04/05, задачи/acid corpus A1…A10 — root06. Auto-link и personal TEST checkout уже существуют. Backend recovery отдельный dependency, UI не выдумывает retry API. Согласованный макет не заменяет gates/code/QE/manual acceptance.

## Применённый recall и коррекция

Реальный recall предыдущего авторского прохода из pinned public-entry worktree вернул5 записей, включая teach:820581d93a5cf7df (полный результат прочитан); координатор сообщил повторный pinned Node22 recall того же урока перед этой коррекцией. Применение: отдельные approved account/stats screens, матрица макет→компонент→проверка, same state/theme/layout/width. Ошибка первого draft — замена композиции inline details — принята и исправлена; это повтор подтверждённого урока, не новая продуктовая гипотеза. Новый teach/recall здесь не исполнялся: store /home/clipmkr/.dz вне доступной записи, успех сохранения не заявлен. Координатору принадлежит запись подтверждённой коррекции в общий store.

Pinned harness0.8.58/feature-adr1.5.25; текущая сессия только author correction документов. Native gates/network/код/tests/commit/push не исполняются.
