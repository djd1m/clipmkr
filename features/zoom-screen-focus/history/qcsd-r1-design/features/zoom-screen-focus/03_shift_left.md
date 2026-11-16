# Shift-left: решения, риски и различающие проверки

Design-only11.11.2026. Применён pinned `qe-ref-shift-left-testing/REFERENCE.md` (upstream0a6de058575cbe292afe220df105cc74120f7674). Это собственный Level4 design analysis, не QCSD/swarm receipt, не запущенные тесты. Все4 ADR имеют Confirmation; исполнение проверок впереди.

| ADR | Что при нагрузке/отказе | Alternative failure / dependency down | Isolation | BDD и required check | Риск/mitigation |
|---|---|---|---|---|---|
|001|Слишком крупный source/timeout остаётся под existing worker budget; old MP4 доступен|Detector unavailable→screen сохраняется, camera omitted; invalid config→failed attempt, не legacy|Pure geometry отдельно; настоящий FFmpeg для filters|Given движущийся odd source и camera disappears, when render03, then action pixels+timestamps сохранены и camera veto виден; `tests/screen-layout-media.test.ts`|HIGH: ошибочное crop/слои; pixel grid+time counter, protected-zone intersection, legacy regression|
|002|Concurrent apply сериализуется video→clip; quota одной транзакцией|Redis down после commit→watchdog; stale fence→0 publish; storage PUT fail→old keys|Real PG transactions, controlled storage fault|Given same key twice after timeout и new later choice, when replay original, then sameoperation/0debit; `tests/clip-layout.integration.test.ts`|HIGH: деньги/данные; counts/ledger snapshot,2keys/1version,late old worker|
|003|Source seek buffering показывает loading/error без перезаписи draft|Original401/404/codec fail→explanation/old clip; noapply непросмотренного состояния|Mounted React+realRange fixture; request/job counters|Given dirty draft и pending seed/poll, when select/cancel/poll, then0rendercalls и тотже video node; `tests/browser/clip-layout.test.ts`|HIGH: UI скрывает side effect/losesdraft; mutation interception дополнена realDB apply tests|
|004|Priority1024 ниже normal0; active analysis≤30s, attempts≤2|Range ignored/timeouts/deletedsource→unavailable; workercrash→bounded lease recovery; late epoch discarded|RealPG/Redis; realworker OpenCV; controlled HTTP fixture|Given10concurrent opens и crash, when recovery, then1seed operation≤2attempts и0render/quota; `tests/clip-layout.integration.test.ts`,`tests/queue-redis.integration.test.ts`|HIGH: jobstorm/privacy/subprocess leak; deterministicidentity,finalCAS, descendant termination, log redaction|

## Discriminating oracles

1. **Normalized ROI:** randomized finite bounds+known colour grid; wrong x/y, odd rounding or swapped source dimensions must move expected pixels and fail. Include1920×1080,1817×969,1280×720,portrait and rotate90; SAR case explicit.
2. **Moving camera:** source camera region contains changing frame counter; output PiP must change and match screen timestamp. Frozen last frame/wrong side/loop fail.
3. **Context fallback:** important marker in each corner of selected screen; unknown focus must keep all four. Reintroducing podcast center crop removes at least one and fails.
4. **Protected action:** known coloured rectangle under proposed PiP/header/ASS/CTA. No protected pixel overwritten; intentionally shifting PiP/ASS onto it fails. Watermark boundary checked against actual canonical metrics.
5. **Timebase:** synthetic audio impulses + labelled frames before/after every cut; outputduration planDuration±1frame, screen/camera counters same. Crossfade test uses final FFmpeg; preview explicitly tests hard-cut midpoint policy.
6. **Replay/credit:** realPG before/after snapshots of video_credit_charge,quota_counter,transcript,selection+clips; concurrent samekey and retryafternewchoice. Broken duplicate admission changes counts. Owner unlimited и граница московского дня используют тот же admission contract, что advisory read. Mocking DB transaction does not close it.
7. **Fence:** hold first publish, accept next version, release old result; old keys/layout remain newer, stale objects cleaned per existing contract. Intentionally removing WHEREfence fails.
8. **Music/CTA sibling:** layout success→music rerender→CTA rerender preserve published layout; concurrent layout/music/CTA reject before extra quota. A layout input drop at getRenderInput fails pixel+DB check.
9. **Seed quota/privacy:**10prepare opens sameowner produce1cache generation; arbitrary foreignclip/revision/sourceURL rejected identically; completed/unavailable cache stops refresh work. URLs containing token sentinel must never appear in capturedlogs/errors/queue rows.
10. **Seed recovery:** terminate Python while FFmpeg child active, advance cache lease, replay old completion; no orphan child, epoch0published, attemptlimit2. Kill only Python must make test fail.
11. **Range/budget:** controlled HTTP source with Range206, Range ignored200,416,moov-at-end,slowbody; terminaldeadline and measuredbytes recorded. No false claim of a3MBhardcap.
12. **UI mounted state:** real hydrated component, both themes390/1440, keyboardradio/focus/dialog escape,44px touch, nooverflow; static SSR alone insufficient. Realvideo frame callbacks and seeks exercised.

## Frozen guards и существующий долг

`tests/render.test.ts` source guard ищет устаревший `filters.push(source ? getFramingFilter`; indexOf=-1 способен ложно пройти. Новый oracle должен реально исполнять layer order либо явно проверять найденный graph, не заменить старую строку новой без RED. Legacy `not.toContain('pad=')` остаётся scoped только legacy. `scripts/test-framing-mutations.mjs` mutation `both-panels-left` имеет отсутствующий anchor; восстановить уникальную актуальную семантическую мутацию и доказать RED/GREEN с >0tests. No-match не PASS. Font/ONNX/metrics source pins неизменны; не перепривязывать SHA ради GREEN.

## Границы и unresolved acceptance

- Sampling0.5s и seed thresholds не доказывают identity/события между замерами. Зафиксированный contract — live pixels внутри подтверждённой ROI + observed absence veto + wholeclip human review. Если QCSD требует покадровую автоматическую гарантию, вернуть требования/дизайн координатору; не маркировать риск закрытым.
- Seed confidence rules — эвристика с измерением на выбранном corpus впереди, не calibrated probability. Приватный approved source используется только в явно разрешённом QA scope; статичный HTML936191… не render evidence.
- Native Range уменьшает ожидаемое чтение, но hard byte ceiling только existing source size per object; traffic/latency измеряются, не предсказываются.
- Missing browser codec/Source access не закрываются synthetic poster. Нужны real sameorigin playback и ограничения в отчёте.

## Вход Step3.5

Флаги HAS_UI=true, HAS_SECURITY=true, HAS_UX=true: нужны3core (qualitycriteria, risk assessor, requirementsvalidator) и3conditional (accessibility,security,QX). Координатор запускает реальные origin roles после freeze; этот документ не подменяет их выводы, HTSMscore или verdict. High риски выше имеют design mitigation, но их runtime proof ещё не выполнен.
