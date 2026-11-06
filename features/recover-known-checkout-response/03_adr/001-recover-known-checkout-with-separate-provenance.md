# ADR-001: Восстанавливать известный checkout отдельным доказательством происхождения

## Статус
`proposed`. Design rework R1 после actual ideation evaluate exit1: QCSQ-01, RISK-01/RISK-02, QT-01–QT-04 остаются открытыми до originating verification. Решение обратимо до исполнения recovery; повторно рассматривается при невозможности сохранить исходные identity и журнал.

## Контекст
Исходный POST получил201, но helper завершился до сохранения body. Известное pending намерение требует восстановления без повторного checkout и без изменения исходного failed результата.

## Драйверы решения
1. D1, высокий: один exact existing intent, без второго POST/ключа/аккаунта и без false success (FR1–FR3).
2. D2, высокий: original failed helper, разные operator/browser keys, execution identity и durable consume-before-action сохраняются (FR2–FR4).
3. D3, высокий: fresh control/health/TEST isolation,24h policy, native writer/cleanup остаются обязательными (FR4).
4. D4, средний: минимальная поправка private QA; исходники canonical executor/launcher/run/native и business code immutable (FR5/NFR).

## Рассмотренные варианты
| Вариант | Сильная сторона | Цена/ограничение |
|---|---|---|
| A. Узкий one-off recovery adapter + небольшой derivative bridge branch | Оставляет original executor и значения runtime/execution; reuse locks/revalidate/isolation/persistence; отдельная доказуемая provenance | Требует additive protocol fence в journal.binding, typed admission и тестирования перехода двух журналов |
| B. Новая версия canonical executor с recovery внутри `operator_business` | Один владелец всех business transitions | Меняет reviewed db0/execution equality; нужны explicit migration и новый review более широкого critical source; нельзя переписать SHA существующей операции |
| C. Повтор checkout с тем же browser key | Использует штатный idempotency path | Второй POST запрещён FR1; прошлый body не доказан, риск несовпадения key/window остаётся |
| D. Generic recovery framework/новый coordinator | Может обслуживать будущие сценарии | Новый lifecycle/authority/namespace; несоразмерен одному missing recovery case и D4 |

## Решение
Выбран A. Новый private `recover-known-checkout.private.py` принимает captured canonical namespace db0 через b9 launcher и exact origin proof; ничего не monkey-patch. Derivative bridge вызывает его только для binding известного failed attempt, ограниченного follow-up и terminal metadata reconciliation. Новые формы находятся в том же original bridge journal, а не в новом namespace. `used[original_open_ticket].state=consumed_unknown` и исходный `completed=false` никогда не становятся success.

Перед recovery тот же journal получает permanent `binding.recovery_protocol` с version/source-set/origin-binding digest; исходные `binding.runtime/execution` сохраняются побайтно в canonical JSON и в create-only snapshot. Actual old812 сравнивает **весь** binding с `{runtime,execution}` до `operate` и потому отказывает после additive fence. Новый bridge понимает обе формы только для одноразовой миграции; после fence обратный переход запрещён. Изменение формы journal binding — явная migration, не переписывание original executor SHA. Все business actions идут через этот bridge; inventory конкретных разрешённых entrypoints и tests их отказов —05B. Произвольное исполнение root собственного Python не входит в эту границу доверия.

Recovery proof имеет `kind=known-checkout-recovery-v1`, `original_response_captured=false`, собственный source/evidence digest, оба разных ключа, original operation/ticket/case/window и отдельно fresh action window. Он **не** создаёт `new_checkout`, **не** ставит `checkout_response_bound=true`, **не** передаётся old `admit` под видом response. Отдельный narrow admission проверяет поля и свежие canonical guards; old admission остаётся прежним. Bound pending разрешает лишь exact предусмотренный TEST follow-up, без нового checkout, relay или paid job.

После exact terminal outcome adapter может выполнить только metadata reconcile: reuse полной `cutover` с24ч от relevant event/upper bound и fresh terminal ledger proof; append original failed attempt + recovery receipt в `business_history`, установить `business=reconciled`/`reconciled_at`, затем снять recovered active_case. Исходные execution/runtime_binding сохраняются; никакого invented original response. Следующий checkout требует обычных новых GO/baseline и прежнего canonical маршрута.

FR1 реализуется в derivative browser через Playwright1.60.0 `route.fetch` с `maxRetries:0,maxRedirects:0` для единственного exact checkout POST, body/request/status fsync до `route.fulfill({response})`. Повтор/redirect/неполное сохранение приводит к STOP без дополнительного запроса. Это инструментированный Chrome, не свидетельство полностью нетронутого network path и не диагноз exact live exception.

## Обоснование
D1/D2 выполняются typed proof вместо семантической подмены response. D3 исполняется reuse canonical code и отдельным fresh preflight под теми же locks; known pending не проходит terminal cutover. A меньше B: не нужна миграция original executor SHA. C не отвечает one-POST; D создаёт ненужный lifecycle. Новый bridge/adapter/helper source set всё равно получает отдельный immutable capture/review binding; старый journal.binding не является доказательством новых source bytes.

R1 уточняет A: просто добавить recovery slot вне binding недостаточно — старый bridge его игнорирует. Permanent binding fence использует существующий отказ old812, удерживает отказ при partial reconcile и оставляет positive ordinary checkout через новый bridge после обеих closure. Known-target exception относится только к pending/terminal самого intent: полный event identity/history/delivery/ACK predicate и24h, isolation/completeness/stability/freshness/no-inflight сохранены явно в05A. Confirmation URL читается fixed read-only source из planned derivative runner; отсутствие доказуемой применимости допускает creation binding, но блокирует follow-up.

Root сверил [ЮKassa: процесс платежа, Redirect](https://yookassa.ru/developers/payment-acceptance/getting-started/payment-process): pending redirect использует confirmation_url; expires_at при waiting_for_capture не задаёт TTL pending формы. Поэтому fresh authenticated GET exact TEST payment и фактическая доступность его формы до submit проверяют текущую применимость, без вымышленного обязательного срока. Это вывод из переданного primary-source результата, не самостоятельная сетевая проверка архитектора и не гарантия будущей доступности URL. A1 задаёт fixed SQL/GET источник внутри одного существующего planned runner target.

## Последствия
Плюсы: исходная история читается без reinterpretation; существующий pending можно честно продолжить; terminal reconciliation не оставляет CJM заблокированным навсегда; приложение не меняется.

Цена: новая narrow authority обязана иметь independent review; crash между operation и bridge writes остаётся явным partial reconcile/STOP, без automatic retry. После fence старый bridge больше не допускается даже после успешного reconciliation; ordinary canonical business path вызывается новым bridge. Ожидание24ч действительно может остановить следующий checkout; нельзя сократить окно или назвать pending терминальным. Private sources ограничивают переносимость тестов: public SHA не заменяет review actual bytes.

Следующие ADR сейчас не требуются. Если понадобится migration canonical execution binding, второй recovery slot, general replay или иной финансовый action — пересмотр scope/ADR до кода. After-action review: root/владелец после завершения текущего TEST CJM, не позднее06.12.2026, сравнить loss/duplicate/cleanup evidence.

## Confirmation
- Method: independent requirements-first review actual private bytes и executable fixtures; real Chrome/local HTTP/fsync RED→GREEN; real POSIX FD/process crash/concurrency probes.
- Monitoring: безопасные diagnostic codes, recovery/action journal states, counts checkout forwarded/blocked; runtime receipt без секретов.
- Success metric:20/20 original Chrome RED и20/20 candidate GREEN с ровно одним POST на попытку; все negative/partial/replay fixtures отказывают до business callback; unknown cleanup не считается завершённым.
- Owner: автор `gpt-6.1-sol high`; independent QE `gpt-6-astra xhigh`, отдельная сессия; serving identity документируется как фактически доступная, не выводится из requested role.
- Load-bearing property: exact reconstructed creation binding никогда не превращает lost original response/failed ticket в completed; повтор/partial не вызывает новый checkout; terminal metadata reconcile сохраняет обе истории и24h.
- Required automated check: `tests/recover-known-checkout-response.test.ts`, tests `reject fabricated original response and mismatched recovery`, `stop replay and partial recovery before callback`, `reconcile recovered terminal without rewriting origin`, `capture actual body before navigation with one forwarded POST`.
- R1 required checks в том же test file: `fence historical entries across every durable recovery boundary`, `preserve every canonical event predicate with one known pending`, `bind confirmation URL only to fresh read-only provider evidence`, `observe durable capture before browser receives response`, `distinguish expired origin evidence from active recovery authority`. Их barriers/minimal mutations определены в05/06; source-substring assertions не заменяют behavior.

## Shift-left: design risk analysis

Риск HIGH: duplicate financial action при crash/replay. Mitigation: original stable locks, durable consumed_unknown до callback, один recovery slot, no automatic retry; тест с process kill и повторным запуском. Риск HIGH: wrong original binding/ложный terminal. Mitigation: exact raw provenance, separate keys/windows, fresh BOTH-store evidence, no_pending только terminal gate; отрицательные мутации каждого поля.

При одновременных процессах второй не получает lock и не выполняет callback. При потере provider/DB/control или истечении окна — STOP с сохранением pending/partial. Решение проверяется в изоляции настоящими local files/locks/Chrome; внешние ответы в fixtures явно SIMULATED, не TEST E2E.

BDD: GIVEN original failed open, один exact pending и разные доказанные keys WHEN approved recovery связывает свежие факты THEN отдельный receipt становится bound, old ticket остаётся consumed_unknown, POST count не растёт. GIVEN bound recovery и process kill после durable consume WHEN новый запуск THEN STOP без callback. GIVEN exact terminal и fresh full24h-safe cutover WHEN explicit metadata reconcile THEN preserved history + reconciled, следующий checkout всё ещё требует нового canonical GO/baseline.
