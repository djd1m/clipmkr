# Уточнение области работ: цель23

05.11.2026. Узкая миграция существующего regression harness, не новое продуктовое поведение. Исторический22-target план SHA `9b5a9a9ca495ca3a02e94dbc260c5d8da3a8401742643b77aad0a9de41670f09` сохранён `history/scope-23/06_implementation_plan.md`, прежний native plan checkpoint неизменен. Новое разрешение относится только к будущему редактированию `tests/progress-screen.test.ts` после нового plan checkpoint.

## Фактическое наблюдение

Root mustRun terminal:11files,129tests,5failed/124passed; логи приватно `qe-20261105T215116Z-c6290296/{stdout,stderr}.private.log`. Coordinator прочитал реальные ошибки и исходники. Test target пока побайтно совпадает с64b9406. Pre-code VideoDetail импортировал useState/useEffect; нынешний approved design законно добавил useRef. Existing local_uploading_staleness_keeps_projection_neutral напрямую вызывает VideoDetail и подменяет только useState/useEffect: реальный useRef падает вне renderer. Это дефект совместимости test harness, не доказанный продуктовый Invalid Hook Call. Исторический baseline test здесь не перезапускался и успешным не объявляется.

Другие ошибки: старый3/4done compact-success oracle; старый обязательный текст «Просмотр» и прежнее имя disclosure; Chromium/WebKit timeout в unavailable/removal scenario. Связь первых двух со сменой согласованной композиции видна по source/HTML. Последние timeout измерены при меняющемся F3 source и до стабильного rerun не доказывают устаревший selector: продуктовый регресс исключать нельзя.

## Допустимое изменение и сохранённый oracle

TASK-7/AM-11 в текущем плане: только необходимая hook mock compatibility и migration на уже согласованные реальные действия, без skip, source-contains-only замены, удаления негативных случаев или маскировки timeout. useRef(initial) mock возвращает отдельный mutable current cell в существующем одноразовом projection harness; сохраняются обход настоящего parent tree и assert no_response/stage_label для всех status/age combinations. Native controls проверяются непосредственно на video; partial3/4 не называется полным4/4, готовые медиа и server-authorized actions сохраняются. В браузере реально открыть secondary контекст и сохранить player identity/currentTime/src, draft, consent, focus, polls и explicit mutation; fault при стабильном source требует исправления причины, не ослабленного ожидания.

Tier L14 сохраняется: files dimension3 для23≤25; новые domain/integration/model/breaking/cross-cutting требования отсутствуют. Requirements/OpenSpec/ADR/DDD/architecture/approvedmockup и ideation snapshot не меняются. Это технический delta execution scope, не повод перезапускать/сбрасывать QCSD lineage. Native QE prepare не запускался. Новый23-target K2/context/source-admission и genuine plan checkpoint выполняются до test edit; текущая подготовка не pass исправленного harness.

## Приёмка

После исправления полный tests/progress-screen.test.ts и исходный root mustRun набор на стабильной ревизии; Chromium/WebKit без skip, прежние семантические assertions сохранены. Новые результаты/ограничения входят в08QE и code/spec anti-drift. App code, тесты, runtime, commit и deploy этим документным проходом не меняются.

## Выполненный prospective admission

Pinned K2 exit0/PASS,0fail/0warn/0skip,23targets; target admission exit0/admitted/reasons[]; literal context exit0/complete/diagnostics[]. Native dz plan checkpoint действительно append-записан с plannedTargets23/previous22 и target23EditedBeforeAdmission=false; старые receipts не менялись. Plan SHA-256 `19169d484a428e0df61d2ee67919adb69fd40ed6cde8bc680afb62edca521d68`, context digest `2edbd466062711a8769c3a42df3a497056833f10721fb633b72c3b32484d0b32`. Код теста до этой записи не менялся. Все семь ideation input hashes совпали со snapshot; host/QCSD/reviewer lineage и QE prepare не менялись. No new module/export/command: дополнительный K1 name scan не применяется к существующему target, первоначальный genuine K1 сохраняется.
