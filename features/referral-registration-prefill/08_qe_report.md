# SOURCE/QE регистрации по приглашению

11.11.2026. **Источник принят, оценка A.** На момент закрытия SOURCE выкладка ещё не была выполнена; последующая фактическая поставка описана отдельно в [09_delivery.md](09_delivery.md). Публичное поле заполнено и раскрыто по действительной ссылке; неизменённое значение не становится ручным источником; итоговый код берётся из подтверждённого серверного результата.

## Исполнители и фиксированный снимок

Автор — `gpt-6.1-sol high`. Архитектор/планировщик — отдельный `gpt-6-astra xhigh`. Три предкодовые роли QCSD — отдельные `gpt-6.1-terra xhigh`; их исходные условия и focused verification описаны в `03.5_ideation_report.md`.

Независимый SOURCE reviewer — свежая сессия `/root/referral_prefill_source_review`, `gpt-6-astra xhigh`, `fork_turns=none`, family `owner-exception` по разрешению владельца. Сначала только требования/ADR/архитектура/план и политики; код найден самостоятельно после заморозки. Авторские результаты прочитаны после собственного изучения и прогонов. Применены code-critic и закреплённые security/risk/regression/mutation протоколы; AQE runtime не запускался.

Финальный author sourceSet: `7e72ce272e165e3c1689f0ff1fa4edfe5a9521bbfa6c15541205a04058ea5ca9`. Native SOURCE revision: `55c52ded3e64633856d460df334330ccf56f8eeae2e6d8a17f5b39478d572deb`; nonce `a87a56ea-6de6-46a6-b221-ace0bb7b9dc3`. Все31 измеренный SHA совпали до/после независимых проверок. Изменены7 application и3 test файла;12 семантических зависимостей сохранены. Не менялись packages, DDL, конфигурация, source/replacement policy или финансовые записи.

## Реальные проверки

| Проверка | Автор | Независимый reviewer |
|---|---|---|
| Шесть затронутых backend-файлов, включая настоящий PG | 91/91, exit0 | 91/91, exit0;22.96с;35 PG-тестов включены |
| Реальные компоненты и Next/HTTPS/PG в Chromium/WebKit | 50 component +18 native, exit0 | 68/68, exit0;133.45с |
| Build / typecheck / lint / diff-check | exit0 | Свежая сборка именно этого WT и raw результаты проверены; diff-check повторён, exit0 |
| Различающие мутации | 3 assertion RED→GREEN | 4 assertion RED→GREEN в отдельном scratch |
| Дополнительный HTML/RSC privacy/cache probe | Не приписан автору | 1 выбранный сценарий, exit0,7.20с;18 остальных явно excluded |

Основной независимый набор —159/159 без skip. Отдельный probe не называется повторным прохождением всех18 native tests. Направленные мутации ловят untouched→explicit, ложный успех по truthy response, stale SSR вместо реального итогового кода и отсутствие связи RETURNING partner_code_id с выбранной DB-строкой. Восстановление scratch-файлов проверено побайтно.

Исполненные основные команды: `npm test -- tests/referral-prefill.test.ts tests/partner-landing.test.ts tests/partner.test.ts tests/partner.integration.test.ts tests/partner-route.test.ts tests/auth.test.ts`; `npm test -- --config vitest.browser.config.ts tests/browser/public-entry-cabinet.test.ts tests/browser/repeat-registration-next.test.ts`. Только изолированный PG с суффиксом `_test`, Redis `/14`, собственные синтетические аккаунты. Production-регистраций, оплат или S3-запросов этим QE не было. Все процессы завершены, source не редактировался во время прогонов.

Первоначальные авторские native запуски имели два отказа тестового инструмента: ожидаемые заблокированные Metrika attempts ошибочно считались внешним выходом; initScript без top-frame guard обращался к localStorage sandboxed iframe. Исходы сохранены, не названы PASS. Исправлены только fixture/oracle, application bytes остались прежними; повторены затронутые native/TS проверки. Для зависимостей использован уже установленный matching tree с тождественными packages/lock; обновления зависимостей не делались.

## Трассировка и anti-drift

- FR1/FR5: настоящий `/r` даёт HttpOnly cookie; SSR показывает только проверенный публичный код, не записывает лишние views, не раскрывает cookie/secret/owner UUID. Invalid/no-cookie не вызывают display lookup.
- FR2: untouched и пустое ручное значение отправляют `{}`, sticky edit — `{code}`; first-touch/guest priority/explicit policy сохранены. Expiry не повышает источник.
- FR3: реальный HTTP `applied_code` совпадает с PG JOIN и двумя строками notice; SSR A→фактическая B, null/rejected/missing-code и mismatch проверены. После COMMIT нет нового I/O. Одна реальная регистрация отражается ровно +1 в обеих канонических проекциях; чужой блогер и повторное чтение неизменны.
- FR4: legacy snapshot/SHA, existing apply0/signup0, trial/атрибуция, обычный login apply1, recovery/safe-next и двойной клик сохранены.
- NFR1: реальный HTML/RSC A→clean→B→A, no-store, отказ lookup и отсутствие секретов. NFR2:390/1440, обе темы, keyboard,44px/16px, без overflow и app JS errors; собственные screenshots reviewer просмотрены.

## Настоящее закрытие gate

`npm --silent run dz -- qe-rounds --slug referral-registration-prefill --source native --action evaluate --project /tmp/clipmkr-referral-registration-impl-20261111 --json` действительно завершился exit0: `closed`, unresolved/reasons пусты, **1 из3 циклов**, sequence3, eventDigest `29fd9563e540de47f2387cab892a286b61490ae0dc9e7b70abece37500aef017`. Собственную clean receipt написал reviewer; root не создавал его оценку. Контрольные checkpoints получены поддерживаемым `feature-adr-checkpoint` после фактических артефактов/gates. Неверный первоначальный feature-relative artifact path отказал и сохранён; успешный исправленный вызов не подменяет этот отказ.

Полные raw команды, исходы и независимый отчёт находятся в закрытом каталоге выполнения. Этот отчёт удостоверяет SOURCE-снимок, а не публикацию: после commit/build нужны отдельные runtime admission, свежая резервная копия, поставка и живой контроль. Cloud.ru/DNS этим не разрешены.
