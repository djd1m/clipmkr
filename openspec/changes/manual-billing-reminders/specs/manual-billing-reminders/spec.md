## ADDED Requirements

### Requirement: Manual action boundary
Тик и GET ссылки SHALL создавать0payment intents/POST. Existing checkout/RUB/цены/receipt/grants SHALL сохраняться; отсутствующий save_payment_method SHALL быть только boolean false, без saved method id.
#### Scenario: Native email journey
- **WHEN** реальный Next/auth пользователь получает synthetic mail и открывает CTA/login/upgrade
- **THEN** доступен существующий экран, paymentPOST/intents0; adapter false проверен отдельно

### Requirement: Rights and LIVE qualification
Система SHALL считать конец текущего непрерывного union фактически выданных payment base/addon/eligible legacy intervals со смежной future цепочкой. TEST/unknown и remaining0 SHALL NOT сокращать права/tail; disconnected future/trial/recovery/bonus не продлевают текущую компоненту. Send SHALL требовать verified LIVE intent/payment identity в компоненте, active/verified account без owner/operator exemption. Недоказанный legacy SHALL suppress send без изменения прав.
#### Scenario: Mixed paid continuation
- **GIVEN** LIVE base имеет смежный TEST addon/пакет с более поздним end
- **WHEN** scheduler вычисляет срок
- **THEN** используется полный end; чисто TEST/unknown компонент без LIVE proof не получает email
#### Scenario: Refund scope
- **WHEN** refund/review относится к актуальным interval/LIVE qualification или только несвязанной старой покупке
- **THEN** актуальная неопределённость временно suppresses до сверки без HTTP/attempt/new key, сохраняя нетерминальный event; одна старая запись не блокирует account навсегда, grants не меняются

### Requirement: Timing and immutable identity
Система SHALL иметь UNIQUE(account,end,offset):3 при24h<remaining<=72h,1 при0<remaining<=24h. Email SHALL обозначать exact date МСК как конец текущего непрерывного периода доступа по пакетам, а не срок каждого отдельного пакета; индивидуальные сроки и бессрочные кредиты сохраняются. CTA SHALL вести GET /upgrade без обещания исчезновения всех кредитов/клипов. End SHALL быть unclamped; current interval обязателен.
#### Scenario: Delayed scheduler
- **WHEN** первый tick за20h до end либо на end
- **THEN** остаётся только1 либо0; missed3 не догоняется

### Requirement: Revalidation and retry safety
Каждый dispatch SHALL перечитывать account/email/end/offset/proof/refund под account→credit→notice locks; network внеTX. После first attempt payload/key SHALL быть immutable, max3 attempts/interval1h/budget<23h; accepted≠delivered. Lease timeout/unknown SHALL NOT создавать новый key; stale completion CAS.
#### Scenario: Purchase and email changes
- **WHEN** покупка/status/email committed до final claim
- **THEN** устаревшая отправка подавляется; после first attempt смена адреса не создаёт новый logical event
#### Scenario: Crash and clock rollback
- **WHEN** ответ потерян/lease истёк/часы ушли назад
- **THEN** same-key retry только при валидном окне; backward/23h exhausted→no send, stale completion не перезаписывает новый state

### Requirement: Reconciliation without a new event
Relevant refund/review/неполный LIVE proof SHALL defer существующий pending/failed/unknown без HTTP/attempt/new key; attempts, first/last timestamps и frozen payload/hash/key сохраняются. Возобновление SHALL требовать тот же end/offset, действующее окно, полную eligibility/verified LIVE без relevant refund/review и прежние max3/1h/<23h после first attempt.
#### Scenario: Reconciliation before first attempt and after unknown
- **GIVEN** существующий pending без попыток либо unknown с frozen payload/key и не исчерпанными лимитами
- **WHEN** relevant review/неполный proof подавляет claim, затем сверка снимает неопределённость при том же end/offset и действующем окне
- **THEN** до сверки HTTP0 и attempt delta0, после неё разрешена одна отправка того же event/key при полной eligibility; после unknown bytes/recipient не меняются, max3/1h/<23h не сбрасываются
#### Scenario: Reconciliation after expiry or recipient change
- **WHEN** до снятия неопределённости истекло окно/retry budget, изменился tail/offset либо status/recipient стал недопустимым, включая смену email после attempt
- **THEN** старый event superseded и не возобновляется; новый key для него не создаётся
#### Scenario: Terminal event or erasure
- **WHEN** discovery снова видит accepted/superseded event либо account удаляется
- **THEN** terminal event не открывается; erasure удаляет journal по CASCADE

### Requirement: Bounded rollout
Delivery flag SHALL быть optional/default false; missing mail SHALL NOT ломать startup/health/checkout. Billing SHALL запускаться после media с≤4HTTP/tick/≤2concurrent/20s monotonic admission и short DB waits. Logs SHALL исключать rawPII/keys. Journal031 SHALL следовать accepted payment030; оферта/даты/notices вне scope.
#### Scenario: Slow mail and locked account
- **WHEN** HTTP fixture тормозит, один account lock удержан, wall clock откатывается
- **THEN** остальные кандидаты имеют positive progress, отправок≤4/inflight≤2, budget продолжает истекать; media уже выполнена, busy claim не расходует attempt
