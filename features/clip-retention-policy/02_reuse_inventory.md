# Инвентаризация переиспользования по реальному коду

Дата: 10.11.2026. Только чтение исходников; runtime и тесты не запускались. Это исследование для предложенного плана, не успешный stage/gate.

| Блок | Фактический контракт | Изменение/переиспользование |
|---|---|---|
| `packages/shared/src/tariff.ts` | `FREE_RETENTION_MS=3 суток`; `clipExpiry` возвращает явный expires_at, иначе paid→null, иначе video retention_from+3 суток | Развить этот существующий API; 7 суток и платный deadline отделить от effectivePlan |
| `packages/db/src/plan.ts` | `retentionFromSql` использует video.finished_at, plan_paid_until, max начавшихся payment credit_grant; `clipAliveSql` зеркалит TS, исключает showcase | Сохранить SQL/TS parity, общий параметр asOf; готовность вычислять отдельно для клипа |
| `packages/db/src/render.ts` | `publishRenderResult` переводит clip в done и job_attempt в succeeded с finished_at; rerender не вызывает updateRenderProgress | Записать неизменяемый первый ready_at при первой принятой публикации; пересборка срок не сбрасывает |
| `packages/db/src/attempts.ts`, миграция `018_clip_music.sql` | job_attempt содержит clip_id, stage, succeeded, finished_at и rerender; попытки сохраняются до удаления аккаунта | Историческое заполнение ready_at: min успешного render finished_at с NOT rerender; проверить отсутствующие/импортированные строки |
| `packages/db/src/payments.ts` | legacy продление сохраняет account.plan_paid_until; expirePaidPlans не обнуляет его; оплата блокирует account FOR NO KEY UPDATE | Существующая сериализация account — граница повторной проверки права перед claim очистки |
| `packages/db/src/credits.ts`, миграция `022_credit_packages.sql` | payment credit_grant хранит entitlement_start/end; signup/trial/recovery — другие источники; base бывает scheduled; payment_intent содержит period_start/end только для credit SKU | Использовать payment grant как историю, исключить trial/recovery; legacy plan_paid_until нельзя считать полной историей интервалов |
| `packages/db/src/ops-set-plan.ts` | Назначение free обнуляет plan_paid_until; журнал не содержит прежней даты | Не обещать восстановление утраченной legacy-истории; учесть при уточнении операторской отмены |
| `apps/web/src/server/retention.ts` | Один advisory lease на проход; выбирает done clip у terminal video; cancel rerender → S3 префиксы → null keys + expires_at | Сохранить batch/retry/storage adapter; добавить durable claim и повторную проверку под account→video→clip; не использовать account erasure для FR-5 |
| `apps/web/src/server/watchdog.ts` | Запускает retentionTick с часовым интервалом; backlog не откладывает следующий проход на час | Добавить уведомления в существующий цикл с независимой обработкой ошибок; новый cron/Redis queue не нужен |
| `apps/web/src/server/screen.ts`, `clip-file.ts`, `short-link.ts`, `guest-pack.ts`, `clip-music.ts`, `video-cta.ts` | Все уже вызывают clipExpiry/clipAliveSql, часть получает срок на уровне video | Обновить ВСЕ селекторы/входы вместе, добавить признаки удаления; не создавать второй rule engine |
| `apps/web/src/lib/screen-contract.ts`, `apps/web/src/app/clips/ClipCard.tsx` | available + expires_at; нет отличия expired от physically deleted | Расширить существующий контракт состояния; сохранить карточку/оценку/историю; UI только после согласования макета |
| `apps/web/src/server/support/mail.ts` | Resend/SMTP/test/disabled, 8 s timeout, bounded body, budget 4, accepted/failed/unknown; message строго verify/reset; нет provider key | Переиспользовать защищённый транспорт, расширив сообщение; не подменять reminder письмом reset и не трогать токены SupportEmailStore |
| `packages/db/src/support-email.ts` | Хранит verify/reset токены и rate admission, не outbox напоминаний | Не переиспользовать таблицу токенов как журнал retention; новая небольшая durable таблица уведомлений оправдана |

## Проекты 1–8 и OSS

Локальный поиск в `/home/2026-AUG-PU-Projects/projects/` дал исходный N5 retention и N6 payments: они не решают новую политику; повторное копирование не нужно. Прочитан донор N1: `01-testimonials-senja/apps/web/src/lib/email.ts`: уже есть `EmailMessage.idempotencyKey` и заголовок `idempotency-key` Resend. Перенести узкий контракт в текущий транспорт с его более строгими ограничениями. Текущие внешние гарантии и срок dedupe Resend ещё требуется проверить по официальной документации перед реализацией; локальный донор этого не доказывает. Указанный в исторических комментариях N3 по предположенному пути не найден; его исследование не объявляется выполненным.

Сохраняем Node22/TypeScript/PostgreSQL/S3/Nodemailer/fetch и Vitest. Новые SDK, брокер, сервис, библиотека дат не нужны. Внешний OSS/API research ограничен: официальные актуальные гарантии провайдера пока не проверены.

## Подтверждённые ограничения исходников

Нет clip.ready_at/deleted_at; старый expires_at смешивает явный срок и следствие cleanup. Единственная найденная запись expires_at клипа — текущий cleanup после S3; импортированные/ручные значения всё равно нельзя автоматически считать доказательством удаления. Текущая очистка не перепроверяет оплату перед S3 и не сериализуется с ней; воспроизведение гонки тестом пока не выполнялось. У частичного результата срок сегодня зависит от всей video.finished_at и может не начаться. Удаление аккаунта намеренно удаляет историю и сильнее retention — этот путь не изменять на «сохранять всё».
