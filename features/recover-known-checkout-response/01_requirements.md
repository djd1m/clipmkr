# Требования: восстановление известного TEST checkout

## Наблюдение
HTTP201 и original browser request сохранены; helper завершился1 до intentId/redirect URL. Read-only SQL exact account+browser key и provider GET подтвердили одно TEST pending намерение,0payment/event. Own temporary session действительно revoked, bridge failed callback/STOP1 сохранён. Причина live exception masked; собственный Chrome/localHTTP/fsync probe20/20 воспроизвёл Network.getResponseBody при immediate navigation. Это доказательство класса harness race, не наблюдение точной live exception.

## Заинтересованные стороны и граница
Владелец ожидает полный настоящий TEST E2E и отсутствие лишних покупок. Исполнитель/QA нуждается в восстановлении existing attempt. Пользовательский UI/тарифы/бизнес-платежи не меняются. Авторизация — исходное автономное TEST задание; конкретные requirements/ADR/plan/gates/QE до code/runtime сохраняются. Старый callback09305c QE4 CLOSED и его limit не переоткрываются.

## Требования и критерии
FR1: один реальный POST, захват request/status/body до навигации; actual Chrome RED→GREEN и safe diagnostics; без подмены provider/успеха.
FR2: recovery только exact original operation/ticket/case/account/browser key/window/intent/provider/test/shop/SKU/amount; разные operator request_key и browser key не переписываются и связываются explicit.
FR3: failed/consumed-unknown provenance не превращается в completed; собственный recovery receipt и явный одноразовый переход, без нового checkout или очистки старого state. Допустимый pending не означает terminal/no_pending; обязательны свежие positive identity/control/health before followup.
FR4: locks/24h/global-off/sole approved target/no historical grant/relay/native writer/own-session positive cleanup сохраняются. Нет вызова protected generic paid-job oracle.
FR5: новые источники reviewed/frozen; реальные negative/FD/process/Chrome fixtures, independent cross-model QE, measured targets и anti-drift до runtime. Любое unknown completion → STOP и durable recovery evidence.
NFR: документыRU, secrets/private IDs/provider URL вне Git; минимум готовых existing blocks; никакого нового daemon/runtime/container.

## Переиспользование
Канонические captured executor/launcher и reviewed bridge, существующие browser/native guard/cleanup и read-only BOTH-store collector — владельцы invariants. Не копировать financial dispatcher/ledger в новый framework. Подробный inventory и обязательный выбор альтернатив — архитектор до code.

## Ledger revision
OpenSpec `openspec/changes/recover-known-checkout-response/proposal.md`, SHA 2ae7ab82e411a23fe61fedfab4ecd34f847851b962cc45fd15a38b3cc3119d09; `openspec/changes/recover-known-checkout-response/specs/payment-qa-recovery/spec.md`, SHA 8b1799a6d468cf51aab7aabd80a30707b230787e2655b20fc6c76395977a291b. Exact execution plan/ADR/QE в этом feature.

## Открытые решения
Минимальный безопасный recovery переход и его provenance, способ pre-navigation body capture, crash/partial record strategy выбираются в ADR; source code/runtime до настоящих gates не разрешены этим документом.
