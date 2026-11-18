# План

Inputs read: 01_requirements, 02_reuse_inventory, 03_adr/001-layout-status-in-clip-list.md, 05_architecture, OpenSpec, утверждённый макет, VideoDetail и ClipLayoutChoice.

- ADR-001 FR-1 FR-2 FR-4 NFR-1. Расширить clip.list и SSR без нового запроса. Выборка сверяет fence, clip, render_version и серию. Успех только у опубликованной версии. Общий контракт музыки и CTA совместим.
- ADR-001 FR-1 FR-2 FR-3 FR-4. После подтверждения освежить текущий список. Карточка показывает доступный компактный статус и открывает существующую панель при ошибке. Успех исчезает через четыре секунды и не повторяется при первом открытии старого результата. Три состояния оформлены по макету.
- ADR-001 FR-1 FR-2 FR-3 FR-4 NFR-1. Целевые проверки `tests/progress-screen.integration.test.ts` и `tests/browser/clip-layout.test.ts`. PostgreSQL: текущая раскладка, несовпадающая серия, отказ, опубликованный результат, чужая запись. Браузер: приёмка, закрытый редактор, переключение клипов, сохранение плеера, короткий успех и отсутствие после reload, ошибка и открытие существующей панели. Независимый cross-model на стабильном снимке.
- NFR-1. Выпустить только веб-сервис после проверок, оставив готовый образ для отката. Проверить на синтетическом клипе в UI работающего сайта и дать ссылку владельцу.

## Риски

Не принять общий флаг пересборки за раскладку, не переиграть исторический успех после reload, не заменить плеер раньше новой версии. На 320 px статус и действие ошибки остаются читаемыми. Подтвердить инверсию связывания типа работы или перехода успеха целевой проверкой в изолированной копии.

EXPECTED_CODE_TARGETS:
- apps/web/src/lib/screen-contract.ts
- apps/web/src/server/screen.ts
- apps/web/src/app/clips/ClipCard.tsx
- apps/web/src/app/clips/ClipLayoutChoice.tsx
- apps/web/src/app/clips/clip-layout.module.css
- apps/web/src/app/videos/[videoId]/VideoDetail.tsx
- tests/browser/clip-layout.test.ts
- tests/progress-screen.integration.test.ts
