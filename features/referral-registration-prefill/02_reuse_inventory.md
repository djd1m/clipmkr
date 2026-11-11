# Инвентаризация переиспользования и контрактов

База `74ea7a6bae354a1cf1fdaec1af01a957cd421137`; факты baseline прочитаны до source edits. Дополнено архитектором R2 после QCR-QUALITY-1/QCR-RISK-1/QCR-TEST-1; runtime остаётся без изменений.

## Канонический тракт

| Компонент | Переиспользование / граница |
|---|---|
| `apps/web/src/lib/partner-referral.ts` | `readReferral` проверяет единственность cookie, формат, HMAC/source/code/deadline и14d TTL. Это node:crypto server helper, не импортировать в client. `referralCookie` сохраняет first-touch и guest priority; не менять |
| `apps/web/src/server/partner-landing.ts` | `PartnerLandingService.find` — актуальный active-code/active-owner SELECT. Можно переиспользовать только lookup, не `createPartnerLandingHandler`/`recordView` для SSR |
| `apps/web/src/app/page.tsx` | Единственная SSR точка входа; сейчас только creditMode и requestTheme. `requestTheme` уже вызывает next/headers, поэтому нет нужды изобретать cookie endpoint |
| `apps/web/src/app/Landing.tsx` | Единственная обычная композиция AuthForm; прокинуть optional public display-code без второго funnel |
| `apps/web/src/app/AuthForm.tsx` | Existing busy/authenticated/retry/discard/next/signup и outcomes-v1. Сейчас details закрыт и input пуст. Только changed field формирует explicit; добавить различение autofill без изменения серверного source |
| `apps/web/src/server/partner.ts` | Baseline apply выбирает parsed.code??referral.code; совпадение с действительной cookie сохраняет source, без cookie {code} становится explicit. Сейчас Attribution не содержит public code. R2 добавляет только optional applied_code в результат метода: c.code из уже существующего locked SELECT при соответствии persisted partner_code_id. Общий Attribution/input/source/SQL mutation policy сохраняются |
| `apps/web/src/lib/rpc.ts`, `server/trpc.ts` | Обычный tRPC transport возвращает result data; generic RPC<T> не проверяет runtime shape. Нужен узкий понятный клиентский check пригодного результата, не переделка RPC |
| `apps/web/src/app/AuthFlow.tsx` | Existing in-memory provider/notice с created/existing и navigation lifecycle. Новый notice kind вместе с подтверждённым applied_code даёт обе строки макета; новой pipeline/storage нет, dismiss/inline placement сохраняется |
| `apps/web/src/app/globals.css` | public-entry tokens, fields min16px и min44px, auth-flow-notice inline. Узкие selectors для invitation hint и второй строки notice; не копировать research CSS/лендинг целиком |
| `PartnerService.dashboard`, `packages/db/src/blogger-report.ts` | Уже действующие blogger all-time и owner Moscow-month проекции. QCR-TEST-1: вызывать обе реальные функции на том же native fixture до/после нового signup; выбранный blogger/code+1, чужой unchanged, reread unchanged. Агрегаты/права/финансовые rows не менять |

`AuthForm` runtime consumer найден только в Landing; тестовый LEGACY_SOURCE изолирован и заморожен. `flow.showNotice` вызывается дважды в AuthForm; default context и showNotice type/implementation находятся в AuthFlow. AuthFlowNotice уже встроен в WorkspaceHeader и upgrade/return; эти места предполагается оставить без edits. Новый optional notice-флаг должен сохранить исходные TS-consumers и ordinary-login behavior.

## Минимальный diff после R2 архитектуры

7 application paths: новый `server/referral-prefill.ts`, существующие `server/partner.ts`, `app/page.tsx`, `app/Landing.tsx`, `app/AuthForm.tsx`, `app/AuthFlow.tsx`, `app/globals.css`. Новый readReferralPrefill переиспользует readReferral/find; partner-landing.ts остаётся неизменяемой dependency. Новый endpoint/таблица/общий DB type/дополнительный pool не нужны. K1 module/export прошёл в R1; R2 добавляет только поле уже существующего return, не новый export.

SSR validated-code→props; details initially open/input initial value. Отдельно отслеживается сознательное редактирование, чтобы untouched value не становилось explicit. Unedited input after submit / auth retry не перезаписывается эффектом props. Надпись autofill скрывается после ручного изменения; automatic success не зависит от наличия текста в поле.

Подтверждение результата: обе строки утверждённого макета требуют actual public code. Сокращённый notice без кода отклонён QCR-QUALITY-1/QCR-RISK-1. Аддитивный applied_code существующего apply получается из DB row, связанной с RETURNING attribution; после COMMIT нового I/O нет. Клиент использует только этот reply, не stale SSR/input. Старые consumers принимают прежние поля, null/error/envelope; canonical Attribution и source guards не меняются.

Advisory lookup добавляет DB I/O только valid-cookie странице: no-cookie/invalid-cookie short-circuit, known404→no display, resource-down→honest no display + fixed category log. Не читать/писать cookies в browser JS, не делать raw Cookie/header объект prop. Page должен остаться request-specific, без общего `cache()`/unstable_cache для invitation.

## Существующие тесты и реальное покрытие

| Anchor | Что уже проверяет / нужная дельта |
|---|---|
| `tests/partner-landing.test.ts`, новый `tests/referral-prefill.test.ts` | Существующий landing suite сохраняет redirect/first-touch/guest/404/rate guards. Новый helper suite проверяет signature/TTL/no-cookie/no-view/resource-down без изменения старого файла |
| `tests/partner.test.ts` | provenance, invalid explicit no fallback, signature/TTL/duplicate, guest, self/replacement. Без изменения файла ожидается regression run |
| `tests/partner-route.test.ts` | apply HTTP/status/identity. Без изменения server endpoint — regression run |
| `tests/browser/public-entry-cabinet.test.ts` | Actual Landing/AuthForm/AuthFlow через Vite, управляемый HTTP transport; mode switching, input draft, busy/retry, notices/a11y. Добавить optional referral prop fixture и DOM/payload/result oracles; controlled transport не выдавать за nativeE2E |
| `tests/browser/repeat-registration-next.test.ts` | Built real Next+HTTPS+native jar+PG/Redis, Chromium/WebKit; existing snapshots, ordinary login и legacy. Сейчас helper context заранее сеет cookieC, что не доказывает настоящий `/r` path. Новому варианту нужен **чистый** context без seeded referral; прежний default оставить для прежних тестов |
| `tests/browser/repeat-registration-next.test.ts` `fill` | Сейчас всегда кликает summary перед manual-code. При новом open-default click закроет details: адаптировать helper только «раскрыть если закрыт», не убирать visibility/input oracle |

Ожидаемые3 test-file edits: новый tests/referral-prefill.test.ts и два существующих browser suites → всего10 runtime/test targets. Native suite дополнительно проверяет HTTP applied_code↔PG JOIN↔notice и обе canonical projections. Existing partner unit/integration/mutation scripts вне этих paths запускаются по риску; их исходники не меняются. `vitest.config.ts` включает `tests/**/*.test.ts` с исключением browser, `vitest.browser.config.ts` включает `tests/browser/**/*.test.ts`; новые cases будут собраны теми же командами. Baseline test count не приводится как результат текущей ревизии.

## Pinned SHA, source guards и mutation anchors

Сохранить `tests/browser/repeat-registration-next.test.ts` inline LEGACY_SOURCE c source-commit `c97515db90e704b44da0644c9ac92a8cd22e6343` и `LEGACY_SHA256=6b97da09ffc9c34dda5bcd814a188f964979fc75499e3518fbe93a3b6e9d2a77`. Это исторический old-client oracle, его нельзя перегенерировать по новому AuthForm.

Не менять frozen `docs/Specification.md` SHA `3ac09f3dcccc354f292ac0ed0452de0e7f14f8bafd68b6f8e54354e303407532`. Новый user-facing delta хранится OpenSpec; существующие `docs/Specification-addendum.md` и `docs/test-scenarios.md` дополняются отдельно после implementation proof, без переписывания исторических pins.

Сохранить существующие assertions safeNext/outcomes/signup counts, source fairness, auth-notice geometry including former floating-style falsifier, font16px/min44px и no external requests. `scripts/lint.mjs` ограничивает TS/TSX≤500lines, запрещает explicit any; текущие9 targets имеют запас, test source must not grow beyond gate. Новые critical mutations — valid signature/activity bypass, untouched→explicit, false green(null/rejected), SSR recordView — только временные isolated mutants на стабильном source snapshot и named targeted tests; прежние guards не снижать.

Новых maintained OSS компонентов не требуется: весь requested seam находится в существующем Next/React/PG/Playwright стеке. Предшествующее исследование `docs/research/referral-registration-ux/` и owner approval переиспользуются, новый UI approval не запрашивается для того же target.
