# ADR-002: Сохранить keyed players при выборе клипа и смене представления

## Status
Proposed; reversible until independent media/lifecycle confirmation. Это решение реализации уже согласованного selected-result, не новый экран.

## Context
Cabinet имеет selected 9:16 player + metadata/actions и fragment rows; Montage — intro + gallery. ClipCard уже владеет download/copy/music errors и video key=fileVersion. VideoDetail владеет polling и guestPreselect. Пересоздание selected-card branch сбросит playing DOM.

## Decision Drivers
D1 high: выбранный clip_id общий для layouts. D2 high: video DOM/src/version/currentTime survive toggle and two polls. D3 high: все действия имеют прежние handlers/permissions. D4 medium: не хранить media bytes/состояние в global store.

## Considered Options
A. Отдельный новый hero player + старые ClipCards: простая вёрстка; проигрыватель/скачивание дублируются и источник playback неоднозначен.
B. Переносить один выбранный ClipCard между containers/portals: компактно; смена parent может сбрасывать instance/media.
C. Постоянный keyed roster ClipCard + отдельные native selector buttons и CSS layout: сохраняет owners/DOM, требует контролировать hidden cards/focus. Выбран.

## Decision
1. VideoDetail владеет selectedClipId:string|null. Первичный выбор — первый available clip по существующему порядку, иначе первый existing, иначе null. Poll сохраняет ID, пока он существует, даже если временно unavailable; при удалении выбрать первый available/первый/null. Нельзя reset на каждый fresh clips array.
2. Все ClipCard остаются в одном постоянном roster key=clip_id. В Cabinet видна selected card, с poster/video слева и metadata/actions справа, остальные cards скрыты CSS и исключены из Tab/accessibility tree; рядом independent selector buttons с ordinal/title/duration/aria-current. В Montage те же cards становятся gallery с прежними src; selected ID/marker общий. CSS не переносит DOM nodes; hidden карточки не используются как второй player для выбранного клипа.
3. ClipCard получает selected/onSelect presentation props. Native video onPlay выбирает этот clip; explicit selector/preview selection может pause предыдущий clip без reset его currentTime. Это действие выбора, не effect от theme/layout. Новая selection не autoplay без user action. Эффект pause зависит от selected, не layout/theme/props object. Тест отличает explicit select от toggle.
4. Native controls/playsInline/preload metadata, signed file redirect/thumbnail/version logic, useClipDownload, link.create, ClipMusicChoice и guest handler переиспользуются. Published version change может легитимно обновить video key; protected toggle/poll window фиксирует version. На unavailable/expired/partial/empty — настоящий статус и доступные actions, не fake playable poster.
5. Основные Просмотр/Скачать/Ссылка/Гостю достижимы у selected clip; score/why/music/retention остаются в компактной secondary details области, важные errors/expiry рядом с действиями. Одна ссылка не генерируется автоматически при выборе. GuestPreselect открывает существующую форму один раз; nonce guard защищает от повторного scroll/focus на ticks.

## Rationale
C переносит различимые Cabinet/Montage result compositions и сохраняет identity; A/B удобнее только ценой защищённого playback. Native buttons не притворяются ARIA listbox, поэтому не появляется неполный custom keyboard protocol.

## Consequences
Positive: no duplicate media owner; selected ID survives layouts. Negative: hidden mounted cards retain bounded metadata and local state; не preload full media, не autoplay скрытых. Для списка используются нынешние server limits; новая pagination/API не вводится. Follow-up ADR: none now.
After-action Review: root+independent media reviewer при stage acceptance и через месяц после принятия.

## Confirmation
Method: tests/browser/mockup-ui-realization.test.ts selected_player_survives_layout_and_poll; same playing DOM/src/version, paused=false, post-toggle currentTime strictly increases over bounded real-time window; paused nonzero separately.
Monitoring: second clip selection, two distinct poll UI updates, guest form name/consent, focus/scroll snapshots; injected remount/reset/constant-time oracle must RED.
Success metric: all assertions pass both engines/four preferences; zero toggle-induced network/business mutations. Unplayable media fixture = NOT ESTABLISHED.
Owner: future implementer + independent primary/fleet media reviewer.
Load-bearing property: layout changes presentation without destroying media or choosing another clip.
