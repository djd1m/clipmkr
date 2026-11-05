# ADR-001: Выдавать личную ссылку через защищённый идемпотентный POST

## Status
proposed — обратимо до реализации; пересмотреть при смене модели личной ссылки или полном redesign.

## Context
Владелец согласовал автоматический личный адрес вместо придумывания кода (FR-1–FR-7).
`ensurePartnerCode` уже создаёт 12 URL-safe символов и сохраняет самый ранний код.
Общий PartnerPanel сейчас смонтирован для всех; его GET загружает статистику без mint.
Генератор используется также guest-pack: менять его права на blogger-only нельзя.

## Decision Drivers
1. D1 high: сохранение кодов, атрибуции, оплаты и антифрода.
2. D2 high: серверная роль и активность перед записью, включая конкурентные изменения.
3. D3 high: один адрес при повторах/двух вкладках, без новой схемы и зависимостей.
4. D4 medium: утверждённая композиция, загрузка видео остаётся главным действием.

## Considered Options
### A. Защищённый POST поверх существующего ensurePartnerCode
Плюсы: существующая сериализация, явная mutation, нет новой схемы; общий helper не ограничивает гостей.
Минусы: отдельное клиентское ожидание и повтор, ещё один сервисный метод.
### B. Создавать код при SSR/GET dashboard
Плюсы: готовый код в первом HTML, меньше состояний клиента.
Минусы: запись при чтении, общий mount создаёт коды обычным аккаунтам; prefetch повторяет write.
### C. Создавать при назначении роли владельцем
Плюсы: код готов до первого входа, один контролируемый оператор.
Минусы: меняет owner flow и транзакцию назначения; не покрывает уже назначенных блогеров без backfill.

## Decision
Добавить `PartnerService.ensurePersonalLink(account)` и tRPC mutation `partner.ensurePersonalLink`
со strict `{}` input. Сессия задаёт account. В одной транзакции: account active + is_blogger под
`FOR NO KEY UPDATE` → `ensurePartnerCode(tx, account)` → прочитать id/code/status/blocked_reason
выбранного кода с row lock → COMMIT. Неактивный/не-блогер получает 404 до partner UPSERT.
Порядок account → partner → code согласован с текущими create/guest/erasure/policy путями.
Достаточно сериализации существующей partner строки; отдельный Idempotency-Key/ledger не нужен.
Повтор после commit и потери ответа возвращает тот же id. Нет автоматической ротации при blocked.
Случайный UNIQUE collision остаётся честной rollback/error; «Повторить» повторяет операцию,
нового самостоятельного генератора и бесконечного retry не вводим.

SSR использует существующий `getBloggerPolicy(pool, account)` только для выбора композиции.
PartnerPanel получает явный personal mode; только в нём effect вызывает mutation, затем dashboard.
Обычный mode сохраняет ручные кампании и GET. Личный ответ хранится отдельно от фильтра статистики;
поздние ответы после unmount/смены attempt не меняют актуальное состояние.

## Rationale
D1/D3: earliest selection и UPSERT уже проверяемы; существующие ID не переписываются.
D2: блокировка account делает роль и удаление согласованными с операцией; SSR не авторизация POST.
D4: async карточка отображает loading/error/blocked/ready; upload DOM не размонтируется.
B отклонён из-за побочных эффектов чтения; C расширяет согласованный owner scope и требует backfill.

## Consequences
### Positive
Нет миграции, нового сервиса, пакета, сущности или переписывания attribution/payment.
### Negative / Accepted Downsides
Первое открытие требует POST и дополнительного чтения; показываем ожидание, ручной retry.
Снятие роли после SSR обнаруживается POST и даёт отказ; следующий reload убирает карточку.
Статус ссылки — снимок после lock, будущая блокировка отрабатывает действующим публичным /r guard.
### Follow-up ADRs
Сейчас не нужны; полный UX и создание приглашения владельцем — другой scope.
### After-action Review
Ответственный: координатор Clipmkr; через месяц после приёмки или при первом дефекте выдачи.

## Confirmation
- Method: HTTP contract, real PostgreSQL races, browser hydration и проверка опубликованной копии.
- Monitoring: существующие HTTP status/request_id и видимые loading/error состояния.
- Success metric: 20 параллельных вызовов → один code/id; все отрицательные сценарии без новых строк.
- Owner: автор `gpt-6.1-sol high`; независимый QE `gpt-6-astra xhigh` в новой сессии.
- Load-bearing property: роль/active до write; earliest и blocked сохранены; GET без mint; upload identity.
- Required automated check: `tests/partner.integration.test.ts` (personal link concurrency/role/block),
  `tests/partner-route.test.ts` (session/strict/method), `tests/browser/blogger-auto-link.test.ts` (UI/fallback).

## Shift-left validation
| Вопрос | Проектное решение и проверка |
|---|---|
| Параллельные запросы/нагрузка | account и partner locks, 20 callers; таймаут теста выявляет deadlock |
| Снятие роли/удаление | held account lock и настоящий конкурентный UPDATE, проверка обоих порядков commit |
| Антифрод/blocked | held code lock + concurrent block; earliest id сохраняется, mint отсутствует |
| БД недоступна/commit response lost | ошибка не показывает фиктивный URL; retry после committed response loss даёт тот же код |
| Изолированность | реальные PG schema fixtures; HTTP adapter отдельно; browser с действующим service |

BDD: Given active blogger без кода, When 20 POST одновременно, Then один id и одна строка.
BDD: Given обычный/удаляемый аккаунт, When POST напрямую, Then 404 и ноль новых строк.
BDD: Given blocked earliest и дополнительные campaigns, When reload/retry/filter, Then прежний код.
Риски HIGH: bypass роли, дубль, потеря атрибуции; для каждого названы реальные отрицательные проверки.
Это авторская shift-left оценка проекта; runtime tests ещё не выполнены.

## Уточнение после initial QCSD — 05.11.2026
Q-BA-01/R-BAL-01: в personal mode запрет copy для blocked личного id действует также
в переиспользуемом PartnerSummary при раскрытом списке. Другую active кампанию, историю
и обычный mode не отключать целиком. Confirmation: browser test
`blocked personal link cannot be copied from expanded campaigns` в `tests/browser/blogger-auto-link.test.ts`.
T-BAL-01: один тест в той же browser suite использует две действительные HTTP-сессии,
реальный PartnerService и PG; ни auth identity, ни service, ни SQL не подменяются.
Confirmation: `two blogger HTTP sessions keep personal link ownership isolated` в
`tests/browser/blogger-auto-link.test.ts`: sequential/concurrent mint и repeat, разные id/code,
точный DB owner, свой dashboard и 403 на чужой code_id. Falsifier подменяет account сервиса
на A: запрос B должен сделать тест красным. Новая сущность, endpoint или harness не требуется.
Initial QCSD сообщил три structural conditions; их closure устанавливают только исходные reviewers.
