# План S: запуск клипа из превью

Цель: устранить подтверждённый отказ center-click при preload=none штатным поведением браузера.
Основание: пользовательский bug report, действующее поручение автономно исправлять продукт.
Inputs read: AGENTS.md, CLAUDE.md, core-cjm.md, feature-adr 1.5.25, responsive-ui,
ClipCard.tsx, globals.css, clip-file.ts, video-screen.test.ts и опубликованная страница.
03_adr/ и 05_architecture: не применяются для S, новых решений архитектуры нет.
Новой архитектуры и нового коммерческого решения нет.

1. T1(FR-1): добавить целевой браузерный тест с настоящим ClipCard и настоящим коротким видео.
   Исходный компонент обязан дать RED: нет метаданных, обычный click не запускает воспроизведение.
   Проверка не вызывает video.play() и не подменяет media events.
2. T2(FR-1,FR-2,C-1,после T1 и K2): изменить только preload none→metadata в ClipCard.
   Оставить остальные media/download/access настройки. GREEN и отрицательный контроль откатом.
3. T3(после T2): связанные ClipCard/screen тесты, typecheck/lint/build; по риску повторить
   адаптивные проверки целевого экрана. Новая геометрия/CSS не вводятся.
4. T4(после T3): независимый cross-model reviewer в новой сессии по требованиям,
   code/spec anti-drift, настоящий QE/checkpoints, commit/push, small production image.
   После выкладки n5 повторить native center-click всех4клипов проблемной страницы;
   при успехе тот же web наmain, режимы оплаты не менять. Старый образ сохранить для отката.

EXPECTED_CODE_TARGETS:
- apps/web/src/app/clips/ClipCard.tsx
- tests/browser/clip-preview-playback.test.ts
