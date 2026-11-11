# Передача авторского rework Zoom R2

WORK_UNIT_ID: zoom-screen-focus-design-rework-r2-20261111
TRACE_PATH: /home/clipmkr-zoom-screen-focus/features/zoom-screen-focus/architecture-handoff.md
Status: author-rework-r2-ready-for-origin-verification
Base revision: `1a7f17f66d83bacf07dd07c513a3cfad03837330`; это working-tree design snapshot, не code commit.
Архитектор `gpt-6-astra xhigh`; автор приложения далее `gpt-6.1-sol high`. Новых агентов автор R2 не запускал, независимые verification не создавал.

## Основание и границы

Root передал genuine R1 evaluate exit1/unresolved10 при nonce `302cd2cc-e122-4169-a974-553215b27b2e`, revision `11a6f6693755d66c3c5b1e986aba3e3bb89660824887660b15ac84e2c154c0f3`. Прочитаны host conditions и независимые R1 reports; исходные33 дизайн/OpenSpec файла сохранены до правок в `history/qcsd-r1-design/` с SHA manifest. `.fa-state`, checkpoint/receipts и reviewer reports не изменялись.

Все десять исходных IDs/owners сохранены в `amendments/qcsd-r2-design.md`. Исправления structural; это авторское addressed, **не** независимое закрытие. 03.5 summary, новый prepare, origin recheck всех6 ролей, evaluate и gates принадлежат root.

## Итог дизайна

- RISK-01/TST-01: нормативный контракт01/OpenSpec/ADR-001 согласован с fixed ROI/0,5s sampling — live pixels только canonical подтверждённой области и того же source time. Запрет face вне ROI/заморозки; observed absence veto wholeclip; смена личности/короткий blank явно вне гарантии. Root задал это значение исходного намерения; новый identity detector/ML не вводится. A→B и sub-sample fixtures проверяют честный предел и pixel provenance.
- ACC-01/02: labels/value/units/min/max зависят от выбранной camera/screen и actual clamp; именованный dialog, предсказуемый focus/отмена/Escape и semantic live status без polling повторов.
- ACC-03/UX-03: pause всех остальных player refs на **каждом play** preview, published, Original, в том числе уже selected clip; close/change clip останавливает preview, polling сохраняет узлы.
- SEC-01: native FFmpeg/ffprobe max_redirects=0, exact storage origin/scheme, TLS verification, closed errors; unsupported/3xx→unavailable без Range proxy. Primary source commit и read-only installed capability evidence сохранены. Никакие UI URL/custom redirect не принимаются.
- SEC-02: closed seed/legacy wire parser до side effects; authoritative owner/active/retention/source+seed revision/epoch перед claim/read и publish. Existing lifecycle/helpers/transport используются без новой auth схемы.
- UX-01: scoped sessionStorage draft, проверенная запись/read-back, явные restore/conflict/lost states; accepted intent отдельно. При blocked storage предупреждение до ухода и native beforeunload/managed confirm; SPA Back при blocked storage нельзя надёжно отменить, recovery там не обещается.
- UX-02: первый03 focus=null/whole-screen с пояснением; camera seed не action tracker. Прежде подтверждённый focus того же source восстанавливается; optional correction не превращается в обязательный wizard.

## UI и новый текст состояний

`selector-mockup.html` SHA256 `76acda5003083138245031f5e96c6697e74844a8b5324e1007d397ac993eb1f0`, PNG, mockup hashes и ui-approval **не менялись**. 03 default/01–02 advanced/explicit confirm и control set прежние. Ошибочные aria/clamp синтетического макета не переносятся как требование к продукту.

В существующей preview/status области и confirmation нужны следующие точные семантические состояния/пояснения: `whole_screen`, sampling limitation, seed pending/ready/unavailable, preview unsupported, draft restored/not-found/storage-unavailable/stale-source/version-conflict, apply accepted/failed. Они описаны в ADR-003; это нормативное содержимое реализации, **не заявление, что владелец отдельно просмотрел каждое такое состояние**. Новых страниц, controls и custom dialog layout не добавляется; native beforeunload/confirm берут существующий browser pattern. Ручная приёмка реализации этих состояний и screen-reader проход остаются в QE/owner acceptance.

## Shared Original seam

Canonical server-only `packages/shared/src/server/original-source.ts`, export `originalSourceRevision`, import `@clipmaker/shared/server/original-source` принадлежит Original. Zoom не создаёт дубль и не re-export-ит node:crypto из root shared index. Source formula/Original metadata union неизменны; source/UI integration делает root последовательно. Для draft scope добавляется session-derived `accountScope` в **Zoom layoutInfo**, а не в Original DTO.

Media coordinator использует thin callback обоих ClipCard и Original; onSelect текущего clip не заменяет onPlay arbitration. Полная metadata/Range реализация Original и source helper остаются read-only зависимостью Zoom, её tests и runtime proof не присваиваются этому дизайну.

## План и измеряемые пути

В06 поправлены TASK-1/3/4/5/7 и AM-4…11 с различающими test ids/paths для всех10 условий. Scope: **40 editable +19 read-only**, консервативный XL прежний. По уточнению root native gate измеряет unchanged semantic dependencies только через EXPECTED_CODE_TARGETS, поэтому trailing block теперь содержит **59** уникальных путей. Это не расширение write authority:19 read-only редактировать нельзя. `00_complexity_assessment` и `scope-inventory` не менялись.

До кода остаются настоящий origin recheck/03.5 closure, final Step6, K1/K2 и root GO. Ни один из них автор R2 не запускал. После реализации — один общий прогон stable revision, targeted repeats по риску, independent QE/fleet/code-spec anti-drift. Тестовая поставка/owner acceptance и production boundary прежние.

## Доказательства и ограничения

`amendments/r2-source-evidence.json` содержит SHA публичных FFmpeg8.1.3 исходников и прочитанных существующих packages. На установленном image `sha256:34abe462e4880dac27c644d8c7302fc95aeedfcd8be85cbc80e7b2ac718f9e09` повторно выполнены только version/help/inspect; max_redirects наблюдался в обоих binaries. Это capability evidence, не redirect/TLS/media fixture PASS. Будущий build не считается закреплённым старым image digest: нужная policy проверяется на фактическом test artifact.

Терминальные OpenSpec/docdiff/hash результаты передаются в авторском JSON и `amendments/r2-document-checks.json`. Код, продуктовые тесты, БД/S3/private media, commit/push и gate mutations отсутствуют. Runtime latency/seed accuracy/actual media, managed navigation/storage-failure browser behavior и screen reader ещё требуют реализации/проверки. Старые font/ONNX/guard pins не ослаблялись.
