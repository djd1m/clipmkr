# ADR-002: Сверять финансовую историю по внешнему происхождению

## Status
proposed — пересмотреть после shop/invoice inventory; до cutover обратимо.
## Context
В native схеме уникальны provider/payment и provider/event, но shop/mode не колонки этих ключей; UUID intent передаётся внешнему provider. Credits и referral отчёты зависят от snapshots и fulfilled_at.
## Decision Drivers
Высокий: FR-5/6/7, ни двойного grant, ни потери события; высокий: совместимость поздних webhook; средний: сохранить native расчёты.
## Considered Options
| Вариант | Плюс | Минус |
|---|---|---|
| Суммировать balances, заново выдать grants | Быстро виден общий баланс | Теряются expiry/reservations/provenance, возникает повторный trial |
| Импортировать все rows с conflict ignore | Минимальная логика | Чужой shop event может подавить настоящий платёж |
| Reconciliation intents/events/grants | Сохраняет проверяемую историю | Нужны shop/mode mapping и replay тесты |
## Decision
Выбрать полную сверку ledger с shop/mode provenance и mapping external order IDs. Однозначно один внешний факт сохраняет один эффект; разные события с collision native unique требуют отдельно согласованного расширения schema/routing до импорта, не префикса к реальному provider ID. Подтверждать account, intent, amount, currency/provider contract, fulfilled snapshot, refund/needs_review и payment_ref вместе. Перенос не вызывает fulfillment повторно.
Freeze новых checkout требует inventory pending intents, durable приёма/повтора поздних callback и единственного authoritative обработчика. Смена callback допускается только root в согласованное окно с подтверждёнными shop/mode. Историческое TEST exception ограничено его исходным окном; live billing не включается. Native schema может не хранить test flag: безопасный статус происхождения должен быть установлен вне предположений.
## Rationale
Сохраняет FR-5/6, позволяет сверять FR-7 по native формуле. Само равенство provider ID недостаточно при неизвестных shops, а неодинаковые ID не разрешают повторно выдавать один entitlement.
## Consequences
Плюс: проверяемые деньги и пользовательские права. Минус: pending/refund cases могут задержать перенос; mitigation — отдельный reconciliation ledger и STOP на неизвестном. Credits остаются в секундах, деньги в minor units, expiry не продлевается переносом. `original_entitlement_ref` проверяется даже без FK. Follow-up: schema ADR при реальных shop collisions. After-action: root/владелец после первого закрытого календарного месяца.
## Confirmation
Method: existing payment/credit/blogger PG tests + новые A3; replay до/после cutover, суммы/резервы/возвраты по каждому владельцу. Monitoring: duplicate effect, unmatched event и grant divergence. Success metric: 0 необъяснённых расхождений; integer20/30/null и Moscow границы месяца совпадают. Owner: root + независимый billing reviewer. Load-bearing property: один внешний платёж — один эффект. Required automated check: будущий `consolidation_payment_replay_once` (файл после K1). Given reused provider ID из неподтверждённого shop, when dry-run, then STOP; Given повтор подтверждённого события, then unchanged grant. Provider недоступен — перенос спорного события блокируется. NOT RUN.
