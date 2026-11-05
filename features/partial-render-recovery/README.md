# Partial render recovery — комплект для review

База a04a28f73db10745536a28518e9a7e52b6073cc2, worktree /tmp/clipmkr-partial-render-recovery-20261105,
branch fix/partial-render-recovery-20261105. Только документация и статический макет, без commit/push.

1. 00_complexity_assessment.md — M10; принят координатором, человеческие допуски не выдуманы.
2. 01_requirements.md — FR-1…FR-6, точная hash-привязка OpenSpec дельты.
3. 02_reuse_inventory.md — реальные владельцы retry/render/credits/UI.
4. 06_implementation_plan.md — предварительный SPARC-GOAP план, не завершённый Step6.
5. ../../docs/design/2026-11-05-partial-render-recovery-notes.md — HTML/preview/hash для согласования.

ADR/QCSD/light architecture/независимая планирующая модель/K1/K2: NOT RUN.
Приложение, workers, S3 transport/timeouts и enum не изменены. Новые runtime имена не введены.
Инварианты A1…A6 привязаны в плане к будущим auth/state/credits/race/preservation/delivery тестам.
Новый сценарий не объявляется прошедшим по старым тестам или диагностическому own-key upload.

Dependency reuse: на время вызова pinned npm/dz и Playwright использовалась временная ссылка
node_modules → /home/clipmkr/node_modules. Собственная установка зависимостей не выполнялась;
ссылка не добавляется в Git. process:install завершился ошибкой до генерации skills; не исправлялся.
Skill modules прочитаны по абсолютным путям действующей установки. Успешный повторный recall — Node22.23.4
из /tmp/clipmkr-public-entry-20261105, общий /home/clipmkr store; новый store не создавался.

Предварительный anti-drift: текущий комплект меняет только features/, openspec/changes/ и docs/design/;
apps/ и packages/ остались на базовой ревизии. Это проверка границы подготовки, не post-code anti-drift.

Структурная проверка дельты выполнена05.11: Node22.23.4, проектный `npm run openspec -- validate partial-render-recovery --strict`
→ exit0, `Change 'partial-render-recovery' is valid`. Это валидность формата, не approval и не проверка реализации.
TASK-5 уточнён по фактическим labels тестового194: controller77 не подменяет publictarget;
при будущем deploy сохраняются шесть текущих compose слоёв Resend и новый payment override по фактическому состоянию.
