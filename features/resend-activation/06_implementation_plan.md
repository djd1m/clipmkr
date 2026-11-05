# S-план Resend activation

Inputs read: AGENTS.md, CLAUDE.md, docs/acceptance/core-cjm.md, docs/model-matrix.md, 00_complexity_assessment.md, 01_requirements.md, packages/shared/src/support-config.ts, apps/web/src/server/support/mail.ts, apps/web/src/server/support/email-handler.ts, docker-compose.yml и существующие support tests.

Исходники и дизайн не меняются. Runtime target — закрытая конфигурация существующего web. Публичный target только docs/operations/resend.md; private API key/sender/profile не являются code targets в Git. Владелец разрешил подключение провайдера; отсутствие ключа/verified domain является входной зависимостью, не разрешением её обхода.

### TASK-1 — FR-1,FR-2,NFR-1,NFR-2
Зафиксировать reuse и профиль /root/.config/clipmkr/mail/resend.env0600, инструкции Domains/DNS/verified key Sending access; genuine S router/plan checkpoints,K2 до apply. Не менять .fa-state прошлой фичи.

### TASK-2 — FR-1,FR-4,NFR-1,NFR-2
Выполнить существующие targeted Resend/config/handler/page/UI unit suites на закреплённых Node22/dependencies из исходного worktree; record exact source hashes и ограничения. Никаких новых тестовых контейнеров и платных/реальных отправок до разрешённого получателя/готового профиля.

### TASK-3 — FR-2,FR-3,NFR-1,NFR-2
После ready профиля: проверить формат существующим loadMailConfig и mail domain DNS/owner verification; fresh target snapshot/backup. Использовать текущий image8859f76 и новый closed compose override только3web env. Проверить merged config без других изменений, port guards; web-only up --no-deps --no-build, nonwebIDs/mount/env/data preserve, health same source. Ключ передаётся только закрытым stdin/file, не argv. При несоответствии сохранить факты и остановить apply; rollback использует прежний состав конфигурации.

### TASK-4 — FR-1,FR-3,FR-4,NFR-1,NFR-2
Проверить actual forgot доступность и live отправку только согласованному получателю; existing account reset требует действия владельца. Для robot full E2E нужен отдельный QA account и доступ к полученному письму; sending-only key сам по себе не даёт чтения inbox. Не подменять реальную доставку перехватом transport/DB token. При отсутствии inbox фиксировать PARTIAL с конкретным следующим шагом. Code/spec anti-drift, operational docs, реальные supported checkpoints и малые commits/push all3/readback. Cloud ручная приёмка отдельно.

EXPECTED_CODE_TARGETS:
- docs/operations/resend.md
