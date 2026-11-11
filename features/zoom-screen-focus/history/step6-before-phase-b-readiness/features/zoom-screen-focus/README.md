# Zoom: «Фокус на действии»

Статус: **Phase A eligibility gates pending; Phase B блокирует TASK-0**. Genuine QCSD R3 closed, все11 условий проверены исходными ролями. Pure parts TASK-1/4 могут идти параллельно Original только после actual supported checkpoints/K1/K2/admission/full context/root GO. GO ещё нет; код Phase A не написан. Phase B требует genuine SOURCE acceptance и интеграции Original.

Worktree `/home/clipmkr-zoom-screen-focus`; base revision `1a7f17f66d83bacf07dd07c513a3cfad03837330`.

- [Канонический итог Step3.5, оформляемый root](03.5_ideation_report.md).
- [План Phase A/B и обязательный TASK-0 для B](06_implementation_plan.md), [актуальная передача](architecture-handoff.md), [post-ideation снимок плана](step6-plan-snapshot.json).
- [Консервативный XL /40 editable и19 read-only](00_complexity_assessment.md), [точный scope](scope-inventory.json).
- [ZF01–10 и AC01–10](01_requirements.md), [OpenSpec hashes](requirements-revision.json), [ADR](03_adr/), [архитектура](05_architecture.md).
- [Reuse/tests/guards](02_reuse_inventory.md), [исходные SHA](source-pins.json), [исторический R3 design dossier](history/ideation-r3-closed-plan/features/zoom-screen-focus/design-dossier.json).
- [Согласование selector](ui-approval.md), [selector HTML](selector-mockup.html), [ограничения макета](mockup-review.md).

QCSD closure: revision `e66723874cc112533766c6896c800786109567d430efd4f5a7ff1b30382acfdd`, nonce `0276c1f3-2f7b-4e38-96c4-10258020aca1`. Closed core9 сохранён; финальный06 подготовлен после closure и не объявляется отдельно просмотренным шестью ролями.

Согласованный selector03/01/02 не требует повторного одобрения. Plaintext states в существующих областях не выдаются за отдельно принятый владельцем UI; media/UI/screen-reader приёмка реализации остаётся обязательной. Candidate Original и прежний E2E не заменяют его genuine SOURCE acceptance и exact integration proof.

Root интегрирует/коммитит/пушит потоки последовательно. Авторы этого плана не выполняли код, product tests, K1/K2, DB/S3, commit/push или production операции.


Engineering reorder сохраняет 9 TASK,12 точных AM,11 conditions,59 measured targets(40 editable/19 read-only). Exact Phase A allowlist — шесть файлов в06/snapshot: shared geometry/timeline, isolated graph, два synthetic test-файла и vitest aliases. DB/RPC/queue/publish/UI/Original leaf, legacy compaction wiring и source/model calls только Phase B. Phase A tests не доказывают integration/seed coverage. Архив предыдущего19 302-байтного плана/metadata: `history/step6-before-parallel-pure/`; более раннего30 453-байтного: `history/step6-pre-context-compaction/`. Current helper readiness фиксируется в snapshot; не K1/K2/code GO.

Current readiness-only: план16 453байта; полный literal94 937/98 304байта (target≤95 000), без усечения. Canonical check-code-targets→build-coder-context дали exit0 `admitted`→exit0 `complete`, diagnostics[]. Это не допуск; root выполняет actual gates/GO для Phase A и отдельно TASK-0/fresh admission для B.
