# Инвентаризация переиспользования

Исследована база реализации `24b4b4a`. Код читался, проверки runtime не заявляются.

| Фактический путь | Переиспользование |
|---|---|
| `apps/web/src/server/partner-code.ts::ensurePartnerCode` | 12 URL-safe символов, UPSERT partner сериализует первый код, выбор `created_at,id`, blocked не заменяется |
| `createOwnedPartnerCode` там же | Образец account → partner → code locking и отказа удаления/антифрода; ручной контракт сохраняется |
| `apps/web/src/server/partner.ts::PartnerService` | Новая узкая транзакционная операция внутри существующего 141-строчного сервиса; dashboard и apply не переписываются |
| `apps/web/src/server/trpc.ts` | Текущий router, strict Zod, partnerResult, Context; новая mutation, не GET |
| `apps/web/src/app/api/trpc/[trpc]/route.ts` | Auth/origin/rate-before-body, no batching, 202, private no-store; семантическая зависимость, изменение не требуется |
| `packages/db/src/blogger-policy.ts::getBloggerPolicy` | Уже экспортирован из `@clipmaker/db`, чтение active policy для SSR; не подменяет транзакционный guard POST |
| `apps/web/src/server/guest-pack.ts` | Второй caller ensurePartnerCode; его существующая выдача обычному host остаётся действующей |
| `apps/web/src/app/dashboard/PartnerPanel.tsx` | Существующая статистика и кампании; новый personal mode только при явном SSR blogger prop |
| `apps/web/src/app/dashboard/page.tsx` | Серверная композиция, uploader остаётся единственным смонтированным экземпляром |
| `apps/web/src/app/globals.css` | 587 строк, workspace tokens, две компоновки, mobile reflow; локальное расширение, без новой системы стилей |
| `tests/partner.integration.test.ts` | Изолированный schema PostgreSQL, уже есть concurrent ensurePartnerCode tests |
| `tests/partner-route.test.ts` | Реальный tRPC HTTP adapter + stub сервис; auth/origin/input контракт |
| `tests/browser/blogger-cabinet.test.ts` | Vite hydration + HTTP + real PG/Redis шаблон для новой browser suite |
| `docs/reuse/blogger-cabinet-projects-1-8.md` | Ранее исследованные проекты 1–8; native Clipmkr уже закрывает генератор/DTO/storage |

Новых OSS-зависимостей не нужно: crypto, PostgreSQL locking, React и clipboard уже есть.
Свежий поиск библиотек не нужен для повторного использования собственного действующего кода.
Новых таблиц, миграций, фонового worker, конфигурации и метрик-счётчиков не добавляется.
Browser suite исключена из обычного vitest.config.ts: запускать отдельно существующим
`vitest.browser.config.ts`, не заявлять её прохождение по одному `npm test`.
