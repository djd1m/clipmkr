# Регистрация по партнёрской ссылке

**Текущий статус11.11.2026: опубликовано на clipmkr.ru.** Runtime —
`638790f2f4109062a4fd53b24fe2a13f8731338d`; живой контроль автозаполнения прошёл
на ширинах390/1440. Независимый SOURCE/QE — [08_qe_report.md](08_qe_report.md),
поставка, ограничения и ручная проверка — [09_delivery.md](09_delivery.md).

Ниже сохранено описание предкодового пакета на момент его подготовки. Упоминания
ожидаемых gates и отсутствия кода относятся к тому историческому состоянию;
фактическое исполнение зафиксировано в отчётах08/09. Измеренные документы SOURCE
и OpenSpec сохранены в точной ревизии проверки.

База74ea7a6, ветка `feat/referral-registration-20261111`, отдельный WT `/tmp/clipmkr-referral-registration-impl-20261111`.

Владелец согласовал конкретный UI, root подтвердил tierM. Отдельный Astra architect/planner подготовил ADR/05/06; три originating QCSD reviewers дали conditional R1. R2 устраняет QCR-QUALITY-1/QCR-RISK-1: обе строки notice показывают публичный applied_code, связанный сервером с сохранённой attribution. QCR-TEST-1 добавляет тот же native signup в canonical проекции blogger и owner, ровно+1/foreign0/reread unchanged. Собственное закрытие условий остаётся у reviewers; ideation closure/Step6/root GO ещё не получены. K1 и предварительный R1 K2 реально прошли; новый R2 K2 фиксируется отдельно. Приложение не менялось.

Нормативный input и точные R2 SHA — `requirements-revision.json`; главный документ `01_requirements.md`. Ожидаемые10editable targets и исторические oracles — `02_reuse_inventory.md`; дополнительные declared targets плана — неизменяемые dependencies. Новые UI screens/secondauthflow/sourcepolicy/invalid404page не добавляются.

Runtime targets: новый `apps/web/src/server/referral-prefill.ts`, существующие `server/partner.ts`, `app/page.tsx`, `app/Landing.tsx`, `app/AuthForm.tsx`, `app/AuthFlow.tsx`, `app/globals.css`. Тестовые edits: новый `tests/referral-prefill.test.ts` и существующие `tests/browser/public-entry-cabinet.test.ts`, `tests/browser/repeat-registration-next.test.ts`. Точные targets/неизменяемые dependencies и named checks — в06.

Фактически выполнены pinned recall (exit0/10records, принят lesson teach:f8d5479058e03557) и OpenSpec strict validate (результат raw сохранён private; не заменяет product correctness). Не запускались product build/tests/nativeE2E, не создавались реальные пользователи, не менялись данные/поставщики/runtime. Production source diff пуст; commit/merge/push/deploy только root.
