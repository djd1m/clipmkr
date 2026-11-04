# Оценка upload-transfer-recovery

Дата: 04.11.2026. Task kind: bugfix
Tier: L — 22 code targets, в том числе 2 manifest/lock, 2 helpers, 7 действующих runtime
файлов и 11 тестовых файлов. Документы/OpenSpec и отдельная S-зависимость не входят в число 22.
Это повышение прежнего M: package/lock/account prop и реальные зависимые тесты раньше
не были учтены. Не сокращать требования/проверки ради M. Фактический router ещё pending;
по модулю 00 file=3, domains=2, integrations=2 (узкий OSS), breaking=2 (legacy resume
намеренно перестаёт приниматься), data models=2 (browser session v2), crosscutting=3
(lifecycle/storage/navigation); сумма 14. Новых DB-моделей/сервисов/endpoint нет; create input узко расширяется optional account_scope UUID.
Активные шаги: 0,1,2,3,3.5,4,5,6,K1,K2,7,8,9. Step9/fleet обязателен для L.

Автор этого документного блока запрошен как gpt-6.1-sol high. До кода архитектуру и QC
проверяют по docs/model-matrix.md: gpt-6-astra xhigh в отдельных сессиях; фактические ID,
effort и пределы runtime-аттестации фиксируются настоящими receipts.

Владелец явно подтвердил «Да, согласовываю этот путь загрузки»: передача → пауза/
повторный выбор того же файла → обработка → клипы. Это не согласование восьми экранов,
всех workspace-композиций или дополнительного серверного recovery.

Зависимость уже находится в текущем main/worktree HEAD
12b2e17577fcabf923f37b8814046357fd12b78a: count+HEAD guard, source-bound к авторскому
9b8b04308754a3a6ed43036505a699184be7b5a9. `git diff --exit-code 9b8b043 HEAD --
apps/web/src/server/video.ts tests/upload-completion-integrity.test.ts` дал exit0 04.11.2026.
SHA256 video.ts=74ada8486f4f1d6ba6d01c7846d173d8ceb9b4dcceb9fedc998123d479c3366b;
test=cc791918b04ddb471b5fe17e023b867ef50fae9fb6417af33e241b0e6c9e66a6.
Это проверка точных двух исходников, не ancestry или повторный runtime PASS. Не повторять
count/HEAD; video.ts дополнительно меняется только для pre-transaction scope precondition.

## Acid corpus

| Acid case | Вход/действие | Обязательный безопасный исход |
|---|---|---|
| A1 | Разные байты, те же name/size/mtime | Не resume, нет PUT/complete старого upload и автоматического нового key |
| A2 | Те же байты, иное имя/mtime | Resume прежнего key/options/video_id; hash всех байтов |
| A3 | Legacy, malformed, чужой scope, неизвестная v2 | Честное ограничение; нет auto create/PUT/complete и скрытой миграции |
| A4 | sessionStorage get/set/remove throw или утрачен cache | Сообщение и отдельное действие; нет авто-дубля; complete только после подтверждённой записи manifest |
| A5 | Deny/accept ухода во время create/PUT/complete | Deny сохраняет попытку; accept abort/fence; никакого нового complete после abort |
| A6 | Unmount/новая попытка до позднего await | Старый ответ не redirect/clear/new requests; новое состояние не очищается |
| A7 | uploading + now/5min/сутки | Не processing/stale, no_response=false, нет фиктивного progress |
| A8 | Complete принят сервером, HTTP потерян/admitted done | Повтор по сохранённым parts; один переход; актуальная стадия не откатывается |
| A9 | Отмена полного hash/файл 2GB | Ограниченные chunk reads, отзывчивость, без create до digest |
| A10 | Смена аккаунта и очистка чужого cache | Никакого применения/удаления чужого v2/нового cache по старому ответу |

QCSD: CONDITIONAL, четыре исходных условия ждут own-reviewer verification; реализация/QE/fleet pending. K1 реально выполнен дважды pinned CLI: оба exit0/free;
K2 реально выполнен с --tier=L --require-requirements: exit0, 0 failures/warnings/skips,
19 targets/10 requirements/3 ADR (исторический снимок до четырёх QC amendments). Сырые выводы k1-*.json/k2-check.txt приложены.
Это локальные текстовые проверки, не независимый QC и не разрешение на код.
Текущий блок — только документы вне Git, без контейнеров/установки пакетов/DB/платных вызовов.

После четырёх QC amendments фактически повторён K2 установленным template helper1.5.25
на этом feature-каталоге: --tier=L --require-requirements, exit0, PASS, 0 failures/warnings/skips,
22 targets/10 requirements/3 ADR. Приватный raw: k2-after-four-qc-rework.private.txt.
Это полнота текста; формальное ideation closure остаётся у host и исходных reviewers.
