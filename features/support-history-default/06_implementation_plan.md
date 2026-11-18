# План реализации

Inputs read: 01_requirements, 02_reuse_inventory, 03_adr/001-verified-default-widget.md, ADR-001, 05_architecture, OpenSpec, согласованный макет, итог независимого проектного ревью.

1. ADR-001, FR-1—FR-5 · Сверить согласованный макет, ADR и актуальную дельту OpenSpec.
2. ADR-001, FR-1, FR-2, FR-4, FR-5 · Оставить одно видимое действие входа в чат. Подключить серверную подпись
   и подтверждение нативного виджета. Сохранить компактные состояния доступа
   и восстановление. Затронуты `SupportPanel`, `support-client` и привязка
   субъекта в `widgetSession` при необходимости.
3. ADR-001, FR-2, FR-3, FR-4 · На синтетических A/B и штатном Libredesk проверить возврат к ответу,
   холодный запуск, новый приватный контекст и две одновременно открытые
   вкладки A/B. Негативный сценарий закрывает недействительный JWT,
   `CLEAR_SESSION` и задержанный `STORE_SESSION` после тайм-аута.
   Пересоздание B идёт без истории A даже с отложенной записью общей
   cookie. Проверить также старый visitor-токен: Libredesk не переносит
   гостевой диалог другому аккаунту, штатный JWT и список диалогов доступны.
   Проверяющий GPT‑6 Astra xhigh получит документы в новой сессии.
4. ADR-001 · На текущем VPS выпустить проверенное приложение и настройку открытия
   диалога для подтверждённых пользователей. Проверить правку прокси
   только для API виджета и сохранить исходную настройку для отката. Дать ссылку для ручной проверки.

Подтверждение владельца находится в `owner-authority.md`.
Браузерные сценарии сосредоточены в `tests/browser/support-widget-readiness.test.ts`
и `tests/browser/support-chat-closure.test.ts`.
Серверный JWT проверяется целевым сценарием `tests/support-email.integration.test.ts`.

EXPECTED_CODE_TARGETS:
- apps/web/src/app/support/SupportPanel.tsx
- apps/web/src/app/support/SignOut.tsx
- apps/web/src/app/support/RecoveryForm.tsx
- apps/web/src/app/AuthForm.tsx
- apps/web/src/app/dashboard/AccountDeletion.tsx
- apps/web/src/lib/support-client.ts
- apps/web/src/lib/support-session-signal.ts
- apps/web/src/server/support/routes.ts
- apps/web/src/server/support/widget.ts
- deploy/support-widget-privacy.caddy
- deploy/workspace-relocation.caddy
- tests/browser/support-widget-readiness.test.ts
- tests/browser/support-chat-closure.test.ts
- tests/support-email.integration.test.ts
- tests/support-widget-ui.test.ts
