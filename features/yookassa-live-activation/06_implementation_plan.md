# План подключения боевого магазина

Inputs read: AGENTS.md; docs/acceptance/core-cjm.md; features/yookassa-receipts/11_fiscal_confirmation.md; 00_complexity_assessment.md;01_requirements.md; packages/shared/src/config.ts; billing-handler.ts; yookassa.ts; payments.ts. Source сохраняется, нового coder handoff нет. K1: новых product command/module/export нет, NA; K2 требуется перед операцией. Этот план не является отчётом об активации.

03_adr и05_architecture: NA дляS, нового архитектурного решения не принимается; существующие receiptADR/архитектура переиспользуются. Трассировка: TASK-1 закрывает FR-1 иNFR-1; TASK-2 — FR-2/NFR-1; TASK-3 — FR-3/NFR-2/NFR-3; TASK-4 — FR-4/NFR-1/NFR-2. Известное расхождение партнёрских TEST-сумм не называется решённым source-исправлением.

- TASK-1 (FR-1, NFR-1): Закрепить baseline/backup и read-only инвентарь. Подтвердить liveGETme enabled/testfalse/fiscalizationyoo_receipt/ИННсовпадает, опубликованный parser принимает3значения,5старыхintent все сопоставленыTESTпровайдеру. Подготовить закрытые before/desired Compose с единственными billing envдельтами; вызвать реальный loadWebConfig из работающего image на desired env. Секреты/stdout не раскрывать.
- TASK-2 (FR-2, NFR-1): Сверить terminalTEST результаты и состояние партнёрского расчёта. При canonical replay явно назвать operator replay и требовать повторный providerGET; canceled только по подтверждённому terminalstatus. Не смешивать этот drain с доказательством настоящего merchantwebhook. Отдельно сохранить точныеTEST paymentIDs для ручного исключения из выплат, сохраняя все business rows.
- TASK-3 (FR-3, NFR-2, NFR-3): Получить конкретное подтверждение livewebhook от владельца и независимое ревью закрытого operator кода/ограничений. Под backup lock после свежего backup применить только desired web environment,up--no-deps с темжеimage; сверить sourcehealth/config/nonweb IDs/mounts/otherenv, обновить backupbinding. Pending operation записать до первого изменения. После liveintent аварийно закрывать sales,не менять provider назад.
- TASK-4 (FR-4, NFR-1, NFR-2): Выполнить настоящую безопасную browserпроверкуGET-only покупки с existing ownQAаккаунтом, отказ поддельного webhook и параметры нового provider; не создавать liveintent/списание. Сохранить result/backup, дать владельцу URL/инструкцию одной оплаты; отсутствие этой покупки пометить NOTRUN. Приёмка чека/начисления/реальногоhook не заменяется настроенным флагом.

## Acceptance evidence и остановки

Все действия выполняются существующим кодом source012efb6: config parser реальногоimage, existing canonical provider/handler/consumer, административный runtime operator без нового сервиса/CLI/пакета. Существующие targets ниже — проверяемые владельцы контрактов, они не разрешены к правке этимSпланом. Если потребуется sourceизменение, вернуться к требованиям/router/плану; не проталкивать его как настройку.

Остановить зависимое переключение при неизвестном результатеTESTсверки, отсутствии ownerlivewebhookподтверждения, несовпадении магазина/ИНН/receipt, изменившемсяbaseline или неуспешномbackup. Безусловного переключенияTESTназадпослеliveопераций нет. BackupданныхнеиспользуетсядляоткатаUI.

EXPECTED_CODE_TARGETS:
- packages/shared/src/config.ts
- apps/web/src/server/billing-handler.ts
- apps/web/src/server/payments/yookassa.ts
