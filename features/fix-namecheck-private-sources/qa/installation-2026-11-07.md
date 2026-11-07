# Установка проверенного dz patch, 07.11.2026

После явного исключения владельца и независимого CLEAN корректирующего коммита1adb71b выполнена предусмотренная TASK-5 установка. Обычные Git merges сохранили историю; app-код, БД и deployment не менялись.

Сначала в actual shared installation опознан прежний patchfb777bc и сохранена резервная копия. Только известный patch снят с проверкой pristine CLI8ca63c; затем штатный `npm run process:install` применил reviewed patch и восстановил Codex skills. Фактический итог: **exit0,22/22 PASS,skipped0**,138.413с,stderr0. Общий `node scripts/lint.mjs` после интеграции — exit0.

Installed CLI SHA256 `a6dcabe4f78f799c9251bccf8f78ec323d4e1689fe99c28feb99b46ef53b2b0a`; known-flags `ab19413bc04dff6998978f4d8bb62e16b7868c2f630efe9b0a677388030b9e7d`. Package pins/lock, installer, AGENTS и CLAUDE не менялись. Из18 tracked/shared input hashes изменились только2 принятых repo targets и2 соответствующих vendor dist; остальные совпали. Исторические6 native files исходного review сохранены.

Затем actual pinned K1 в execution worktree main recovery: existing module `feature-adr-paths.test`→taken/exit1; proposed basename `recover-known-checkout-response.integration` и export `knownCheckoutIntegrationCases`→free/exit0, scan complete,460 files с непустым tests root. Это **public project scope**, не private-Python admission и не имена вне выбранных roots/languages. Новый helper до проверки не создавался.

Main K2 PASS0:3declared/2on-disk targets,0unlisted twins; C8 warning о формате FR1 требует отдельной ручной трассы, C4 no-acid SKIP сохранён. OpenSpec strict0. Actual target admission и literal context также выполнены отдельно в execution worktree; они не подтверждают реализацию или runtime.

Исторический native CLOSED3 не переписан в приёмку новых bytes: [отдельный independent report](lint-correction-independent-review.md) и [решение по исключению](lint-correction-acceptance.md) описывают действительное основание. No fake receipts/reset. Main CODEQE2 по-прежнемуNO-GO04–09,2/3; новый helper, независимый codeQE и живой платёжный E2E остаются следующими этапами. БД/session/provider/Cloud этой установкой не затронуты.
