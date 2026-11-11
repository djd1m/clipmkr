# ADR-001: Показывать проверенное приглашение без изменения серверного происхождения

Исторический черновик автора до архитектуры. Не нормативный ADR: единственное актуальное решение — `03_adr/001-preserve-referral-authority.md`. R2 после QCSD отклонил сокращённый notice без кода: актуальные01/ADR/05/06 требуют обе строки макета и applied_code из подтверждённой persisted attribution. Старый текст ниже сохраняется как история варианта, не руководство реализации.

## Status

proposed — черновик фактов/вариантов автора для отдельного Astra architect. Не является завершённым step3 и не разрешает coding. Решение обратимо до выпуска; пересмотреть при изменении canonical attribution API/source policy. Требования: FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-2.

## Context

`/r/:code` сохраняет подписанную HttpOnly-cookie и302 на `/`, но Page/Landing не передают invitation в AuthForm. Details закрыт и поле пусто; человек копирует код из URL. Backend fallback может при этом работать правильно. Владелец согласовал конкретный autofill UI HTML040a988b…; source policy, 404 и финансовый учёт не меняются.

Текущий `PartnerService.apply` назначает source по **текущей действительной** cookie: при равном code сохраняет cookie/guest source, иначе любой явный code получает explicit. Следовательно, простая установка defaultValue создаёт provenance race, если cookie исчезнет между SSR и submit. Result содержит Attribution без публичного code. AuthFlowProvider/Notice уже несёт created/existing состояние до безопасной навигации и inline показа.

## Decision Drivers

1. Сохранение серверной attribution и исторической политики — high.
2. Ноль ручного копирования и согласованный вид поля — high.
3. Успех только по пригодному server result — high.
4. Минимальный diff/единый auth flow/доступность формы — medium.

## Considered Options

### A. SSR validated display-code и существующая форма/RPC/notice

Pros: HttpOnly сохранён; текущие active lookup, source и notice переиспользуются; нет нового endpoint/DDL. Cons: advisory DBread на valid-cookie render; нужно различать auto/manual и корректно переживать lookup failure/expiry. Подтверждение конкретной строки code невозможно вывести из stale SSR props.

### B. Оставить backend fallback, показать только общий текст без заполненного поля

Pros: меньше source edits, нет риска отправки autofill как explicit. Cons: не выполняет прямое требование раскрытого заполненного поля и не показывает эффективный source пользователю.

### C. Отдельный клиентский API для invitation и новый post-auth flow

Pros: можно отдельно обновлять display после гидратации. Cons: новый endpoint/transport/lifecycle, позднее появление кода, дополнительные failure/race states; повторная pipeline при уже существующем SSR и AuthFlow. Чтение HttpOnly через browser JS не является допустимым вариантом.

## Proposed Decision

Выбрать A. Server-only helper в существующем `server/partner-landing.ts` использует `readReferral` и `PartnerLandingService.find` без `recordView`. Он возвращает только публичный code или отсутствие display после проверки подписи/TTL/active state. Page читает текущий header на сервере и прокидывает optional string через Landing в AuthForm. Персонализированный render не кэшируется между запросами.

AuthForm показывает approved invitation notice и initially open/editable field. Неизменённое авто-значение использует `{}`; сознательный ручной непустой ввод — `{code}`; пустой input сохраняет fallback и не означает discard. Серверная проверка source/replacement остаётся в `PartnerService.apply`.

Created notice расширяется только сведением о пригодном результате apply. Подтверждать applied можно по server result со статусом pending/activated и непустой принадлежностью; null/rejected/skip/discard/error не дают green. Без расширения API финальный notice безопасно содержит утверждённый текст «Аккаунт создан. Приглашение применено» **без строки недоказанного кода**. Existing skip и ordinary login сохраняют разные старые ветки.

Имена нового helper/optional props/notice field, точный runtime result-check и DB-failure handling утверждает architect, затем K1. Текущий документ не навязывает новый API/exports до архитектурного решения.

## Rationale

D1: `{}` оставляет актуальную cookie единственным доказательством пассивного source; stale display не повышает приоритет. D2: пользователь видит effective code сразу и может его изменить. D3: существующий notice получает доказанный результат, а не выводит success из HTTP200. D4:6 application files и3 current test suites вместо нового funnel/пакета/таблицы.

B отвергнут несмотря на малый diff: прямое visible-field требование остаётся невыполненным. C отвергнут несмотря на возможную позднюю актуализацию: такая новая архитектура не требуется для bounded seam и увеличивает состояние.

## Consequences

Positive: выполняется approved путь; backend provenance и текущие auth/retry guards сохраняются; не растёт статистика при SSR.

Accepted downside: valid-cookie SSR требует дополнительного active lookup. Mitigation: no-cookie/invalid short-circuit, advisory failure без verified code/green, фиксированный безопасный log и resource-down negative test. Между display и submit состояние может измениться; final apply остаётся авторитетным. Исследовательская вторичная строка с кодом в кабинете не должна ложно подтверждать stale string; отдельное API-расширение не требуется.

Follow-up ADRs: сейчас не требуются. При желании сменить first-touch на last-touch или отдать applied-code в API — отдельная задача/решение.

After-action review: owner root/владелец; через месяц после фактического выпуска либо при первом подтверждённом обращении о неверной attribution. Выпуск ещё не выполнен.

## Confirmation — предлагаемые проверки для architect

Method: existing unit/component fixtures и real built Next+HTTPS+native jar+PG. Monitoring: текущее growth/attribution представление + fixed display-check failure category, без новой telemetry подсистемы. Success metric: все named critical сценарии выполняются;0 false applied confirmations,0 SSR-created views и0 leaked secrets. Owner: автор реализации и независимый SOURCE/QE reviewer.

Load-bearing properties: untouched autofill не становится explicit после expiry; server success не выводится из null/rejected; SSR не пишет view; existing skip preserved.

Required automated checks (будущие, не объявляются исполненными): `tests/partner-landing.test.ts` — проверка signature/TTL/active lookup, no-view и resource-down. `tests/browser/public-entry-cabinet.test.ts` — open editable prefill/manual payload/result status + notice. `tests/browser/repeat-registration-next.test.ts` — настоящий clean `/r` journey, PG source, notice, A→B/guest/cache/expiry и прежний existing/login oracle. Конкретные названия назначаются final планировщиком; заменить эти описания named tests перед step3 checkpoint.

## Shift-left questions — вход архитектору и QCSD

- DB lookup недоступен: общая форма доступна без непроверенного display; fixed safe log. Это advisory read, auth/apply failure остаются прежними.
- Другая вкладка заменила cookie между SSR и submit: unedited submit `{}` применяет актуальную server policy, не old prop; final message не утверждает stale code.
- Cookie malformed/expired/duplicate: parser short-circuit до DB; no display/green.
- Unit isolation доступна через canonical `find` dependency; критический сквозной oracle требует real Next/HTTPS/PG, а не два разделённых mock tests.
- BDD: Given valid invitation rendered, When cookie removed before submit and code untouched, Then apply receives{} and final notice does not claim invitation applied on null result.

Risk: HIGH по provenance/false-success без названных проверок; mitigations обязательны в final plan и independent QCSD. Этот draft не выдаёт mitigations за выполненные и не закрывает step3.
