# ADR-002: Сохранить состояние у стабильных владельцев

## Status
proposed — 05.11.2026, обратима до реализации; пересмотреть при смене media/recovery контрактов. Feature-local ADR; Exact HTML APPROVED; QCSD, review и K1/K2 PENDING.

## Context
FR-3/5/7: `VideoDetail` опрашивает video/clip DTO каждые 5 секунд; CSS выбирает видимый клип. Музыка относится к clip_id, CTA — к video_id, consent — к получателю и составу пакета. `ClipMusicChoice` сейчас отправляет `clip.setMusic` при выборе; draft/apply — реальное предстоящее UI-изменение. Открытие/закрытие панели не должно запускать мутации или менять player.

## Decision Drivers
- D1 (высокий): не терять ввод/player при polling, theme/layout, выборе клипа.
- D2 (высокий): не переиспользовать consent для нового содержания.
- D3 (средний): отсутствие параллельного глобального store и новых persistent моделей.

## Considered Options
| Вариант | Плюсы | Минусы | D1 / D2 / D3 |
|---|---|---|---|
| A. Стабильные mounted owners + локальные drafts | Сохраняет существующее дерево и API | Нужна явная политика reconciliation | высокий / высокий / высокий |
| B. Central draft store по ID | Переживает произвольные переносы компонентов | Вторая модель, очистка между аккаунтами, лишний provider | высокий / высокий / низкий |
| C. Mount-on-open с initial props | Меньше скрытого DOM | Потеря draft при закрытии/переключении, риск remount player | низкий / средний / высокий |

## Decision
Выбран A; подробная таблица владельцев — `../04_domain_model.md`.
- `VideoDetail` (`apps/web/src/app/videos/[videoId]/VideoDetail.tsx:62`) сохраняет `selectedClipId`, существующий poll и `guestPreselect`. `clips.map` и `key={clip.clip_id}` остаются; не заменять их одним условным selected-card. Не добавлять preference/status/poll timestamp в key.
- `ClipCard` (`apps/web/src/app/clips/ClipCard.tsx:10,33,53`) держит тот же video DOM node и src при неизменной опубликованной версии. Новая опубликованная версия/истечение availability — допустимая смена media; pending/failed rerender сохраняет прежний файл. Порядок wrapper/player стабилен в done/partial, не перестраивается при смене settings или статуса. Переключение selection только приостанавливает прежний player, без seek/reset.
- `ClipMusicChoice` (`clips/ClipMusicChoice.tsx:6`) хранит draft выбранного трека у своего clip_id. Выбор/предпрослушивание — ноль `clip.setMusic`; отдельное «Применить» — один существующий запрос. Dirty draft не перетирается polling; pristine draft следует только принятому свежему серверному значению по алгоритму R2, не любому ответу poll. Ответ успешного запроса фиксирует принятый draft, `onQueued` сохраняет текущий optimistic rerender flow. Пока busy/rerender — редактирование заблокировано, отказ оставляет draft для явного повтора; close не сбрасывает draft. При уходе с записи draft не обещан после reload.
- `VideoCtaForm` (`videos/CtaFields.tsx:32`) существует один раз у video_id, сохраняет свои kind/url/saved. Раскрытие/Play/выбор клипа не remount формы и не подменяет `initialKind` из каждого poll. Повторно использовать `ctaProblem`/`save`; музыка и CTA сохраняются отдельными явными действиями — API не атомарен.
- `VideoUploader` (`upload/Uploader.tsx:18`) сохраняет параметры music=false, teaser=true, compact=true, CTA=none и прежние account-scoped upload/resume owners. Summary вычисляется из фактических values, включая restored/locked options; отдельного summary-store нет.
- `GuestPacks` (`clips/GuestPacks.tsx:18`) владеет единственным draft: name, selected clip IDs, consent. Любое изменение имени, состава (включая preselect), consentHash/version, video scope или потеря доступности выбранного клипа сбрасывает consent. Обновление DTO с теми же ID/availability само по себе не сбрасывает. После create — прежний reset; для нового пакета требуется новое согласие. Старый consent не возвращается автоматически даже после возврата прежнего состава. Пока request busy поля заморожены; payload соответствует согласованному составу. Список созданных пакетов сохраняется независимо от draft.
- Hidden invalid: capture `invalid` раскрывает enclosing details перед focus; custom ошибки (`ctaProblem`, HTTPS, limits) проходят тот же путь ДО RPC. В Uploader нет native form-submit: нельзя надеяться только на `onInvalid`; upload handler явно проверяет CTA и фокусирует его поле.
- Focus owner: share-trigger записывается как element ref при открытии гостя; close открывает его «Ещё» и возвращает focus. Если trigger удалён/скрыт сменой selection, fallback — summary «Ещё» текущего клипа, затем всегда смонтированный видимый h1 с tabIndex=-1 и ref по R2. `revealGuestForm` и reduced-motion переиспользуются.

## Rationale
D1: local owners уже существуют и не нуждаются в общем кэше. D2: consent — подтверждение конкретного payload, а не предпочтение аккаунта. D3: B нужен для нового межстраничного persistence, которого нет; C противоречит сохранности draft. Reuse: действующие DTO/rpc/upload helpers, без новой state library.

## Consequences
Плюс: polling не управляет пользовательским вводом. Минус: все карточки остаются mounted — сохраняется текущая стоимость DOM, проверяется 0/1/4 и длинный список; не добавляются новые pollers. Dirty состояние музыки требует теста race со старым poll. Это локальное session-state, не обещание восстановления черновика после выхода. Follow-up ADR не требуется до новых persistence/контрактов. After-action: архитектор и UI-автор через месяц после приёмки.

## Confirmation
- Метод: Chromium/WebKit, реальные media element/React components, управляемые DTO/race/failure; mutations без реального provider в локальном слое. Живой media E2E отдельно.
- Несущие свойства: player/form identity стабильна; dirty draft независим по clip_id; consent не переносится; сервер остаётся источником auth/цен/checkout/retry.
- Автоматические проверки: `tests/browser/ux-simplification.test.ts` — `draft_survives_poll_and_disclosure`, `guest_consent_payload_binding`, `hidden_invalid_reveals_and_focuses`, `music_apply_once`; existing `tests/browser/clip-preview-playback.test.ts` и `scripts/check-workspace-presentation.test.mjs` — player identity/currentTime/selection lifecycle; `tests/browser/per-account-test-checkout-next.test.ts` — delayed account A response after B mount.
- Метрика: тот же connected video/input node, неизменные src и текущая позиция без seek при pause-controlled probe; ноль mutations от poll/toggle/select/preview; ровно один запрос на apply; ноль guest.create после изменения согласованного состава до новой галочки.
- Мониторинг: lifecycle/regression checks при каждом UI diff; ответственные Sol/независимый QE. NOT RUN здесь.
- Given draft клипа A и consent на A, When poll → B → A → изменение имени гостя, Then draft A сохранён, player не remount от poll, consent false и create запрещён. HIGH риски lost input/чужое согласие снижаются стабильным деревом и reset в каждой ветке изменения payload.
- Dependency-down: error виден вне закрытого advanced, черновик остаётся, авто-retry mutation нет. Повторный клик при busy не создаёт второй запрос. Изолированные fixtures проверяют lifecycle, не S3, оплату или серверную транзакцию.

## R2: детерминированные reconciliation и focus (условия ещё открыты у reviewers)

### UXR-02 — owner и порядок принятия DTO

`VideoDetail` остаётся единственным владельцем clips DTO/poll и минимального per-clip pending-ack `{track, baselineRenderVersion}`; `ClipMusicChoice` — draft/saving/preview. Callback существующей цепочки `ClipMusicChoice → ClipCard → VideoDetail.onMusicQueued` передаёт принятый track; не вводить generic state framework. В VideoDetail private read generation/sequence + AbortController ограничены текущим videoId/mount. Не использовать Date.now как доказательство свежести сервера.

1. Editing: dirty draft не следует DTO. Saving: child блокирует повторное apply; старый media доступен, poll сам по себе не снимает saving.
2. После **успешного** `clip.setMusic` ack: callback синхронно увеличивает read generation, abort текущего read, инвалидирует прежний inFlight token и сохраняет accepted track/baseline render_version. До нового чтения выставляется queued/awaiting-confirmation; draft не становится свободным pristine-follow-any-poll.
3. Немедленно запустить fresh `video.get`/`clip.list` через тот же read path **после ack**, без второго interval. Каждый read/result/error/finally проверяет mount/videoId, captured generation и current request token; старый finally не снимает inFlight нового read. Abort — оптимизация, generation check обязателен даже если transport игнорирует abort. Интервал5с переиспользуется, reads не перекрываются внутри поколения.
4. Read, начатый до ack, отвергается целиком, даже если вернулся позже. Fresh read после ack сверяется с `ClipMusicService.setMusic` (`server/clip-music.ts:37–50`): committed операция увеличивает render_version перед ack. Пока version <= baseline и нет достоверного нового terminal outcome, accepted track/awaiting сохраняются, apply disabled, «Уточняем состояние пересборки»; ошибка чтения видима, retry только read, не повтор mutation. Никакого false success по timeout.
5. Fresh DTO с version > baseline и rerendering=true подтверждает queued: server DTO принят, pending-ack снят, apply удерживается existing rerendering. Fresh DTO с новой version и rerender_failure при !rerendering — **реальный отказ**, а не stale: показать ошибку и прежний опубликованный файл; clear pending, сохранить желаемый track как dirty для явного retry, показать отличающийся rendered track. `packages/db/src/render.ts::retryRender` действительно возвращает music_track_id к rendered_music_track_id при окончательном отказе; это разрешённое server reconciliation, не скрыть его optimistic overlay.
6. Fresh terminal success/публикация новой версии — принять server rendered track/music_skip_reason (auto может разрешиться в конкретный track), снять waiting, обновить pristine только если нет нового dirty input. При конфликтующей более новой версии/изменении другим клиентом серверная версия имеет приоритет, показать актуальное состояние, не переотправлять намерение автоматически. При пропаже clip/404/expiry очистить pending с явным unavailable/error, не держать вечный queued. Network ambiguity самого setMusic не маркировать ack; error+draft и read-refresh до возможности осознанного retry, серверные conflict/quota остаются решающими.

Confirmation `music_apply_ignores_pre_apply_poll`: hold pre-apply read, ack, доставить старый read **игнорируя abort**, затем post-ack queued / fast success / terminal failure / read error / deleted clip; принятому track не откатываться от старого ответа, controls не re-enable раньше времени, реальный failure виден, old file доступен, всего1 mutation. Удаление generation check → RED. Внешняя concurrency/replica lag не решается новым API; ambiguous fresh version остаётся видимой неопределённостью, не притворным успехом. Все результаты NOT RUN.

### UXA-001 — доступный последний focus fallback

`VideoHeader` в `videos/[videoId]/VideoDetail.tsx:15–20` обязан всегда рендерить видимый connected `<h1 tabIndex={-1}>` с постоянным ref/id результата, включая zero clips/partial/error. Он находится вне скрываемой guest/edit области и вне условия clips.length. `tabIndex=-1` не добавляет постоянную Tab-остановку. Закрытие GuestPacks: original trigger, если connected/видим/доступен (раскрыть его «Ещё»); иначе видимый summary текущего клипа; иначе **этот h1**, а не body или произвольный querySelector. Сначала закрыть контекст, затем focus видимой цели; reduced motion/scroll existing.

Confirmation `guest_close_last_trigger_focus_result_heading` и `share_focus_return_missing_trigger`: открыть гостя, DTO убирает последнюю карточку, закрыть — document.activeElement точно h1, connected/visible, Tab продолжает естественный порядок без добавленного tabindex0. Отдельно удалить только исходную карточку, оставить выбранную другую: focus её summary. Удаление tabIndex/ref fallback → RED. NOT RUN.

### UXU-003 — последствия до mutation

Перед «Применить музыку» в ClipMusicChoice виден текст: изменится этот клип, при применимом суточном ограничении операция использует одну пересборку, прежний файл остаётся доступен до публикации нового в пределах срока хранения. Источник `ClipMusicService.setMusic`: проверка ownership/expiry/conflict/effectiveMusic, затем quota('rerender',1); неизменный effective track/active render/expiry дают отказ, а не обещанную пересборку. Owner unlimited не выдавать за расход лимита: общий текст оговаривает серверные исключения, не приписывает numeric remaining, которого ClipScreen не содержит. Не называть цену/кредиты, не обещать unlimited всем.

У отдельной «Сохранить призыв» сохранить **видимую перед save** существующую подсказку `VideoCtaForm` (`videos/CtaFields.tsx:46–52`): смена вида (включая none) меняет пиксели доступных готовых клипов и использует по одной пересборке на клип при применимом лимите; только URL — без пересборки/квоты. Сервер `VideoCtaService.setCta`/`ctaPixelsChange` — истина: готовые истёкшие файлы исключены, quota отказ откатывает всю операцию. Не обещать N до server result; существующий CTA компонент переиспользуется без изменения файла, уточняющая общая оговорка об исключениях/сроке доступна в родительской edit-секции VideoDetail. Музыка/CTA — разные кнопки и mutations. При error сохранить draft и доступный старый файл; это не гарантия после expiry.

Confirmation `music_and_cta_consequences_visible`: до request,390/1440×themes/layouts, видимые сообщения у каждой кнопки, link-only vs kind-change, busy/expiry/quota failure, select/preview0 mutations/apply1. Скрытие предупреждения/перенос после mutation → RED. Reuse CtaFields — read-only target, code change не планируется; NOT RUN.
