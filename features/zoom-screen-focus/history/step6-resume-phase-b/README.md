# Zoom: «Фокус на действии»

Статус: **Phase B readiness checkpoint; owner pause; B code GO не выдан**. Root интегрировал accepted Original98e647e2 в merge c66b9ef4. Phase A реализована и имеет авторские23 tests/types/lint PASS до merge; independent focused recheck открыт: unused focus в01/02 не должен отключать camera/отдельный screen pane. Fix/verification pending, formal Zoom QE не завершён.

- [Текущий план](06_implementation_plan.md), [execution snapshot с exact refs/SHA](step6-plan-snapshot.json), [handoff](architecture-handoff.md).
- [Точный scope42 editable+20 read-only](scope-inventory.json), [source pins](source-pins.json), [design source pins](design-source-pins.json).
- [Closed ideation root report](03.5_ideation_report.md), [requirements](01_requirements.md), [ADR](03_adr/), [архитектура](05_architecture.md), [OpenSpec revision](requirements-revision.json).
- [Approved selector](ui-approval.md); core9/OpenSpec/UI и исторический R3 dossier не менялись. Plaintext states не объявляются отдельно принятыми owner.

Добавлены только B editable `apps/worker/src/render/probe.ts` (SAR producer) и `packages/shared/src/enums.ts` (canonical CHECK enums032). `tests/enums.test.ts` добавлен как неизменяемый measured guard; catch-all нельзя ослаблять. Девять TASK,12 точных AM,11 conditions и XL сохранены. Исторические scope40/19 в closed core9 остаются историей; актуальный execution scope —62 measured.

После команды owner resume: root рассматривает PhaseA finding/fix и текущие source hashes, выполняет pending PhaseB gates/admission/full context, затем отдельно решает code GO. Этот документ не разрешает B writer. Архив прежних7 документов: `history/step6-before-phase-b-readiness/`. В этой правке не выполнялись source edits/Git/stash/commit/QE/runtime; новый helper/gate прогон отложен по owner pause.
