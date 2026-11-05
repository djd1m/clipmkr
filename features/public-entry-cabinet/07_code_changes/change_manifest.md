# Реализация публичного входа — состав изменения

05.11.2026. Автор — отдельная CLI-сессия gpt-6.1-sol high. Основание: утверждённый макет, требования01, ADR-001, план06 и настоящие design/plan checkpoints. Координатор исходники автора не редактировал.

Переиспользованы существующие auth API, code.apply, safeNextPath, ThemeToggle/store и LandingDemo. Новых зависимостей, API, SQL или worker-изменений нет. Public CSS изолирован; только общий ThemeToggle получил optional showLabel=false. Обновлены две устаревшие проверки R9 и существующий mutation runner, включая явный host transport.

| Целевой файл | SHA256 |
|---|---|
| `apps/web/src/app/Landing.tsx` | `edcb1f9c4fa9bd2f69638dabcebdd5d20a47cbaa4503a3ac8b284adb86de2e18` |
| `apps/web/src/app/LandingCta.tsx` | `4cb774ae2e3c79490f63fa041f8ab2b499d7b746afb849ae1dd8e170f03b6c5e` |
| `apps/web/src/app/AuthForm.tsx` | `6b97da09ffc9c34dda5bcd814a188f964979fc75499e3518fbe93a3b6e9d2a77` |
| `apps/web/src/app/ThemeToggle.tsx` | `e05180d01beeb14836923ec35a254d65c36df041f3a252b3181a2965d8029441` |
| `apps/web/src/app/globals.css` | `0db0a062ffb862c3ce08f3e3d4eb9da94c7cd59b7d7488e55cc5f11d0603c30f` |
| `scripts/responsive/rules.mjs` | `04bc6f127795227d92ed57abba7da2702394a1dbb1c05311fa30fc4630cd7c13` |
| `tests/browser/public-entry-cabinet.test.ts` | `236bd0f676f4d096fa8e8f7030aa89dc6ac5544e2b0ce850ccdecfe64cecae55` |
| `tests/landing-demo.test.ts` | `d6876126d9972e9ebb99f28798c507066c8bd9dd7c898ddb52c48ffc3c85fe9c` |
| `tests/browser/responsive-check.test.ts` | `303878c6206e79aec68bbbda0458623126e04c091585f4f253beb7f8f6b24f45` |
| `tests/responsive-check.test.ts` | `773f97cf18db33e271b7d7024703f8cc283daeba99db07944bc50d3228efb3d8` |
| `tests/run-landing-demo-mutations.mjs` | `ec7894a39f061b4595a237f29ecec8857b9a5118de1920d3fac6bfe0fce9e3ca` |

Фактические проверки: исходный named RED на старой форме; после реализации public+responsive 129/129, отдельный public повтор после lifecycle oracle31/31; unit/contracts133/133. Mutation runner: playsinline RED4→GREEN4, public-entry-cta RED16→GREEN16. Дополнительные guard-мутации хранятся приватно и проверяются отдельно. Mount fixtures используют настоящий компонент/CSS, но управляемые transport/router; это не published Next/auth E2E.

Независимое QE, canonical image build, тестовая выкладка и published E2E на момент этой записи ещё не завершены. Cloud.ru и DNS не изменены. Raw logs, credentials и скриншоты с приватными данными не коммитятся.

## Коррекция по независимому QE

Исходный native cycle1 — unresolved PE-QE-001/002, не GO. В AuthForm заменён preventScroll на обычный focus, чтобы поле попадало в viewport; в ThemeToggle public showLabel стал command без aria-pressed, default toggle сохранён. В существующий public-entry test добавлены три named проверки (320×568text100/200 и truthful theme command). Фактический исходный RED3 → corrected GREEN3. Полный public повтор, проверки и независимое own-condition verification фиксируются по завершении.
