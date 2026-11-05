# Требования и reuse — Resend activation

Подтверждённый запрос владельца — подключить Resend. До этого actual runtime mode disabled; sender и key отсутствуют. Новый внешний вид не создаётся: включается существующий recovery flow. Документы на русском, секреты и token links вне Git.

- FR-1: использовать готовые loadMailConfig/SupportMailer/readEnvironment и существующие forgot/reset API/UI без нового transport/SDK/dependencies.
- FR-2: применить только N5_MAIL_MODE=resend,N5_RESEND_API_KEY,N5_MAIL_FROM к web test clipmkr.ru после заполнения владельцем закрытого профиля; пустой/невалидный профиль запрещает apply.
- FR-3: canonical image/source, volumes, controllers/nonwebIDs и другие env сохранить; Cloud.ru/DNS сайта не переключать. Rollback возвращает прежний web mode.
- FR-4: реальная проверка разрешённого получателя; отдельно фиксировать API accepted, фактическую доставку и завершённый reset→login. Нельзя менять пароль существующего владельца/пользователя без отдельного явного действия; E2E использует отдельный согласованный QA account или ручную проверку владельца.
- NFR-1: ключ/адрес получателя/reset token не выводить в команды/публичные отчёты/Git; private files0700/0600, tracking off по инструкции владельцу.
- NFR-2: без confirmed domain/key не заявлять реальную отправку. Existing provider mocks не заменяют delivery; тестовые reserved addresses не применять для действительной доставки.

Reuse: packages/shared/src/support-config.ts (closed mode resend); apps/web/src/server/support/mail.ts (fixed API,bounded8s/16KiB/concurrency4,no retry), existing support/email-handler.ts (token semantics,anti-enumeration,rate limits) и RecoveryForm; docker-compose web env wiring; existing tests/support-mail-resend.test.ts,support-backend-environment.test.ts,support-email-handler.test.ts,support-backend-page-state.test.ts,support-ui.test.ts. Всё уже в опубликованном source; package install/custom runtime code не нужны.

Recall общего /home/clipmkr/.dz фактически вернул урок: успешный вход не доказывает recovery; конфигурация почты проверяется отдельно. Applied: реальные состояние mail и E2E статусы раздельны.

Shift-left/QE reference: security/contract/regression протоколы studio-extended-qe; без AQE runtime. Риски: отправка не тому получателю, подмена origin ссылки, потеря env при recreate, accepted без delivered. Oracles: scoped profile, unchanged public origin, exact config/container diffs, human/owned inbox receipt. Это план, не PASS.

## Зафиксированный OpenSpec input

- `openspec/changes/resend-activation/proposal.md` SHA256 `5c49b776256ae515e534c910a5eedf440635fd51b269193709f89a0aa407ce56`.
- `openspec/changes/resend-activation/specs/resend-activation/spec.md` SHA256 `bff7b010133284a09ce47051d75ad294858740b91b28e6be1ab8bf4021652710`.
- `openspec/changes/resend-activation/tasks.md` SHA256 `3230b56747a4e9becc83447f5e9087f27f4f9d469957c67c5daabbe57d0dfff2`.
