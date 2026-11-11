# Передача финального плана Zoom после QCSD

WORK_UNIT_ID: zoom-screen-focus-final-step6-20261111
TRACE_PATH: /home/clipmkr-zoom-screen-focus/features/zoom-screen-focus/architecture-handoff.md
Status: plan-ready-task0-blocks-code-admission
Планировщик `gpt-6-astra xhigh`, будущий автор кода `gpt-6.1-sol high`. Документ Step6 готов; workflow stage/checkpoint, K1/K2 и code GO автором не создавались.

## Установленное закрытие и текущий снимок

Actual root R3 evaluate: exit0/closed, revision `e66723874cc112533766c6896c800786109567d430efd4f5a7ff1b30382acfdd`, nonce `0276c1f3-2f7b-4e38-96c4-10258020aca1`, unresolved/reasons[]. Все6 origin reports R3 существуют; UX-04 и первые10 условий имеют собственные verification. Raw result: `/root/.config/clipmkr/zoom-screen-focus-20261111/ideation-evaluate-r3.raw.json`.

Core9 (00/01/02 research/ADR001–004/04/05) и OpenSpec не менялись при финализации. `design-dossier.json` сохранён побайтно как **исторический R3 design snapshot**, не новый manifest изменившегося06. Его копия и точные прежние06/handoff/README лежат в `history/ideation-r3-closed-plan/` (четыре файла, без рекурсивного архива). Новый `step6-plan-snapshot.json` отдельно фиксирует post-ideation plan SHA/status/пределы. Финальный06 не объявляется отдельно проверенным шестью origin reviewers.

## TASK-0 — что ещё нужно до K1/K2 и кода

Независимая SOURCE-приёмка Original и интеграция принятой ревизии остаются **PENDING**. Наличие candidate кода и сообщённый Cloud/native Next E2E16/16 не доказывают итоговый accepted artifact после исправлений long-request/GC/default-timeout lifecycle. Чужой runtime результат Zoom не присваивается.

Root должен получить genuine SOURCE QE/acceptance финального Original SHA, последовательно интегрировать его canonical server-only shared leaf, Original route, OriginalSource и VideoDetail, записать actual resulting revision/hashes и проверить sourceRevision/metadata/Range/media seam. Точный список — TASK-0 в06. В `step6-plan-snapshot.json` dependency proof пока явно null/pending; source pins обновляются после настоящей интеграции. Candidate из `/home/clipmkr-original-video` не импортируется и не считается accepted dependency.

Canonical helper: `packages/shared/src/server/original-source.ts`, export `originalSourceRevision`, import `@clipmaker/shared/server/original-source`; root re-export в browser index запрещён. Предоставленная root tentative сигнатура `(videoId:string, objectKey:string, uploadId:string|null|undefined, actualBytes:string|bigint|number)` должна быть сверена на принятом интегрированном source, не служит proof сама по себе. Дубликат helper/source route не создаётся.

Media seam проверяется на реальном интегрированном Original: native play capture в существующем Zoom parent либо тонкий callback обеспечивает каждый play preview/published/Original. Реализация относится к TASK-5 после допуска. Original16 editable targets не расширяются ради Zoom, дополнительные controls/pages не нужны. При выявлении реального нового contract issue — сообщить root до admission; закрытый core9 самостоятельно не переписывать.

## Полнота плана и UI

Финальный06 сохраняет TASK-0…8, AM-1…12, все11 condition IDs и non-vacuous test oracles, включая accepted→reload→failed recovery и cleanup только matching published draftVersion. EXPECTED_CODE_TARGETS содержит прежние59 уникальных путей:40 editable +19 read-only. Измерение read-only не разрешает их изменение; scope/XL не расширены.

Согласованный selector SHA256 `76acda5003083138245031f5e96c6697e74844a8b5324e1007d397ac993eb1f0`, PNG и ui-approval сохранены.03 default,01/02 advanced и explicit confirmation прежние. Нормативные plaintext states R2 в существующих preview/status/confirmation областях не изменены и не объявлены отдельно просмотренными владельцем; их фактическая UI/screen-reader/wholeclip приёмка остаётся впереди.

## Проверки и следующий переход

Проверены только document integrity: closed core9 hashes, неизменность OpenSpec/UI/R3 dossier, trailing59 targets, сохранность11 conditions/AM и oracle markers, whitespace/docdiff и новые metadata hashes. Это не root K1/K2, source admission, независимый review финального06 или runtime PASS. Product code/tests/DB/S3/commit/push не выполнялись.

Следующее действие root: genuine TASK-0→actual dependency proof/pins→supported stage/checkpoint/K1/K2→отдельный code GO. После реализации сохраняются один общий прогон stable revision, targeted repeats по риску, independent QE/fleet и human acceptance перед production boundary.
