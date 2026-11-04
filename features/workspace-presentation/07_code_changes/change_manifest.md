# Передача кода workspace-presentation

Ветка feat/workspace-presentation-20261104, writer /tmp/clipmkr-workspace-impl-20261104.
Состояние: локально проверенный shell increment, интеграция recovery/независимый QE/stage pending.
Uploader не изменялся. Текущий план объявляет 12 targets, 11 реализованы; нет новых runtime dependencies,
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
- scripts/check-workspace-presentation.test.mjs — safe stage runner, catalog windows и проверка трёх отчётов.
- scripts/workspace-presentation-local.mjs — прежний локальный React host, общий palette check и actual noDates UpgradeScreen+CSS boundary.

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


## Текущая маршрутизация и AM-8/AM-9

00_complexity_assessment.md сохранён как исходный routing snapshot. Его proposed/«код не написан»
не описывает текущее исполнение. Reassessment остаётся M при 12 targets: один домен представления,
0 новых runtime-интеграций, 0 бизнес-моделей/операций. Два добавления — AM-8 существующий SSR unit
fixture и AM-9 test-only local helper; продуктовый scope не расширен. Авторитет ideation — actual
.fa-state convergence/revision и настоящий plan checkpoint, а не наличие draft-файла.

AM-9 до реализации: K1 module workspace-presentation-local/exports runLocalWorkspaceChecks,
runCatalogNoDates — actual free; дополнительный shared palette export workspacePalette — actual free.
K2 M require-requirements и admission после 12-target declaration PASS. Именованные amendments
разрешаются actual dz amendment-check, не считаются runtime успешными только из-за этого.
Private receipts: workspace-implementation-next/k1-am9.json, k1-am9-palette.json,
k2-am9.log, k2-am9-final.log, amendment-am9-final.json. Native lineage не сбрасывался.

AM-9 CLI:
- stage: обязательный --catalog-phase=off либо --catalog-phase=on; phase fixture/witness совпадают;
- component: --catalog-component=no-dates с phase fixture/base; локальные actual UpgradeScreen/CSS,
  null purchaseWindows prop, source SHA совпадает с чистым apps/web/src текущего checkout;
- aggregation: --catalog-verify-reports <off.json,on.json,component.json> --out <private-dir>.

Все три отчёта связываются artifact SHA/imageDigest/project/origin/windowPairId и digest mode witness.
OFF не притворяется checkout PASS: содержит required-in-on-window; noDates в phase report имеет
required-component-boundary. Aggregation требует настоящий полный component grid из 88 cases
(64 geometry +24 R9), два браузерных движка и оба SSR окна. Результат catalog-evidence-complete
не является feature acceptance либо backend/provider E2E. Ни положительных stage mode witnesses,
ни SSR phase reports автор не создавал. Root получает их из фактического того же web последовательно.

Local handler extraction прошла 4/4 Chromium/WebKit; focused regression 61/61 и lint PASS.
No fixture и invalid catalog phase дают exit2. Локальный noDates probe запускается с явной identity
LOCAL_UNBOUND_COMPONENT_PROBE_NOT_STAGE, не может служить stage/aggregation evidence. Он выявляет
не скрытые тестом ограничения NFR: light html neutral alias specificity, R9 explanation/return ниже
первого экрана и desktop R8 заголовка. Product/CSS изменения в AM-9 не выполняются; findings переданы
root. Точные актуальные результаты local matrix и raw JSON сохраняются приватно.


Финальный AM-9 local-unbound matrix: 24 PASS /64 FAIL из88 в Chromium/WebKit;32 light HTML palette,
24 R9 explanation/return,8 desktop R8. Этот FAIL не stage proof и не был пропущен. Raw matrix и точный
scope ограничений записаны в 03.5_quality.md. Final modules: main462, helper156 строк.
