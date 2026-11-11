# Авторская проверка реализации перед независимым SOURCE/QE

11.11.2026. Автор `gpt-6.1-sol high`; база `74ea7a6bae354a1cf1fdaec1af01a957cd421137`, branch `feat/referral-registration-20261111`. **Это авторские результаты, не independent QE и не разрешение выкладки.** Root выполняет SOURCE/QE, процессные записи, commit/merge/push и поставку.

## Допуск и снимок

Перед первым source edit заново исполнен установленный `check-code-targets.mjs --repo /tmp/clipmkr-referral-registration-impl-20261111 --feature features/referral-registration-prefill`: exit0, admitted, digest `f0063b3a376403c918d43e53d63d43222f807b6f52bfa7aa86b47d9e0a3af485`. Ранее root реально закрыл originating ideation R2 и выполнил K1/K2/6 supported checkpoints, затем дал явный ROOTGO. Наличие старых DRAFT-фраз не подменяло эти позднейшие actual receipts.

Финальный sourceSet `7e72ce272e165e3c1689f0ff1fa4edfe5a9521bbfa6c15541205a04058ea5ca9`,10 editable source/test paths; hashes в `07_code_changes/change_manifest.md`.12 semantic dependencies не менялись. Build, core и component проверяли те же финальные application bytes; после первого frozen run менялся только native test fixture. Это проверено сравнением всех10 hashes, а не предположено по git HEAD. Коммит ещё не создавался.

## Исполненные команды и наблюдения

Команды запускались из текущего WT с Node22.23.4, project-pinned установленными зависимостями. Приватный runner передавал synthetic environment и выделенные PG `*_test`/Redis14, не выводя секреты. Исходники во время каждого прогона не менялись. Дополнительные повторы ниже были только по затронутому участку после реально найденных отказов.

| Команда / проверка | Терминальный результат | Ограничение |
|---|---|---|
| `npm test -- tests/referral-prefill.test.ts tests/partner-landing.test.ts tests/partner.test.ts tests/partner.integration.test.ts tests/partner-route.test.ts tests/auth.test.ts` | exit0,6files/91tests PASS,25.725s | Реальный PG integration включён; это выбранный scope, не весь продукт |
| `npm run build` | exit0,56.199s; новый Next/preflight build в данном WT | Сохранилось warning об optional `@valkey/valkey-glide` из BullMQ; сборка завершилась, этот пакет/код не менялся |
| `npm run typecheck` после исправления installed dependency context | exit0,44.349s | Первоначальный старый canonical-dist context был неуспешен и сохранён отдельно |
| `npm test -- --config vitest.browser.config.ts tests/browser/public-entry-cabinet.test.ts tests/browser/repeat-registration-next.test.ts` | component file50tests PASS; общий первый aggregate exit1,6 новых native FAIL,62PASS,132.522s | Этот aggregate не объявляется green: причины fixture/oracle раскрыты ниже |
| `npm test -- --config vitest.browser.config.ts tests/browser/repeat-registration-next.test.ts` после первого test-only repair | exit1,12PASS/6FAIL,75.733s | Вновь наблюдаемый SecurityError не проигнорирован; исправлена его test instrumentation причина |
| Та же native-команда после top-frame repair | exit0,18/18 PASS,83.305s; Chromium и WebKit | Свежий built Next + native HTTPS cookie jar + PG/Redis; без production записей/видео/платежей |
| `node node_modules/typescript/bin/tsc --noEmit -p tests/tsconfig.json` на final fixture | exit0,18.272s | Повторён затронутый tests compile; полный приложения typecheck уже проверял неизменившиеся application bytes |
| `npm run lint` на final fixture | exit0 | Повторён после test-only edits; явный any/line caps/source rules не ослаблялись |
| `git diff --check` | exit0 | Не является проверкой поведения |

Полный финальный затронутый набор подтверждён отдельными terminal evidence:91 backend,50 component и18 native. Единого повторного общего green aggregate не заявляем; полный продуктовый hundreds-test run не запускался, поскольку source/риски не расширились. Native repeats имеют конкретную причину ниже. Все владельческие test sessions завершены; после финального native прогона3449/3450 не слушаются, `repeat_next_%` schemas в изолированной БД осталось0.

## Native oracle: что доказано

- Настоящий clean `/r` выдаёт HttpOnly/Secure cookie; SSR показывает раскрытое editable поле; для регистрации достаточно email/password, apply payload `{}`. A→B first-touch и guest priority сохраняются.
- При SSR A и актуальной cookie B либо manual B реальный HTTP `applied_code`, PG JOIN attribution→partner_code и обе строки notice показывают B. После удаления cookie без ручного ввода apply `{}` возвращает null, атрибуции и ложного applied notice нет.
- SSR refresh не добавляет link_view. A/clean/B request isolation, HttpOnly visibility, отсутствие raw cookie/secret в HTML, blocked code/inactive owner и временно недоступный display lookup проверены настоящим Next/PG.
- На том же `/r → email/password → apply` обе канонические проекции (`PartnerService.dashboard` и `bloggerReport`) дают chosen registrations+1, foreign0 и повторное чтение без изменения. Owner month берётся из сохранённого created_at по Europe/Moscow; all-time dashboard не переопределялся.
- Прежние existing snapshots/apply0/signup0/trial, ordinary login apply1, legacy source SHA, cookie/reload/recovery/next и inline-notice geometry сохраняются. Actual native screenshots390dark/1440light и notice получены в обоих браузерах; personal production data отсутствуют.

## Отказы фикстуры и их действительная причина

1. Новый assert `external=[]` противоречил baseline: fixture намеренно включает analytics consent/counter и abort-ит SDK запросы `mc.yandex.ru`. Бизнесовые DB/reply/UI assertions до него проходили. Новый oracle исправлен: весь внешний transport по-прежнему abort, известные **заблокированные попытки** SDK не выдаются за реальный egress, неожиданные hosts запрещены. Нулевое число попыток запросов не заявляется.
2. Новый pageerror oracle обнаружил прежний `addInitScript`, обращавшийся к localStorage также внутри sandbox SDK iframe без allow-same-origin. Минимальный независимый Chromium/WebKit counterexample воспроизвёл SecurityError в старом варианте и0errors после `window !== window.top` guard, сохранив positive top-document storage. Исправлен только тестовый script; ошибки приложения не фильтруются/не игнорируются. Финальные18native PASS проверяют и signup positive instrumentation.

Application bytes не менялись из-за этих отказов, поэтому rebuild/core/component не повторялись; затронутый shared native fixture проверен целиком, tests TS/lint повторены. Результаты и неуспешные raw logs сохранены, а не перезаписаны последним green.

## Discrimination и границы доказательства

Три мутации запускались в отдельной временной source-копии, без изменения проверяемого WT: untouched autofill стал explicit; status200/rejected позволил false green; final code взят из SSR вместо reply. Каждая named component acceptance реально RED(exit1) на mutant и GREEN(exit0) после восстановления. Это3 подтверждённых guard falsifiers, **не mutation score всего продукта**. Остальные tests под `-t` были отфильтрованы и не считаются пройденными этим прогоном. Полные50component отдельно выполнены.

`referral apply confirmation omits unbound code` управляет transaction result для mismatch/rejected/self и подтверждает response guard; он не называется SQL proof. Реальное соответствие COMMIT/PG/HTTP отдельно покрыто native тестом. Первоначальный helper RED был import/collect отказом отсутствующего нового модуля; он не выдаётся за выполненный behavioural assertion.

## Артефакты и дальнейшая граница

Raw logs, terminal result JSON, fixture counterexample, mutation6results, source-freeze manifests и synthetic screenshots находятся в закрытом run directory `/root/.config/clipmkr/referral-registration-impl-20261111/`. Профиль оставлен без изменений, чужие процессы/worktrees/runtime не затронуты. В Git не добавлялись `.dz`, `.fa-state`, secrets или private artifacts.

Нормативные R2 требования/ADR/OpenSpec реализованы без расширения first-touch/404/source policy. Старые author-design notes — исторический draft; нормативный R2 сохраняет обе строки и additive applied_code. OpenSpec task statuses и final addendum/test-scenarios/dz trace дополняет root после independent review, не меняя frozen Specification/SHA. Code-critic и independent cross-model SOURCE/QE ещё предстоят в свежей сессии; авторское чтение/самопроверка их не заменяют. Выпуск, ручная приёмка, Cloud.ru/DNS и реальные signup/payments не выполнялись.
