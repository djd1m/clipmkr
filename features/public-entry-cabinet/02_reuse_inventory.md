# Инвентаризация переиспользования

05.11.2026, базовый commit `bb178c42cb570103e40cf10f8bad37d73128a0d9`.
Исследование — чтение существующих исходников/тестов, не утверждение об их свежем прохождении.

| Действующий блок | Решение и граница |
|---|---|
| `apps/web/src/app/Landing.tsx`, `LandingCta.tsx` | Изменить композицию/CTA согласно HTML; сохранить реальные компоненты, SSR markup для browser fixtures |
| `apps/web/src/app/AuthForm.tsx` | Изменить представление и выбор режима; сохранить реальный submit, signedIn retry, pendingRegistration, `code.apply`, discard_referral, observeSignup, clearSupportIdentity, afterLogin |
| `apps/web/src/lib/payment-return.ts` | Не менять: `safeNextPath` разрешает только точные `/upgrade?from=…` и `/upgrade/return?intent=UUID`; остальное dashboard |
| `apps/web/src/app/ThemeToggle.tsx`, `lib/workspace-layout.ts`, `lib/theme.ts`, `app/theme-server.ts` | Переиспользовать canonical document preferences и `n5_theme`; optional text label для публичной шапки, прежний default для кабинета |
| `apps/web/src/app/globals.css` | Scope публичного shell и существующие `--workspace-*`; без нового CSS файла/глобальной перекраски legacy screens |
| `apps/web/src/app/LandingDemo.tsx`, `packages/shared/src/showcase.ts` | Переиспользовать без замены на иллюстрацию; controls/playsinline/preload/route и реальные caption сохранены |
| `apps/web/src/app/layout.tsx` и `SupportLauncher` | Один общий legal footer/support; внешний вид публичной страницы изолировать CSS, не дублировать навигацию |
| `apps/web/src/app/forgot/page.tsx`, `support/page.tsx`, `legal/terms/page.tsx`, `legal/privacy/page.tsx` | Настоящие ссылки на существующие страницы; offline-dialog не переносится |
| `apps/web/src/app/page.tsx` | Существующие `requestTheme()` и `billingMode==='credits_v1'`; не вводить параллельное чтение config |
| `tests/browser/responsive-check.test.ts`, `tests/responsive-check.test.ts`, `scripts/responsive/rules.mjs` | Актуализировать только `/` supersession: CTA виден desktop/mobile, demo после формы на mobile; все остальные guards сохранить |

Существующего Clipmkr достаточно. Новое извлечение auth/theme из проектов 1–8 не требуется:
работающие native реализации уже найдены здесь. Поддерживаемые имеющиеся React/Next/native form
controls и Playwright/Vitest используются без новых OSS dependencies. Новая UI/auth abstraction не нужна.

## Ожидаемые targets реализации и тестов — 11
1. `apps/web/src/app/Landing.tsx`
2. `apps/web/src/app/LandingCta.tsx`
3. `apps/web/src/app/AuthForm.tsx`
4. `apps/web/src/app/ThemeToggle.tsx`
5. `apps/web/src/app/globals.css`
6. `scripts/responsive/rules.mjs`
7. `tests/browser/public-entry-cabinet.test.ts` — единственный новый модуль, K1 до создания.
8. `tests/landing-demo.test.ts`
9. `tests/browser/responsive-check.test.ts`
10. `tests/responsive-check.test.ts`
11. `tests/run-landing-demo-mutations.mjs` — заменить устаревший demo-above-fold case настоящим отрицательным контролем согласованного CTA/порядка, сохранить остальные mutations и tamper guards.

Это scope baseline для QCSD/плана; 11-й файл включён как необходимая актуализация существующего QE.
Новые exports/commands не предлагаются. Существующие имена сохраняются; optional prop ThemeToggle
выбирается автором в плане. K1 обязан проверить новый test module и любые добавленные публичные имена.

## Проверки и известный конфликт старых ожиданий
`tests/landing-demo.test.ts` сейчас требует старые заголовок, demo→CTA→form и desktop CTA hidden.
`tests/browser/responsive-check.test.ts` требует mobile video above-fold;
`scripts/responsive/rules.mjs` возвращает для `/` два селектора: CTA и video.
Обновить эти ожидания по FR-9, не удалять suite и не отключать R9 глобально. Проверять demo
через достижимость/плеер и mobile порядок отдельно; CTA остаётся R9 action.
Mutation runner сейчас фильтрует тест «демо и действие в первом экране»: после изменения названия
этот фильтр нельзя оставлять с 0 tests. Новый named case должен действительно дать RED, затем
restore GREEN; disabled/skip или смена regex без исполнившегося теста не являются доказательством.
`tests/auth.test.ts`, `tests/theme.test.ts`, `tests/payments-guards.test.ts`, `tests/partner-route.test.ts`
и применимые partner suites запускаются как
регрессии без редактирования. Browser tests существующей реализации кабинета — regression CSS/theme.
Новая public-entry browser suite покрывает BDD/негативы на настоящих компонентах; настоящий auth E2E
на опубликованном web проводится отдельно. Точные команды/fixtures фиксируются в Step 6 после QCSD.
