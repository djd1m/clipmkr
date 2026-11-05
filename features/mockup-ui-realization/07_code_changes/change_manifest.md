# Манифест реализации

Код реализует уже согласованные композиции; API, БД, зависимости и серверные квоты не меняются. Единственный источник плана —06, актуальная ревизия AM-6 описана в07. Все29путей ниже остаются под контролем actual check-code-targets; наличие в этом списке не является результатом QE.

- apps/web/src/app/WorkspaceHeader.tsx
- apps/web/src/server/dashboard-summary.ts
- apps/web/src/app/dashboard/layout.tsx
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/app/dashboard/videos/[videoId]/page.tsx
- apps/web/src/app/upload/Uploader.tsx
- apps/web/src/lib/upload-parts.ts
- apps/web/src/app/dashboard/LimitsPanel.tsx
- apps/web/src/app/videos/VideoList.tsx
- apps/web/src/app/videos/[videoId]/VideoDetail.tsx
- apps/web/src/app/clips/ClipCard.tsx
- apps/web/src/app/clips/GuestPacks.tsx
- apps/web/src/app/upgrade/page.tsx
- apps/web/src/app/upgrade/UpgradeScreen.tsx
- apps/web/src/app/globals.css
- scripts/check-mockup-ui-realization.mjs
- tests/mockup-ui-realization.test.ts
- tests/browser/mockup-ui-realization.test.ts
- tests/upload-browser.test.ts
- tests/upload-resume.test.ts
- tests/browser/upload-lifecycle.test.ts
- tests/progress-screen.test.ts
- tests/billing.unit.test.ts
- tests/workspace-presentation.test.ts
- tests/music-uploader.test.ts
- tests/teaser-uploader.test.ts
- tests/compaction-uploader.test.ts
- tests/pack-shot-uploader.test.ts
- tests/credit-packages-ui.test.ts

Промежуточные изменения и исправления ревью проверяются на окончательных байтах; результаты и ограничения фиксируются в08_qe_report.md.
