# Передача кода workspace-presentation

Ветка feat/workspace-presentation-20261104, writer /tmp/clipmkr-workspace-impl-20261104.
Состояние: локально проверенный shell increment, интеграция recovery/независимый QE/stage pending.
Uploader не изменялся. Текущий план объявляет 12 targets, 11 реализованы; нет новых runtime dependencies,
API/БД/моделей/контейнеров. Последующая публикация и зеркальные push принадлежат root.

## Источники требований

- Feature requirements: `features/workspace-presentation/01_requirements.md`, SHA-256 `c2c5642b63d2f368485ab2426ae1a76bda9eace3482ae8b163c77c2dac619712`.
- OpenSpec ledger: `openspec/changes/workspace-presentation/specs/workspace-presentation/spec.md`, SHA-256 `93441bd01c1faff2acf02cd70ffcd9af18b3ee2967a70568d019b89db2a8434e`.
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


## FR-6: исправление light root specificity на combined artifact

Execution: /tmp/clipmkr-ui-integration-20261104, исходный HEAD58871ea; единственный writer
CSS/tests/этой квитанции по поручению координатора. Targets12 и bound FR/ADR/архитектура неизменны.
До кода actual K2 M require-requirements exit0 и code-target admission admitted с manifestDigest
b359817e079b92f850f1fb2432c0c5d2dcce5dc876cba51d5a4a4926802a174a.

Новый тест scoped workspace canvas is neutral and public palette restores запускает Chromium/WebKit
с настоящими globals.css, WorkspaceSettings и noDates UpgradeScreen markup. На исходном CSS RED:
оба engine cases падают на non-neutral surface: HTML. Причина — :root[data-theme=light] специфичнее
html:has(.workspace-shell), поэтому --paper корневого html оставался публичным зеленоватым.

Исправление: единственное добавление :root[data-theme=light]:has(.workspace-shell) в существующий
alias selector. Значения токенов, геометрия, тексты, бизнес-логика и существующие контролы не менялись.
GREEN: оба layout × обе темы × оба движка (8 component/palette cases); после удаления shell исходные
computed background/color html/body возвращаются к публичной палитре. Focused workspace/theme/billing
64/64 PASS, lint и tests typecheck PASS. Raw RED/GREEN/K2/typecheck: приватный workspace-fr6-selector-fix/.

Это local component/CSS regression, не Next stage E2E. Проверки и известные ограничения R8/R9
не ослаблены, полный noDates88-case и stage windows в этом узком исправлении не объявлены PASS.


## AM-10: актуальный owner delivery target

Прямое owner-steer04.11.2026 20:15 UTC заменяет прежний обязательный77 target: ручная приёмка
именно https://clipmkr.ru, existing VPS194.85.249.105/project n5-clipmaker/service web.
Root read receipts: /root/.config/clipmkr/release-parity-20261103/clipmkr-ru-ui-target/
target-and-backup.private.json и existing-runtime.private.json. Секретное содержимое не выводилось
и не переносится в Git. Root сообщил исходный image20261102-52e794d-web, payments off,
26accounts/25videos/48clips,16uploading status,0updated за15m; это read inventory, не app E2E.
Наличие исторических minio/testminio не используется как S3 proof и не является разрешением удалить их.

01 NFR-3,05 delivery/preflight,06 AM-10 и OpenSpec delta обновлены; requirements/spec SHA выше
соответствуют новым bytes. Старые ideation/native QE receipts сохранены verbatim: их исходная
revision не объявлена проверкой нового delivery amendment. Primary review source130102f требует
нового measured native snapshot/verification от root без reset истории.

До runner edit: actual strict K2 M PASS и code admission f3f046536119929e45a68f7295de69fb59ea5df86c143700bb816faeae456404.
Runner теперь использует один closed set exact pairs: n5-clipmaker+https://clipmkr.ru (owner-manual),
clipmkr-stage-20261028+https://77.83.87.178 (только optional internal-regression). Любые cross/arbitrary
origin/project, referral site и raw IP194 alias отклоняются до browser/network; sourceSha/imageDigest,
windowPair/private mode witness/webService проверки сохранены. Reports явно различают purpose;
ни один internal regression не заменяет ручную приёмку clipmkr.ru. Нового deployment здесь нет.

Targeted CLI guard validation использует только неполные private negative fixtures: два правильных
pair проходят target guard и останавливаются exit2 на отсутствующем artifact; шесть неправильных
pair отвергаются exit2 на target guard. Положительный runtime/mode witness/stage PASS не выдумывался.
Private logs: workspace-fr6-selector-fix/am10-{k2-before,focused,lint}.log, am10-guard/results.json.

## NFR-1 / AM-12: масштабирование workspace h1 при text200

Узкое CSS исправление по поручению root, исходный HEAD44923a5. Изменены только globals.css
и эта авторская запись; runner/06/Mtest принадлежат отдельному workspace writer. До CSS edit
actual strict K2 M require-requirements: PASS, 0 failures/warnings/skips, 12 targets; admission
95327a8e5b7ed244c49d0fcf53e497f139636e241ef404a0ab4f2f7a3ac6e020 admitted, reasons=[];
literal coder-context complete. Это не новый checkpoint approval и не независимый QE.

Причина R8: глобальный h1 clamp(2rem,3.75vw,3.375rem) на1024 даёт38.4→64px, на1440 54→64px
при root font200%. Добавлен низкоспецифичный .workspace-shell :where(h1): fallback2rem и
@supports enhancement clamp(2rem,calc(3.75vw / 16px * 1rem),3.375rem). Деление на16px нормализует
исходную fluid шкалу к root rem. На поддерживающих typed arithmetic engines прежние100% размеры
сохраняются, text200 масштабируется вдвое. Старый движок без поддержки получает32px h1 при
обычном root16px и64px при root32px; прежняя desktop fluid типографика в fallback не обещана.
Специфичность сохраняет специальные заголовки, включая mobile detail24→48px. Public вне shell
не затронут; нет новых tokens/dependencies/DOM порядка, условий, скрытия или изменения R9.

Изолированный private probe читает actual globals.css и вызывает неизменный textZoomRule:
2 engines ×2 layouts ×2 themes ×8 widths320/360/390/414/672/768/1024/1440 =64 cases.
До правки:16 desktop R8 findings; после:64/64 без R8 и с неизменными100% размерами.
Ещё64/64 native @supports=false cases в памяти проверяют rem fallback: только условие enhancement
подменено на заведомо неподдерживаемое значение, CSS файл не менялся. Это симуляция unsupported
ветки в настоящем браузере, не проверка старых browser versions. Ещё16 detail/public typography
checks PASS. Chromium148.0.7778.96 и WebKit26.4 реально поддерживают положительное условие.
R7 lintCSS возвращает2 warnings на16px divisor в @supports и declaration; это нормализатор,
не фиксированный размер шрифта. Oracle/thresholds не менялись, warnings не скрыты.

Команды с PATH Node22.23.4 (включая children): private probe.mjs red/green; npm test --
tests/workspace-presentation.test.ts tests/theme.test.ts tests/billing.unit.test.ts —64/64 PASS;
npm run lint —exit0; npm run typecheck —exit0. Это focused состояние до новых AM-11/12 tests
другого writer, их отдельная проверка принадлежит ему. Финальные K2/admission повторены успешно.
Private raw CSS baseline/probe/JSON/logs: /root/.config/clipmkr/release-parity-20261103/workspace-r8-fix/.
Изолированный CSS probe не доказывает full-app clipping/keyboard/Next stage, реальный page zoom200%,
effective320 или OS keyboard. Последние остаются отдельной ручной проверкой NFR-1. NoDates R9
остаётся открытым UX gap; прежние88 cases не объявлены целиком зелёными. Full suite не повторялся.
