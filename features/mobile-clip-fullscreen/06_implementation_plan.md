# План полноэкранного просмотра

Inputs read: 00_complexity_assessment, 01_requirements, 02_reuse_inventory, OpenSpec, owner-authority.

- FR-1, FR-4. Добавить действие у доступного video в `ClipCard.tsx` и
  `guest-page.ts`. Сохранить существующие права выдачи, версии и загрузку.
  Короткая ссылка с обложкой сохраняет своё поведение.
- FR-2, FR-3. Общая небольшая функция управляет тем же узлом video.
  Стандартный fullscreen и нативный метод Safari вызываются внутри
  действия пользователя. При отказе браузера расширить рамку на текущей
  странице, сохранить клавиатурный выход, фокус и управление видео.
- FR-1, FR-2, FR-3, FR-4. В одном браузерном наборе из двух поверхностей
  проверить готовое видео, недоступный файл и возврат на ту же позицию.
  Для iPhone отдельно зафиксировать, где использовали эмуляцию, а где
  физическое устройство. Проверить наличие кнопки в guest HTML и в
  кабинете. Независимый GPT‑6 Astra xhigh проверяет продукт и контракт.
- FR-1. Выпустить веб-образ на clipmkr.ru после приёмки поддержки.
  Рендеры и очередь не пересобираются.

EXPECTED_CODE_TARGETS:
- apps/web/public/clip-fullscreen.js
- apps/web/src/app/clips/ClipCard.tsx
- apps/web/src/app/globals.css
- apps/web/src/server/guest-page.ts
- tests/guest-pack.test.ts
- tests/browser/ux-simplification.test.ts
