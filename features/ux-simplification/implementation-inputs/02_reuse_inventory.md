# Переиспользование текущего main

База `a4488b4caf602f093a0cc3393b4903e210cb3989`. Source inspection, не runtime PASS
и не выбранная архитектура. Новый framework/OSS/UI library не нужен.

| Блок | Существующая реализация | Что сохраняем / что требуется от размещения |
|---|---|---|
| Header/preferences | WorkspaceHeader/WorkspaceSettings; lib/workspace-layout.ts | document preferences, SSR cookies, theme/layout fallback и notice сохранения; лишь консолидировать входы |
| Dashboard | dashboard/page.tsx и layout.tsx | Server auth, owner_unlimited, bloggerPolicy, readDashboardSummary и существующий pagination |
| Upload | upload/Uploader.tsx + lib/upload* | hash/identity/account scope/resume, navigation guard, pause/abort, storageBlocked/mismatch/unknownComplete; редакторские defaults false/true/true/none |
| Credits | dashboard/LimitsPanel.tsx + lib/limits-contract.ts | баланс/резерв/expiry/refresh30s, отдельный file limit; перед стартом показать cost estimate из уже имеющихся данных |
| Auto-link | dashboard/PartnerPanel.tsx personal + server/partner.ts | Уже внедрены ensurePersonalLink/loading/error/blocked/copy fallback; менять только размещение/контекст статистики, не новый генератор |
| Клипы | VideoDetail/ClipCard/useClipDownload | Existing selectedClipId, video element/fileVersion, poll5s, download errors/expiry; убрать конкурирующие вторичные действия |
| CTA и музыка | videos/CtaFields.tsx, clips/ClipMusicChoice.tsx | Existing validation/rpc/CC0 catalogue/audio preview, сохранённое и draft; не потерять values при контекстном раскрытии |
| Гость | clips/GuestPacks.tsx + lib/guest-contract.ts | Один существующий pack owner, multi-ready selection, consent/version/hash, create/send/revoke/list и focus/reduced-motion |
| Owner | dashboard/bloggers/BloggerAdmin.tsx | Existing lookup/save/month report, nullable limit/rate/reason, API auth; secondary fields/details, без нового monthly blogger reward API |
| Тарифы | upgrade/UpgradeScreen.tsx + upgrade/page.tsx | Server-derived salesEnabled/catalogOnly/owner/testMode, purchaseWindows, prices/dates; disabled reason и явное подтверждение |
| Account | dashboard/AccountDeletion.tsx | Existing irreversible confirmation/72h/unchecked consent; перенос контейнера не отменяет последствий |
| Public/support | AuthForm/RecoveryForm/ReturnScreen/SupportPanel/legal | Готовые функции и error states; покрыть общей regression, не переписывать ради единообразной обёртки |

Новый API/таблицы/env/provider/RPC не нужны для этой UI-реорганизации. Если реальный
partial-retry ещё отсутствует, использовать только фактический next_action и согласовать
интерфейс с отдельным recovery-потоком. Реферальная attribution и TEST checkout guards
остаются источниками истины. Никаких переносов приватных медиа/паролей в fixtures.

## Чего не следует переносить буквально из prototype

Synthetic links/таймер обработки/имитация clipboard/disabled payment label не являются
контрактами приложения. Native player/storage/auth/payments остаются существующими.
Reels Boss — референс распределения действий, не донор бренда/тарифов/новых функций.
