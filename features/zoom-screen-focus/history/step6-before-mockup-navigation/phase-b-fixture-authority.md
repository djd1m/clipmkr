# Inline Vite fixture compatibility: Step6 authority

Root разрешил только добавление двух существующих TS source aliases в пять `configFile:false` harnesses. Диагностика Original обнаружила missing mapOutputTime из linked CommonJS dist; production Next уже проверялся отдельно и не меняется. Это existing TASK7 regression obligation, не новый UI/дизайн/API.

- tests/browser/original-video-access.test.ts
- tests/browser/ux-simplification.test.ts
- tests/browser/billing.test.ts
- tests/browser/mockup-ui-realization.test.ts
- tests/browser/upload-lifecycle.test.ts

В каждом inline resolve.alias добавить только `@clipmaker/shared/screen-layout` → existing packages/shared/src/screen-layout.ts и `@clipmaker/shared/cut-timeline` → existing packages/shared/src/cut-timeline.ts (resolve от current cwd, как соседние aliases). Для Object.fromEntries arrays это только2 string elements. Assertions, mutations, guards, profiles, production package/imports неизменны.

Scope49 editable+21 read-only=70:4 outside paths added, mockup transferred read-only→editable. Прежние44editable/все66targets сохранены; остальные21 readonly не редактировать. Core9/ADR/OpenSpec/approvedUI/R3 и9TASK/12AM/11conditions неизменны. K1 не запускается: новых module/export names нет, reuse не collision claim.

Root full SOURCE freeze: HEAD `7afb421072b397c554471d4741d1075e3037556e`, packet SHA `79361f268591c921c9560fdb1dc3be391c7e5ad851fbdf664aa1307ae111c0c4`; source70 stable во время gates. Actual K2 exit0: PASS, C8 unsupported ZF/AC shapes WARN (supplement20/20), C4 no acid corpus SKIP; admission admitted; context complete, diagnostics[]; supported plan checkpoint ok:true — все exit0. K1 не исполнялся: новых имён нет.

План SHA `45c4bddab24bbdd17dfe9838babd9751fb5988f45dfd9b700c661c0b4f73594b`; full literal 97784B/98304B, SHA `281bd5da7725f3a43f3a94c6633cad69dfde815ca369dcbcacbdbea110b7ef46`, без обрезки. Private actual commands/results: `/root/.config/clipmkr/zoom-screen-focus-20261111/phase-b-fixture-amendment/`; literal `coder-context.literal.prompt.md`, terminal package `gate-package.json`.

На момент передачи same Sol full current literal read и отдельный root70GO pending. Планировщик не менял5fixture source, не запускал runtime/Source QE/Git. Новый design/research/QE cycle не создавался. Предыдущие документы: `history/step6-before-fixture-authority/`.
