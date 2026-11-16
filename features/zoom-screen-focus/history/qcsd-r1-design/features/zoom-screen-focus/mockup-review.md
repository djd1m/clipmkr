# Макет selector: подготовка к согласованию

Статус: предложение автором; approval владельца отсутствует. Выбор03 ранее поручен,
но не заменяет согласование нового selector. Приложение/runtime не менялись.

## Что показывать

- `selector-mockup.html`: автономный HTML, synthetic CSS-иллюстрация вместо private media.
- `screenshots/selector-closed-{390,1440}.png`: дополнительные настройки изначально закрыты.
- `screenshots/selector-open-{390,1440}.png`:03 по умолчанию, доступны01/02;
  отступы/нейтральные токены Cabinet и зелёный акцент из `docs/design/2026-11-05-ux-simplification.html`.
- Nested «Уточнить область…»: выбор screen/camera и относительной области. Это UI-эскиз,
  а не доказательство работающей нормализации/детекции/автопереходов.

На телефоне download текущего файла находится перед preview и доступен в первом экране;
новые настройки идут после клипа. На desktop preview слева, действия и selector справа.
Пояснение компромисса меняется для01/02/03. Камеру можно отключить; screen остаётся.
«Проверить и применить» открывает подтверждение; отмена сохраняет draft. Макет ничего не рендерит.

## Реальные проверки

Авторский Chromium probe: `node /tmp/zoom-selector-probe.cjs`, финальный запуск exit0.
`browser-probe.json`: viewport390×844 и1440×844, document width равна viewport;
closed initial state;01→02→03 отражены в preview; confirm disabled до проверки; cancel сохраняет03;
page errors0; external HTTP requests0. Screenshot desktop и mobile просмотрены автором.
После изменения desktop alignment и phone download повторялся только затронутый browser probe;
продуктовые suites не запускались, product source не менялся. Первый short-return probe не использован
как terminal evidence; сохранён финальный terminal exit0 на неизменённом HTML.

Pinned `npm run openspec -- validate zoom-screen-focus --strict --no-interactive` (через PATH pinned
`/home/clipmkr/node_modules/.bin`, cwd отдельного WT) — exit0, change valid.
SHA256 OpenSpec и source inputs сверены Python с фактическими bytes.
Whitespace всех новых text artifacts проверяется `git diff --no-index --check /dev/null <file>`;
обычный git diff не проверяет untracked, поэтому отдельно выполнен обход новых файлов.

## Чего это не доказывает

Нет WebKit/реального телефона/axe/full responsive gate/обеих тем приложения; макет только dark,
как назначенный артефакт390/1440. Нет video playback, real FFmpeg/ROI detection, backend concurrency,
проверки credits, новой версии MP4 или публикации. Это обязательные следующие gates реализации.
Нет независимого UI-QE/ручной приёмки владельца. Полная картинка макета — статичная схема,
не обещание human readability реального source или сохранения всех длинных строк в03.
