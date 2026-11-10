# Манифест авторских изменений AUTH-001

Автор: `gpt-6.1-sol high`, 10.11.2026. Только текущая локальная рабочая копия; это не независимый QE, checkpoint dz или выпуск.

Объём после разрешённого AM-11: 16 source/test targets — 10 application и 6 tests. Новые файлы: `AuthFlow.tsx` и `repeat-registration-next.test.ts`. Остальные targets изменены адресно. Собственные документы автора — этот файл и `author-summary.md`; координирующие требования/решения/QA/поставка принадлежат root.

- Backend переиспользует `AuthService`, `PgAuthStore`, `transaction`, `grantTrialTx`, bcrypt и прежний fenced session insert; строковый `register` сохранён. Store подтверждает только commit, service явно отказывает недопустимому результату store.
- HTTP согласует outcomes-v1; legacy duplicate получает409 без новой сессии. Catch содержит только фиксированные category/action.
- AuthForm различает created/existing/conflict, сохраняет запрет attribution/signup для existing также при задержке перехода. Один memory provider хранит notice и recovery draft; встроенный notice находится под навигацией, error оформлен по утверждённому макету.
- SQL guards/constraints/migrations и код PartnerService, analytics, forgot/reset API не заменены. Новых пакетов, сервисов или миграций нет.
- Исправлен устаревший тест количества таблиц26→27: текущие миграции содержат27 CREATE TABLE и реальная схема имеет27 таблиц. Новая таблица этой фичей не добавлялась.

## Точный снимок

Агрегат16 targets SHA-256: `73a5f3724b753d43b6ca19be42f9eec08de82a2d2c939967c63dd7ab7af59579`. Алгоритм: UTF-8 строки `path + NUL + sha256(file_bytes) + LF` в порядке таблицы ниже, затем SHA-256 всего потока.

Next BUILD_ID: `hlTEjYOJIUJhzImhBF8VJ`; SHA-256 файла BUILD_ID: `90e25cf0bd418f983a0e5797d61124a2286349f063b1f9d0e4b50b0122025a06`.

| Target | SHA-256 |
|---|---|
| `apps/web/src/server/auth.ts` | `95bc4eb7002dd250184aa5a607ab825f0c177d3bded03473ed607accca169bf2` |
| `apps/web/src/server/auth-store.ts` | `72247eb5acccca9fc68e512cdee8600b7b34591be603a5d69db0a13dcd8c8729` |
| `apps/web/src/server/auth-handler.ts` | `f3c92eca69584170077e25d26db393e1c70ee91b73c0790efeac848f1fa12c79` |
| `apps/web/src/app/AuthForm.tsx` | `6647eb8ac0d9b4d96112bea2cf369c46359b1993781f353224f63edf4f75a273` |
| `apps/web/src/app/AuthFlow.tsx` | `705e3a492fc0187456a2845e43c9479e53f9f4f6b5b99e5e946d9669a75951f8` |
| `apps/web/src/app/layout.tsx` | `4b319a78f4680c7ddd001db0fc210cad09ebd21f4be52bd5944335e93b7914cb` |
| `apps/web/src/app/globals.css` | `200f2d056e3ed559aa8c43f7d1c0d699ad1e4294d29be7df279d021be3fcaf9c` |
| `apps/web/src/app/support/RecoveryForm.tsx` | `d26f9dcb325234eda1b6546549722584a7403472233a2a5f95cf3559a28e9aee` |
| `apps/web/src/app/WorkspaceHeader.tsx` | `1c0c99ba202652da5c4132e41e0bbf9e4ef1825b18af3bfc1d6d60b4d93b0a4c` |
| `apps/web/src/app/upgrade/return/page.tsx` | `03e4ff047994381b5d5d304fc956fcd42a872fa617aeb3bfb877179a4e12bb12` |
| `tests/auth.test.ts` | `73a41f00c5bb61091799b52f4e79698b220985fe6a336653fc344130effd2ee8` |
| `tests/bcrypt-load.test.ts` | `8f93e302daa4201c7f32bdd9a67ddd55ce91084c07cb60935e31e6d42ace7d42` |
| `tests/database.integration.test.ts` | `d5b9488a34a9891d1090a947a1803d543ca302af993a8b619a5cd7add15473b8` |
| `tests/support-ui.test.ts` | `64c81827529dacfdbf9b26e109a71eab52aaeaa5cdd587f61ba0edde6e2c09c4` |
| `tests/browser/public-entry-cabinet.test.ts` | `4c5b87054edf07ebccb71a445e7b8158976ebafb75d4671d84657163ad00d8a2` |
| `tests/browser/repeat-registration-next.test.ts` | `317fffb8587909e9e50cc8108aa47cad008826a97f7f91acac19f710a989f13c` |

## Сопоставление с literal handoff

Перед авторским freeze полностью прочитан `R/coder-context-final.private.json` (status complete), literal promptBlock: 36480 символов, без пропусков в трёх последовательных фрагментах0…12000,12000…24000,24000…36480. R — `/root/.config/clipmkr/repeat-registration-20261110`.

Builder digest: `6c1641489f29e91dd3d02776b1530e4a695092b204ee9d6a87e4070d58f8947d`. SHA-256 UTF-8 literal promptBlock: `1f162c9ee116702f3d0baa8561ef5e8fdcdbd9597dc375b8b23d91671ea7245d`.

Первичная делегация содержала paths/digest, а не embedded promptBlock. Чтение выше — корректирующая сверка перед freeze, не утверждение исторически выполненного embedded handoff. До кода автор читал названные файлы и получил действительный допуск от координатора; этот факт не исправляет прошлый формат передачи. Native receipts/K1/K2 автор не изменял и не создавал задним числом.

| Часть literal snapshot | Авторская сверка |
|---|---|
| Requirements FR-1…FR-7 | Новое создание, modern existing, wrong/unavailable, guards, themes/keyboard/recovery сопоставлены с service/handler/PG/component/native tests |
| ADR Decision1…8 | Commit boolean; строгий invalid return; общий passwordLogin; register wrapper; header negotiation; HTTP/cookie/log; строгий клиент и side effects; один memory context |
| ADR Confirmation | Реальные PG unique-blocker/fence/rollback и native HTTPS jar выполнены; независимый review остаётся обязанностью координатора |
| TASK-0 | Действительный pre-code допуск и расширение AM-11 сообщены координатором; автор не подменяет gates файлами |
| TASK-1…2 | Реализованы; дополнительно при literal сверке расширена таблица input/transport guards и выполнен RED→GREEN invalid store return |
| TASK-3 | Реализован approved flow, inline view и recovery; после отдельного RED восстановлен приоритет password focus на возврате |
| TASK-4 | Настоящие interleavings для одинаковых/разных паролей и legacy/credits, reset/erasure между compare/insert, trigger rollback |
| TASK-5 | Собранный Next/HTTPS/PG/Redis, обе browser engines, exact old-client bytes, positive controls, реальные темы и screenshots |
| TASK-6 | Авторские hashes/tests/ограничения здесь; окончательные OpenSpec/spec anti-drift и dz records выполняет root |
| TASK-7 | Независимый QE, разрешённая поставка и зеркала не выполнялись автором и не объявляются успешными |
| AM-1…AM-11 | Связанные проверки и реальные discriminators перечислены в author-summary; дополнительные targets/export AM-11 изменены только после нового K1/K2 допуска |

Git commits/push, production, Cloud.ru/DNS, внешние письма/платежи автор не выполнял. Private env/runner/logs/screenshots и локальные receipts не входят в этот манифест как файлы к коммиту.
