> Актуально 10.11.2026: опубликовано на clipmkr.ru, native QE закрыт, live просмотр/скачивание и backup прошли. Итог и ограничения: [10_delivery.md](10_delivery.md). Нижние записи сохраняют историю этапов.

# Политика хранения клипов

Кандидат реализации 47targets (L) после согласования владельца и настоящего native ideation closure/K1/K2; независимый code/QE и поставка остаются отдельными gates. Production runtime этой фичей ещё не менялся.

- `01_requirements.md` и `requirements-revision.json` — согласованная политика и exact OpenSpec ledger.
- `03_adr/`, `04_domain_model.md`, `05_architecture.md` — принятые координатором решения; originating QCSD evidence в `03.5-*` и `03.5_ideation_report.md`.
- `06_implementation_plan.md`, `pre-code-checks.md` — выполнение и реальные pre-code основания.
- `07_code_changes/change_manifest.md`, `07_code_changes/author-summary.md` — actual diff/авторские проверки с ограничениями.
- `deployment-plan.md` — границы runtime/release/rollback координатора, не квитанция публикации.

Source bytes frozen для независимого QE после narrow исправления полностью истёкшего выпуска; тестовые логи и приватные synthetic S3 receipts не содержат production операции. Старые артефакты не выдаются за выполненную новую приёмку.

Независимый первый QE выявил 7 условий; author repair готов с реальными red→green и mutation доказательствами. Повторное originating verification и native closure ещё не объявляются успешными. См. `qe-author-delta.json`.
