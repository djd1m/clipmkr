## 1. Компонентный guard

- [ ] 1.1 Написать real PostgreSQL + actual provider adapter тесты foreign payment/refund/retries/concurrency и получить semantic RED на существующем ungated handler; сохранить фактический результат.
- [ ] 1.2 Реализовать QA-only pre-ledger adapter с exact profile и локальной intent/provider ID парой; получить GREEN, включая known local drain после checkout revoke и early binding retry.
- [ ] 1.3 Добавить тонкий QA Next route и точечно расширить существующий exact route guard; проверить route wiring/startup отказ и canonical совместимость.
- [ ] 1.4 Обновить feature-adr07 manifest и требование→риск→тест mapping по фактическим четырём code paths; не изменять parent нормы/историю/deployment.

## 2. Завершение зависимости

- [ ] 2.1 Выполнить targeted integration, typecheck/lint/build и repository test checks с явными skips/limitations; провести guard/profile/drain mutations, затем восстановить код и повторить affected tests.
- [ ] 2.2 Провести независимый Astra review и code/spec anti-drift; записать только подлинные child code/QE receipts. Передать verified patch родителю, сохранив его original qe-primary-01 открытым до собственной повторной проверки.
