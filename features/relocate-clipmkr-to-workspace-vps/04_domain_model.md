# Границы состояния при переносе

Новые бизнес-сущности не вводятся.
- PostgreSQL приложения: аккаунты/сессии → видео/транскрипты/клипы/attempts; credits/grants/allocations/charges и платежи; partners/codes/attribution/growth. Идентификаторы и связи сохраняются.
- Redis/BullMQ: транспорт и квоты/rate limits; доставка согласуется с PG attempts, все типы waiting/active/delayed учитываются.
- S3: исходники, render/thumbnail, multipart; logical keys и namespace не переписываются без необходимости.
- Helpdesk: отдельные PG/Redis/uploads и identity/inbox mapping; основной dump их не содержит.
- Внешние поставщики: ЮKassa хранит историю payment, Resend/SMTP доставляет письма; переезд не разрешает повтор финансовых операций/рассылок.
- Контур управления: Git SHA не равен runtime digest; домен/edge определяют единственную активную цель.

Состояния перехода: SOURCE_ACTIVE → BACKUP_VERIFIED → TARGET_ISOLATED_VERIFIED → OWNER_ACCEPTED → WRITES_FROZEN → FINAL_STATE_VERIFIED → TARGET_ACTIVE → OBSERVED. Ни одно состояние после SOURCE_ACTIVE пока не установлено. После первой новой записи rollback требует последнего состояния, не старого snapshot.
