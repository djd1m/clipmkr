# Закрытие чата — независимый QE

11.11.2026 SOURCE QE закрыт первым циклом из трёх: ревизия `0d68ce98b52d696404eb0b756f8d526b50a5ececa106355f35041d65418b4207`, nonce `04401310-5986-4728-ab26-91b233340736`, sequence2, eventDigest `414f6bd67efe040cbae37f8d126f9a9017675bc8b9d36c62704a69e335272516`. Использован настоящий закреплённый `dz qe-rounds --source native`: prepare до независимого ревью, evaluate после него. Все9 подготовленных SHA совпали до и после проверок. Runtime этим отчётом не подтверждён.

Автор `gpt-6.1-sol high`; независимый `gpt-6-astra xhigh`, новая сессия `/root/support_close_source_review`, только нормативные документы на входе. Проверяющий самостоятельно нашёл код и тесты. Подтверждённых замечаний нет, own receipt `qe-primary/owner-exception/clean`; временный cross-model режим разрешён владельцем. Подробный отчёт и исходные логи приватны в `/root/.config/clipmkr/support-chat-close-20261111/source-qe/`.

## Результат

Нативный `hide()` вызывается до logout и удаления родительских controls. Ordinary close по-прежнему выполняет hide-only: повторное открытие не получает дополнительного logout от этого исправления. При missing/throwing hide существующая очистка identity всё равно выполняется; старый недоступный SDK не объявляется исправным. Origin/epoch/consent/account guards сохранены. Изменено одно существующее тело helper, новых UI, API, зависимостей или серверных моделей нет.

## Независимые проверки

| Команда / контроль | Наблюдение |
|---|---|
| `node node_modules/vitest/vitest.mjs run --config vitest.config.ts tests/support-widget-ui.test.ts tests/support-ui.test.ts` |23/23, exit0,0,964с |
| `node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts tests/browser/support-chat-closure.test.ts` |8/8, exit0,5,63с;1440/390, реальный React и отдельный cross-origin iframe |
| Тот же focus-контроль на helper из actual baseline717b55d | Два ожидаемых behavioral RED,6 намеренно не выбраны; не syntax/load failure |
| Private supplementary probes настоящих helper/SupportPanel |6/6: draft DOM после ordinary close/reopen, Enter, close-error/retry, hide-error→logout/destroy/refused reopen |
| Focused strict `tsc --noEmit` по трём support tests |exit0 |
| `git diff --check` и сравнение prepared manifest |exit0;9/9 SHA прежние |

Автор отдельно получил23 unit/8 browser PASS после6 behavioral RED на baseline; эти результаты не подменяют перечисленное независимое исполнение. Все процессы дождались terminal result, локальные HTTP/Vite/browser закрыты. Общий прогон и полный build не повторялись ради пятистрочного lifecycle diff; образ для поставки ещё собирается отдельно.

## Code/spec anti-drift и ограничения

FR-1…5 и план покрыты. Старые review-pending формулировки нормативных01/06 сохраняют исходную историю и уточнены настоящим `owner-authority.md`; текущее независимое закрытие записано здесь. OpenSpec task checkboxes синхронизируются после поставки, а не изменяются внутри принятого snapshot.

Синтетическое сохранение draft/history DOM не доказывает серверную историю Libredesk. Реальная JWT-привязка, повторный вход, ответ оператора и изоляция A/B — отдельная операционная приёмка существующего support-access. Клавиша Escape внутри чужого iframe не перехватывается; проверен Escape родительского документа и доступная кнопка закрытия. Нет заявления о WCAG-сертификации или глобальном отзыве сеанса поставщика.
