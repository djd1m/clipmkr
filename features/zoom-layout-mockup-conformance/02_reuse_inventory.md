# Переиспользование и затронутые контракты

- `packages/shared/src/screen-layout.ts`: parser и planner, единый producer геометрии для UI и FFmpeg. Исправить узкую ветку новой01/02, сохранить прежние версии и03.
- `apps/worker/src/render/screen-layout.ts`, `ffmpeg.ts`: существующие crop/scale/overlay, YuNet и один timebase. Новый render pipeline/OSS runtime не нужен.
- `apps/web/src/app/clips/ClipLayoutChoice.tsx`, `ClipLayoutPreview.tsx`, `clip-layout-draft.ts`: черновик/ROI/подтверждение, canvas; переиспользовать без новой страницы.
- `packages/db/src/clip-layout.ts`, `render.ts`, migration032: strict versioned layout, durable intent и `COALESCE(i.layout,c.rendered_layout->'requested')`. Потребители music/CTA тоже читают опубликованный layout, поэтому замена геометрии v1 глобально недопустима.
- `tests/screen-layout.test.ts`, `screen-layout-media.test.ts`, `render.test.ts`, browser/clip-layout, clip-music/CTA integration; actual FFmpeg/PG/Redis/real S3 existing harness. В новый scope не переносить и не сбрасывать прежние закрытые QE receipts.
- `scripts/test-framing-mutations.mjs`: существующие mutation anchors/точные source string replacements. До правок выписать затронутые anchors; не обновлять guard/SHA механически, чтобы скрыть RED. Контрольные мутации wrong01 placement/wrong02 order/screen shrink должны давать behavioural RED.
- `docs/research/zoom-screen-layout/mockup.html`: неизменный независимый original; Playwright и существующий browser runtime делают публичные PNG и геометрию. Приватные кадры/медиа остаются закрытыми.

Новые зависимости, ML, хостинг и дизайн-система не требуются. Native blocks + существующие maintained FFmpeg/OpenCV/Playwright достаточно. Точный список файлов/версий и required checks окончательно закрепить в плане перед K2.
