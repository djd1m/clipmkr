# AUTH-001: фактические проверки и ограничения

## До реализации

10.11.2026. App source baseline653c032; продуктовый код ещё не изменён.

- `node baseline-auth-probe.private.cjs` с отдельной *_test БД/уникальной схемой:exit0, first sessionvalid=true, repeat с правильным и неверным паролем token returned=true/authenticate=null,1account/1session/1credit_grant. Схема удалена вfinally. Репродукция service/store/PG, не браузерного пути.
- `npm test -- tests/auth.test.ts`, Node22, изолированные node_modules:exit0,10/10PASS. Это исходные guards, включая старый opaque-register contract, который требуется адресно заменить.
- `node mockup-check.private.cjs`:exit0,12состояний standaloneHTML (3сценария×2темы×390/1440). Видимость, overflow, перенос email в forgot, Tab и переход нового пользователя проверены. Не продуктовая авторизация.
- `npm run openspec -- validate repeat-registration --strict`:exit0 перед утверждением; после изменения taskcheckbox/hash требуется повтор перед кодом.
- Прямое согласование владельца «Да, реализовать этот макет» записано вowner-authority; HTML20b1c2232ee87ae5e67c1e973a670cc75480a5c64f0d2cdc511105123edd298b неизменён.

## Подготовительное независимое QCSD

Три отдельные сессииgpt-6.1-terra xhigh проверяют авторский ADR/архитектуруgpt-6-astra xhigh. Первые выводы conditional:8условий (часть пересекается по oldclient/newserver), не успешный допуск к коду. Scope одной квитанции сначала включал неизмеренный source path: aggregate gateexit3; originating reviewer исправил только scope, смысл сохранён. Первый отказ сохранил6условий других ролей; следующий вызов сообщилauthor-delta-missing. Состояние/lineage не сбрасывается; два фактических RISK-условия будут приняты авторской дельтой и проверены исходными ролями вместе с остальными.

Это реальные отказы подготовки, не успешные receipts и не дефекты уже опубликованного приложения. Авторская доработка до кода продолжается.

## После реализации

Пока не выполнены: PostgreSQL-конкуренция нового кода; actualHTTPSNext/browser cookie/reload; проверка сохранности attribution/grants; независимый sourceQE; code/spec anti-drift; сборка/поставка. Нельзя считать precode/mockup проверки их заменой.
