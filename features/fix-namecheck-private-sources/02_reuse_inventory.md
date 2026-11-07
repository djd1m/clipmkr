# Reuse и наблюдённый разрыв

Использовать installed harness-cli 0.8.58/harness-core 0.8.66 и существующий patch/install/test механизм. Закрытая source provenance закреплена SHA в требованиях; actual 18 hashes совпали с предыдущим advisory.

| Источник | Решение |
|---|---|
| `patches/dz-name-check-app-source.patch` | Расширить имеющийся compatibility scanner; единственный tracked patch target |
| `tests/feature-adr-paths.test.mjs` | Сохранить K1 nested/collision/empty и K2 Next-path negative control; добавить candidate CLI cases здесь |
| `scripts/install-process.sh` | Уже применяет project patch и запускает тест; только readonly reference, сейчас не запускать |
| `node_modules/@dzhechkov/harness-cli/dist/cli.js` | nameCheckScan/cmdNameCheck, existing optionLists/parser/help; изменять только через patch и только temporary copy при испытании |
| `node_modules/@dzhechkov/harness-cli/dist/known-flags.js` | Согласовать source-root через дополнительный hunk того же patch; нового package target нет |
| `node_modules/@dzhechkov/harness-core/dist/name-check.js` | Reuse decideNameCheck/exportedNamesIn/renderNameCheck без изменения pure decision |

Root реально получил exit0/free для существующего `tests/feature-adr-paths.test.mjs` (module `feature-adr-paths.test`). Это evidence scope gap, а не успешный K1 и не дефект pure decision. Baseline receipt SHA256 `dfb793c999a5dab59a14e0adfb03a92bb6357a055cf3039b37a6e07ff2e0c8eb`; полные command/path остаются закрытыми.

Исходные patch/test SHA256: `fb777bc802ad3d34bb540d13f4c31c881a61ffd1bf77d93f9bf5a023960d1031` / `f09ca4b5e0e72a9068ca5cd7ff37a94b63395e7790bd5aa12796e936809652ed`. Перед кодом root сверяет выбранный base. Installed upstream src scanner покрывает только direct TS под packages/@dzhechkov; current patch добавляет apps/packages/scripts JS/TS. Root override, tests и Python отсутствуют.

Не создавать второй gate, registry, binding JSON, runtime helper или dependency. Python stdlib AST читает текст статически; target imports/exec недопустимы. Existing CLI invocation telemetry сохраняется: readonly здесь относится к исследуемым sources, не обещает отсутствия существующей host telemetry.
