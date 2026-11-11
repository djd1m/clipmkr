# Доступ к исходной записи — маршрутизация

Task kind: feature

Исходная ревизия: `e66d9addfad16e1b6dcd7bd07bf06c5abb1343f1`.
Рабочая ветка: `feat/original-video-access`; отдельный worktree `/home/clipmkr-original-video`.

## Оценка

Уточнённый tier M, сумма 10: файлы 3 (10 runtime + 1 test config + 5 test файлов = 16), домены 2 (чтение исходника и UI записи), интеграции 1 (новых нет, существующий Cloud.ru S3), breaking 1 (нет), модели 1 (нет), cross-cutting 2 (существующая auth/privacy граница). Override отсутствует. Pinned router задаёт M для суммы9–13: больше10 файлов повышает только файловую размерность до3, не превращает весь tier вL. Итоговый список в `06_implementation_plan.md`; повтор routing при изменении доменов/контрактов или следующего порога. Предварительный score9 заменён фактическим inventory, а не оставлен ради удобного tier. Root уточнил размещение единственного sourceRevision helper в shared server leaf для web/worker; отдельный source alias в test config исключает проверку старого dist.

Подтверждение tier/checkpoint ожидается у координатора; приложение до реальных gates не изменяется. Бюджет отдельно: требования/reuse 20 минут, архитектура/план/независимая QCSD 30–60, реализация 45–75, проверки/QE 45–90, тестовая поставка/владелец отдельно без обещания срока приёмки. Это оценка, не измерение и не основание сокращать gates.

## Recall

Первый `npm run dz -- recall "original video source presign S3 Range ownership no-store retention" --json --limit 8` на global Node вернул SQLite UNREADABLE/self-register, JSON fallback `[]`; это не успешное извлечение уроков.

Повтор с `PATH=/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin:/home/clipmkr/node_modules/.bin:$PATH npm run dz -- recall "original video source presign S3 Range ownership no-store retention" --json --limit 8 --project /home/clipmkr` из канонической копии: terminal exit 0, восемь реальных результатов. Применены три advisory урока: `teach:2d3d9d8b8ef7670f` (физические bytes не восстанавливаются сроком); `teach:1b4b2d51ff5634ed` (DOM/composition и один владелец media важнее совпадения палитры); `teach:2d00a4e3e9909522` (неизвестная принадлежность не равна доказанному противоречию). Нет нового teach: замечаний владельца в этом потоке не получено.

## Этапы и ограничения

Активны 0 → 1 → 3 → 3.5 → 5(light) → 6 → K1/K2 → 7 → 8. Новая интеграция, схема БД, платёжные изменения и изменение хранения не планируются.

Step3/5 и отдельный Step6 выполняет назначенный координатором архитектор `gpt-6-astra xhigh`; три настоящих QCSD роли координирует root. Автор `gpt-6.1-sol high` не выдаёт собственный read-only inventory за их результаты. Reference mode, pinned протоколы `/home/clipmkr/.agents/skills/feature-adr/references/agentic-qe`; AQE runtime не установлен. `docs/process/extended-qe.md` отсутствует в Clipmkr: ссылка устаревшего внешнего hook не означает установку процесса другого проекта.
