# Автоматическая ссылка блогера — M

Дата: 05.11.2026. Implementation base: `24b4b4a`; утверждённый макет `18e4fa9`.
Task kind: feature. Рабочая ветка: `feat/blogger-auto-link-20261105`.
Архитектор: запрошен `gpt-6-astra xhigh`, сессия `blogger_auto_link_plan`.
Автор кода: отдельная будущая сессия `gpt-6.1-sol high`.

## Маршрутизация

M; активные этапы 0, 1, 3, 3.5, 5(light), 6, 7, 8. Reuse inventory дополнительно.
9 ожидаемых файлов кода/тестов, 2 связанных домена: роль и реферальная идентичность.
Новые интеграции, схема и пакеты отсутствуют. S рассмотрен и отклонён: UI, новая
мутация, авторизация и конкуренция требуют проверки нескольких контрактов.
L/DDD не нужен: существующие сущности account → partner → partner_code сохраняются.
Баллы: files=2, domains=2, integrations=1, breaking=1, data-models=1, crosscutting=2;
сумма 9 → M. Ориентир: requirements 5, planning 10, implementation 20, QE 10 минут;
это оценка небольшого среза без ожидания независимых reviews и ручной приёмки, не обещание SLA.

## Критические примеры (acid corpus)

| ID | Вход | Ожидаемое поведение |
|---|---|---|
| A1 | 20 параллельных первых POST одного блогера | Один код и одинаковый id/URL |
| A2 | Обычный аккаунт, удаление или снятие роли | Ноль новых partner/partner_code |
| A3 | Самый ранний код blocked, конкурентная блокировка | Прежний id, blocked; ноль mint |
| A4 | Несколько кампаний, выбор фильтра | Личный код неизменен; история сохранена |
| A5 | Clipboard denied, RPC failure, late response | Честные состояния и повтор без дубля |
| A6 | Смена темы/вида во время загрузки | Тот же uploader DOM и незавершённая загрузка |

## Recall и допуск

Реально выполнено из `/tmp/clipmkr-public-entry-20261105` с Node 22.23.4:
`npm run dz -- recall "blogger referral partner code idempotency guards approval" --project /home/clipmkr --json`.
Получено 10 записей. Применены `teach:99608aa1a1a6ccf5` (reuse + guards),
`teach:0b0af6409f8c4e51` (принадлежность сессии), `teach:dfbc5d28641e8c8e`
(узкая согласованная композиция), `teach:ba5cef0122e70293` (настоящие receipts).
Panel Step 3 записан поддерживаемым `dz statusline --fa-record`, recalled=10, stored=0.
Это состояние работы, не успешный checkpoint.

Согласование владельца — `owner-approval.md`. Initial QCSD выполнен; три условия исправляются в документах, convergence unresolved до focused review. K2 NOT RUN.
Нельзя объявлять Step 6 завершённым и запускать Step 7 до их действительного завершения.
