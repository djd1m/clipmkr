# Каркас плана: консолидация данных

Статус: неполный исполнимый план; разрешены документы. До независимого QCSD, K1/K2 и разрешения root реализация не начинается.

Inputs read: 00_complexity_assessment.md,01_requirements.md,02_reuse_inventory.md,03_adr,03.5_risk_inventory.md,04_domain_model.md,05_architecture.md; AGENTS.md,CLAUDE.md,docs/acceptance/core-cjm.md,docs/review-policy.md,docs/model-matrix.md; прежний cloudru-release-parity и production/reverse-ssh docs; локальная SQL/auth/S3/billing реализация; свежие private root identity receipts19:30UTC.

## Goal state
Принятое приложение работает на c с сохранёнными данными обоих datasets, правильным доступом/ledger/ссылками/объектами и проверенным восстановлением. Текущая задача заканчивается reviewable docs scaffold и настоящими router/requirements receipts. Runtime и final plan gate сюда не входят.

## Tasks и зависимости
| Задача | FR / решение | Конкретный результат и проверка | Зависимость / статус |
|---|---|---|---|
| TASK-1 | FR-1/2/10, ADR-004 | Fresh identity + bounded B1 inventory; schema/journal/capacity/binding на двух datasets | Root readonly scope; root identity/B1 выполнены, B2–B5 агрегаты прочитаны; full conflict/data audit открыт |
| TASK-2 | FR-2/3/4/7/8, ADR-001 | Полный graph/identity/codes/support history collision inventory, закрытые решения владельца | После TASK-1; НЕ ВЫПОЛНЕНО |
| TASK-3 | FR-5/6/7, ADR-002 | Shop/mode/orderIDs/pending/replay/credit/referral compatibility, без double trial | После TASK-1/2; НЕ ВЫПОЛНЕНО |
| TASK-4 | FR-2/9/10, ADR-003 | Exact object whitelist/namespace/lifecycle/capacity; определить минимальный copy adapter | После TASK-1/2; НЕ ВЫПОЛНЕНО |
| TASK-5 | FR-1..12 | Уточнить ADR/model/узкие runtime paths по inventory; независимый QCSD quality/risk/testability, все conditions verified | TASK-2/3/4; root организует отдельно |
| TASK-6 | FR-1..12 | K1 новых имён, K2 XL --require-requirements и supported plan checkpoint на settled scope | После закрытого TASK-5; НЕ ПРОВЕДЕНО |
| TASK-7 | FR-2..11 | Минимальный importer/reconciler рядом с existing controller, не migration platform; meaningful tests A1..A7 | Только после TASK-6 и исполнения в разрешённом scope; код здесь не пишется |
| TASK-8 | FR-10/11 | Два private backups, restore в unique scratch existing PG16, object rehearsal на real S3, измерить RTO/диск | После TASK-7/отдельного разрешения mutations; НЕ ВЫПОЛНЕНО |
| TASK-9 | FR-1/12 | Согласованные UI/recovery/E2E source и ручная приёмка; bind accepted release/images, не docs HEAD | Внешняя зависимость root; НЕ ЗАЯВЛЯЕТСЯ ПРОЙДЕННОЙ |
| TASK-10 | FR-2..11 | Final writer fence/snapshots/import/reconcile, no missing rows/objects/effects; проверяемый rollback | TASK-8/9, конкретное окно и go root; НЕ ВЫПОЛНЕНО |
| TASK-11 | FR-1/4/6/7/8/9/12 | Cutover c, новый вход/старые данные/новый CJM/real TEST provider/limits90/120/custom; проверка доступов | После TASK-10/отдельной авторизации; НЕ ВЫПОЛНЕНО |
| TASK-12 | FR-10/11/12 | Независимое QE/fleet по XL, code/spec anti-drift, 24h/30d followup, backup/maintenance handover | После TASK-11; источник не очищать без решения |

## Очерёдность и параллельные группы
TASK-1 последовательно до data aggregates; TASK-2/3/4 допускают независимое чтение после общего binding, но mutations/финансовые решения сериализуются root. TASK-5→6→7→8 и зависимость TASK-9 обязательны. TASK-10/11/12 последовательны. В текущей сессии новые агенты не запускались; независимый Terra review отдельно организует root. QCSD не подменяется этой авторской таблицей.

## Несущие проверки
| Сценарий | Задача / будущий test | Требуемый результат |
|---|---|---|
| A1 | TASK-2/7, consolidation_identity_collision_refuses | Same-email/different-owner блокирует merge |
| A2 | TASK-7/8, consolidation_preserves_existing_target | Двойной импорт/restore rehearsal не меняет существующие c rows |
| A3 | TASK-3/7, consolidation_payment_replay_once | Один grant, неизвестный shop/order конфликт не теряется |
| A4 | TASK-4/7, consolidation_object_collision_preserves_target | Target bytes прежние при same key/different bytes |
| A5 | TASK-8/10, consolidation_writer_drift_refuses | Writer/drift/delete delta блокирует cutover |
| A6 | TASK-8/10, consolidation_rollback_preserves_postcutover_writes | Acknowledged payment/video после switch не теряется |
| A7 | TASK-7/11, consolidation_origin_access_isolated | Source token не c session; чужие links/data не доступны |

Названия tests — проект критериев, не существующие тесты. Точные новые paths/exports/commands будут выбраны и проверены K1 после inventory. Нельзя создать заглушки тестов ради K2. Reuse тестов/контроллера указан в02_reuse_inventory.md. Обязателен PostgreSQL16 test write-side SQL; MinIO не заменяет real S3 приёмку. Runtime suite/lint/build и независимый code-critic/QE запускаются после реального кода, не для prose.

## Checkpoints и разрешения
Router/requirements — зафиксировать текущие документы supported dz. Detailed requirements/ADR proposed, конфликтные identity/window decisions остаются владельцу. Root GO означает внутреннее ограничение делегата; это не новое требование повторно спрашивать пользователя для уже разрешённого readonly. Final plan checkpoint нельзя создавать до QCSD/K1/K2. Инструментальный exit0 не подтверждает согласование владельца. Сетевые/изменяющие действия этой сессии не разрешены.

## Risk assessment
Риски и mitigation в03.5_risk_inventory.md. Blockers final plan: полная schema/data equivalence и storage размеры после root B1/B2–B5, collisions, payment shop/mode, object namespace, active writers/delta protocol, window/capacity и source acceptance. Минимизация: complete final snapshot вместо новой CDC платформы; existing PG16 scratch вместо новых containers; reuse native manifests и isolated adapters. Если требуется новая система очередей/ledger/identity — отдельное решение, не скрытое расширение scope.

## Amendments
Предыдущих независимых замечаний для этой новой архитектуры нет; closed findings не выдумываются. Уточнение root19:30: runtime identity известна, datasets/binding ещё unknown; root readonly GO — внутренняя координация. Старые findings cloudru-release-parity не закрываются новым slug.

EXPECTED_CODE_TARGETS:
- features/cloud-data-consolidation/00_complexity_assessment.md
- features/cloud-data-consolidation/01_requirements.md
- features/cloud-data-consolidation/02_reuse_inventory.md
- features/cloud-data-consolidation/03_adr/001-preserve-dataset-provenance.md
- features/cloud-data-consolidation/03_adr/002-reconcile-financial-history.md
- features/cloud-data-consolidation/03_adr/003-map-objects-without-overwrite.md
- features/cloud-data-consolidation/03_adr/004-fence-and-reconcile-cutover.md
- features/cloud-data-consolidation/03.5_risk_inventory.md
- features/cloud-data-consolidation/04_domain_model.md
- features/cloud-data-consolidation/05_architecture.md
- features/cloud-data-consolidation/06_implementation_plan.md
- features/cloud-data-consolidation/readonly-inventory.md
- features/cloud-data-consolidation/process-evidence.md
- features/cloud-data-consolidation/requirements-binding.json
- openspec/changes/cloud-data-consolidation/proposal.md
- openspec/changes/cloud-data-consolidation/specs/data-consolidation/spec.md
- openspec/changes/cloud-data-consolidation/tasks.md
- features/cloud-data-consolidation/live-observations.md
- features/cloud-data-consolidation/process-receipts.json
- features/cloud-data-consolidation/local-validation.json
