# Передача кода workspace-presentation

Ветка feat/workspace-presentation-20261104, writer /tmp/clipmkr-workspace-impl-20261104.
Состояние: локально проверенный shell increment, интеграция recovery/независимый QE/stage pending.
Uploader не изменялся. План объявляет 11 targets, 10 реализованы; нет новых runtime dependencies,
API/БД/моделей/контейнеров. Последующая публикация и зеркальные push принадлежат root.

## Источники требований

- Feature requirements: `features/workspace-presentation/01_requirements.md`, SHA-256 `3be20981e185cd6510c15c4100acbde6b6fd14b5b91783bb29ed78f3c83b1d83`.
- OpenSpec ledger: `openspec/changes/workspace-presentation/specs/workspace-presentation/spec.md`, SHA-256 `68674a0ec9b5e9e36e3471afdf2b0df5df7b2bd94915bc09dd38f3ccab236298`.
- Ideation revision: `d010f09f042d97cb97b58fe65a64c287798095b60717272ac8e99a5b1984cd82`.
- Execution amendments: AM-7 same actual File oracle совместим с native input reset; AM-8 next/headers fixture.

## Код

Созданы:
- apps/web/src/lib/workspace-layout.ts — строгая cookie и Document-scoped immutable store/sync.
- apps/web/src/app/WorkspaceSettings.tsx — native Settings и sibling sync.
- tests/workspace-presentation.test.ts — parser/writer/denial/store и SSR unit assertions.
- scripts/check-workspace-presentation.test.mjs — 498 строк, safe stage runner и local handlers mode.

Изменены:
- apps/web/src/app/layout.tsx — request preferences + sibling sync без обёртки children.
- apps/web/src/app/ThemeToggle.tsx — единый snapshot с Settings, прежнее доступное имя.
- apps/web/src/app/dashboard/layout.tsx — static shell, прежние erasure/auth/owner gates.
- apps/web/src/app/upgrade/page.tsx — static shell на прежнем UpgradeScreen.
- apps/web/src/app/globals.css — scoped neutral aliases и ограниченная FR-1 геометрия.
- tests/billing.unit.test.ts — только mock next/headers для direct RootLayout SSR fixture.

Удалённых файлов нет. Плановый apps/web/src/app/upload/Uploader.tsx ожидает recovery integration;
никакой старый Uploader целиком не переносить.

## Проверки и ограничения

Фактическая матрица и причины FAIL/NOT ESTABLISHED — в 03.5_quality.md. Raw logs и browser screens
приватно: /root/.config/clipmkr/release-parity-20261103/workspace-implementation-next/.
Секреты/storageState/media/request bodies/HAR в Git не включены.
Standalone stage запускать отдельно от npm test:
`node scripts/check-workspace-presentation.test.mjs --base <validated HTTPS origin> --fixture <private JSON0600> --out <private directory>`.
Local-only: `node scripts/check-workspace-presentation.test.mjs --local-handlers --out <private directory>`.
Нет fixture/согласованного media/owned auth/stack/catalog/versions — exit2; неизвестные попытки
запросов блокируются до backend и приводят к fail. Fixture/manifest описаны в 06; runtime preflight
также требует ownershipReceiptPath и stack receipt backupVerified/activeUploadsChecked/appOnly.
