# План изменения адреса подписки

Inputs read: 01_requirements, 02_reuse_inventory, 03_adr, 05_architecture, OpenSpec, утверждаемый макет, CtaFields, short-link-handler, prepareCta, video-cta, render и существующие тесты.

1. ADR-001 FR-1. Показать URL текстом текущей основной ссылки `subscribe` с прежними `href`, rel, подписью домена и экранированием. Сохранить прежний вид формы, обновить подсказки о показе и пересборке.
2. ADR-001 FR-2 NFR-1. Выделить допустимый отображаемый адрес короткой публичной ссылки. Читать URL для рендера только у подписки, использовать прежнюю область и шрифт. Обработать текст через файл, исключить необработанное значение из фильтра, ключа и журнала, включить хеш фактического адреса в контракт медиа.
3. ADR-001 FR-3. Применить текущее атомарное изменение призыва и лимит пересборок, когда меняется отображаемый адрес. Не добавлять автопостановку старых материалов. Проверить идемпотентность, сохранение прежнего файла и полный откат на отказе квоты.
4. ADR-001 FR-1 FR-2 FR-3 NFR-1. Целевые проверки `tests/clip-cta.test.ts`, `tests/clip-cta-render.test.ts`, `tests/clip-cta-rerender.integration.test.ts`, `tests/cta-media.test.ts`. Сценарии Chromium 320 px и переход на URL через перехват; FFmpeg на синтетическом файле до и внутри окна; PostgreSQL для смены адреса и отказа квоты; отрицательный контроль параметров и других видов. Страж должен обнаруживать возврат надписи вместо адреса.
5. FR-1 FR-2 NFR-1. Независимое cross-model QE GPT‑6 Astra xhigh на одной ревизии и проверка code/spec anti-drift. При выпуске web и video worker используют одну ревизию, откат предыдущими образами. Публичная кнопка меняется при открытии; ранее опубликованный MP4 при штатной пересборке.

Риски: динамический ввод фильтра, переполнение узкой области, смена ссылки и квота, повтор публикации под тем же ключом. До реализации нужны итог согласования макета, проверка новых имён K1 и K2 для этой редакции.

EXPECTED_CODE_TARGETS:
- packages/shared/src/cta.ts
- apps/web/src/app/videos/CtaFields.tsx
- apps/web/src/server/short-link-handler.ts
- apps/web/src/server/video-cta.ts
- packages/db/src/render.ts
- apps/worker/src/workers/render.ts
- apps/worker/src/render/ffmpeg.ts
- apps/worker/src/render/cta-overlay.ts
- tests/clip-cta.test.ts
- tests/clip-cta-render.test.ts
- tests/clip-cta-rerender.integration.test.ts
- tests/cta-media.test.ts
