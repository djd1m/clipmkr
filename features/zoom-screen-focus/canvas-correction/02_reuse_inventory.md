# Переиспользование, контракты и gates

Переиспользуется существующий ClipLayoutPreview, его source video/canvas/shared planScreenLayout, callback onState и ClipLayoutChoice apply gate. Существующий browser fixture/editor/run и синтетический MP4 остаются canonical harness; добавляются три случая в том же tests/browser/clip-layout.test.ts. Новые компоненты, библиотеки, package exports, команды и модули отсутствуют.

K1: новых имён command/module/export нет; `paint` существующая локальная функция с уточнённым boolean return. Collision sweep для отсутствующих новых имён не запускается и не выдаётся за PASS/exit0. Достаточно no-new-names inventory и реальных typecheck/build.

Затронутые проверки: canonical browser clip-layout.test.ts (Chromium/WebKit по текущей конфигурации), canonical npm run typecheck, canonical npm run build. Source guards/mutation anchors и фиксированные SHA остальных157 не меняются. Антидрифт сверяет manifest159 с разрешённой заменой ровно двух digest. Исходный RED и candidate harness3/3 сохранены отдельно; они не являются результатом применённого продукта и не повторяются формально.

Исходные требования/архитектура: ../01_requirements.md, ../03_adr/003-preview-layout-on-source-timeline.md, ../05_architecture.md; зависимый read-only consumer apps/web/src/app/clips/ClipLayoutChoice.tsx. Новый архитектурный ADR не нужен для локального исправления исполнения уже принятого отказа.
