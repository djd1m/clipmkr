> Итог10.11.2026: source QE закрыт, исправление опубликовано и проверено на clipmkr.ru. [Фактическая поставка и ручная проверка](10_delivery.md). Ниже сохранён журнал этапов; ранние «не выполнено» относятся к тому моменту.

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

## Закрытие предкодовой проверки

Actual third ideation aggregate:exit0/closed на db36a53a3abe04b251dffdb491633ff9e651205a7cef56ddf1bf6e3ec5bdb5a7, все9условий verified. Второй aggregate былexit1 толькоRISK03; его нормативная дельта согласовала FR2/OpenSpec с legacy negotiation без изменения утверждённого HTML. Исполнение sourceQE ещё впереди. K1 currentAuthFlow names FREE0; K2 preflight PASS0,0warnings,1no-acid skip.

## Авторский кандидат и проверка координатора перед независимым QE

Реализация заморожена в16source/test targets; все16SHA координатор сверил с07/change_manifest. Агрегат73a5f3724b753d43b6ca19be42f9eec08de82a2d2c939967c63dd7ab7af59579. Actual logs прочитаны: core4files34PASS, component46PASS, nativeHTTPS10PASS (61.38s), пропусков выполнения нет. Автор также выполнил7related suites132PASS; вместе222 test executions, без заявления процента общего покрытия. Build/typecheck/lint/diffcheck автораexit0. Предыдущие setup failures/редакции и промежуточные проверки сохранены, не выдаются за первую успешную попытку.

NativeChromium/WebKit без auth-cookie injection подтвердили настоящую __Host cookie, protected next/reload, existing/no side effects с seeded spent/reserved и заменяемым attribution, положительные created/login/cookie controls, legacy old UI и keyboard/recovery. Темы проверены поdataset/computedbackground; первые неверно названные light screenshots были тёмными и не являются evidence светлой темы. После правильного cookie seed обе темы реально проверены. Root лично просмотрел final mobile/desktop notice и wrong-state screenshots: normal flow под nav, red alert, email сохранён/password пуст.

Автор обнаружил и закрыл delayed navigation retry (existing не вызывает code.apply/signup даже при повторном submit) и возвращение фокуса на пустой пароль после recovery. Значимые guards проверены12source mutants и8инъекциями прежнего fixedCSS; это не процент mutation coverage. Полный media-responsiveCLI не запускался: ему нужны video/short/guest/clip fixtures; новая генерация дляAUTH не требуется. Targeted browser matrix включает320/390/1440, темы, увеличенный текст и клавиатуру; полный WCAG и физический Chrome/Windows не заявляются.

Процессный лимит: первичная делегация получила paths/digest вместо вставленного literalpromptBlock, предусмотренногоStep7. Полное корректирующее чтение36480символов актуального complete блока перед authorfreeze записано в07; исходная передача не объявляется выполненной задним числом. При сверке добавлены недостающие planned guard-table проверки; существующие K1/K2/target admission были фактическими.

Amendment-check сначала ошибочно вызван изcanonicalcwd и проверил старые файлы:exit1. Повтор изexecutionworktree дал actualexit0,11resolved,0missing/placeholder. Это ошибка вызова, не пропавшие тесты.

Base Specification.md побайтово совпадает с653c032 и SHA3ac09f3dcccc354f292ac0ed0452de0e7f14f8bafd68b6f8e54354e303407532. Дельта register-only явно вaddendum иOpenSpec, текущие3ledgerSHA совпали. Package manifests/lock не менялись. Динамический статусQE/доставки хранится вfeature-adr; OpenSpec не используется как обход его gates. Независимый sourceQE и release ещё не исполнены.

## Независимый source QE: закрыто

10.11.2026 native `dz qe-rounds --source native --action evaluate`: **exit0/closed**, revision `64b6843421c7b36bd8212647a350760b30ba54f5954c20c875446163ef4a6dd1`, nonce `7d508213-9258-4c3a-aa05-de8908ebc714`, unresolved=[]/reasons=[]. Первый sourceQE цикл, все3ролиclean, conditions не выдумывались. Перед evaluate проверены полный roster, scopes и все42SHA; partial aggregate не запускался.

- qe-primary, новаяgpt-6-astra xhigh: самостоятельная статическая проверка кода/тестов и зависимостей, без собственного test execution.
- qe-security, новаяgpt-6-astra xhigh: самостоятельно22unit и11selectedChromium component checks, без пропусков выполнения;35других случаев исключены фильтром.
- qe-tests, новаяgpt-6-astra xhigh: самостоятельно3PG barrier/fence/rollback и3nativeHTTPSChromium checks, всеPASS;8+7других случаев исключены фильтром. WebKit/остальные author runs и12mutants проверены как evidence/source, не присвоены собственным execution.

Эти числа не суммируются с222author tests как уникальное покрытие. Все42snapshot hashes и3OpenSpec ledgerSHA независимыми ролями подтверждены. Это cross-model проверка кодаSol; авторский ADRAstra отдельно проходилTerraQCSD. НикакогоAQEruntime не устанавливалось.

Фактические изображения: [вход в существующий аккаунт](07_code_changes/screenshots/actual-existing-390-light.png), [неверный пароль](07_code_changes/screenshots/actual-conflict-390-light.png). Изолированные синтетические аккаунты/баланс не относятся к рабочим пользователям. Загрузка/кабинет на изображениях — прежний контекст, не новый редизайн.

## Code/spec anti-drift перед поставкой

FR1/2: storebool→outcome→настоящаяsession/cookie, PG/HTTPS reload. FR3/7: actualLanding conflict/recovery, preservedemail/emptyfocusedpassword, inline notices, обе проверенные темы/ширины/клавиатура. FR4: uniqueINSERT/trialtransaction, existingRPC/signup0 включая delayed retry, PG snapshots+positivecontrols. FR5/6: status/hash fence, invalidstore503, rate/Origin/body/cookie/next/log guards. Legacy boundary явно отражена и вFR2, и вOpenSpec/addendum. Нет migrations/packages/newservices, login/forgot/resetAPI сохранены. BaseSpec3ac09f3d… совпала побайтово сbaseline;3ledgerSHA совпадают, approvedHTML20b1c2 неизменён. Манифест16source/test совпадает; обязательные11AM найденыactualamendment-check0.

Поставка текущемуVPS ещё следует поdeployment-plan; закрытыйsourceQE не называется провереннымpublishedUI. Полныйresponsive-mediaCLI/физическийWindows/WCAG/inboxdelivery не заявлены; проверка оплаты/генерации не повторялась радиAUTH.

## Итог после публикации

Публичный Chromium browser: новая регистрация, конфликт неверного пароля, обычный login, существующий аккаунт с верным паролем, нативная Secure/HttpOnly cookie и protected reload — PASS. Читающая БД-проверка собственного QA-аккаунта:1account/1trial grant,3session,0неотозванных после выхода.2существующих клипа воспроизводятся и скачиваются. Обновлён только web085103b; backup до/послеexit0. Все42QE snapshot SHA после поставки совпали. Полный протокол10_delivery.md.

QE-VERDICT: A-

Буквенная оценка — итог координатора по фактическим проверкам и ограничениям, включая исходный неполный handoff; независимые роли дали clean без буквенной оценки. Подтверждённых source findings нет, пустой Findings ledger не создаётся.

qe ledger row skipped — stage resumed

После восстановления контекста обнаружен уже записанный checkpointqe этой ревизии; согласно resume guard новая ledger row не добавлялась. В проектном run-cost ledger отдельная строка этого slug не найдена: это ограничение учёта, а не доказательство нулевых затрат. Native closure и реальные тесты подтверждены независимо от cost ledger.

Финальный guard check --op code:exit0/pass,0violations; проверен no-skill-drift. Signature-fresh — notEstablished, worktree audit store отсутствует, поэтому это не доказательство подписи/audit log. Прямой no-stubs scan всех16замороженных source/test files дал0совпадений; новых исходников после QE нет.

Подтверждённый live-урок сохранён actual dz teach --no-mirror: teach:93a90fc757a70df8; повторный recall вернул этот урок с reward0.85; фактическое чтение проверено. Сначала recall ошибочно выполнен другим Node runtime и не прочитал SQLite native module; под проектным Node22 фактическое чтение восстановлено, ложный no-hits не принят за результат store.
