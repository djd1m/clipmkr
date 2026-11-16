# QCSD qcsd-testability — независимая оценка

Актуальный вердикт роли: **CLEAN — QT-01 закрыто адресной проверкой на фазе ideation**. Первичная оценка testability **88/100**, AC completeness **100% (8/8)** сохраняется без нового общего review. Это полнота спецификации и исправление выбора будущих проверок, не PASS тестов или всего convergence gate. Типографика находится в отдельном scope root и в этой повторной проверке не оценивалась.

## Focused wording check ADR, 16.11.2026

Вердикт роли сохраняется **CLEAN**. Новый actual binding: nonce `5c7603bd-9819-4f43-a899-3b61b893e6c5`, revision `0c2a871b57fc259a0dce47edc0aa24fb4d69dc8ad19d1873c1824c9da0673617`. Прочитаны реальный host и wording author handoff; host/receipt и manifest digest сверены перед записью.

Байтовое сравнение с ранее проверенным ADR (`dc469c43221a1798e8ee55b9d1914b70415d95dd90a7ff1296f8bf02e197737a`) подтверждает ровно `## Решение` → `## Decision` плюс русское пояснение. Остальной body, Confirmation и приёмочный смысл неизменны; новый ADR SHA256 `c43b422ba76dc0fc60ebcccdc7648d85ebf037dcc5c8abe9b63bc9037682f58a`. Классификация дельты **wording** подтверждена; новых рисков в проверенной дельте не найдено. Поведение машинного reader отдельно не исполнялось и не объявляется проверенным.

QT-01 сохраняется закрытым: перечитаны команда release suite (:103) и AM-7 (:178); весь план сохраняет SHA256 `83f3d971e21b0624b2003baeb169cc9a4ace592ebad5cae51fb8470bf5b4a9d4`. Исходное condition не изменено; его собственная verification перенесена на текущую revision с `classification: structural`, `implementationVerified: true` в значении фазы ideation. Для новой дельты выставлены `deltaVerification.classification: wording` и `authorAssessmentChecked: true`.

Это адресная проверка текста и актуальности прежнего закрытия QT-01. Полный review, новый пересчёт баллов, tests/code/deploy и convergence evaluate не выполнялись. Типографика и runtime вне scope; общий verdict gate не заявлен. Записаны только собственная entry и этот отчёт под прежним flock; originating condition, чужие entries, author и host сохранены. Ниже — история предшествующих проверок на прежнем binding.

## Адресная проверка QT-01, 16.11.2026

Проверены только исходное условие, реальный author handoff и дельта `06_implementation_plan.md`. В строке 103 stable-candidate Vitest run явно включает `tests/zoom-layout-release.test.ts`. AM-7 в строке 178 связывает `current_vps_apply_fails_before_any_write_on_invalid_or_changed_evidence` с count/exit/skip на том же candidate. **Условие QT-01 выполнено на уровне плана.**

Базовые байты получены через `git show 0cbe2e9194eaff9597341f91f04528097da2711a:features/zoom-layout-mockup-conformance/06_implementation_plan.md`; их SHA256 совпал с первоначально проверенным `1e15df4b27845f08c7ddec31220fe3deac8c769f351d18d55fafbc9665132722`. Полный diff этого файла содержит ровно добавление пути в Vitest command и AM-7. Текущий SHA256 плана: `83f3d971e21b0624b2003baeb169cc9a4ace592ebad5cae51fb8470bf5b4a9d4`.

Author assessment проверен: declared changedScope совпадает с дельтой плана; новых рисков от этого уточнения не выявлено. Классификация **structural** сохранена: изменение включает обязательную проверку в исполнение. Nonce/revision прежние и совпали с фактическим host JSON; четыре manifest digest повторно сверены. План не входит в host manifest, поэтому его новый hash указан отдельно.

Собственная entry теперь содержит `verdict: clean`, verification исходного QT-01, `authorAssessmentChecked: true` и structural `deltaVerification`. `implementationVerified: true` означает проверку исправленного планового артефакта в фазе **ideation**, как требует контракт; исходное condition сохранено без изменения всех полей. Чужие entries, author и host не редактировались.

Тест `tests/zoom-layout-release.test.ts` пока отсутствует и не исполнялся. Общий review, новый пересчёт баллов, код, тесты, deploy и convergence evaluate не выполнялись; итог всего gate остаётся за host. `03_typography_qualification.md` не читался: его результат не является доказательством этой адресной проверки. Последующие разделы сохраняют первичное исследование и его ограничения как историю.

## Происхождение и границы

- Дата: 16.11.2026; actual host `app-server`, cwd `/home/clipmkr`.
- Запрошено и подтверждено локальным `turn_context`: `gpt-6-astra`, effort `xhigh`; CLI `0.167.1`, originator `codex_exec`, provider `openai`.
- Отдельная сессия: `01a1e5bc-57d0-76e0-9cbb-032b453d1dfb`, начата `2026-11-16T19:01:28.635Z`, без истории кодирования. Только метаданные собственной сессии использованы для проверки модели.
- Git HEAD `0cbe2e9194eaff9597341f91f04528097da2711a`; рабочая копия содержит предкодовые документы вне HEAD. Поэтому доказательство связано с actual host snapshot, а не с утверждением о чистом HEAD.
- Nonce `648a76dc-4aa9-40f4-8604-5d803fb9061e`; revision `a1a7daea0e719964423c5250f716ad6b7858ef1e8799f86471c90cd92ee133bb`. Прочитан реальный host JSON; все четыре manifest digest совпали с байтами файлов, повторно перед записью.
- `family=owner-exception` взята из roster. Независимость относится к новой сессии. План называет Astra автором дизайна; эту оценку не выдаю за cross-model ревью дизайна Astra. Предусмотренное Terra-review этим отчётом не заменяется.
- UI approval привязан к commit `0cbe2e9`; HTML SHA256 `5fdbd7611b7e4a975df03d94a246f9620b64c79580b88748087a655b213f9ee6` совпал. Нового согласования интерфейса не запрашивал.

Прочитаны `AGENTS.md`, установленный feature-adr и `modules/03.5-ideation-swarm.md` (включая полный convergence contract), `00_complexity_assessment.md`, `01_requirements.md`, ADR-001, `05_architecture.md`, `06_implementation_plan.md`, `owner-approval.md`, `03_shift_left.md`, review policy/model matrix. Прежние reviewer-отчёты и авторские QE-выводы не использованы как доказательства. Затем самостоятельно найден и прочитан относящийся к задаче код/tests. CLAUDE runtime не использовался.

Flags: HAS_UI=true, HAS_UX=true; новые security-контракты не вводятся (HAS_SECURITY=false в данном M-routing), но существующие access/quota negatives обязательны. Подагенты не создавались.

## Десять принципов

| Принцип | Балл | Основание и предел |
|---|---:|---|
| Observability | 90 | Численные bounds ≤2px, raster/native/canvas, published request и planned composition_version; runtime-наблюдений этой сессии нет. |
| Controllability | 88 | Pure inputs, отдельные PG schema/clock/quota fixtures, browser storage/RPC, synthetic frame markers; наличие private source/S3 среды не проверялось. |
| Decomposability | 93 | Parser, shared planner, isolated native graph, DB publication и UI draft имеют самостоятельные точки проверки. |
| Simplicity | 82 | Один union/version dispatch и существующие harness; C0/C1, DDL и release entrypoint увеличивают число проверяемых состояний. |
| Stability | 91 | Explicit version, frozen v1, immutable original commit, canonical replay; запрещён upgrade-on-read. |
| Information | 86 | Заданы ROI, допуски, glyph bands, source/font pins, негативные случаи; qualification пока pending, фактический image/source ещё не подтверждён. |
| Communication | 93 | MC→TASK→названные тесты и ограничения proof явны; найден узкий пропуск release suite в командах. |
| Relation to prior work | 94 | Реально существуют PG replay/access/quota, browser restore, native pixel/timebase и mutation harness. Исторический PASS не переносится. |
| Time | 78 | 23–41 ч разделены на реализацию/проверку/поставку; native/DB/S3 и typography остаются зависимостями. Это оценка, измерений длительности нет. |
| Accountability | 85 | Указаны author, independent QE, root qualification, owner acceptance; сессия и SHA фиксируются. Модель этой роли совпадает с объявленным автором дизайна, ограничение явно раскрыто. |

Среднее арифметическое: 880/10 = **88**. Баллы — экспертная оценка предкодовой проверяемости, не результат тестового runner.

## AC completeness и реальные точки проверки

Критерий полноты: для MC есть управляемое исходное состояние, наблюдаемый ожидаемый исход и предусмотренный уровень проверки. Все 8 MC удовлетворяют этому критерию; полнота маршрута запуска выделена отдельно в QT-01.

| AC | Oracle / способ проверки | Что ещё должно быть выполнено |
|---|---|---|
| MC-01 | Immutable original01, source1816×968, независимые screen/PiP bounds и raster ≤2px; TASK-02/04. | Behavioural RED legacy, затем GREEN v2 и настоящий QA01. |
| MC-02 | Original02, ROI930×704, separate camera, contain; pure/native/canvas. | GREEN v2 и достижение ROI через UI, а не API-инъекцию. |
| MC-03 | Original DOM/CSS отдельно от planner; v1 drift RED по координатам; preview/MP4 parity вторична. | Создать oracle/test и mutation evidence; build/import failure не считается RED. |
| MC-04 | Browser local radio/draft с нулём apply/jobs/quota; 03 default, no implicit upgrade. | Дополнить текущие browser scenarios веткой v2. |
| MC-05 | Независимые width/height с canonical 1e−6, clamp, step any; warning и reviewed reset. | Через реальный control получить reference aspect без применения. |
| MC-06 | PG populated032→033/repeat, exact request version, music/CTA mixed batch, publication substitution, C0 replay. | Расширить тесты обеими версиями; C0 проверять на собственной ревизии. |
| MC-07 | Synthetic live markers, native cut_plan/audio/camera, no-camera/SAR, raster glyph/CTA/WM. | Квалификация реального libass/drawtext до кода и all-frame v2 proof; прежний v1 тест не доказывает v2. |
| MC-08 | Pin/source/image/approval mismatch → nonzero; spy на write side effects executor; QA/owner acceptance отдельно. | Выбор release test исправлен (QT-01 закрыто); реальные negative/positive outcomes и implementation QE ещё впереди. |

Самостоятельное чтение подтвердило: `packages/shared/src/screen-layout.ts:55` принимает только v1; `apps/worker/src/render/screen-layout.ts` использует pane1080×800/pad400; `ClipLayoutPreview.tsx:23` клипует y400..1200; `ClipLayoutChoice.tsx:212` связывает высоту с width. Это исходные ограничения, которые план адресует, не новый дефект будущей реализации. `packages/db/src/render.ts:32,93` использует COALESCE и canonical equality, пригодные для version-substitution теста.

Существующая база: `tests/clip-layout.integration.test.ts:42,51` проверяет foreign/stale/refusal и 10 concurrent confirmations с одним debit; `tests/browser/clip-layout.test.ts:303` требует реальную выделенную PG/Redis/S3 среду и не принимает её отсутствие; `tests/screen-layout-media.test.ts:249` сопоставляет camera/screen/source counters и audio marker. Последний использует несколько фиксированных кадров плюс marker: planned all-frame проверку v2 ещё надо реализовать. Pure/planner parity в текущих tests не заменяет independent original oracle.

## QT-01 — обязательный release test не выбран явными командами

**Severity WARNING, classification structural; при первичном review открыто, теперь закрыто адресной проверкой выше.** Исходное доказательство:  `06_implementation_plan.md:54` требует новый `tests/zoom-layout-release.test.ts` и test `current_vps_apply_fails_before_any_write_on_invalid_or_changed_evidence`. В блоке общего прогона `:101–105` файл отсутствует; отдельная обязательная команда ему не назначена. `scripts/test.mjs:3–4` передаёт выбранные пути непосредственно Vitest и не добавляет этот suite. При буквальном выполнении опубликованного набора доказательство нуля write side effects не получится. TASK-06 описывает намерение, но не устраняет этот пробел списка запуска.

Это **препятствие полноте evidence MC-08**, а не доказательство небезопасного executor: его ещё нет. Достаточное исправление — добавить файл в существующий Vitest run либо указать отдельный обязательный targeted запуск на том же stable candidate и учитывать его exit/count/skip в evidence bundle. Новый общий цикл для исправления документа не нужен. Условие закрывает эта роль после чтения исправленного плана; исполнять будущий тест до появления кода для ideation closure не требуется.

AM-1 (qcsd-testability): включить проверку штатного исполнителя VPS в обязательный запуск. Confirmation: invalid/missing/changed evidence приводит к нулю mutating calls самого entrypoint → test `current_vps_apply_fails_before_any_write_on_invalid_or_changed_evidence` (будущий тест TASK-06; существование/невакуозность сейчас не заявлены).

## Известные предпосылки и ограничения

- На момент первичного review typography qualification была pending у root — установленный **STOP до кода/K2** (`05_architecture.md:75–79`, TASK-01). Нет оснований объявить ни fit, ни невозможность fit. Этот отчёт не выполняет qualification и не создаёт дублирующего условия convergence.
- PG suites содержат `describe.skipIf(!DATABASE_URL)`; `scripts/test-skip-reporter.ts` делает skip ошибкой при `N5_ACCEPTANCE=1`. Будущий guard обязан проверять отсутствие mandatory skip независимо от общего exit0, как уже требует план. Текущая доступность инфраструктуры не установлена.
- Original Git object SHA256 фактически совпал с `7b83572176b7c48c38c5d9d3ed141148c482cc11bb98493c07fcef59fe6f4ad0`. Сами картинки/реальный MP4/ink bbox визуально не исследованы; pin match не доказывает их качество.
- Host manifest покрывает только complexity/requirements/ADR/architecture. Прочитанные дополнительные входы закреплены ниже отдельно; receipt revision не следует выдавать за автоматический hash всех входов этой оценки.
- SHA256 плана при первичном review: `1e15df4b27845f08c7ddec31220fe3deac8c769f351d18d55fafbc9665132722`; shift-left: `f4666db31fe0764c39fa37fa00f3fc67d7334c66d049cf4255879a32c1326200`; owner approval: `9cff0de2d45731d4c0c082d5716735645739940ee3d6cb0d2fa80f1d5097caa6`; reference pins: `c1f772aeacdf25af8bc5e3b657b554f81839a20a7d06f6a53b2ddd49f0812522`.

Фактические операции: `rg`, `cat`, `sed`/`nl`, `git rev-parse HEAD`, `git show 9e19f5746a28bad89c9551ce8cd9934f0f0a4f8e:docs/research/zoom-screen-layout/mockup.html`, `git status --short -- features/zoom-layout-mockup-conformance`, `hostname`, чтение metadata собственной CLI-сессии и Python SHA256/JSON сверки. Одна ошибочная попытка чтения предполагаемого имени `032_clip_layout_intent.sql` исправлена через `rg --files`: фактический файл `032_clip_layout.sql` прочитан. Тесты, mutation scripts, K1/K2, convergence prepare/evaluate, БД/runtime/deploy не запускались. Gate PASS/closure не заявлены.

Code/spec anti-drift: продуктовый код не изменялся; выборочно подтверждены точки текущего v1 и запланированные v2-контракты. Полный anti-drift реализации остаётся будущим QE. Запись ограничена этим отчётом и собственной entry qcsd-testability под `flock /root/.config/clipmkr/conformance-review.lock`; чужие entries и author сохранены.
