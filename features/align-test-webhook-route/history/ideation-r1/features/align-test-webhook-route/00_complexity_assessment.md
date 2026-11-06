# Маршрутизация сложности: TEST callback

Task kind: bugfix

05.11.2026. Отдельная операционная фича; текущая работа — только planning. Применён закреплённый feature-adr 1.5.25 из node_modules проекта, режим reference. AQE runtime не запускается.

## Оценка

| Измерение | Балл | Основание |
|---|---:|---|
| Файлы | 2 | 2 будущих implementation targets и 8 основных planning/ledger файлов; при расширении пересчитать |
| Домены | 2 | Edge routing и существующий billing callback; API/DB модели не меняются |
| Интеграции | 1 | 0 новых: Caddy, основной proxy и ЮKassa уже используются |
| Breaking | 2 | Контракт URL сохраняется; фактический владелец обработки callback меняется |
| Модели данных | 1 | 0 новых; миграций/слияния данных нет |
| Сквозные свойства | 2 | Один trust concern: сохранение реального IP через существующую цепочку proxy |

Итого **M10**. XL измерений, новых инфраструктурных компонентов и breaking API нет. Активны 0/1/3/3.5/5/6/7/8; Step2 research и DDD/Step9 не обязательны. `02_reuse_inventory.md` — обязательная локальная инвентаризация reuse, не исполнение L-stage research. M требует один lightweight ADR, настоящий независимый QCSD и архитектуру light. Бюджет полного M run: 45 мин (R5/P10/I20/Q10); этот bounded planning run не обещает завершённый runtime.

## Риски отказа

| Acid | Отказ, который проверка обязана обнаружить |
|---|---|
| A1 | Callback снова направлен старому контейнеру/другой business DB |
| A2 | Изменены другие host blocks, alias, rewrite или XFF |
| A3 | Для применения заменён inode bound Caddyfile или reload выполнен до validate |
| A4 | Реальные платежи/другие аккаунты получили доступ либо TEST secret/test=true не подтверждены |
| A5 | Reload/health сбой оставляет изменённый config без точного rollback |

## Recall и статус

Первый recall под default Node завершился exit0 с ошибкой ABI SQLite и пустым fallback; это не успешное чтение store. Повтор под `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node`, pinned npm CLI из `/tmp/clipmkr-public-entry-20261105`, `--project /home/clipmkr --json --limit 3` вернул 3 прочитанные записи. Применён teach:b9ca1b2cc77e0c4e: использовать установленный проектный patched gate, не объявлять tooling несовместимым без проверки. Две UI-записи не перенесены в требования callback.

Решение владельца об автономных шагах1–4 основного блока передано координатором; отдельное human approval этих bytes отсутствует. Здесь не выданы approval/checkpoint receipts. Requirements/ADR draft не разрешают runtime apply; Step3.5 независимые QCSD-роли пока NOT RUN. 05/06 — предварительная подготовка для review, не закрытие зависимых этапов. Код/runtime/UI/legacy data не изменены.
