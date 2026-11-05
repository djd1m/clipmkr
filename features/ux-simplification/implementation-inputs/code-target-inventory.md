# Ограниченная карта изменений для Astra

База `a4488b4caf602f093a0cc3393b4903e210cb3989`. Это source inventory,
не финальный EXPECTED_CODE_TARGETS, не архитектурное решение и не разрешение Step7.
14 явных existing UI/CSS targets, до5 conditional UI/glue targets,6 test/harness
целей: **20–25 файлов**, L. Верхнюю границу расширять только с новым router.
Все пути ниже относительно репозитория; названия новых компонентов не утверждены.

## 14 действующих целей UI/CSS

Префикс `apps/web/src/app/`:

| № | Существующий файл | Наблюдаемая необходимость изменения |
|---|---|---|
| 1 | globals.css | Геометрия согласованного main flow, two themes/layouts, contextual panels/mobile/zoom; существующие tokens без новой palette |
| 2 | WorkspaceHeader.tsx | Дубли тарифов/выхода/settings vs один account context, ролевые входы |
| 3 | WorkspaceSettings.tsx | Положение account/theme/layout controls при сохранении preference lifecycle |
| 4 | dashboard/page.tsx | Консолидация Limits/Pro/account/partner sections; personal auto-link сохранить |
| 5 | dashboard/LimitsPanel.tsx | Краткий summary и полная детализация по контексту; refresh/limits неизменны |
| 6 | dashboard/PartnerPanel.tsx | Отделить обнаружимую auto-link от явной статистики и advanced extra codes; backend уже есть |
| 7 | upload/Uploader.tsx | Cost вне закрытых settings; summary изменённых параметров; основной CTA/error/recovery выше advanced |
| 8 | videos/VideoList.tsx | Компактный список/статусы/empty state и название без потери pagination/uploading context |
| 9 | videos/[videoId]/VideoDetail.tsx | Композиция player→download, status/partial/empty и контекст CTA/guest; polling/selection сохраняются |
|10 | clips/ClipCard.tsx | Вторичные share/edit/score под «Ещё», title/player/download/expiry/errors открыты |
|11 | clips/ClipMusicChoice.tsx | Контекстный edit с draft/apply и existing preview, не потерять музыку текущего клипа |
|12 | clips/GuestPacks.tsx | Возврат из share к существующим packs/create/send/revoke и explicit consent по получателю/составу |
|13 | dashboard/bloggers/BloggerAdmin.tsx | Lookup/назначение/reason основные; nullable limit/rate и report details дополнительные; reveal invalid |
|14 | upgrade/UpgradeScreen.tsx | Лаконичные пакеты при сохранении цен, сроков, server eligibility/TEST/disabled reasons и payment intent states |

`videos/CtaFields.tsx`, `dashboard/AccountDeletion.tsx`, `clips/useClipDownload.ts`
имеют готовые контракты: сначала reuse без изменения; при обнаруженной необходимости
править их — включить в5 conditional slots вместо молчаливого расширения.

## До5 условных целей: placement/glue решает Astra

Три slots на уже существующие containers/leaf: dashboard/layout.tsx,
upgrade/page.tsx, videos/CtaFields.tsx либо AccountDeletion.tsx (не автоматически все4).
Два slots максимум на минимальные UI containers account/stats/share по выбранному
архитектором размещению. Если используется существующая страница вместо нового
route/component, слот снимается. Новые basename/export/route подлежат K1 после выбора;
здесь имени и способа навигации не назначаем. При >5 conditional — пересчитать план.

##6 целей проверок/harness, предварительно

1. tests/workspace-presentation.test.ts — defaults/markup/preferences/DOM order/zoom.
2. tests/clip-card.test.ts — главное действие, expiry/error и вторичные действия.
3. tests/browser/blogger-cabinet.test.ts — распределение ordinary/blogger/owner функций.
4. Один новый browser scenario file для UI simplification (имя/fixture решит план, K1 NOT RUN).
5. scripts/check-workspace-presentation.test.mjs — existing lifecycle/focus/player checks.
6. scripts/workspace-presentation-local.mjs — shared fixture/geometry для same-state comparison.

Existing tests/browser/blogger-auto-link.test.ts, per-account-test-checkout-next.test.ts,
upload-lifecycle.test.ts, billing.test.ts, clip-preview-playback.test.ts и contract/unit
наборы сначала запускать без изменений; менять только при новой обоснованной цели.
Не объявлять существующие тесты зелёными: здесь они не запускались.

## Весь набор21 семейства, без молчаливых пропусков

| № | Семейство | Статус / реализация или regression obligation |
|---|---|---|
| 1 | Главная/вход/регистрация | Preserve AuthForm/Landing и ранее поставленный public entry; короткий auth preview не требует нового auth flow |
| 2 | Восстановление пароля | Preserve RecoveryForm/forgot/reset; CSS/focus/error/reload regression |
| 3 | Подтверждение почты | Preserve verify-email и RecoveryForm; вход из account остаётся, ошибка доступна |
| 4 | Новая запись | Change7 +4/5; file/limit/cost/start, advanced defaults |
| 5 | Передача/проверка | Change7 layout, preserve hash/progress/abort/guards, error/busy visible |
| 6 | Прерванная передача | Change7 presentation; storageBlocked/mismatch/unavailable/unknownComplete проверять, не новый resume protocol |
| 7 | Список записей | Change8 +4; pagination/status/empty сохранены |
| 8 | Расшифровка/выбор/монтаж | Change9 status composition; no-response не failure/success |
| 9 | Полная ошибка | Change9, только native next_action; reason/retry limits видимы |
|10 | Частичный результат | Change9/10; готовые клипы доступны; retry лишь по фактическому recovery-контракту отдельного потока |
|11 | Готовые клипы | Change9/10/11; player identity, download, expiration, rerender failure |
|12 | Share/guest | Change10/12; consent, multi-ready clips, pack list/send/revoke и focus |
|13 | Публичная короткая ссылка | Preserve c/[code]/route.ts; thumbnail+CTA, не выдуманный video/download |
|14 | Кабинет блогера | Change4/6; published auto-link реюз, error/blocked/copy сохраняются |
|15 | Статистика блогера | Change6 + conditional placement; extra codes/details доступны, без monthly reward API |
|16 | Назначение блогера | Change13; owner-only lookup/reason и reveal hidden invalid |
|17 | Отчёт владельца | Change13; monthMSK/null rate/no payouts, link breakdown контекстно |
|18 | Пакеты/оплата | Change14, upgrade/page eligibility реюз; price/expiry/TEST/disabled reason сохранены |
|19 | Возврат оплаты | Preserve ReturnScreen/polling/ownership; confirmed/pending/canceled/unknown/timeout regression |
|20 | Account/settings | Change2/3/4 + conditional placement, AccountDeletion reuse; consent/irreversibility/72h visible |
|21 | Support/legal/service | Preserve SupportPanel/legal/support admin; CSS regression и права supportOperator, никакой выдачи owner новых служебных прав |

## Ближайшие3 экрана по основному CJM

1. **Новая запись/передача**:4/5/7 (+1/2/3 shared shell). Выбор файла, лимит,
   cost/start, advanced summary, pause/error/recovery; blogger link сразу видима.
2. **Обработка/ошибка/partial**:9 (+10). Реальное состояние, готовый player/download;
   integration contract с recovery-потоком до обещания retry.
3. **Готовые клипы → Поделиться/оформление**:9/10/11/12. Сохранить player/draft/consent,
   pack lifecycle и возврат фокуса. Затем owner/stats/packages/account;21-family matrix
   остаётся обязательной, первые3 экрана не объявляются всей готовой фичей.

## Вопросы архитектору

Размещение stats/account/share; границы draft state и player lifetime; safe global CSS
scope; dependency на реальный partial recovery;6 test targets и верхний бюджет25.
Новых backend endpoints/DB schema/env/provider changes в changemap нет.
