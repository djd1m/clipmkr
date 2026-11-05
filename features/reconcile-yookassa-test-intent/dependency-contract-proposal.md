# Предложение поправки S/M: старые intent → новая native TEST-оплата

Статус: **R3 proposed** после QCSD R2, не утверждённая S-поправка. S-артефакты не меняются.
Root принимает решения в делегированном плане владельца; этот документ не утверждает,
что владелец заранее одобрил конкретный canary. Реализации/apply canary в M нет.

## Порядок допуска

M выполняется **до активации S receiver**: public payments off/provider absent, current-DB
writers/ingress drained, shared TEST checkouts/refund writers frozen по private admission M.
Legacy receiver отдельной DB не является препятствием uniqueness M и не переносится.
После трёх resolved terminal readback M отдаёт private manifest/proofs/outcomes/source root.
M не доказывает native delivery: старый succeeded уже ACKed legacy HTTP 200, повтор не обещан.
По [контракту уведомлений ЮKassa](https://yookassa.ru/developers/using-api/webhooks) HTTP 200
подтверждает получение, а прочие ответы повторяются в течение 24 часов; API GET не callback.

Предлагаемый отдельный S-путь устраняет цикл «checkout ждёт native, новый native требует
checkout». Его принятие и fresh exact dependency hashes/review нужны ДО opening. До этого
существующий native-only gate S действует; M ничего в нём не закрывает.

| Состояние | Обязательный вход | Действие / выход |
|---|---|---|
| M off/drained | M gates/QE + actual private admission; S receiver не активирован | 3 отдельных адресных runs, без opening/смены web |
| M terminal | Правильный succeeded/payment/grant/period, два canceled с no-financial readback, нет unresolved conflicts/rights review | Private outcomes/root handoff; source не native |
| S receiver ready | Принятая S-поправка, exact dependency hashes, loaded route/config, negative origin, actual TEST/shop, receiver live при checkout frozen | Проверенные timer/observer и отдельный canary admission |
| Canary creation | Frozen baseline и проверенный fail-close timer, полное наблюдение | Одно ожидаемое UI создание; global window ≤120s либо до первого создания, что раньше |
| Canary frozen/drained | Подтверждённый runtime checkout=false и drain всех creation in flight | Полный diff creations; только ровно один expected case разрешает TEST-card оплату/native acceptance |
| Native acceptance | Настоящий provider callback/штатная verification + один payment/grant + rights/relogin | Отдельное решение root о полном global TEST-окне |

## Измеримый oracle canary — ответственность S

S до canary определяет и проверяет concrete observations/timestamps/private operator,
связывая их с loaded runtime/actual DB/shop и reviewed source. Требование полноты не
выполняется только таймером, фильтром QA или одним ответом UI.

1. При подтверждённом checkout frozen и отсутствии creation in flight взять полный DB
   baseline множества intent IDs/provider bindings (не только QA и не только timestamp),
   сверить shared-shop provider inventory/pending. Сохранить snapshot/time/hash приватно.
2. Перед opening проверить receiver, current config, independent host timer, controller
   observer и связь с actual target. Timer закрывает checkout при смерти controller/SSH;
   отсутствие доказанного timer запрещает opening. Максимум 120s фиксируется admission.
3. Наблюдать ВСЕ creations от baseline. Первая expected creation, deadline, лишняя/unknown
   creation или потеря observation → немедленный запрос global freeze. Потерянный UI response
   не разрешает повтор checkout: сверить полный baseline/diff. QA список не auth allowlist.
4. Freeze подтверждается фактическим checkout=false/штатным отказом новых и повторных POST,
   загруженной конфигурацией и завершением ранее начатых checkout requests/provider calls.
   Успешный запрос изменить config сам по себе не freeze. Receiver остаётся живым. Unknown
   close/потеря observation запрещает продолжение, до подтверждения действует host guard.
5. После подтверждённого freeze И drain creation in flight зафиксировать конечный полный
   DB snapshot и разницу с baseline; сопоставить все provider creations/payment IDs этого
   окна, включая неизвестные/незавязанные на UI-response. Проверить отсутствие пропусков
   pagination/потерянных observations. Стабильный count или timestamp-фильтр недостаточны.
6. Ровно один expected intent + полная связность двух snapshots/provider inventory позволяет
   только native acceptance. Два одновременных создания до реакции observer, любой unknown
   ID, утрата baseline/полноты/доказанного drain → abort и drain ВСЕХ обнаруженных. Нельзя
   удалять/игнорировать чужой intent или выдавать глобальный canary за ограниченный QA.
7. После этого оплатить TEST-card на настоящей странице провайдера; receiver принимает
   native callback. Сохранить native source/result, один правильный payment/grant, права,
   relogin и duplicate без нового grant. API recovery не заменяет отсутствующий callback.

S обязан выбрать фактические средства наблюдения in-flight и независимого timer, затем
проверить их в собственном review/admission. Если available observability не доказывает
полноту шага 5, canary BLOCKED; M не добавляет daemon/DDL/новую allowlist ради обхода.

## Abort, источники и проверка зависимости

Любая лишняя/unknown creation, drift route/DB/shop, потеря timer/observer или deadline →
freeze/drain; full window запрещено. Receiver остаётся для всех уже созданных TEST-платежей.
Неизвестный close не называется closed. Каждая новая строка объясняется phase ledger,
без прямого SQL cancellation/grant. Pending/unknown case требует отдельного канонического пути.

- M собственный succeeded claim: API-proof hash в existing event и связанный readback.
- M native-first duplicate: исходный native hash/evidence, отдельная API observation;
  неизвестный источник остаётся unresolved. Native acceptance S этим не закрывается.
- M canceled: только API/external proof/outcome и terminal readback в M drained окне.
- S readiness: actual route/origin/timer/observation; сама по себе не payment acceptance.
- S native first acceptance: новая TEST-оплата и действительно полученный callback.

05_architecture.md M закрепляет exact SHA этого предложения и текущих S требований/плана/
OpenSpec. Root пересчитывает перед prepare/handoff; любой mismatch → stale_dependency и
новый prepare/review, никакого opening по старому snapshot. Принятие S-поправки меняет
зависимости: требуется обновить эти hashes и independently recheck соответствующие условия.

## Фальсифицирующие проверки S до canary

Два одновременных создания до freeze → abort/drain обоих; потерянный UI response → нет
повторного checkout; пропуск страницы/потеря observation → нет positive oracle; смерть
controller/SSH → actual frozen по host timer; receiver принимает callback во frozen состоянии;
unknown_close не даёт full admission; изменение одного байта зависимости блокирует handoff;
API M-proof никогда не удовлетворяет native gate. Все проверки **NOT RUN** в M. S отдельно
принимает scope/план и отвечает за evidence; M-автор не пишет успешные S receipts.
