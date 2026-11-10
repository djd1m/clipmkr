# Проверяемость требований

Авторская проверка10.11.2026 по studio-extended-qe (shift-left-testing + qe-requirements-validation), без AQE runtime. Это не независимый QCSD verdict.

| Требование | Главный риск | План доказательства | Текущий результат |
|---|---|---|---|
| FR1/2 | cookie-пустышка вместо входа | Реальный PG и браузер reload кабинета | Исходный разрыв найден чтением; runtime тест ещё не исполнен |
| FR3/5 | Вход без пароля / раскрытие erasing | Неверный пароль, erasing, session race, прежний login privacy test | Включено в требования |
| FR4 | Повторный бонус/атрибуция/событие signup | Два concurrent INSERT + counts/grant/source + browser analytics | Включено; не закрывать одними unit mocks |
| FR6 | Утрата существующих защит | Existing rate-limit-before-body/Origin/body/hash/cookie/next negative checks | Запланированы без изменения login/reset контракта |
| FR7 | Невидимое сообщение/неактивная вкладка | Actual Chromium 390/1440, две темы, keyboard и доступность действий | Макет проверяется отдельно; продуктовая E2E ещё не выполнялась |

Все7 MUST имеют наблюдаемый исход; нет новых инфраструктурных зависимостей. Явная дельта против historical FR-AUTH001 ограничена register, решение владельца зафиксировано; нельзя случайно ослабить login/forgot. Конкретная архитектура/план проходят независимый QCSD до кода, макет — владельца.
