# План: довести кабинет блогера и длительность

Статус: план согласован владельцем 02.11.2026: «Да, реализуй по плану». Первоначальный часовой таймбокс истёк без завершения объёма; работы продолжаются по поручению владельца.
Inputs read: 01_requirements.md, 03_adr/001-account-policy.md, 05_architecture.md,
нативные probe/stt/partner/credits, донор №6 commission и текущий журнал E2E.

## Задачи

- [ ] T1 (ADR-001, FR-1, FR-2, FR-3, C-1): добавить миграцию `026_blogger_policy.sql`, политику в shared/upload и DB-модуль настроек. Поля account: is_blogger boolean default false, blogger_source_limit_seconds nullable integer, blogger_commission_percent nullable 20/30. Поле video: source_limit_seconds default 5400. Технический диапазон 120..86400 секунд. При create сохранить снимок; при probe проверить его до расходов. Проверки: `tests/blogger-policy.test.ts`, `tests/blogger-policy.integration.test.ts`, обычная граница 5400/5400.1, блогер 7200/7200.1, override 9000, изменение профиля после create и отказ чужому актору.
- [ ] T2 (ADR-001, FR-1, FR-2, C-1, после T1): провести limit через ProbeSourceRow, fileFailure и acceptProbe. Заменить скрытые технические барьеры 5400 в chunker, tariff.inputCreditSeconds и authorizeSttCall единым техническим максимумом, сохранив реальный допуск в probe. Созданные задания используют снимок. Прогнать соответствующие probe, transcription, chunker, credit тесты и границу 120 минут; квоты и цены не обходить.
- [ ] T3 (ADR-001, FR-3, FR-4, FR-5, C-1, после T1): создать owner API и страницу `/dashboard/bloggers`, переиспользовать текущую сессию и hasOwnerUnlimited. Изменения только владельцем с проверкой origin и audit. Месяц YYYY-MM по Москве, отдельные агрегаты людей/готовых записей/проверенных платежей, без умножения JOIN; фильтр возвратов как в текущем PartnerService. Ставка nullable 20/30, оценка от выручки явно предварительная. Из №6 переиспользовать подход к integer-арифметике, не коммерческие константы. Проверки: `tests/blogger-report.integration.test.ts`, `tests/blogger-policy.test.ts`, `tests/browser/blogger-cabinet.test.ts`.
- [ ] T4 (FR-1, FR-3, FR-4, после T1/T3): вывести применимый лимит в Uploader из remainingLimits, владельцу дать ссылку на настройки; обычному пользователю не предлагать доступ владельца. Сохранить созданные коды и свой кабинет. Браузер: Chromium/WebKit, обе темы, 320/375/1440, keyboard/error, просмотреть снимки без частного медиа.
- [ ] T5 (FR-6, C-1, независимая проверка): выяснить действующий магазин Clipmkr; проверить checkout/подтверждение/повторное событие/полученные права. Не использовать ключи чужого магазина без указания владельца. Секреты не публиковать; нет профиля — BLOCKED именно реальный платёж, продолжить остальные части.
- [ ] T6 (после T2/T4): tests/typecheck/lint/build и изолированная БД; RED/GREEN для границ и доступа. Реальный baseline на 88 минутах уже PASS; 120 минут не объявлять проверенными по нему. Независимое ревью, anti-drift, исправления только подтверждённых находок, небольшой commit/push. Проверенный артефакт и план отката до выкладки.

## Контракты и разделение работы

Shared/upload: NORMAL_SOURCE_SECONDS=5400, BLOGGER_SOURCE_SECONDS=7200,
MAX_SOURCE_SECONDS=86400; sourceLimitSeconds({is_blogger,blogger_source_limit_seconds}).
DB/blogger-policy: getBloggerPolicy, setBloggerPolicy; DB/blogger-report: bloggerReport.
Owner API: GET/POST `/api/owner/bloggers`; POST принимает account_id, is_blogger,
max_minutes|null, commission_percent|null и reason. Не принимает owner-флаг.
DB settings проверяет actor через hasOwnerUnlimited в транзакции и пишет operator_action.
Запросы owner API требуют действующую сессию; POST — разрешённый origin и rate limit.
Новые экспортируемые имена проверяются K1 до кода. Новые пути сверх списка требуют поправки плана и K2.

## Amendments

AM-1 (QCSD risk/quality): активная учётка владельца проверена на целевой среде: owner_unlimited=true. API получает actor только из действующей сессии и перепроверяет владельца внутри транзакции изменения; reason и audit атомарны. Confirmation: матрица доступа и отказ чужому origin → test `owner policy changes require active owner and audit` in `tests/blogger-policy.integration.test.ts` (fails if reverted).

AM-2 (QCSD risk/testability): лимит проверяется внутри acceptProbe перед reserveVideoCreditsTx и квотой. Повтор idempotency_key и retry используют первоначальный снимок. Confirmation: изменение роли между create и probe не меняет допуск → test `idempotent create preserves source limit` in `tests/blogger-policy.integration.test.ts` (fails if reverted).

AM-3 (QCSD quality/risk): отчёт имеет сводку по блогеру И каждой его ссылке. Активный пользователь — уникальный аккаунт с готовой записью и хотя бы одним готовым клипом за выбранный месяц после assigned_at; регистрации считаются отдельно. Месяц по Москве. Платёж сохраняет все native-фильтры payment/intent/assigned_at, после замены источника старый платёж новому источнику не приписывается. Confirmation: повторные видео и платежи не умножают людей и выручку → test `monthly report counts unique people and verified payments` in `tests/blogger-report.integration.test.ts` (fails if reverted).

AM-4 (QCSD quality): оценка процента считается от подтверждённой выручки существующих пакетов до комиссий провайдера, округление вниз до копейки; текущая ставка применяется к выбранному месяцу заново. Null — отсутствие оценки. Это не месячная подписка и не задолженность к выплате. Confirmation: null/20/30 на реальных фиксированных ценах пакетов → test `commission estimate uses explicit rate and integer floor` in `tests/blogger-report.integration.test.ts` (fails if reverted).

AM-5 (QCSD risk): все новые поля имеют DB CHECK и defaults для старых записей. При выкладке обновить web и всех потребителей лимита до допуска длинных задач. Откат не включает запуск старого worker с пределом 5400 поверх уже принятых длинных заданий: сначала остановить новый приём, сохранить совместимый worker до завершения. Confirmation: миграция и legacy insert → test `migration preserves legacy source limits` in `tests/blogger-policy.integration.test.ts` (fails if reverted).

AM-6 (QCSD testability): браузерная приёмка разделяет статическую вёрстку и настоящий localhost API/session; 88 минут не доказывают 120. Настоящая оплата и трёхролевой платёжный CJM остаются BLOCKED до магазина. Confirmation: авторизованный owner endpoint/отказ чужим ролям → test `owner policy changes require active owner and audit` in `tests/blogger-policy.integration.test.ts` (fails if reverted); отдельные реальные E2E протоколы сохраняют собственные ограничения.

## Gates

До реализации: реальный QCSD (качество, риск, тестируемость), подтверждение M-плана владельцем,
K1, K2 --tier=M --require-requirements и поддерживаемые dz receipts по фактически выполненным
этапам. S-план навигации — отдельная уже подготовленная работа; его приёмка не закрывает M.
Миграция только через существующий migrator. Выкладка с миграцией и смена payment mode
не подменяются успешной локальной сборкой.

EXPECTED_CODE_TARGETS:
- packages/db/migrations/026_blogger_policy.sql
- packages/shared/src/upload.ts
- packages/shared/src/tariff.ts
- packages/db/src/blogger-policy.ts
- packages/db/src/blogger-report.ts
- packages/db/src/index.ts
- packages/db/src/probe.ts
- packages/db/src/transcription.ts
- apps/web/src/server/video.ts
- apps/web/src/server/limits.ts
- apps/web/src/lib/limits-contract.ts
- apps/web/src/server/blogger-owner-handler.ts
- apps/web/src/app/api/owner/bloggers/route.ts
- apps/web/src/app/dashboard/bloggers/page.tsx
- apps/web/src/app/dashboard/bloggers/BloggerAdmin.tsx
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/app/dashboard/layout.tsx
- apps/web/src/app/upload/Uploader.tsx
- apps/worker/src/workers/stt.ts
- apps/worker/src/stt/chunker.ts
- tests/blogger-policy.test.ts
- tests/blogger-policy.integration.test.ts
- tests/blogger-report.integration.test.ts
- tests/browser/blogger-cabinet.test.ts

Уточнение AM-4: искусственная дробная копейка не создаётся обходом CHECK цены пакета. Проверка 20/30/null проходит на допустимых платежах; реализация использует целочисленное округление вниз.
