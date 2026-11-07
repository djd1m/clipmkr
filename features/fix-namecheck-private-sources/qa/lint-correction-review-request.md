# Коррекция после третьего QE: запрос независимого ревью

06.11.2026. **Кандидат проверен автором; независимая приёмка этой дельты не выполнена. Установка не разрешена этим документом.**

## Причина

После функционального QE организатор обнаружил пропущенную проверку общего проектного lint: прежний test содержал644 строки по `source.split('\n').length`, при разрешённых500. Это ошибка последовательности проверок организатора. Исторический независимый отчёт `../08_qe_report.md` сохраняется и относится к прежним test bytes; его CLEAN не распространяется на корректирующую дельту.

## Точный предмет проверки

Предшественник — коммит `632fb940a451a4b5f050e9ea2a22fbaf7add8b33` этой ветки. Изменяется существующий `tests/feature-adr-paths.test.mjs`: удалено повторение fixture/subprocess/mutation lifecycle. Functional patch, требования, reuse, ADR, архитектура, план, OpenSpec и shared installation не меняются. Новых implementation targets, модулей, API и зависимостей нет.

- Прежний test SHA256: `13de66c1f801f90a5dbd716ef69f0a394a0e4edd9f0cb968f0368c318d7f0267`.
- Новый test SHA256: `c820ae6a29db3cf6b351d8207d239a4a4ac68f5a68bcc4a2fb0c4228e4238bb6`.
- Неизменный patch: `b804a82aee8ec3c5821a42c0c9a1dae9380a20df94182ac3e5600929a869ce9a`.
- Исполненный temp candidate CLI: `a6dcabe4f78f799c9251bccf8f78ec323d4e1689fe99c28feb99b46ef53b2b0a`.
- Factual07: `d95b7c26708f76d669acfb5691c4dc6701a791728e0b2ff964b766c5ddcf3c5c`.

## Проверки завершённого автора

Node22.23.4: syntax0; настоящий неизменённый `node scripts/lint.mjs`0; `node --test tests/feature-adr-paths.test.mjs`22/22,skipped0,142.181с. Test499 физических/500 split lines. Все22 названия,147 CLI argv/exits/executable hashes,10 K2 commands и144 fixture JSON совпали с предыдущими receipts. Все16 meaningful mutants сохранили bytes и конкретные нарушаемые oracles. Это авторские доказательства, не новый independent verdict.

Root после actualterminal0 физически сверил source, lint script,10 нормативных и18 shared hashes. Прочитан полный test и дельта. Авторский и root code-critic не обнаружили дополнительных подтверждённых дефектов; они не подменяют независимое ревью. Подробные журналы сохранены вне Git без секретов в публичном документе.

## Необходимое решение

Третья native QE-проверка предшественника уже CLOSED. Правило Step8 устанавливает потолок3 и запрещает обход сменой feature/source/nonce; штатное `begin-continuation` доступно после трёх witnessed cycles, активный из которых **никогда не закрывался**. Поэтому этот маршрут для текущего CLOSED3 неприменим.

Запрашивается отдельное явное исключение владельца: ровно одно cross-model ревью указанной корректирующей дельты прежним originating reviewer `gpt-6-astra xhigh`, без сброса или изменения native history и без объявления новых bytes native-CLOSED. Автор — `gpt-6.1-sol high`; фактическая serving identity NOT_ATTESTED. Проверяющий сохраняет исходные NCQE-01/02/03 и проверяет parity/lint/соседние сценарии. Результат и исключение фиксируются отдельно; разрешение не распространяется на очередные циклы, установку или runtime.

До явного решения такое дополнительное ревью не запускается. Shared installation, actual private K1, приложение/E2E, оплата, БД, SSH и Cloud — NOT RUN для этой коррекции.
