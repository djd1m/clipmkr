# План первой автоматической компоновки

Inputs read: 01_requirements, 02_reuse_inventory, 03_adr, 05_architecture, OpenSpec, AGENTS.md.

## Задачи

- FR-1 · ADR-001. Переиспользовать декодирование и YuNet, собрать визуальные наблюдения и применить существующую 02 в первой нарезке.
- FR-2 · ADR-001. Подтверждать маску только для стабильного окна. Проверить 7/8 замеров, 60%, сохранённый/вырезанный пропуск, смещение на пиксель и отсутствие демонстрации в `tests/screen-layout-media.test.ts`.
- FR-3 · ADR-001. Миграция 036, одно ограждённое решение перед S3 и проверка результата в существующей публикации. Сохранение старого формата, повтор решения при тайм-ауте и снимок в `tests/clip-layout.integration.test.ts`.
- FR-4. На реальном предоставленном фрагменте проверить полный рендер. Одновременно проверить затронутый набор и независимо просмотреть diff. На новой тестовой записи проверить готовую первую версию 02 через браузер и рабочее хранилище. Сверить отсутствие ручной пересборки.

## Контрольные точки

До кода независимое чтение дизайна, K1/K2, допуск целей и фактический
проектный checkpoint. Затем код и короткий повтор независимого ревью
по изменившимся контрактам. Автор GPT‑6.2 Sol high. Независимый QE GPT‑6
Astra xhigh, новая сессия. Используются FFmpeg, OpenCV, Vitest,
PostgreSQL и существующий тестовый аккаунт на VPS. Выкладка идёт
по текущему протоколу проекта.

EXPECTED_CODE_TARGETS:
- apps/worker/assets/scripts/detect_faces.py
- apps/worker/src/render/faces.ts
- apps/worker/src/render/framing-plan.ts
- apps/worker/src/render/screen-layout.ts
- apps/worker/src/render/ffmpeg.ts
- apps/worker/src/workers/render.ts
- packages/db/migrations/036_clip_initial_layout.sql
- packages/db/src/render.ts
- tests/screen-layout-media.test.ts
- tests/clip-layout.integration.test.ts
