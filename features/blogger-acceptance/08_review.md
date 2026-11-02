# Code/spec anti-drift: кабинет блогера

Дата: 02.11.2026. Проверены FR-1…FR-6/C-1, ADR-001, согласованный M-план с AM-1…16 и OpenSpec.
Подробная итоговая проверка: `08_qe_report.md`; живые факты: `docs/measurements/2026-11-02-blogger-live-cjm.md`.

| Требование | Реализация | Проверка |
|---|---|---|
| FR-1: 90/120 минут, индивидуальный лимит | shared upload policy, worker STT, owner API/UI | unit + PostgreSQL границы/+0,1 с; настоящий тракт 7199,065391 с → 4 клипа |
| FR-2: снимок до расходов | video.create: account FOR SHARE, source_limit_seconds; probe до кредита/квоты | PostgreSQL snapshot/idempotency/order; старые записи остаются 5400 с |
| FR-3: управление только владельцем | blogger-policy, native handler, /dashboard/bloggers, atomic operator_action | PostgreSQL откат audit; HTTP 401/403/422, настоящий HTTPS owner UI |
| FR-4: нативные ссылки и уникальные люди | PartnerService; bloggerReport, Moscow month, independent aggregates | PostgreSQL уникальность; один плательщик по двум ссылкам; настоящий трёхролевой CJM |
| FR-5: null/20/30, предварительная оценка | BigInt integer floor; UI без обещания выплат | PostgreSQL ставки/копейки; настоящий owner UI 20→30→20 |
| FR-6: настоящий магазин | существующие YooKassa checkout/provider/native webhook | тестовые карты и настоящий webhook; начисление и платная нарезка; реальные списания выключены |
| C-1: совместимость | additive 026/027, сохранены квоты/2 ГБ/fencing | native migrator, полный изолированный Node 22 suite, image guard |

## Замечания независимого ревью

Временная политика владельца — cross-model, отдельные сессии без контекста кодирования.
Запрошенные ID моделей инструмента: рецензенты gpt-6-astra и gpt-6.1-sol;
автор исправлений gpt-6.1-terra. Это metadata запуска, а не независимая аттестация runtime модели.
Проверяющие сначала получили документы, сами нашли реализацию и воспроизвели дефекты.
Ранние проверки агентами той же модели cross-model не называются.

- AM12: потерянный complete при уже начавшейся/отказавшей обработке. Исправлен идемпотентный ack;
  собственный неизменённый PostgreSQL repro Sol и 34 существующих проверки проходят.
- AM13: замена источника меняла историю выручки; сумма уникальных плательщиков по ссылкам
  завышала итог. Источник теперь сохраняется в payment_intent; aggregate считает DISTINCT.
  Собственный PostgreSQL 16 repro Astra и девять отрицательных финансовых контролей проходят.
- AM14: тестовому магазину не хватало явной маркировки. Общий layout теперь показывает
  предупреждение об учебных суммах только при live+testMode; настоящий HTTPS UI проверен.
- AM16: реальный подтверждённый платёж провайдера оказался раньше merchant created_at на 13,94 с.
  Убрано сравнение независимых часов. Проверенная идентичность/сумма/SKU/статус/снимок/месяц
  сохраняются, NULL источник не атрибутируется задним числом. Оба новых теста сначала RED,
  затем 39/39 настоящих PostgreSQL интеграций GREEN; отдельный отчёт ревью в reviews/.

Отчёты: `reviews/cross-model-astra.md`, `reviews/cross-model-sol.md`,
`reviews/cross-model-astra-am16.md`. Итоговые результаты и границы живой приёмки фиксируются
в `08_qe_report.md`; ранние неполные прогоны не выдаются за успешные.

## UI и процесс

Owner UI: 6/6, экран видео: 40/40, Chromium/WebKit; обе темы, мобильные/desktop ширины,
нативные domRules, axe serious/critical, text zoom 200%, отрицательная мутация R9.
S-защита от раннего перехода при загрузке: 6/6. Это не утверждение о проверке всех страниц сайта.
K1 выполнен настоящим dz на byte-identical проекции исходников (ограничение scanner);
K2 проверяет 52 target, один легитимный skip отсутствующего acid corpus.
Pinned OSS patch Next paths воспроизводима; три положительных и шесть отрицательных путей,
исходная реализация RED. Автоматические Git/Codex хуки не активированы;
проектные gates и checkpoints выполняются явно. Claude bridge действительно дал probe-failed;
успешное Anthropic review не заявляется. Runtime AQE не установлен, режим reference.
