> **PROPOSED PRIVATE DRAFT — FR6 + QE2 repair, 06.11.2026.** Planning only; W/native/code неизменны. Source afc6 не принят: KCQE-04…09 unresolved. Adoption, originating reviews/gates и implementation допускаются только отдельно.

# Зачем
Pinned c12 control flow позволяет вывести HTTP201 checkout, но это не wire capture; browser QA не сохранил body/intent перед навигацией, exact response_at отсутствует. Read-only exact account+browser idempotency key и provider GET уже доказали одно новое TEST pending намерение. Закрытый оператор корректно остановился; существующий reconcile требует new_checkout, которого при lost response нет. Нужна ограниченная recovery-возможность без повторного оформления и без подделки успеха исходного helper.

Последующая read-only сверка06.11.2026,11:08:37Z показала у того же provider payment canceled/unpaid/expired_on_confirmation, при DB intent=created и отсутствующем confirmation URL. Нужен также прямой terminal-only metadata путь из failed origin без фиктивного pending binding. Эта сверка не доказывает текущую полноту payment/event/grant inventory.

# Изменение
Устойчивый захват checkout evidence до навигации, безопасный diagnostic code и отдельный reviewed recovery известного checkout по точной исходной попытке. Все исходные journals/conditions сохраняются. Связь operator request_key и отличающегося browser idempotency_key фиксируется явно.

Для exact expired origin — source-bound fresh preflight, permanent B1 fence и explicit metadata reconcile под прежними locks с полным canonical cutover/ledger proof; без callback/session/checkout, pending bound или active_case. Stale DB status сохраняется; automatic expiry не считается decline/manual-cancel PASS. Pending follow-up путь сохраняется для фактически pending target; неизвестные event/delivery history и partial closure остаются STOP.

# Отдельная supporting QA delta: administrative disposition
При недоказуемой historical A0 выбрать distinct typed `administrative-terminal-disposition-v1` для единственного exact исходного target. Это не recovery mode `terminal_from_origin`, не снятие его A0 и не wording clarification. Original failed/consumed_unknown, разные keys, source/windows и `A0=NOT_VERIFIED` сохраняются; новый action по исходному платежу запрещён навсегда. Прежний unknown recovery остаётся STOP.

Только independently complete fresh terminal/no-financial-effects evidence, exact non-temporal identity, no-inflight/allowed-actor census, permanent old-action fence, full BOTH-store/history/delivery/actual-event ACK24h gate и finite source/metadata authority могут допустить две **administrative** closure в прежних журналах. Same D1 real-I/O/live-L/reader-resync используется с distinct witness kind; отсутствующее/partial свидетельство не восстанавливается. Admin операция имеет0callback/session/checkout/provider mutation и не меняет application DB/intent/grants.

Будущий уже согласованный TEST — отдельный fresh ordinary GO/fullgate после joint admin confirmation. Единственное явное исключение в bounded caller-held derivative state admission позволяет ровно один переход от этого quarantined original к новому обычному attempt: exact original unknown добавляется в immutable history, не completed; старые used/proof/case остаются. Дальше обычный lifecycle, no reusable exemption. Unchanged canonical operator не получает новую семантику и под held route не вызывается. Если любой safety conjunct неизвестен — STOP, не waiver.

Обязательные реальные decline/manual-cancel, paid clip и3-role/referral/revenue CJM не сокращаются. Исходный expired сценарий остаётся decline/manual-cancel NOT_VERIFIED; новые настоящие сценарии проходят полноценную приёмку. Никакого retry исходного checkout или нового namespace ради обхода unknown.

# QE2: уточнение прежних safety contracts
Actual QE2 не принял код: late action finalization, whole-scope/phase guards и collector/history consistency требуют structural repair. D1a записывает все final business/admission markers и phase до live L_action, но все consumers считают их UNRESOLVED без exact valid completion. После L audit добавляет только immutable completion, сохраняя canonical bytes/значения остальных полей и previous entries. Late business → noL/nocompletion/STOP; liveL+lateaudit → candidate, freshGO/bothlocks и actual journalFD→parentdir fsync→exactreadback нужны до нового action; producer success отдельно. Closed versioned schema, whole projections с exact exclusions, immutable per-ticket snapshots/anchor/predecessor, generation/fork/rollback и finite immutable ordinary descriptor roster с exact whole P→T→separate GO/head→once binding в existing used[id], без hashcycle; deadline-only rebind запрещён отдельным control05D1a.2,1MiB/STOP-before-effect —05D1a; unknown не разрешает следующий ticket. Existing adapter получает explicit bounded revalidation seam вместо несуществующего hook; immutable original не меняется. Global BOTH-store correlation, required SQL fields/scoped reads и честные per-store coverage cuts обязательны также для FR6. Это исправление FR2–FR5, не новый user-facing scope и не закрытие findings.17/17 не является acceptance.

# Граница
Только приватный QA/оператор TEST clipmkr.ru; production handlers/auth/payment policy, grants/ledger, Cloud/DNS не меняются. Основной план в features/recover-known-checkout-response/. Новая delta сама не является gate или runtime GO.

# Supporting QA packaging revision3 (PROPOSED)
Только test-only extraction05T/06TASK-8:6private+3public, TShelper строки cases в прежнем процессе; общий lint≤500, private<700, exact parity. FR1–FR6/user CJM/14design/9KCQE/round budget unchanged; actual installation/K1/K2/review ещё обязательны, не GO.
