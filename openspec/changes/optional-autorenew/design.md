## Context
Авторитетные decisions/DDD/QE — `features/optional-autorenew/01_requirements.md`, `02_reuse_inventory.md`, `03_adr/001-reuse-native-renewal-intents.md`, `002-bind-consent-to-verified-method.md`, `003-gate-renewal-on-accepted-notice.md`, `04_domain_model.md`, `05_architecture.md`. Редакция AR-20261111-1; hashes в `requirements-revision.json`.

## Goals / Non-Goals
Сохранить manual checkout и receipt/idempotency/credits invariants; реализовать opt-in. Не менять тарифы, не автопокупать addon, не выполнять реальные списания/письма/merchant mutations при разработке.

## Decisions
Native payment_intent имеет единственную identity account/T и immutable request. Consent активируется только verified succeeded+saved; token server-only и merchant/test bound. Notice accepted не равен delivered. Предупреждение целится в T−72h, accepted≤T−24h; пропущенный цикл не догоняется. Cancel запрещает новые dispatch; committed in-flight может завершиться. Подробные alternatives/Confirmation — ADR.

## Risks / Trade-offs
Unknown payment требует same-key recovery <23h либо STOP/review; никакого SQL+HTTP atomicity. Merchant live recurring требует фактического подтверждения. Юридическая достаточность не заявляется. Defaults ещё требуют показа в UI-макетах.

## Migration Plan
Additive schema без backfill согласий; flag default off. Точный execution plan создаётся после QCSD в feature-adr, затем K1/K2. OpenSpec tasks не разрешают обход gates.
