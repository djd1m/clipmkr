# ADR-001: Сохранять происхождение и владение данных

## Status
proposed — пересмотреть после инвентаризации и независимого QCSD; до исполнения обратимо.

## Context
Два непустых datasets могут иметь совпадающие email, PK, внешние ID и ключи объектов при разном владении.

## Decision Drivers
Высокий: FR-2/3 — сохранить все данные c и не передать чужие данные другому пользователю. Высокий: FR-4/7 — сохранить credentials и attribution. Средний: bounded операции с реальным collision report вместо общего account merge.

## Considered Options
| Вариант | Сильная сторона | Цена/риск |
|---|---|---|
| Restore source поверх target | Простой полный перенос одной системы | Теряет c, противоречит FR-2 |
| Автоматический merge по email | Уменьшает дубли и ручную работу | Нет proof личности, разные credentials/атрибуции/права |
| Явный mapping с provenance | Отделяет происхождение от identity, сохраняет target | Нужны inventory и решения по конфликтам, более долгая подготовка |

## Decision
Выбрать явный mapping `(dataset, entity_type, source_id) → target_id` с reason/evidence и immutable run binding. Идентификаторы существующего c сохраняются; source PK сохраняется только при отсутствии collision. Доказанная идентичность разрешает дедупликацию по утверждённой карте, но email/UUID/hash пароля по отдельности недостаточны. Для спорной личности сохранить обе записи в защищённой staging/backup, не переименовывать email на выдуманный и не объявлять перенос завершённым. Конфликтные пакеты ждут конкретного решения владельца.

Переписывать весь граф зависимостей, включая UUID внутри текстовых/JSON fields, `quota_counter.scope_key`, credit source_key и external payment metadata mapping. Immutable `payment_intent` нельзя обновить произвольным UPDATE; импорт готовит согласованные insert-данные и отдельную внешнюю совместимость. Historical video billing_policy проверяется после INSERT trigger, а не доверяется входному dump. Без тестируемого безопасного способа — STOP, не глобальное отключение constraints/triggers.

## Rationale
Provenance удовлетворяет FR-2/3 и делает повторный импорт распознаваемым. Схема unique email не допускает двух активных конфликтных строк: требуется решение до final switch, не ослабление ограничения. Merge credentials и privileged flags не выводится из одинакового email.

## Consequences
Плюс: целостность владения и воспроизводимое объяснение каждой строки. Минус: человек разбирает реальные конфликты, релиз может ждать. Mitigation: сначала агрегатная collision inventory, затем закрытый список только необходимых решений. Сессии source сохраняются как исторические записи, но не становятся активными c tokens; target сессии/secret сохраняются, если нет отдельного решения отзыва.
Follow-up: ADR-002/003/004. After-action: root и владелец через 30 дней после принятого cutover пересматривают unresolved conflicts/поддержку.

## Confirmation
Method: PG16 scratch и отрицательные A1/A7, отдельная проверка requirements/ownership. Monitoring: число unmapped/conflicting/orphan rows и failed ownership probes. Success metric: 0 неразрешённых конфликтов/потерь/FK нарушений при cutover; 0 чужих чтений. Owner: root + независимый reviewer. Load-bearing property: совпадение email не создаёт доступ. Required automated check: будущий `consolidation_identity_collision_refuses` (точный файл после K1), реальный PG16, повтор mapping идемпотентен. Given same email/different UUID/owner, when dry-run, then конфликт блокирует импорт без writes. При сбое mapping нет частичного переключения; offline scratch изолирует проверку. NOT RUN.
