# Handoff: cold native readiness

Авторская реализация frozen; independent SOURCE review/QE, native prepare/evaluate и поставка остаются root. Автор не делал commit/push/runtime operations. Точные hashes шести inventory paths и команды — author-handoff.json; base ac83c7f, runtime primary evidence58e72ab.

## Реализация и честная граница
loadSupportWidget теперь регистрирует message listener до script/iframe и ждёт exact WIDGET_LOADED от canonical iframe.contentWindow/configured origin. Старые URL/path/inbox/API guards и общая8s граница сохранены; resolve/reject очищают listener/observer/timer. WeakSet хранит только подтверждённый iframe: повторное использование немедленное; replacement ждёт собственный сигнал. SupportPanel/UI/server/session/privacy/config не менялись.

## Реальные evidence
- K1 перед code: name-check --module support-widget-readiness --project WT --json, exit0/free, complete483files. Новых exports нет.
- Strict S K2 PASS0failure/0warning; S no-ADR/no-acid skips3=N/A, не выполненные тесты. Supported router/design:requirements/plan checkpoints реально записаны; recall[] на каждом переходе.
- Code checkpoint actual supported CLI ok:true. Первая запись code случайно использовала default Node24; немедленная проверка node --version это обнаружила, затем поддерживаемый command повторён на требуемом Node22.23.4 с тем же codeInputHash4a54bb58… и явным writerRuntimeCorrection. Обе реальные записи сохранены, история не сбрасывалась; тесты/gates выше выполнялись с PATH Node22.
- Current admission exit0/admitted154e9449a069d7d8f13d91835822d9f25103e3c2490312502259acca5b9e5122. Literal context complete b0c326d7f105a3a03d67d99b6df59fa24143ee2418158a3dbc9573d07c43e9a3 полностью прочитан до code.
- Units24/24 PASS (19 widget,5 privacy/SSR), browser12/12 PASS без skip1440/390; strict focused TypeScript и diff exit0; OpenSpec strict valid. Shared dist/.next не создавались, dependencies только symlink.
- Behavioral RED: исходный ac83c7f loader + final fixture в отдельном cwd snapshot: оба cold identify1440/390 exchange0 вместо1, terminal exit1. Final loader: оба достигают одного exchange с первого нажатия, native identity A видна child DOM.
- Повтор browser был обоснован конкретным рискoм optimizer reload: jsx-dev-runtime внесён в предварительный optimizeDeps обоих fixtures. На стабильном baseline/final логах reload отсутствует. Первый попытанный snapshot invocation с --root, но cwdWT честно дал GREEN2 на текущем Vite source; это не baseline и не выдано за RED. Затем cwd corrected, actual RED2 получен; WT не переключался.

Raw logs private /root/.config/clipmkr/support-widget-readiness-20261111/. Unit доказательства относятся к неизменившимся loader/unit/consumer bytes; последний optimizer edit затронул только browser fixtures, после него browser/strict-types проверены повторно. Default Vitest selector исключает browser; browser suite запущен явно. CI definitions в этом checkout не найдены — CI-parity не заявляется.

## Anti-drift и лимиты
FR-1→cold RED2/GREEN first exchange; FR-2→wrong source/origin/type, valid DOM безready8s timeout, replacement/warm/cleanup units; FR-3→existing SSR/opt-in/epoch/logout +12 browser/close cases; FR-4→real React cross-origin child delayed350ms +1440/390; FR-5→four editable/noUI/noConfig/noDeps. Существующий close fixture теперь загружает iframe лениво через widget.js, как app, и выполняет реальный message handshake. Его focus/clear/unmount/hide-only assertions сохранены.

Статус UI пока появляется после setUser; remote async ACK не подтверждается. Synthetic fixture не доказывает настоящий vendor history, token exchange authorization, replies или две реальные учётки. Root отдельно выполняет native QA. Warm cache предполагает установленный app invariant единственного loader и отсутствия внешнего iframe navigation; reload/replacement DOM не импортирует ready из других элементов.

Использованы risk/contract/security/lifecycle/mutation/regression методики studio-extended-qe reference; AQE runtime/agents не запускались. Self prevalidation по code-impl/code-critic не называется независимым review. Нового SQL/денег/модели/миграции нет; DB/full build/full npm test не запускались по согласованному узкому diff. Независимую grade/closure автор не ставит.
