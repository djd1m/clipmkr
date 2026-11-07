> 07.11.2026: owner-approved clean-before-write delta; code/QE/runtime допуск отдельный. Прежняя история —08.

# Требования: восстановление известного TEST checkout

## Наблюдение

Исторические QE2 findings/receipts сохранены в08 и Git; эта редакция не закрывает их.
HTTP201 выведен из pinned c12 control flow: case.request сохраняется только после r.status()===201. Это не wire capture; request — parsed postDataJSON projection, exact response_at отсутствует. Helper завершился1 до intentId/redirect URL; original failed case сохранён. Read-only exact account/browser key и provider GET подтвердили одно TEST pending намерение и0payment/event; own-session revoke и failed callback/STOP1 сохранены в исходных receipts. Local Chrome/fsync probe20/20 подтверждает класс race, не точную masked live exception.

Clarification после codeQE cycle1: KCQE-01…06 открыты. Candidate controller bound [authentic case.checkoutClickAt, bridge-completion.completedAt] не является установленным clock/source/causal proof. Corrected observation даёт одного approved owner из четырёх main rows; TEST/shop/amount/order correlation всех четырёх не является ownership/history GO. Initial applied inventory совпадает с original runtime-spec.inventory; later manifest законно иной. Это техническое уточнение evidence прежних FR, не изменение user scope. Для прежней clarification OpenSpec hashes/bytes сохранялись; новая supporting QA delta FR6 ниже явно изменяет proposed ledger, не actual W.

Обновление06.11.2026,11:08:37Z: свежая read-only сверка exact original target показала provider `canceled/paid=false`, reason `expired_on_confirmation`, без confirmation URL; DB intent всё ещё `created`. Это последующее состояние той же попытки, не новая покупка и не успешный decline/cancel тест. Данная сверка не читала payment/events/grants и не заменяет fresh whole BOTH-store inventory перед reconcile. Original operation остаётся `incomplete_pending`, original open — `consumed_unknown`.

## Заинтересованные стороны и граница
Владелец ожидает полный настоящий TEST E2E и отсутствие лишних покупок. Исполнитель/QA нуждается в восстановлении existing attempt. Пользовательский UI/тарифы/бизнес-платежи не меняются. Авторизация — исходное автономное TEST задание; конкретные requirements/ADR/plan/gates/QE до code/runtime сохраняются. Старый callback09305c QE4 CLOSED и его limit не переоткрываются.

## Требования и критерии
FR1: один реальный POST, захват request/status/body до навигации; actual Chrome RED→GREEN и safe diagnostics; без подмены provider/успеха.
FR2: recovery только exact original operation/ticket/case/account/browser key/window/intent/provider/test/shop/SKU/amount; разные operator request_key и browser key не переписываются и связываются explicit.
FR3: failed/consumed-unknown provenance не превращается в completed; собственный recovery receipt и явный одноразовый переход, без нового checkout или очистки старого state. Допустимый pending не означает terminal/no_pending; обязательны свежие positive identity/control/health before followup.
Для уже expired original target допустим отдельный прямой metadata reconcile: exact canceled/unpaid/expired_on_confirmation с сохранённым DB intent=created и доказанным отсутствием target payment/grant, только после source-bound fresh identity/control/health, полного canonical cutover и complete event/delivery history. Он не создаёт pending `bound`, `active_case`, callback, session или checkout; исходная failed история и stale DB status сохраняются. Обе durable closure обязательны до следующего обычного admission. Unknown/mismatch, неполный inventory или неизвестная/слишком свежая relevant event bound → STOP. Provider GET сам не webhook event и не создаёт новое24h окно; все actual relevant events сохраняют canonical24h. Outcome `expired_before_recovery` означает decline/manual-cancel NOT VERIFIED. Pending recovery остаётся доступным только при фактически pending target.
FR4: locks/24h/global-off/sole approved target/no historical grant/relay/native writer/own-session positive cleanup сохраняются. Нет вызова protected generic paid-job oracle.
FR5: новые источники reviewed/frozen; реальные negative/FD/process/Chrome fixtures, independent cross-model QE, measured targets и anti-drift до runtime. Любое unknown completion recovery/текущего action → STOP и durable recovery evidence. Отдельная proposed FR6 допускает только forensic unknown единственного original через собственный full terminal predicate; никакой financial/current-action unknown не освобождается.

FR6 (supporting QA contract, не новый user-facing scope): distinct `administrative-terminal-disposition-v1` допускается только после новой requirements/ADR/gates/independent verification и отдельного finite GO. Root разрешил подготовку этого варианта, не code/runtime. A0 existing recovery неизменна; historical unknown сохраняется как NOT_VERIFIED, не guessed201/time/offset.
- Exact original non-temporal identity + independently proven fresh canceled/unpaid/expired/noncapturable,0target payments/grants/delivery obligations, full retained BOTH-store/history/correlation/no-inflight/allowed-actor proof и actual event ACK24h обязательны. Missing/unknown/other target/current action/partial → STOP.
- Admin producer под original continuous locks пишет только typed two-journal disposition и distinct D1 confirmation; не переводит old business/used/case в success и не вызывает callback/session/checkout. Original source/keys/windows/raw не меняются, B1 permanent; DB stale status сохраняется.
- Только после admin joint+reader resync отдельный fresh ordinary GO/fullgate допускает one-time explicit caller-held state-admission exception, durable consume перед любым effect и exact immutable archive original unknown before first current checkout. Original case/used/proof остаются, key dedup/fence продолжаются. No implicit canonical propagation/retry/namespace reset.
- Old decline/manual-cancel NOT_VERIFIED; все mandatory real decline/manual-cancel/paid-clip/3roles acceptance остаются. Никакая administrative запись не является финансовым действием или доказательством user CJM.

Уточнение реализации FR2–FR5 по QE2, без расширения user scope: все final business/admission markers записываются до live L_action; без exact D1a completion любой consumer считает их UNRESOLVED. Post-L audit добавляет только immutable completion при equality всех иных полей и прежних entries; следующему entry нужны exact closed schema/snapshots/chain, fresh authority и real journal reader durability, либо STOP. Late business не создаёт L/completion; late audit после genuine L оставляет лишь candidate. Finite immutable ordinary descriptor roster/cap и1MiB проверяются доeffect; whole context→ticket→отдельный GO/head→once binding при consume по05D1a.2, включая deadline-only refusal. History/tickets не переписываются. Общий held-scope/previous-unknown guard предшествует snapshots/health и каждой persist; ordinary ticket связывает exact phase/current case. Полный BOTH-store proof запрещает cross-store provider/intent/owner collisions и raw event contradictions. Collector/consumer обязаны согласовать реальные SELECT fields, bounded dependent sets и честные coverage cuts; неизвестность не исправляется fabricated timestamp/flag. Эти требования действуют также внутри proposed FR6.

Уточнение владельца07.11 (KCQE-05): pristine до первой progress-записи допускает только новый явный вход с полным fresh preflight; partial/unknown сохраняют STOP. Точный контракт — OpenSpec «Новый явный вход до первой записи»; отсутствие artifacts не GO.

NFR: документыRU, secrets/private IDs/provider URL вне Git; минимум готовых existing blocks; никакого нового daemon/runtime/container.

Packaging05T/06TASK-8: только testcase extraction,6private+3public; TS lint≤500/private<700, exact parity. FR1–FR6/AM-1…20/14design/9KCQE и round budget unchanged; K1 новых имён NOT_ESTABLISHED.

## Переиспользование
Канонические captured executor/launcher и reviewed bridge, существующие browser/native guard/cleanup и read-only BOTH-store collector — владельцы invariants. Не копировать financial dispatcher/ledger в новый framework. Подробный inventory и обязательный выбор альтернатив — архитектор до code.

## Ledger revision3 — supporting QA packaging
Текущие OpenSpec bytes (clean-boundary согласован; иные допуски отдельны): OpenSpec `openspec/changes/recover-known-checkout-response/proposal.md`, SHA-256 `82d270724eee14b96ebab706880036e4946ac7e10e8a47b1aa3042a3a827cb76`; `openspec/changes/recover-known-checkout-response/specs/payment-qa-recovery/spec.md`, SHA-256 `23310a0e989f1dd1f3e9175d8026fcc305616222299b910e5a8c88da293183f1`. Hashes измерены по actual private proposed bytes текущего integrated bundle. Actual adoption/checkpoints/QCSD/K1/K2 и code review выполняются отдельно в том же feature.

## Planning-only authorization и предел доказательства
Все FR1–FR5 recovery predicates действуют для своих existing modes; FR6 — явная supporting QA requirements delta, не их silent fallback. Root delegated TEST authority покрывает draft выбора; дальнейшие gate/implementation/execution permissions отдельны. Завершённый codeQE2 на sourceSet prefix afc6/native revision a9905f80a820bff04bb2124d8b25f231ba77f9cf83c351555eae3acafae35275 не принимал код и не оценивает этот новый draft.14 design conditions и9 KCQE сохраняют meanings/lineage; никаких closures здесь.

## Открытые решения
Минимальный безопасный recovery переход и его provenance, способ pre-navigation body capture, crash/partial record strategy выбираются в ADR; source code/runtime до настоящих gates не разрешены этим документом.
