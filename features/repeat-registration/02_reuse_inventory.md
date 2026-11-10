# Переиспользование для AUTH-001

Проверено чтением source main653c032. Это наблюдение кода, не браузерная репродукция.

| Блок | Что используем | Текущее расхождение |
|---|---|---|
| AuthService auth.ts | bcrypt compare, dummy hash, token/HMAC/session TTL, login | register всегда возвращает token, даже если INSERT ничего не создал |
| PgAuthStore auth-store.ts | ON CONFLICT, атомарный trial+session, createSession active+password_hash FOR SHARE | register не возвращает признак вставки |
| auth-handler.ts | body/Origin/rate-limit, JSON и защищённый cookie | любой token register считается успехом |
| AuthForm.tsx | существующая форма, переключение входа, safeNextPath, блокировка повторной отправки | любой HTTP200 даёт signedIn, signup/code.apply выполняются без результата created/existing |
| grantTrialTx/unique account.email | однократное начисление при реальном account INSERT | Не заменять precheck или повторной выдачей |
| Existing forgot/reset | восстановление доступа | Контракт сохраняется, без новых писем реальным пользователям |
| tests/auth.test.ts и existing browser public-entry | guards и настоящий UI | Старый test об opaque register надо адресно заменить по принятой дельте, login privacy tests сохранить |

Не требуется внешний OSS: проект уже использует поддерживаемые bcrypt/pg/Next/React/Playwright. Новый пакет формы или auth-сервис увеличил бы объём без пользы. Совместимость AuthService.register с многочисленными внутренними callers нужно явно решить до кода; массовая перепись fixtures не является целью.

## Исходная репродукция на настоящем PostgreSQL

Координатор выполнил baseline-auth-probe.private.cjs на исходном коде653c032 и существующей отдельной *_test БД, с уникальной схемой и штатными миграциями. Actualexit0: первая регистрация→действительная session; повтор с верным паролем→token returned, authenticate=null; повтор с неверным→token returned, authenticate=null. Counts1account/1session/1credit_grant. Схема удалена вfinally. Это репродукция service/store/DB; исходная браузерная репродукция ещё не выполнялась. Пароли/токены/реальные аккаунты в артефакты не включены.
