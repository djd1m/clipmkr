# Переиспользование для восстановления известного checkout

Архитектурное исследование06.11.2026, без исполнения private helpers, сети, SQL, Chrome или финансовых действий. Запрошенная роль `gpt-6-astra xhigh`; serving identity `NOT_ATTESTED`. Основания: новые01/OpenSpec, AGENTS/CLAUDE, core-CJM/model-matrix/review-policy, feature-adr03/03.5/05/06 и закреплённые shift-left/code-goal-planner references. AQE runtime недоступен; прочитанные протоколы не означают выполненный QCSD.

## Найденные владельцы поведения

Private source root `P=/root/.config/clipmkr/ui-recovery-cloud-20261105`. Полные SHA измерены чтением файлов; исходники не изменены.

| Источник относительно P | SHA-256 | Переиспользование и ограничение |
|---|---|---|
| `payment-cjm/apply-route.private.py` | `db0dbd2fbdae3caea1de1b9416d5c9a67596dc5f59bfff0363d2613610118087` | `lock_scope`, `bound`, `revalidate`, `isolation`, `cutover`, `read/create/save/persist`; сохранить immutable source и `EXECUTION`. `admit`184–192 требует original-response binding; `operator_business`548–590 не принимает потерянный response; `reconcile`536–546 требует `new_checkout`. Эти отказы сохраняются. |
| `payment-cjm/launch-route.private.py` | `b9b8ab7b8965d518f1dc4849d3dea0903696dc13200efbaa803e320cdff25892` | Capture exact bytes, isolated Python, запрет mutable/dynamic imports. Повторно используется без изменений; не загружать новый adapter через снятие его ограничений. |
| `runtime-bridge/bridge.private.py` | `81292776ba2b5442540f8572a07848a491dab6eca32119e77184033437a84023` | Стабильный controller lock, strict JSON/FD deadlines, consume-before-callback, исходный ticket journal. Узкий derivative branch; исторический source immutable. `active_case` возникает только после canonical success, поэтому сегодня отсутствует. |
| `payment-cjm/browser.private.mjs` | `c12c4a311f4291a0bb5ae8c3adb61ea2a44fcb79e7a597cfe3a51fc97958ba48` | Native Chrome UI, existing form/actions, private atomic save. Чтение `r.json()` после request fsync уязвимо к смене документа. Derivative capture/read-recovery input; исходный source остаётся эталоном RED. |
| `payment-cjm/run.private.py` | `f15ce1e17ec83226eaa59bce153866a09a5077310391bc143bf04d736baed01e` | Published identity/proxy/TEST guards, native session writer/revoke, `native(w,mode,extra)`. Узкий derivative для typed recovery context; canonical f15 и зависимые paid-media sources не меняются. |
| `payment-cjm/native-probe.private.mjs` | `ababad30d66c6d878623e54478308e943bfb1182c06b934487d38465511a67e0` | Existing read-only intent/provider oracle и positive own-session cleanup; immutable. `native(..., extra.windowStart)` допускает передать доказанное original creation window отдельно от fresh action window. Protected `paid-job-probe` не вызывается. |
| `payment-cjm/collect-cutover-readonly.private.mjs` | `39b849cf573f76caf24a70f71b154c709c5bf0330b43f617c4ed8f5fe4577690` | Complete bounded BOTH-store inventory и provider GET для существующего event-window gate. Не включает browser idempotency key/confirmation URL; exact-key evidence supplied separately, не выводится из этого collector. |

## Минимальный новый код

Один ограниченный adapter для exact origin attempt; небольшие derivatives bridge/browser/run, два исполняемых fixture файла и public operational test. Приватные derivatives располагаются отдельно от P; имя code-directory не создаёт новую operation/case/ticket/idempotency namespace. Runtime по-прежнему использует original operation directory, stable locks и bridge journal. Полный scope —06.

Никаких изменений handlers, БД/миграций, ledger/grants, auth policy, Cloud/DNS, Caddy, callback QE4, generic paid oracle или canonical paid-media sources. Новая интеграция/daemon/пакет не требуется. Не переносить финансовый dispatcher из других проектов1–8: отсутствующая возможность находится в локальном QA journal, а canonical Clipmkr/provider блоки уже существуют. Новые OSS-компоненты добавлять незачем.

## Существующий OSS для capture

Локально установлен Playwright1.60.0; его `Route.fetch`, `APIResponse.body` и `Route.fulfill` доступны в `/home/clipmkr/node_modules/playwright-core/types/types.d.ts`. Выбор — один forwarded request через `route.fetch({maxRetries:0,maxRedirects:0})`, сохранение actual body до `route.fulfill({response})`. Это инструментированный настоящий Chrome и настоящий upstream response; API transport контролируется Playwright, а не обычным browser network path. Synthetic local server используется только в fixtures. Ни заглушка response, ни provider success не подставляются.

Eager `response` handler не выбран: CDP body-read всё ещё может проиграть навигации. Реконструкция через повторный POST с тем же key не выбрана: она нарушает one-POST требование и не возвращает доказательство прежнего body. Generic recovery framework не выбран: расширяет авторизацию и состояние ради одного конкретного failed attempt.

## Доказательства и границы

Root сообщил один POST201, один exact-key TEST pending intent,0payments/events,0target grants и positive own-session revoke; архитектор не переизмерял runtime. Собственное чтение source подтверждает необходимость нового recovery transition. Исторический assessment прочитан только после требований и source; это supporting evidence, не implementation QE.

Root local Chrome/fsync probe20/20 воспроизводит класс CDP `Network.getResponseBody` race. Exact live exception скрыт старым catch и остаётся неизвестным. Native callback QE4 CLOSED — отдельная неизменяемая история, не текущий незакрытый finding.

## Caller-held business boundary — structural proposal

Необходима одна прямая адаптация тела frozen `payment-cjm/apply-route.private.py:548–590`, SHA-256 `db0dbd2fbdae3caea1de1b9416d5c9a67596dc5f59bfff0363d2613610118087`, в existing `K/recover-known-checkout.private.py`. Это **копия одного фиксированного тела**, примерно40–55 строк структуры плюс вызовы существующих guards, а не исполнение original `operator_business`. Open/flock/finally-close wrapper заменяется контрактом caller-held original controller+route FD; predicates, exact request/response/business/history и порядок calls сохраняются. `lock_scope/loadrecord/runtime_binding/isolation/cutover/admit/reconcile/persist` непосредственно переиспользуются из captured db0. Все immutable hashes прежние.

Причина: original operator повторно открывает route и self-blocks на EXNB; отпускание route оставляет authority TOCTOU без canonical hook перед persist. Выбрана ограниченная копия без handoff, monkeypatch globals/open/flock, AST generation, нового module/export/path/dispatcher. Startup вызывает existing held-host-FD `revalidate`, не повторно блокирующий `operate`; host FD отличается от route FD. Compatibility и negative matrix обязательны по05D2/06AM-13. Source drift → STOP/review, не автообновление копии. FR/OpenSpec,6private+2public, DB/auth policy и financial authority неизменны.

QCSQ-03/QT-06 clarification: reused boundary принимает explicit phase + exact entry/state/case binding по05D2. Closure/witness prerequisite относится к POST_RECOVERY ordinary/session, не к producer этих closure и не к pending own-session. Lost-response reconcile остаётся существующим typed adapter; canonical reconcile требует настоящий new_checkout и применяется лишь к обычной response-bound ветке. Один original controller→route acquisition на guarded entry; held route FD передаётся явно через adapter/revalidate/derived boundary, host FD остаётся отдельным. Revalidation вызывает прежние primitives без повторного open/flock; callback не запускает relocking writer executor. No new paths/modules/framework, source pins и прежние predicates неизменны.
