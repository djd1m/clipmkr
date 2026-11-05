# Ограниченный тестовый checkout — M

Дата: 05.11.2026. Task kind: feature. База `24b4b4a4be4364659142b1428511fb634378ddbc`.
Ветка `feat/per-account-test-checkout-20261105`; отдельный worktree, без незавершённой автоссылки.
Координатор сверил текущую runtime-ревизию `4d053b051fbef8ae19345951ae12817f138bb2d1`
с этой source-базой; архитектор не выполнял независимого live-аудита или операций провайдера.

## Маршрут
M: 0, 1, 3, 3.5, 5(light), 6, 7, 8. Дополнительный reuse inventory вместо внешнего research.
8 production/config файлов, 5 существующих тестовых файлов, 1 существующая provider fixture и 2 узких test-only файла; нет новых доменных сущностей,
платёжных переходов, схемы, провайдера или денежной арифметики. По числу файлов с тестами
после QCSD и объявления optional настройки получается 16, но размер/домены ограничены конфигурацией и одним entry guard; это не L-подсистема.
Баллы: files=3, domains=2, integrations=1, breaking=1, data=1, crosscutting=2; сумма 10 → M.
S отвергнут из-за auth/config/API/SSR границы. DDD не нужен: существующие account/intents неизменны.
Ориентир планирования 10 минут; реализация/QE зависят от реальных проверок, без обещания срока.

## Acid corpus
| ID | Вход | Отказ/результат |
|---|---|---|
| A1 | TEST provider + global false + разрешённая сессия | native checkout разрешён только ей |
| A2 | другой account/anonymous/body spoof | нет intent и provider create, UI закрыт |
| A3 | testMode false/live key/off/fake + exception | preflight отказ либо отсутствие доступа |
| A4 | UUID absent/empty/invalid/multiple | absent/empty отключает exception, malformed отказывает startup |
| A5 | SSR и POST одной сессии/разных аккаунтов | одна policy, чужой UI не становится активным |
| A6 | повторы/конкуренция/status/webhook | прежняя идемпотентность и ownership, без двойного grant |

## Recall и роли
Выполнен pinned `npm run dz -- recall "payments test checkout account authorization server policy" --project /home/clipmkr --json --limit 4` с Node22.23.4; получено 4 записи.
Применены `teach:2d16bb3c5fb99858` (смена account не принимает старый checkout response),
`teach:3f59a22d1f854566` (проверять реальные disabled-кнопки при валидных windows),
`teach:0b0af6409f8c4e51` (принадлежность задаёт session, не запрос).
Архитектор requested Astra xhigh; будущий автор Sol high. Три QCSD core-роли — независимые
Terra xhigh сессии для Astra-документов; финальный QE Sol-кода — новая Astra xhigh сессия.
Initial QCSD выполнен тремя отдельными Terra core-сессиями; условия QL-01/QL-02/QT-001 ожидают focused closure.
Root выполнил pinned K1 checkoutAllowedForAccount: FREE/exit 0 (по его передаче). Новые test module names
требуют K1. K2 и code admission не выполнены; поручение владельца не выдаётся за gate PASS.
