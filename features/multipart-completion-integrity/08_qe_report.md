# Авторская проверка multipart-completion-integrity

Дата: 04.11.2026. Это собственная проверка автора, не независимое cross-model ревью.
Ниже сохранены результаты автора. Независимая проверка и её фактическое закрытие
добавлены отдельным разделом; они не подменяют авторские результаты.

## Реальные gates до кода

K1: no-new-production-names — новых production module/export/command нет, только изменения
существующего VideoService.complete и новый test module. До кода production diff был пуст.
K2 pinned feature-adr1.5.25: первый запуск exit1 (C8: 3 IDs были только на continuation lines),
исправлен только план. Второй запуск exit0, PASS: 0 failure, 0 warning, 2 legitimate S skips
(C1/C2 no new ADR), все 8 IDs покрыты. Кода app/test до PASS не было.
Дополнительный check-code-targets сначала refused symlink-artifact:node_modules; symlink убран
из worktree, dependency resolution вынесен в /tmp/node_modules. Повтор admitted exit0.
Это устранение запрещённого артефакта, не подмена/отключение установленного gate.

## RED / GREEN

Первый RED: exit1, 12 failed/19 passed. Три падения были ошибкой таблицы it.each автора;
она исправлена до production изменения. Второй RED: exit1, **9 failed / 22 passed / 0 skipped**,
исходный video.ts byte-identical HEAD. Все девять — реальное ошибочное queued вместо отказа:
3 count mismatch, 4 HEAD mismatch, 2 lost-response mismatch.

После +3 production строк целевой GREEN: exit0, **31/31**, 0 skipped.
Регрессия: exit0, **57/57** в 6 файлах, 0 skipped:
upload-completion-integrity.test.ts (31), upload-fix.test.ts (9), upload.test.ts (8),
upload-route.test.ts (3), upload-browser.test.ts (3), upload-guards.test.ts (3).
Первые проверки выполнялись системным `node` из PATH (проверенный позже PATH даёт v24.21.0).
Финальный GREEN повторён явно на **Node v22.23.4** из согласованного runtime:
57/57, 6 файлов, 0 skipped; lint exit0. Повтор нужен для заявленного engines >=22 <23.
`npm run typecheck`: exit0, все workspaces и tests/tsconfig; финальный повтор Node22 также exit0.
`npm run lint`: exit0. Строгий OpenSpec validate на Node22: exit0 после исправления
уровней Markdown delta/Requirement/Scenario; первый отказ сохранён в закрытом логе.
Реальные MinIO/БД/S3/Redis/VM/API не использовались. Full build и browser E2E не выполнялись.

## Трассировка и gap check

| Требование | Проверка/доказательство |
|---|---|
| FR-1 | Counts1/2/4 против expected3 отказ до storage; success30/3,31/4; malformed number schema |
| FR-2 | HEAD0/23/25/MAX против declared24 ->409; lost23/25 ->409 до Range/transaction |
| FR-3 | untouched asserts no connect/UPDATE/enqueue/refund/abort/delete для integrity reject; >MAX/adapter preserve too_large |
| FR-4 | Legacy queued без metadata + короткий list; admitted queued/transcribing/selecting/rendering/done/failed без effects |
| FR-5 | foreign/missing/deleted404 до storage; query ownership фильтр проверяется harness |
| FR-6 | Success/lost correct HEAD; actual/queued/COMMIT раньше enqueue; retry after queue failure без повторного S3 |
| NFR-1 | Real transaction helper + SQL event order, state recheck after storage; new production names absent |
| NFR-2 | Только synthetic pool/storage и mock refund; очищенный process env; 0 skips в выбранных unit suites |

Acid A1/A2 count; A3 size; A4 lost response; A5 retries; A6 ownership; A7 unavailable;
A8 malformed schema связаны с указанными тестами. В пределах unit scope непокрытых требований
автор не обнаружил; это не заменяет независимый анализ рисков.

## Ограничения и риски

- Pool/storage синтетические, refundUploadSlot замокан; сохраняемый вызов refund проверен, но
  реальная атомарность квоты и конкуренция PostgreSQL этим блоком не доказываются.
- При completed объекте неправильного размера <=MAX запись остаётся uploading; автоматическое
  исправление/перезагрузка этого объекта и пользовательский recovery UX не добавлены.
- Большие binary files не создавались; HEAD values моделируются. Нет реальной медиа-обработки.
- Браузерный upload-lifecycle E2E, live S3, UI и deployment не выполнены. Новые Cloud.ru версии запрещены
  до ручной приёмки. Ветка автора не считается принятой/доставленной до независимого ревью.

## Проверка code/spec anti-drift

Production guard count соответствует FR-1/OpenSpec. HEAD сравнение находится после >MAX и до
magic bytes/transaction, соответствует FR-2/FR-3/OpenSpec. Checks стоят после ранних admitted/
queued branches, соответствует FR-4/OpenSpec. Новых enum/DB fields/API/UI/dependencies нет.

## Независимая проверка и formal convergence

Запрошена `gpt-6-astra xhigh`, отдельная задача
`/root/multipart_integrity_independent_review`, `fork_turns=none`.
Автор — requested `gpt-6.1-sol high`. Провайдерный runtime ID/UUID не аттестован.
Проверяющий начал с требований/плана и сам нашёл код/тесты, без авторских итогов.

Предварительное независимое ревью дало GO; отдельно запущены **54/54** unit-проверки
на Node 22.23.4, без пропусков. После настоящего host.prepare тот же проверяющий
самостоятельно сверил актуальные SHA и записал собственный native receipt.
Production SHA-256: `74ada8486f4f1d6ba6d01c7846d173d8ceb9b4dcceb9fedc998123d479c3366b`;
новый test: `cc791918b04ddb471b5fe17e023b867ef50fae9fb6417af33e241b0e6c9e66a6`.
Одна LOW-рекомендация усилить unit-проверку `FOR UPDATE` не блокирует этот scope.

Настоящий `dz qe-rounds --source native --action evaluate` завершился exit0:
**closed**, 1 witnessed cycle, 0 unresolved. Revision:
`46afc85a88ad5d135a781f4059eb0ea00004ba4192ee645e4ebb5c2be1bee536`.
Family `owner-exception` отражает явное решение владельца о cross-model;
это не заявление об Anthropic-проверке. Старые untracked screenshots других фич
и project config попали в snapshot автоматически: сверены по SHA, их пользовательские
сценарии этим ревью не переаттестованы и сами файлы в этот commit не включаются.

Закрыт ограниченный серверный unit-блок. Build образов, настоящий S3/DB/Redis,
браузерный upload и доставка остаются отдельными проверками.
