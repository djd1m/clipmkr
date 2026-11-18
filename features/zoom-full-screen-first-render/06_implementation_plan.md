# План ручного переноса камеры без дубля

Inputs read: 01_requirements, 03_adr, 05_architecture, OpenSpec, AGENTS.md, текущие общие модули и существующие тесты.

## Цель

Связать FS-05/06 с общим расчётом и существующей ручной пересборкой, сохраняя подтверждённый макет 02. Включить исправление финального замера камеры для нового режима. На этом этапе действует поручение владельца «действуй!» после показа точного [макета](camera-relocation-mockup.png) и оценки сроков. Первая автоматическая нарезка — отдельный объём.

## Задачи

- TASK-01 · ADR-001 · FS-05. Тип версии 3, общий расчёт пересечения, миграция 035, существующие `tests/screen-layout.test.ts` и `tests/clip-layout.integration.test.ts`. На изолированной PostgreSQL дополнительно применить 035 поверх строки 2 и проверить принятие 3 и отказ неверного сочетания.
- TASK-02 · ADR-001 · FS-05. В FFmpeg скрыть только подтверждённое пересечение, для версии 3 сохранить последний замер. Проверить цвет области и соседей в 01–03, дробную границу, отсутствие камеры и две фикстуры конца интервала (видимое и действительно исчезнувшее лицо) в `tests/screen-layout-media.test.ts`.
- TASK-03 · ADR-001 · FS-06. В существующем редакторе создать 3 при новом выборе, отрисовать общий результат и сохранить старые черновики и повтор запросов. Проверить отсутствие отправки при неподтверждённом окне и отказ камеры опубликованного клипа в `tests/browser/clip-layout.test.ts`.
- TASK-04 · FS-04/05/06. Независимый code-critic и QE: одна стабильная ревизия, полный приватный рендер фрагмента с движением, краями экрана и проверкой звука, отчёт и контроль на VPS. Не расходовать квоту автора записи для диагностики.

## Зависимости и контрольные точки

Три независимых роли QCSD до плана. Затем последовательная реализация TASK-01 → TASK-02 → TASK-03. После фиксации снимка независимое ревью GPT‑6 Astra xhigh без истории кода параллельно терминальным локальным проверкам. Переиспользуем Playwright, Vitest, FFmpeg и изолированную PostgreSQL. Структурные ворота: измеренные K1, K2, target admission и literal coder context. Результаты закрепляются фактическим checkpoint dz до кода.

## Риски

Открытие черновика, повтор и смена музыки могут незаметно менять раскладку. Старая версия и ключ запроса остаются каноническими. Ложное удаление проверяется пикселями вокруг камеры и отказом с пустой областью. Предпросмотр выбранной камеры условен до проверки всего клипа воркером, опубликованный отказ отображается по снимку. Миграционная проверка и резервная копия предшествуют запуску новой версии на сайте. Cloud.ru и DNS вне выкладки.

## Amendments

AM-1 (владелец): переносить окно камеры без дубля. Confirmation: проверка исходного окна, нового окна и соседнего контента → test `v3 moves the camera once without changing visible screen around it` in `tests/screen-layout-media.test.ts` (fails if reverted).
AM-2 (QE): сохранить оформление титров и CTA версии 02, обновить ограничения тестов 1/2/3 и отличить действительный финальный кадр с лицом от пустого. Для проверки лица используется обрезанная фотография Эйлин Коллинз из набора [scikit-image](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.astronaut), исходник NASA в общественном достоянии. Confirmation: настоящее лицо в последнем замере и вето при его исчезновении → test `tail sampling retains the final real observation while a blank tail still vetoes the camera` in `tests/screen-layout-media.test.ts` (fails if reverted).

EXPECTED_CODE_TARGETS:
- packages/shared/src/screen-layout.ts
- packages/db/migrations/035_clip_layout_camera_relocation.sql
- apps/worker/src/render/screen-layout.ts
- apps/worker/src/render/ffmpeg.ts
- apps/worker/src/render/faces.ts
- apps/worker/assets/scripts/detect_faces.py
- apps/web/src/app/clips/ClipLayoutChoice.tsx
- apps/web/src/app/clips/ClipLayoutPreview.tsx
- tests/screen-layout.test.ts
- tests/screen-layout-media.test.ts
- tests/browser/clip-layout.test.ts
- tests/clip-layout.integration.test.ts
- tests/fixtures/camera-tail-portrait.png
