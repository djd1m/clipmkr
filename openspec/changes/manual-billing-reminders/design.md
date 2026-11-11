## Context
M/12, proposed r2. Owner «реализуем2и3»; payment-environments first. Оферта опубликована9312564/docs8ea82, прежний legal draft только история.

## Goals / Non-Goals
Два manual emails по end текущей непрерывной цепочки. Не менять права/финансы/UI/оферту; не строить recurring/framework.

## Decisions
ADR-001/05: полный entitlement union base/addon/eligible legacy, включая TEST/unknown; отдельный verified LIVE identity proof допускает отправку. Event(account,end,offset), immutable payload/key после first attempt; final serialized claim,HTTP внеTX, max3/<23h. Временный relevant refund/review/неполный LIVE proof оставляет pending/failed/unknown без HTTP/attempt/new key; после сверки тот же event возобновляется только при том же end/offset, действующем окне, полной eligibility и прежних max3/1h/<23h. Timestamps/payload/key не сбрасываются; terminal accepted/superseded не открываются. Изменённый tail/offset, истёкшее окно/исчерпание или недопустимый status/recipient→superseded; erasure→CASCADE. Дата письма — конец текущего непрерывного периода доступа по пакетам, индивидуальные сроки и бессрочные кредиты прежние.031 после030; flag=false. Dispatch после media≤2concurrent/≤4tick,20s monotonic admission и short DB locks.0paymentPOST при tick/CTA GET.

## Risks / Trade-offs
Accepted≠delivered; outage/clock rollback пропускает письмо; релевантные refund/review suppress до сверки, без продления окна или retry budget. После commit dispatch письмо нельзя отозвать атомарно. Budget20s ограничивает admission, не весь watchdog.

## Migration Plan
Fresh QCSD нормативного контракта выполняется параллельно завершению payment-environments, затем06. До кода/031 дождаться merge final accepted030 source, фактически перепроверить proof/locks/optional false/migrations, закрепить final revision и пройти K1/K2. При влияющем на QCSD расхождении — независимая проверка затронутой дельты. Candidate не является accepted source; dependency pins пока pending. Поставка2 предшествует поставке3.031 additive/default-off; rollback flag off без restore. Existing isolated PG/Redis/mail/Next fixtures.

## Open Questions
Решений владельца по оферте здесь больше нет. Final dependency fields/SHA ещё не готовы; это порядок интеграции, не разрешение пропустить gates.
