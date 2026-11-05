# Уточнение области работ: тестовые цели24/25

05.11.2026. Prospective plan-only amendment; допуск ещё не выполнен. Предыдущий план WRITE23 + READ-ONLY12 =35 сохранён побайтно в `history/scope25/06_implementation_plan.md`, SHA-256 `54537fca57c0862d7c3c4d0d7e7346b886354b39c6cc748eba73b97f3ae66b7e`. Исторические checkpoints/ideation/ADR остаются неизменны. Автор не редактирует новые цели до актуальных gates и фактического чтения полного текущего coder context.

## Причина и разрешённый delta

Запрос автора: `07_code_changes/scope-request-24-25.md`. Его baseline 56passed/20failed и pageerror probes зафиксированы там как наблюдение автора, в этом документном проходе они не повторялись. Source inspection подтверждает: auto-link Vite сейчас заменяет next/navigation, но не next/link; billing использует renderToStaticMarkup без React hydration и ищет Pro до явного раскрытия. Это основания проверить совместимость harness, а не доказательство отсутствия продуктового регресса.

- Target24 `tests/browser/blogger-auto-link.test.ts`: только точный Vite next/link anchor adapter и необходимые existing React prebundles; сохранить HTTP/PG/auth, account isolation, blocked/manual-copy/reload/zoom/preferences, все assertions/timeouts. Native Next/AM-5 остаётся отдельным требованием.
- Target25 `tests/browser/billing.test.ts`: выбран минимальный mounted/hydrated ClipCard fixture внутри того же файла для прежнего capability scenario через настоящие «Ещё»/edit. Сохраняются exact href, on/off assertions, SSR composition, price/return/axe/responsive checks. Перенос assertion в иной suite не выбран. Application/API/config/package edits, skips, force-open DOM и ослабление checks не разрешены.

TASK-8/9 и AM-12/13 описывают исполнение и проверку. Оба suite запускаются полностью в Chromium/WebKit на стабильном source с исходным regression набором; mismatch или timeout сначала диагностируются. Исходные семантические проверки должны падать при нарушении capability/ownership. Post-fix результаты здесь NOT RUN.

## Повторный router и границы

Files3 (25≤25), Domains3, Integrations1, Breaking2, Models1, Cross-cutting4: сумма14, tier L. Полностью выбран conservative cap25. WRITE scope25 =14 UI/CSS+2 SSR+9 test/harness;12 unchanged dependencies только READ-ONLY, native manifest37. Новый path сверх25 требует повторного router/плана/gates до правки. Root00/ADR/DDD/05/requirements/OpenSpec/ideation остаются прежними bytes, здесь хранится prospective пересчёт scope. K1 delta не вводит новых module/export/command names.

Предварительно оба test paths побайтно совпали с HEAD: auto-link SHA `612055ee0185ba95cf29d0b809dd406a49079fa4cc51dc5d1eb3b79d0e0976b0`, billing SHA `64a1b5cb4ea0a20c43de63c5deeeeac9d6cd6e727861674677ee1e1c384a7341`. Повторная сохранность проверяется перед checkpoint. Private `scope25-baseline.private.json` содержит измерение; существующий код/tests/07 artifacts не редактируются этим планировщиком.

## Evidence и передача автору

Настоящий pinned recall выполнен,3 lessons прочитаны: project gates, reflow oracle, generated context ≠ consumed. K2/target/context выполняются до поддерживаемого checkpoint; их реальные результаты и точные commands — private `scope25*.json`. Полный актуальный promptBlock должен фактически прочитать автор перед дальнейшими edits; snippets/наличие JSON не доказательство чтения. Этот проход не делает QE prepare, commit, runtime/deploy и не переписывает historical receipts.

## Фактические pre-checkpoint результаты

Pinned K2 exit0/PASS:37 targets,0 failures/0 warnings/0 skips; source target helper exit0/admitted/reasons[]; coder context exit0/complete/diagnostics[]. Plan SHA-256 `c5255046bad2813a26a18536e3532b263b040ec400220719e442ea9e66f304e7`; context digest `7db6ecd79b298f22dba5d9292a89d493887c0d5155915766f4c57477d8718b27`; manifest digest `93fdc209b483471a4b5e67ed99532213e610075d8cbc0e088711772024c8f7ab`. Полный текущий promptBlock экспортирован приватно в `ui-qcsd/scope25-current-context.private.txt` (57926 characters); actual consumption автором пока не подтверждён.

Code/spec anti-drift: оба будущих test targets до admission неизменны;12 readonly baseline hashes совпали; неизменны существующие требования/ADR/архитектура/ideation и исторические документы; предыдущий06 exact сохранён; git diff --check exit0. Измерения в `scope25-anti-drift.private.json`. Параллельный автор изменил08_qe_report.md: это не immutable design input и не правка планировщика. По studio-extended-qe применена трассировка requirement→risk→scenario: FR-4→identity/hydration→TASK-8, FR-3/5→hidden capability→TASK-9; observed gate results выше, runtime regression NOT RUN этим планировщиком. Этот plan-only проход хранит evidence здесь,07/08 artifacts автора не редактирует. AQE runtime/независимое QE не запускались. Supported checkpoint запускается только после перечисленных проверок; его actual stdout/exit фиксируется отдельно `scope25-plan-checkpoint.private.json`, успех не предполагается заранее.

## Настоящий checkpoint после проверок

Поддерживаемый `dz feature-adr-checkpoint --stage plan` выполнен после K2/admission/context/anti-drift, exit0 и `ok:true`; execution project — текущий implementation worktree. Witnessed06, scope-amendment-25 и history/scope25/06. Полный результат private scope25-plan-checkpoint.private.json. Это разрешает только указанные test-only правки после фактического полного чтения coder context; результат этих будущих тестов и code/QE не предрешён.
