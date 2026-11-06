# Переиспользование

- apps/web/src/app/layout.tsx: единственный global role=status блок читает loadPaymentsConfig;
  удалить этот JSX и ненужный import. readEnvironment остаётся нужен AcquisitionAnalytics.
- apps/web/src/app/upgrade/UpgradeScreen.tsx: existing testMode prop от server page,
  existing intro TEST badge, package-purchase-terms и legacy payment explanation.
  Короткий conditional текст добавить в действующие области около кнопок без нового helper.
- apps/web/src/app/dashboard/partner/page.tsx: существующий getScreenRuntime возвращает config;
  conditional p перед PartnerPanel personal presentation=statistics. Блок финансов этой страницы
  содержит «Выручка до комиссии» в existing PartnerSummary; источник данных не изменяется.
- apps/web/src/app/dashboard/bloggers/page.tsx: существующий getRuntime после owner guard;
  получить config из того же runtime, conditional p непосредственно перед BloggerAdmin.
  Его existing report содержит «Выручка пакетов»/«Предварительное вознаграждение».
- apps/web/src/app/dashboard/account/page.tsx: existing TEST badge сохраняется без изменения.
- tests/billing.unit.test.ts: existing rendered Layout test заменить проверкой отсутствия global;
  добавить rendered server pages с existing runtime boundaries mocked, обе роли/режимы/отказы доступа.
- tests/credit-packages-ui.test.ts: existing React SSR harness, прямой render UpgradeScreen;
  добавить проверку положения TEST-пояснения перед каждой кнопкой и legacy кнопкой.

Проекты 1–8/OSS: перенос не требуется: действующие JSX, пропсы, config и React SSR полностью
закрывают исправление; новая библиотека/параллельный источник режима ухудшили бы минимальный scope.

## Rework QE-TEST-001

Независимый reviewer обнаружил reachable /dashboard → legacy PartnerPanel для is_blogger != true:
PartnerSummary показывает «Выручка до комиссии». До поправки эта поверхность не учтена.
Переиспользовать уже доступный config Dashboard: тот же условный p внутри existing details,
после summary перед PartnerPanel. Не вводить общий dashboard banner и не менять personal summary.
apps/web/src/app/dashboard/PartnerPanel.tsx — только readonly semantic dependency, SHA256
27a56b2d93af2a95b4c932f61170571041392ee2e54a87899031d0e4921a396e.
При QE проверить checksum и отсутствие git diff; денежный renderer/handlers не меняются.
