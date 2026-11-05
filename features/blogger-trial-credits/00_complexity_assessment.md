# Стартовые кредиты блогера — маршрутизация

Дата: 05.11.2026. Статус: S8 и финальный план приняты root 05.11.2026.
Task kind: bugfix
База: public-entry HEAD `e381a2a8034d1424800e85f61625990b4e1bb0e8`.
Worktree: `/tmp/clipmkr-blogger-trial-20261105`; reconciliation не изменяется.

## Маршрутизация

| Измерение | Балл | Основание |
|---|---:|---|
| Файлы | 1 | 3 code targets: credits.ts, blogger-policy.ts, новая PG integration suite |
| Домены | 2 | Роль блогера и credit ledger, существующая общая DB |
| Интеграции | 1 | Новых нет |
| Breaking | 1 | Нет breaking API: HTTP schema/response и native defaults сохраняются |
| Модели | 1 | Таблицы, source enum и миграции не добавляются |
| Сквозное | 2 | Аудит начисленной разницы в existing policy action |

Итого **S8**. XL-измерений и breaking API нет; существующий audit не новый auth-контур.
Root проверил шесть измерений и подтвердил минимальный scope: денежный риск сам по себе
не увеличивает число файлов/моделей/интеграций. Активны `0→1→6→K1/K2→7→8`.
ADR/DDD/05/QCSD/fleet по S не обязательны. PG concurrency/security/cross-model QE остаются
обязательными по природе write-side изменения, независимо от небольшого tier.
Ориентир: дизайн30–45мин, реализация30–60мин, real-PG/QE отдельно по факту; это не timeout.

## Полномочия и recall

Владелец явно поручил устранить разрыв: blogger limit120мин при trial30мин, после
трёх минут использования осталось27. Root уточнил семантику: общий trial120 с учётом
начальных30 и уже потраченного; ожидается117remaining. Повторное сохранение не пополняет;
явное увеличение владельцем может добавить лишь разницу до нового максимума.
Это разрешение подготовить/проверить решение, не historical approval конкретного плана.

Actual `npm run dz -- recall 'blogger trial credit grant role initial funding audit idempotency'
--project /home/clipmkr --json --limit 8` из pinned sibling, Node22.23.4: exit0,5 результатов
прочитаны. Релевантен `teach:0f0ab74f9b8c96e2`: роль/длительность не обеспечивают бюджет,
повторное сохранение не должно давать бесконечный grant. Остальные UI/реферальные/upload
уроки не выдаются за подтверждённые credit механизмы. Учётный факт сообщил root; эта
сессия не читала live DB. Local source подтверждает отсутствие grant в setBloggerPolicy.

Автор дизайна/плана — gpt-6-astra xhigh; будущий код — gpt-6.1-sol high.
Independent implementation QE — fresh gpt-6-astra xhigh requirements-first сессия,
отличная от автора Sol. Requested IDs, не runtime attestation. Код, продуктовые тесты и live сейчас NOT RUN. Actual K1/K2/checkpoint evidence — plan-checks.json/README. При расширении scope выполнить routing повторно.
