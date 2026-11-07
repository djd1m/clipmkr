# Восстановление известного checkout после потери ответа

Task kind: tooling
Tier: M, предварительно9баллов: 4–10 исполняемых/fixture файлов=2; browser QA и operator journal=2; новых интеграций нет=1; breaking API нет=1; отдельный recovery receipt=2; новых сквозных механизмов нет=1. Архитектор уточняет literal targets до code.

M: requirements → один ADR/shift-left → независимый QCSD risk/testability → light architecture → implementation plan → K1/K2/actual checkpoints → author → cross-model QE → runtime отдельно. DDD и fleet L/XL не применяются. Это новая отсутствующая возможность восстановления, а не пятый цикл старого callback QE4; старые условия/receipts не изменяются.

Запрошенные роли: архитектор gpt-6-astra xhigh; автор gpt-6.1-sol high; QE gpt-6-astra xhigh в новой requirements-first сессии. Для ревью артефактов Astra — gpt-6.1-terra xhigh. Serving identity NOT_ATTESTED. Применяются feature-adr+project-pinned dz, supporting OpenSpec и extended QE без AQE runtime.
