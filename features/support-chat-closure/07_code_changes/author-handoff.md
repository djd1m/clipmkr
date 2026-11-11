# Handoff: S close fix готов к независимому SOURCE QE

11.11.2026. Авторская реализация и targeted checks завершены; **независимый QE, интеграция и публикация ещё не выполнены**. Root/Astra — planner и host fresh reviewer. Writer не выполнял native prepare/roster/receipt и не ставил финальную оценку.

## Authority и genuine entry

Owner/root authority: `../owner-authority.md`. Exact-reviewed01 SHA256 `7d6d2e89aa41d57055ef3ac5e9fe143c89397a257acf1deaa0bc1d439b23241d`;06 `19100c5589ac2b78da3bbfdbdc3bc05d03b83dc94d2456a79b6b00499906737d`, bytes не менялись. Их review-pending/not-run статусы и исходный draft inventory — исторический pre-authorization текст, superseded фактическим authority и этим handoff, а не скрытое отсутствие approval.

- Canonical pinned dz0.8.58, Node22.23.4. Реальные router/design(requirements S)/plan checkpoints созданы CLI после review; artifact paths относительны feature dir. Первая invocation с absolute artifact paths была честно refused и сохранена в private log, затем исправлена по фактическому CLI-коду. Успешную запись не имитировали.
- K1 `npm run dz -- name-check --module support-chat-closure.test --project <worktree> --json`:exit0/free, source scan complete477files. Новых exports нет.
- K2 canonical `check-plan-completeness.mjs <feature> --tier=S --require-requirements`:exit0/PASS,0fail/0warn; legitimate S no-ADR/no-acid skips3 явно сохранены. Повторён после изменения00.
- Перед первым code edit `check-code-targets.mjs --repo <worktree> --feature <feature>`:exit0/admitted, reasons[], manifestDigest `7569f9c4883671b1e38350a90a0f3009f354a1488bc795dc3468ea412b345552`.
- `build-coder-context.mjs <feature> --tier=S`:exit0/complete, digest `3cfca4dce46f0560d5525f1c83dfadfe052fe5d3e8754b9800de2de9b8182578`; весь literal promptBlock прочитан до edits. No missing ADR для S. Сохранён base-ref717b55d; original selection не сбрасывалась.

## Реальные проверки на стабильном коде

Все команды из `/tmp/clipmkr-support-chat-closure-20261111`, с `PATH=/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin:$PATH`.

| Проверка | Фактическая команда | Исход |
|---|---|---|
| Behavioral RED до product fix | `node /home/clipmkr/node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts tests/browser/support-chat-closure.test.ts` | exit1,6failed/2passed,5.51s; failure именно visible iframe при focus/account/unmount, не syntax/load |
| Final units | `npm test -- tests/support-widget-ui.test.ts tests/support-ui.test.ts` | exit0,23/23,0skip;1.09s |
| Final browser | та же browser команда | exit0,8/8,0skip;5.95s, обе ширины |
| Focused types | `node /home/clipmkr/node_modules/typescript/bin/tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --jsx react-jsx --esModuleInterop --skipLibCheck --strict --noUncheckedIndexedAccess --types node apps/web/src/lib/support-client.ts apps/web/src/app/support/SupportPanel.tsx tests/support-widget-ui.test.ts tests/browser/support-chat-closure.test.ts` | exit0 |
| Whitespace | `git diff --check` | exit0 |

Raw logs в `/root/.config/clipmkr/support-chat-close-20261111/`: `baseline-browser.private.log`, `final-{units,browser,types,diff}.private.log`, `code-entry/`. Они не коммитятся. New browser test входит в existing `vitest.browser.config.ts` selector, а default npm test штатно исключает browser suites; поэтому browser запуск явно указан отдельно.

## Requirement → risk → evidence

- FR-1/FR-5: реальные iframe→parent focus, clear-event snapshot и независимый DOM/nativeVisible; baseline RED6→final GREEN8. На390 переход focus выполняется Shift+Tab, а не синтетическим dispatch.
- FR-2/FR-4: existing button, возврат opener focus, повторное show без нового logout, parent Escape — GREEN на1440/390.
- FR-3: missing/throwing hide всё равно вызывает logout, затем existing destroy/unavailable/settings/event cleanup; existing async logout failure/epoch cases GREEN. Подход finally исключает ослабление privacy при hide failure.
- Identity/unmount: actual React effect/callback cleanup с открытой iframe — GREEN1440/390. Current failure helper применяется общим путём, поэтому AuthForm/SignOut/RecoveryForm/AccountDeletion не получили дублирующих обработчиков; sibling callers прочитаны, не изменены.

Extended reference QE: применены change/risk-based regression, behavioral discrimination через parent baseline, keyboard/focus и bounded local failure injection. Pinned studio protocols прочитаны; AQE runtime/agents и WCAG certification не заявляются. New I/O/dependency/SQL нет, real-DB прогон для этого diff не требуется. Полный npm test/build не запускались по согласованному узкому риску; shared .next/dist не создавались.

## Лимиты и дальнейший host этап

Public сайт всё ещё2af00157/b4d549bf; runtime fix и настоящий post-publish browser контроль — задача root. Browser fixture не доказывает реальную историю, delayed replies, verified contact или A→B provider authorization; native SDK hide capability отдельно подтверждена read-only живым воспроизведением до fix. Cross-origin iframe Escape не перехватывается; проверен parent Escape при active listener.

Read-only history audit принят root отдельно: native conversations/JWT exchange существуют, runtime identified=false/secret absent. Их activation/consent/history CJM сюда не добавлены. Corrective dz teach делает root в canonical store; автор выполнил recall, новый teach не дублировал.

Прежде чем root создаст formal native snapshot, сверить `author-handoff.json` и текущие три file hashes. Если source base при интеграции меняется, targeted proofs относятся к этому snapshot717b55d+указанный diff, а не автоматически ко всему M3 artifact.
