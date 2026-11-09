## Подготовка
- [x] Проверить текущие IP и основные БД чтением
- [x] Снять предварительные backup основной, helpdesk, legacyTEST и локальной БД
- [x] Проверить восстановление4архивов во временных БД существующего PG
- [ ] Выполнить полную сверку согласованного исходного snapshot, Redis/S3 и support
- [ ] Завершить ADR/план и обязательные независимые gates
## Исполнение
- [ ] Подготовить целевой экземпляр и проверить реальные зависимости/E2E
- [ ] Выдать инструкцию владельцу и получить приёмку
- [ ] Согласовать окно и отдельное переключение DNS
- [ ] Перенести финальный согласованный срез с единственным writer
- [ ] Проверить переходный relay и сценарии отката

## Узкое исправление QA callback
- [ ] Принять independently verified child guard patch и focused parent normative review; сохранить original qe-primary-01 и историю parent
- [ ] Собрать отдельный QA web на исходной source base+4patchfiles, проверить manifest и pin image в Compose/test; передать direct TEST URI без rewrite
- [ ] Проверить final cumulative7targets в исходном третьем parent QE cycle, затем отдельно провести разрешённое merchant/runtime окно
