# Фактический допуск AM-4

Автор полного прогона сообщил о пяти failures в существующей wiring suite: её synthetic fixture не объявляет новый optional web key. Точный файл tests/wiring.test.ts подтверждён чтением. Первоначальная ошибочная ссылка на tests/env-wiring.test.ts исправлена; такого файла нет.

Координатор дополнил TASK-2, список targets и AM-4. Требования/OpenSpec/ADR/архитектура не менялись; увеличение до17изменяемыхфайлов ограничено потребителем тестовой конфигурации. Первоначальный K2 отказал формату AM-4; после добавления exact test title/path реальный K2 PASS с0failures/0warnings/0skip. Actual code admission admitted, новый literal context complete с digest84865803d1706513bee2a15dd6809fc8dca0a8b00b595bf57f520c05b2fad350.

Независимый gpt-6-astra xhigh, сессия /root/cloudru_working_release_review, сверил FR-5, ADR-001, architecture и фактическую fixture/checkWiring. Вывод clear: пустое значение только уweb соответствует прежнему контракту; отрицательный контроль потери ключа обязателен. Это review ограниченного дополнения плана, не code QE или runtime PASS.

Реализация потребителя остаётся задачей первоначального автора; прошлые полнонаборные failures не переименовываются вPASS. Перед изменением файла автор должен прочитать новый literal context и повторить admission. Полный итоговый набор, anti-drift и независимый QE остаются обязательными.

## AM-5 вместо локальных дубликатов

Полный набор завершился1537PASS/8FAIL/15S3SKIP. Дополнительно к5wiring появились3проверки clip-music-choice с тем же отсутствующим optional ключом общей environment(). Поэтому AM-4 заменён AM-5: один пустой default в существующей tests/fixtures/environment.ts; отрицательный контроль в уже объявленной tests/payments-guards.test.ts. tests/wiring.test.ts вернуть к исходной неизменённой версии после переноса собственной AM-4 проверки; clip-music-choice не менять. Это переиспользует общую fixture, без ослабления checker или production delivery. Отсутствующее значение в отдельных config cases моделировать явным delete, пустое — отдельный case.

Astra xhigh отдельно подтвердил clear для AM-5 после чтения обоих потребителей и общей fixture. Новый K2 действительно PASS0/0/0; current admission admitted363d018f2c857bf72a3f1c18f126706fd626f2147c52ab5c2a4f3d572fbeb433; literal context complete eb8f2de14326291a178012e5bd281c1cfcb10dda36e9dee327c9c72efe10e3d2. Никакие failed/skipped тесты ещё не объявляются PASS. Предыдущее checkout recall прочитано до этого допуска. Source snapshot после правки и итоговый QE обязательны.
