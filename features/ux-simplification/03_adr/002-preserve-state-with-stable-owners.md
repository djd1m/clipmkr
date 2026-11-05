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
- `ClipMusicChoice` (`clips/ClipMusicChoice.tsx:6`) хранит draft выбранного трека у своего clip_id. Выбор/предпрослушивание — ноль `clip.setMusic`; отдельное «Применить» — один существующий запрос. Dirty draft не перетирается polling; pristine draft следует подтверждённому серверному значению. Ответ успешного запроса фиксирует принятый draft, `onQueued` сохраняет текущий optimistic rerender flow. Пока busy/rerender — редактирование заблокировано, отказ оставляет draft для явного повтора; close не сбрасывает draft. При уходе с записи draft не обещан после reload.
- `VideoCtaForm` (`videos/CtaFields.tsx:32`) существует один раз у video_id, сохраняет свои kind/url/saved. Раскрытие/Play/выбор клипа не remount формы и не подменяет `initialKind` из каждого poll. Повторно использовать `ctaProblem`/`save`; музыка и CTA сохраняются отдельными явными действиями — API не атомарен.
- `VideoUploader` (`upload/Uploader.tsx:18`) сохраняет параметры music=false, teaser=true, compact=true, CTA=none и прежние account-scoped upload/resume owners. Summary вычисляется из фактических values, включая restored/locked options; отдельного summary-store нет.
- `GuestPacks` (`clips/GuestPacks.tsx:18`) владеет единственным draft: name, selected clip IDs, consent. Любое изменение имени, состава (включая preselect), consentHash/version, video scope или потеря доступности выбранного клипа сбрасывает consent. Обновление DTO с теми же ID/availability само по себе не сбрасывает. После create — прежний reset; для нового пакета требуется новое согласие. Старый consent не возвращается автоматически даже после возврата прежнего состава. Пока request busy поля заморожены; payload соответствует согласованному составу. Список созданных пакетов сохраняется независимо от draft.
- Hidden invalid: capture `invalid` раскрывает enclosing details перед focus; custom ошибки (`ctaProblem`, HTTPS, limits) проходят тот же путь ДО RPC. В Uploader нет native form-submit: нельзя надеяться только на `onInvalid`; upload handler явно проверяет CTA и фокусирует его поле.
- Focus owner: share-trigger записывается как element ref при открытии гостя; close открывает его «Ещё» и возвращает focus. Если trigger удалён/скрыт сменой selection, fallback — summary «Ещё» текущего клипа, затем заголовок результата. `revealGuestForm` и reduced-motion переиспользуются.

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
