# Проверка автоматической ссылки блогера

05.11.2026. Статус: независимый source QE закрыт после исправлений; публикация и приёмка настоящего HTTPS выполняются отдельно ниже.

## Граница и исходные документы

M, requirements-first feature-adr; одобренный HTML из 18e4fa98e72fd8bdc84287d6c7495b4e3410b907. OpenSpec `openspec/changes/blogger-auto-link/specs/blogger-referral/spec.md`, SHA-256 `320ac1ea73b4ef2bfba6240c374522bc55f9eeebe1cd930f6b87971a09ad4eb0`. План и требования не расширялись до общего упрощения интерфейса. Владелец отдельно разрешил публикацию автоссылки на clipmkr.ru, а перенос на Cloud.ru отменил.

## Артефакты и проверки автора

Авторская сессия: requested gpt-6.1-sol high; отдельная runtime-аттестация модели недоступна. Шесть production-файлов, три тестовых; исходная база24b4b4a. Source-set SHA-256 `093cf6737a4fa94920c7a4a9c6eb077629acab18dd34a80c23d5ca2c088cba50`. Координатор сверил все девять текущих source hashes и SHA-256 журналов с handoff: совпали. Чтение журналов не заменяет независимое QE.

| Требования | Риск / сценарии | Наблюдаемые результаты | Ограничение |
|---|---|---|---|
| FR-3/4/5/7 | PG concurrency20, role/erasure lock barriers, earliest blocked, rollback, сохранение payment/attribution | Scoped93/93, exit0 | Изолированные схемы существующего PG16 |
| FR-4/6/7 | Реальный HTTP adapter, strict empty input, auth/origin/method/rate/error | В том же scoped наборе | Не публичный deploy |
| FR-1/2/3/5/6/7 | React→HTTP→PG, первые открытия/повтор/копирование/две auth-сессии/blocked campaigns | Chromium+WebKit14/14, exit0 | Harness собирает композицию; actual Next проверяется отдельно |
| NFR | 320/390/1440, темы/виды, text200%, uploader DOM/File/progress | Browser14/14 и сохранённые кадры | Не сертификат доступности; screenreader/hardware Safari не проверены |
| ADR-001 | Пять целевых falsifiers: blogger guard/earliest blocked/client mode/expanded blocked/ownership | Каждый mutant exit1; source hashes восстановлены; named server2/browser6 GREEN | Не полный mutation score |
| Регрессия | Существующий npm test | 1543 PASS,15 SKIP | S3_ENDPOINT не задан:15 S3-зависимых тестов НЕ ВЫПОЛНЕНЫ; полный S3-regression не считается успешным |
| Сборка | typecheck/test typecheck/lint/build/diff-check | exit0, журналы с проверенными SHA | Образ и публичный стенд проверяются при поставке |

Авторский legacy responsive launcher завершился exit2 после ошибочного создания временного контейнера; автор остановил свой контейнер. Этот запуск НЕ PASS. Дальнейшие проверки используют нативные браузеры и существующие БД/Redis; новые тестовые контейнеры не разрешены.

## Расширенный QE

Применяется studio-extended-qe в reference-only режиме: risk/test-design на требованиях, contract/security для POST/ownership, regression/accessibility для карточки, bounded resilience для таймаута/abort, mutation для guards. AQE runtime не установлен, примеры FleetManager не выполнялись. Полная продуктовая приёмка90/120мин и оплаты этой ограниченной фичей не закрывается.

## Code/spec anti-drift

FR-1/2 → personal PartnerPanel, Dashboard и scoped CSS: компактная карточка, готовый URL, copy/manual fallback, mobile порядок. FR-3/5 → существующий ensurePartnerCode, account/code locks и earliest identity без обхода blocked; фильтр статистики отделён от DTO личной ссылки. FR-4/7 → strict POST, session account и серверный active-blogger guard, без mint у обычного пользователя/SSR. FR-6 → явные loading/error/retry с deadline и cleanup. ADR-001 → переиспользованы текущие генератор/HTTP adapter/компоненты; новых dependency/schema/env/generator нет. Привязанный OpenSpec hash совпадает. Независимая проверка и actual Next browser acceptance ещё ожидаются.

## Независимый контроль и поставка

Fresh reviewer requested gpt-6-astra xhigh, session01a1aca3-b1ee-7982-bf5e-71aa9280b9fe. Сначала только согласованные docs, затем самостоятельно исходники и тесты; авторские отчёты не переданы как начальное доказательство. Source QE host prepared revision `267e3dda26362903d497852cf0bc3aa2c8d165912450689a5db61c6545441865`; closure пока не получен.

Публикация разрешена только после реального независимого closure. Цель: https://clipmkr.ru на194.85.249.105, web-only с сохранением current config/mail/env/БД/клипов и всех остальных контейнеров. Инструкция ручной проверки и фактические результаты добавляются после исполнения. Cloud.ru не обновляется по последнему указанию владельца.

## Реальный repair и независимое source closure

Первоначальный независимый review выявил QE-BAL-01/02 HIGH и QE-BAL-03 WARNING. Root evaluate действительно unresolved; условия не удалены и не заменены положительным пересказом. Sol исправил только PartnerPanel/CSS и расширил browser tests: native selection нажатого URL, один внутренний столбец personal studio без перемонтирования, readonly font>=16px. Остальные runtime targets исходной реализации не менялись.

Текущий source-set `ef2c9b3c3e13ddf25b1e3cb2057f98e6aa2df177764cf8e187025856a0113ec5`;9/9 hashes авторского handoff координатор сверил с текущими байтами, все записанные log SHA также совпали. Новые reproducer6RED →20browserPASS в двух движках; отдельно2усиленных File identity/complete cases,6выбранных UI cases,51unit, typecheck/lint/build/diff exit0. Первоначальные1543PASS/15S3SKIP относятся к первому source-срезу, не выдаются за новый полный прогон после repair.

Originating Astra xhigh самостоятельно повторил16focused tests в2движках (31deselected не PASS), typecheck/diff exit0; author tests не заменяли его evidence. CTA bottom689.42/689.34px<=768, правильный URL во всех4clipboard combinations,16px и200%reflow, настоящий File/DOM и завершение задержанной передачи подтверждены. Все3исходных immutable conditions получили собственные structural verifications на новой revision. Подробности `reviews/qe-primary.md`.

Root pinned plain evaluate exit0 closed: `eafecbe9c54dff47fed7aa423a7ed398594560c94da61f97585303058bd39c79`, unresolved[]. Все75manifest hashes сохранены; actualauthor risk assessment проверена originating reviewer. Поддерживаемый code checkpoint на новомsource-set реально принят. Оценка координатора A относится к scoped source-feature; независимый вердикт — clean, буквенная оценка ему не приписана. ActualNext/публичная приёмка ещё не заявлены.

Anti-drift: FR-1/2/3/5/6/7 и NFR сохранены;03/05/06/OpenSpec approved смыслы не менялись. Исправления восстановили исходный контракт, нового UI/провайдера/данных/ролей/env не вводили. Полное общее UX-упрощение/90/120/оплата остаются отдельными задачами. Cloud.ru не обновляется по последнему указанию владельца.

Поддерживаемая запись QE ledger реально завершилась exit0: `{"ok":true,"kind":"ledger","stage":"qe","verdict":"written","exit":0,"reason":"appended and verified by re-reading the tail","blocking":false,"target":"/home/clipmkr/.dz/feature-adr/run-cost-ledger.jsonl"}`. Перед QE checkpoint повторный project recall прочитан: nested qe/report binding и genuine originating verification обязательны.

QE checkpoint действительно принят exit0; повторный evaluate подтвердил closed и checkpointClosure digest `fcbb0a4e3343595c241ecc75e7074b137248d4a56764134596a05c67223fe8f3`. Поставка пока не выполнялась.
