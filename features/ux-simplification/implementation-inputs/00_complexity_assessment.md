# Текущая граница реализации UX — вход маршрутизации

Task kind: refactor

05.11.2026. Статус: подготовка входов, НЕ checkpoint approval. Exact HTML approval
PENDING; общее «действуй» не заменяет согласование этой ревизии.
База: `a4488b4caf602f093a0cc3393b4903e210cb3989`.
Предыдущий research-router и frozen inputs не меняются. Этот addendum описывает
возможную реализацию прежнего предложения на текущем main, не новую функцию.

## Оценка: L, 14 баллов

| Измерение | Баллы | Текущая причина |
|---|---:|---|
| Files | 3 | 14 явных UI/CSS targets + до5 placement/glue targets +6 test/harness targets =20–25; exact список сузит Astra |
| Domains | 3 | Общий кабинет/медиа, партнёрство блогера, управление владельца/деньги — три области существующего продукта |
| Integrations | 1 | Новых нет; RPC/checkout/media остаются существующими |
| Breaking | 2 | Перемещение обнаружимых действий и сценариев UI; API/БД не меняются |
| Models | 1 | Новых persistent/domain models нет |
| Cross-cutting | 4 | Три роли, keyboard/focus/consent, две темы/компоновки, финансовые/ошибочные состояния |

Сумма14; override XL dimension даёт минимум L. Название «упрощение» не уменьшает
размер изменения. Если архитектура даст >30 targets/новые backend contracts,
маршрутизация пересчитывается; scope нельзя расширить молча.

Для будущего L активны0/1/2/3/3.5/4/5/6/7/8/9. ADR — MADR+Confirmation;
DDD/архитектура, настоящий QCSD и независимые проверки обязательны. Это требования
будущего процесса, не выполненные stages. Бюджет router: ориентир L120мин (15/30/45/30),
не обещание срока поставки; media/payment/manual checks зависят от разрешённых условий.

## Фактический recall до подготовки

Pinned Node22.23.4, dz0.8.58, skill1.5.25; `npm run dz -- recall
'ui simplification controls current baseline partial upload' --project /home/clipmkr
--json --limit 5` из установленного toolchain worktree вернул5 записей.
Прочитаны `teach:dfbc5d28641e8c8e`, `teach:a9f988b318609d05`,
`teach:f2472a51e3e72ac1`, `teach:e90818b60204f522`, `teach:3326a09ebf1b6466`.
Применение: сохранять критическое и advanced-state; не объявлять причину upload/S3
установленной; UI не вытесняется стримерским research; текстовый zoom проверяется
отдельно от default geometry. Существующая auto-link уже исправила часть старого
наблюдения об обнаружимости — не выдавать её отсутствие за текущий дефект.

## Авторизация и граница

Разрешены source inventory/requirements/reuse и scaffold для Astra. UI approval,
архитектура, QCSD, финальный план и K1/K2 остаются PENDING/NOT RUN. Продуктовый код,
runtime/deploy, роли, данные, DNS и formal success receipts не менялись.

## Перенос в канонический процесс перед gates

Этот nested набор — только входы архитектору. До formal implementation prepare,
QCSD и K2 нужно обновить canonical root00/01/02/05/06 на реальный L, сохранив старую
research-ревизию/manifest через Git/ссылки. Не прогонять прежний research или S-вход
вместо текущего scope20–25. Frozen HTML/PNG в этой подготовке не менялись.
