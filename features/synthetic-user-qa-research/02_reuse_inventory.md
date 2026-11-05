# Переиспользование

Обязательные входы: AGENTS.md, CLAUDE.md, docs/acceptance/core-cjm.md. Существующие Playwright/Vitest, native HTTP/PG harness и feature-adr evidence — baseline пилота; новый agent runtime в продукт не добавляется.

Portal homepage получен public HTTPS без authentication, содержит официальный link rel=describedby /llms.txt. web-tool initial fetch недоступен, обычный public curl работает; ограничения записываются отдельно.
