# AUTH-001 — независимый primary source review

10.11.2026. Роль `qe-primary`, family `owner-exception`, модель запуска `gpt-6-astra xhigh`; автор кода по заданию — `gpt-6.1-sol high`. Отдельная сессия `/root/repeat_registration_qe_primary`, без истории кодирования и без авторских итогов/предыдущих QE-отчётов в исходном контексте. Основание cross-model: `AGENTS.md`, `docs/review-policy.md`, `docs/model-matrix.md`.

**Вердикт роли: clean. Подтверждённых source-дефектов и пропущенных MUST в рассмотренной реализации не обнаружено.** Это статическое code-critic review, не итоговый Step-8 gate, не результат исполнения тестов и не разрешение поставки.

Применены `/home/product-studio/.agents/skills/code-critic/SKILL.md`, установленный `/home/clipmkr/.agents/skills/feature-adr/modules/08-qe.md` и его pinned `references/agentic-qe/qe-ref-brutal-honesty-review/REFERENCE.md` (Linus, direct). Квота замечаний не применялась: задание требует настоящих нарушений и допускает чистый результат.

## Привязка доказательств и объём

Рабочая копия: `/tmp/clipmkr-repeat-registration-20261110`. Native host только прочитан, не изменялся.

- Revision: `64b6843421c7b36bd8212647a350760b30ba54f5954c20c875446163ef4a6dd1`.
- Nonce: `7d508213-9258-4c3a-aa05-de8908ebc714`.
- Независимый SHA256-пересчёт всех **42/42** путей host manifest: несовпадений нет. Проверены в том числе 12 PNG утверждённого пакета; это проверка байтов, не визуальная приёмка PNG.
- `requirements-revision.json`: все три текущих OpenSpec файла совпали со своими записанными SHA. Proposal `f97e9cb3014de2e31d850365e0b1a2d4dd0659c8282ac85346609f4b6a33eee3`; spec `26c834f811f60a402c92fd32286805b67400dbfd0f912593fc8845c9f73088bc`; tasks `e4352acd8d3444ae0526ec3ecdfbdaa2ee51401d2e4af71eeae04577fb6b1a61`.
- Утверждённый HTML `docs/design/2026-11-10-repeat-registration.html`: `20b1c2232ee87ae5e67c1e973a670cc75480a5c64f0d2cdc511105123edd298b`, совпадает с owner-authority и requirements revision.

Сначала прочитаны AGENTS/CLAUDE, требования01, ADR001, архитектура05, план06, owner-authority, requirements-revision, OpenSpec и HTML. Затем самостоятельно найдены и разобраны 16 source/test targets из плана: 10 app-файлов и 6 тестовых файлов. Изучены текущий код и diff; дополнительно прослежены `Landing`, `safeNextPath`, root/forgot/upgrade routes, `transaction`, `grantTrialTx`, enum parser, runtime wiring, строковые register callers, test runner/config. В `globals.css` проверены дельта и применимые theme/layout/button правила. Глобальный аудит остальных подсистем не выполнялся.

## God-object growth (BLOCKING)

Нарушений нет. Изменённые app-модули имеют 19–553 строки; новый `AuthFlow.tsx` — 44 строки и отвечает за UI-память/представление. Новая бизнес-логика не добавлена в модуль на 700+ строк. AuthService, HTTP handler и SQL-store сохраняют разделение обязанностей.

## Security violations (BLOCKING / HIGH)

Нарушений нет. `auth.ts:33–50` использует результат атомарного INSERT и общий парольный helper; active, совпадение bcrypt и успешный `createSession` обязательны. `auth-store.ts:27–34` сохраняет `status='active'`, прежний `password_hash` и `FOR SHARE` перед вставкой сессии. SQL параметризован; новый пароль не записывается в существующий аккаунт.

`auth-handler.ts:32–61` оставляет limiter до чтения тела, Origin, JSON/4096-byte/Zod/bcrypt bounds. Точный opt-in на строках64–66 разрешает попытку парольного входа, но не заменяет её. Missing/unknown header при duplicate не достигает session insert. Отказы не устанавливают новый cookie; успешный token остаётся только в защищённой cookie. Catch на строках76–79 выводит фиксированную категорию/action без exception.

## Architectural concerns (HIGH / MEDIUM)

Нарушений нет. Переиспользованы существующие bcrypt, HMAC/TTL, SQL transaction, trial grant, fenced session creation, `safeNextPath`, attribution RPC, analytics и RecoveryForm. Новый provider не является источником серверной авторизации. Таблиц, migrations, пакетов и альтернативного auth-сервиса не появилось.

String wrapper сохраняет `Promise<string>` на успехе; отрицательный исход теперь исключение без credentials, как предусмотрено ADR. Common helper поддерживает прежний token/null контракт login. Повтор требует hash + compare — это явно принятая цена ADR; bcrypt не перенесён в PG connection/transaction.

## Anti-pattern violations

Нарушений нет. Нет нового retry loop в приложении, глобального auth state, параллельной реализации логина, фонового незавершённого write или скрытого преобразования store error в успех. Fixed HTTP503 в auth catch соответствует принятому privacy-контракту и не является замалчиванием успешного результата.

## Type / contract issues

Нарушений нет. `AuthStore.register` возвращает boolean после завершения transaction; `undefined` не принимается за created. Union различает created/existing и conflict/unavailable. Handler возвращает согласованные200/409/401/503. `AuthForm.tsx:81–93` проверяет объект, исключает массив/null, требует `ok===true` и известный registration outcome. Прежний ok-only ответ допустим для login, но не подтверждает регистрацию.

`AuthForm.tsx:85–89` освобождает busy/availability до обращения к `Landing.requestMode`, сохраняет email, очищает password и удерживает сообщение через mode effect. Обычный login и created продолжают прежний attribution flow; existing на строке97 пропускает RPC, а signup на строке59 ограничен created.

## Edge-case sweep

По коду рассмотрены: новый адрес; active correct/wrong; missing/unknown/erasing; ложный store outcome; session false/exception; concurrent same/different password; reset/erasure между credential snapshot и INSERT; старая форма/неизвестный header; новый клиент со старым ok-only; malformed/null/array/non-2xx/offline; oversized input; небезопасный next; повтор submit и повтор клика при задержанной навигации; recovery туда/обратно и full reload.

`AuthFlow.tsx:22–31` удерживает notice до целевого pathname и удаляет после ухода, без таймера. Обе формулировки совпадают с утверждённым HTML. Notice вставлен после WorkspaceHeader и nav return-страницы; CSS задаёт обычный поток. Recovery переносит email и безопасный next в React memory; password/token туда не входят. Возврат через RecoveryForm очищает draft после переноса, успешный вход и уход на сторонний pathname также его очищают. Полный reload не восстанавливает draft из storage.

## Test quality

Структурных проблем, обесценивающих целевые проверки, не найдено. Тесты прочитаны, **не запускались этой ролью**.

- `tests/auth.test.ts`: actual AuthService/bcrypt с fake persistence для исходов; handler guards, одинаковые login refusals, protocol negotiation, invalid store result, transport/password boundaries и fixed-log negative control.
- `tests/database.integration.test.ts`: реальный winner INSERT удерживается до commit; другой PID подтверждается через `pg_blocking_pids` до release. Same/different password и оба billing mode имеют observable account/grant/session assertions. Reset/erasure commits предшествуют настоящему fenced insert; trigger проверяет transaction rollback внешним SELECT.
- `tests/browser/public-entry-cabinet.test.ts`: настоящие Landing/AuthForm/RecoveryForm/provider, управляемый transport; conflict после React settle, сохранение email, пустой пароль, непригодные успехи, attribution retry/discard, duplicate submit и notice.
- `tests/browser/repeat-registration-next.test.ts`: реальный собранный Next за HTTPS; auth-cookie не подставляется вручную. Browser jar/flags/protected reload, empty-context rejection, полные PG snapshots израсходованного/зарезервированного trial и attribution; created/login положительные controls для apply/signup. Legacy mount использует старый исходник, не stripped-header нового клиента.
- Независимо декодирован `LEGACY_SOURCE`: 7967 байт, SHA256 `6b97da09ffc9c34dda5bcd814a188f964979fc75499e3518fbe93a3b6e9d2a77`; байты совпали с Git `c97515db90e704b44da0644c9ac92a8cd22e6343:apps/web/src/app/AuthForm.tsx`.
- `tests/bcrypt-load.test.ts` адаптирует typed store, сохраняя нагрузочную проверку; `tests/support-ui.test.ts` сохраняет verify/reset/mail-disabled контракты. Runtime исполнения и результаты mutation/discrimination принадлежат отдельной QE-роли.

PG suite по прежнему допускает skip без DATABASE_URL; это не доказательство её исполнения. Native browser suite явно отказывает без test PG/Redis14. Оба browser файла включены шаблоном отдельного `vitest.browser.config.ts`; обычный `npm test` их исключает. Наличие test-файлов не доказывает запуск этого отдельного профиля или CI.

## Process / done-ness gaps

Статического code/spec drift не найдено. Addendum явно заменяет только register anti-enumeration; историческая frozen Specification не переписана. Текущие OpenSpec revisions и approved mockup согласованы с требованиями. Исторические формулировки proposed/ожидается в design-документах не использованы как свидетельство действующего gate.

| План / требование | Статическая реализация | Граница вывода |
|---|---|---|
| TASK1–2; FR1/2/4/5/6 | Boolean store, outcome, общий helper, negotiation, HTTP/cookie/log guards присутствуют | Не утверждается live DB результат |
| TASK3; FR2/3/6/7 | Approved flow, notice, memory recovery, busy release, strict replies присутствуют | Визуальная/runtime приёмка отдельно |
| TASK4–5; FR1–7 | Названные PG/component/native HTTPS проверки найдены и прочитаны | Их прохождение здесь не заявлено |
| TASK6 | Явная normative delta и current hashes присутствуют | Typecheck/lint/mutation/teach не исполнялись здесь |
| TASK0/7 | Независимый source review выполнен этой ролью | K1/K2/native gate, доставка и ручная приёмка не присваиваются reviewer |

## Production safety

В diff нет новых migrations, production configuration или provider вызовов. Browser harness использует random schema, synthetic secret, тестовую БД, Redis14 и локальный payment fixture; auth получает cookie через HTTPS. Операций production/Cloud.ru/DNS, commit/push или вызова prepare/evaluate этой ролью не было.

## Suggestions only (LOW)

Не добавлялись косметические замечания или условия ради количества. Подтверждённых новых существенных рисков после source sweep не найдено.

## Skipped checks (transparency: what you intentionally did not check, why)

По поручению static/code-critic не запускались тесты, build, lint, typecheck, mutation/discrimination, браузер или dz gates. Не инспектировались runtime screenshots, окружение production, remote CI и результаты автора; не подтверждены deploy/приёмка. Отсутствие этих результатов в собственном отчёте не объявляется ни дефектом кода, ни их прохождением. `architecture/vision.md`/`architecture/degradations.md` в этой рабочей копии отсутствуют; границы взяты из AGENTS/CLAUDE, core-cjm, требований и ADR.

Начальная собственная receipt: `verdict=clean`, `conditions=[]`, `verifications=[]`, `authorAssessmentChecked=false`, `deltaVerification=null`. Author остаётся null; чужие роли и host не изменяются. Общий gate/release этим отчётом не закрывается.
