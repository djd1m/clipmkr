# Протокол подготовки 10.11.2026

- Продуктовые правила и применение к существующим материалам согласованы владельцем.
- Изменения приложения, БД и runtime не выполнялись. Настоящие code gates и QE ещё впереди.
- Использованы feature-adr, frontend-design и рекомендации studio-extended-qe для требований/рисков. Установка AQE runtime не выполнялась.
- Project-pinned dz recall выполнен; teach:2d3d9d8b8ef7670f записан и успешно извлечён повторным recall. Урок отделяет продление доступа от восстановления уже удалённых байтов.
- OpenSpec validate clip-retention-policy --strict: exit0. Это проверка структуры текущего ledger, не полноты реализации. До code gates дополнить delta сценариями FR-4/6/7 и окончательными решениями ADR.
- Статический HTML проверен настоящим headless Chromium: 5 состояний; отсутствие горизонтального overflow при390px; нет кнопки скачивания в expired/deleted; переключение в светлую тему. Screenshot просмотрен. Это не E2E приложения.
- Макет: docs/design/2026-11-10-retention.html; screenshot: docs/design/screenshots/retention-390.png. Вопрос о согласовании отправлен владельцу; ответа на момент записи нет.
- Предварительный независимый обзор требований выполняет gpt-6-astra xhigh, fork_turns=none, отдельная сессия /root/retention_requirements_review. Не заменяет три originating QCSD roles/native convergence.
- Anti-drift на данном этапе: новые сроки присутствуют только в документах/макете, production продолжает прежние правила. Не выдавать подготовку за поставку.
