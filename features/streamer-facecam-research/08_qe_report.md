# Авторский QE-отчёт исследования

Срез 05.11.2026 UTC. Doc-only S; автор gpt-6.1-sol high. Это собственная проверка автора, не независимое заключение и не приёмка будущего renderer. Формальный независимый review ещё не выполнен; его результаты должны храниться в reviews/, вне семи измеряемых документов. Реализация, локальный эксперимент и пилот с людьми не выполнялись.

## Фактический процесс

До создания публичного draft прочитаны project AGENTS/CLAUDE, core-cjm, model-matrix, pinned feature-adr и модули 00/01/02/06; применён problem-solver-enhanced в качественном объёме. Studio-extended-qe использован в reference-режиме: явные риски, проверяемые сценарии, границы доказательства и anti-drift; AQE runtime не запускался.

Первоначальные recall/K2 и router/requirements/plan checkpoints сохранены отдельно. После уточнений root выполнены новый recall и K2, затем поддерживаемые requirements/plan checkpoints с обновлёнными входами. Фактические результаты просмотрены перед записью следующего этапа. K1 N/A: исполняемые имена/код не вводятся. S-tier ADR/architecture артефакты N/A: предложения в architecture-options.md не являются утверждённым ADR.

- `k2-final-check.log`: PASS, 0 failures, 0 warnings, 3 legitimate skips; 7 targets на диске, все 7 FR упомянуты.
- `requirements-final-checkpoint.log`: exit 0, ok:true; SHA 9b8d4cdafe37bd6d39e59c7af9e6265ab3c7a6f293f4ea09e98c86c2d568f8f7.
- `plan-final-checkpoint.log`: exit 0, ok:true; SHA e5842975aea9ed84fd41f2bd7425de9793e39cd5ad3a7325340880dddbeae378.
- Во время финальной проверки добавленное пояснение после блока EXPECTED_CODE_TARGETS сначала вызвало C3 target-block-malformed. Пояснение перенесено перед блоком; повторный фактический K2 дал результат выше. Это исправление формы плана, не изменение product scope.

## Требование → риск → проверка → результат → предел

| Требования | Риск и сценарий проверки | Наблюдение / evidence | Предел |
|---|---|---|---|
| FR-1/4/6 | Большое игровое лицо ошибочно считается автором; камера скрыта; строгая цель подменяется fallback | Architecture и pilot различают ROI/identity/tracking/mask, экспортное и условное покрытие, строгий режим/отказ; общий D′; дублирование камеры и потерянные пиксели отмечены | Материалы не обрабатывались, точность не измерена |
| FR-2 | Маркетинг становится доказанным успехом | Шесть официальных аналогов, dated self-reports отдельно от проверенного UI; Framedrop исключён из shortlist из-за недоступного первоисточника | Нет аккаунтов/покупок/независимых метрик конкурентов |
| FR-3/7 | Stars/pushed_at заменяют maintenance; ошибочная лицензия; зеркало заменяет исполнение инструмента | Primary LICENSE/README/API snapshots; SAM 3 — SAM License; AGPL/GPL и model weights выделены; public mirror exact SHA и applied/read-only методы различены | Юридическое решение и пригодность моделей не установлены |
| FR-4/5 | Старый dual незаметно переопределён; лимиты или интеграция расширены | Старый dual «два человека» сохранён; камера + IDE/игра требует будущей дельты требований/ADR/макета. 90/120/custom и 2 000 000 000 bytes сохранены; file upload baseline | Новые требования/OpenSpec не приняты; Twitch integration не создана |
| FR-6 | Успех crop объявляется готовностью продукта; synthetic UMUX становится человеческой оценкой | Локальная геометрия отделена от полного клиентского пилота; S3/partial/support readiness отмечены; реальные люди/UMUX/WTP только предложены | Нет benchmark, market validation, стоимости или оценки пользователей |
| Все FR | Непроверенные ссылки, незаявленная мутация или нечитаемый текст | `author-local-checks.json`: 7 MD, 0 ошибок локальных ссылок/whitespace, 0 foreign changes. Финальная смысловая/языковая вычитка выполнена | HTTP 200 не доказывает истину; полный внешний link-monitor не запускался |

## Источники и ограничения

`source-retrieval-receipts.json` содержит 71 фактическую запись запроса / 70 уникальных URL, а также снимки GitHub metadata и selected source changes. В отдельном прямом чтении 26 страниц продуктов/документации: 15 HTTP 200, 10 HTTP 403, 1 DNS failure; доступное содержание некоторых 403 прочитано через Web и не выдаётся за собственный хэш прямого ответа. Framedrop: Web 502 / DNS failure. Twitch legal вернул оболочку, полный юридический анализ не заявлен. GitHub latest release 404 не означает отсутствия релизов. Никакие signed receipts, FETCH_VERIFIED или криптографическое подтверждение истинности не создавались.

## Подтверждённая языковая коррекция

Root указал слитные даты/термины и неясную смесь русского с английским в публичных документах. Выполнены recall → исправление всех семи текстов → проверка фактического результата → teach → повторный recall. `teach-wording.log`: exit 0, ID teach:c18a9e69280d5050; `recall-wording-after.log` действительно вернул этот урок. Термины ROI/facecam пояснены; exact code IDs, commits и URL сохранены. Первый wording recall не содержал прямого специального урока — это не скрывается.

## Code/spec anti-drift

База worktree — main 9375c10238a147fcf43219ab8d9533b75a3ae6c7. Проверенный source срез не выдаётся за свежий live probe; web f55 / workers ebb — заданный контекст публикации. Main позднее продвинулся root, но это исследование не меняло baseline задним числом.

Фактический git status показывает только docs/research/streamer-facecam/ и features/streamer-facecam-research/. Код, зависимости, product requirements, OpenSpec, runtime, Cloud, S3, аккаунты и платежи не изменялись. Нет claims об implementation approval. Результат — предложение направления и ограниченного пилота; freeze hashes записаны в draft-freeze.json. После freeze измеряемые семь документов не редактировать до явно переданного rework.
