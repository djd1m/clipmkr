# Сверка трёх существующих TEST-намерений — R3 proposed

## Why

По переданному координатором наблюдению три намерения текущей БД остались created:
у настоящего TEST-провайдера два canceled и один succeeded. В текущей БД payment-строк
не обнаружено; legacy receiver записал succeeded как unknown_intent и ответил HTTP 200.
Это входное наблюдение расследования, а не повторная проверка данным автором и не
гарантия неизменности состояния. Свежая сверка обязательна перед любым применением.

## What Changes

- Добавить закрытую операторскую сверку только заранее определённых TEST-намерений.
- По умолчанию выполнять dry-run; в каждом apply запуске обрабатывать ровно один
  selected case из трёх: succeeded через canonical apply, canceled через guarded canonical cancellation.
- Для succeeded проверять provider/refunds/владение; для canceled проверять официальный
  terminal canceled/paid=false и отсутствие financial facts в проверенном off/drained окне
  ДО S receiver activation; один row lock не объявляется сериализацией frozen native.
- Различать API observation и source применения: собственный event получает API-proof hash,
  native-first сохраняет исходный hash. Неизвестный источник/COMMIT остаётся unresolved.
- Dry-run/ранний refusal не пишет DB/provider/proof/outcome. Общий deadline включает PG.
- Сохранять canonical captured_at/период; expired/неожиданный период вызывает rollback/эскалацию,
  без новой политики продления или отдельного финансового writer.
- Закрыть три существующих намерения без выдуманной пользовательской аутентификации;
  canceled получает только external proof/outcome, без финансового event или grant.

## Impact

Авторитетные решения и выполнение: `features/reconcile-yookassa-test-intent/`.
Предпочтительный запуск CLI — controller Node 22 через штатный закрытый SSH DB tunnel.
Web/worker images, deployed source `8859`, compose, почтовый контур и схема сохраняются.
Новые таблицы, daemon, OSS, открытый API и прямые SQL grants не предлагаются.
S-фича test-payment-window сохраняет собственные артефакты; её native first acceptance
не закрывается API-сверкой. Предлагается отдельная поправка S/M: после M-terminal состояния
трёх intent и route/origin/timer admission ограниченно открыть создание одной новой TEST
оплаты через UI, немедленно заморозить checkout, получить настоящий callback и лишь затем
рассматривать полное тестовое окно. Новое неожиданное создание вызывает freeze/drain.
Контракт должен быть отдельно согласован и принят в S до исполнения; QA список не заменяет
контроль глобального canary. Эта M-поставка не реализует открытие окна или изменения proxy.
Поручение владельца обработать намерения позволяет root принять документы/план в
делегированном scope после closed QCSD. R3 plan пока draft; выполнение зависит от
M-гейтов, независимого QE и live admission. QCSD R2 выполнен, recheck R3 ещё нет.
