# План

Inputs read: 00_complexity_assessment, 01_requirements, 02_reuse_inventory, утверждённый макет/owner-authority, OpenSpec.

- FR-1, FR-3, FR-4. Добавить отдельную подборку карточек и запустить
  публичный путь /roadmap. Ссылка «Планы Clipmkr» располагается рядом с
  ходом в поддержку на экране аккаунта. Документировать обновление списка.
- FR-2. Ссылка «Предложить функцию» открывает тот же маршрут поддержки
  с заголовком и текстом предложения. Применяются утверждённая панель
  и все ветки входа, разрешений и восстановления.
- FR-1, FR-2, FR-3, FR-4. Проверить актуальный мобильный экран без входа,
  ссылку из двух пользовательских ролей и открытие подтверждённого
  синтетического чата. Независимый GPT‑6 Astra xhigh проверит публичную
  границу и соответствие макету. Выкладка после смены музыки.

EXPECTED_CODE_TARGETS:
- apps/web/src/app/roadmap/page.tsx
- apps/web/src/app/roadmap/public-roadmap.ts
- apps/web/src/app/dashboard/account/page.tsx
- apps/web/src/app/support/page.tsx
- apps/web/src/app/support/SupportPanel.tsx
- apps/web/src/app/globals.css
