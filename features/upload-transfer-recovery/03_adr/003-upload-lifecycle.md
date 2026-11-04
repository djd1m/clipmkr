# ADR-003: Ограждать локальную попытку без remount и сохранять серверный источник истины

## Status
proposed; заменяет lifecycle/navigation часть ADR-001. Обратимо до внедрения; пересмотреть
при новой программной навигации или запросе продолжения вне исходной browser session.

## Context
Uploader cleanup abort есть, но await после unmount способен продолжить Complete/redirect.
VideoList даёт раннюю ссылку uploading. screen и локальные часы детали ошибочно считают
uploading старой серверной обработкой. Согласован конкретный путь паузы/повторного выбора.

## Decision Drivers
1. Deny ухода не прерывает PUT, accept не вызывает скрытый Complete — high.
2. Поздний ответ не меняет новую попытку/аккаунт — high.
3. Существующие request/queue/ownership контракты остаются — high.

## Considered Options

| Вариант | Плюс | Минус |
|---|---|---|
| Только убрать ссылку ID/списка | Минимальный UI edit | Остальные anchors/unmount/late await остаются |
| Новый router/upload framework | Общая навигационная абстракция | Замена transport/lifecycle и новые зависимости |
| Native guard + controller/generation (выбран) | Локально, переиспользует DOM/React | beforeunload/history ограничены браузером; нужны recovery-тесты |

## Decision
Один Uploader на том же месте React-дерева. File, phase, resume/current attempt остаются
в нём; helpers не владеют React/навигацией. Phase: idle/hashing/readyNew/readyResume/creating/transferring/
savingManifest/completing/paused/mismatch/storageBlocked/unknownComplete/error/accepted. Active guard по ref текущей
попытки, не запаздывающему state. После каждого await (hash/read/create/uploadParts/fetch/json)
проверить mounted, generation и signal; перед cache mutate/new request/redirect — повторно.
Pause/accept-leave синхронно инвалидируют generation и abort controller. Catch/finally старого
поколения не setState/refresh/clear resume новой попытки. Смена File/account — тот же fence.
Unmount снимает listeners и fence/abort. StrictMode setup/cleanup не даёт двойного create.

State/action и reset File/input следуют FR-5: pause → повторный выбор → локальный hash →
readyResume → отдельное «Продолжить загрузку»; hash-match сам не вызывает сеть.
Доступность по NFR-2: label/описание/ошибка input, persistent polite status для смены фаз,
alert для mismatch/storageBlocked. После Pause/hash cancel/picker cancel — focus выбора File;
hash-match — focus Continue, mismatch/unknownComplete — выбор File, storageBlocked — retry save.
Один перенос при исчезновении активной кнопки; progress/hash ticks не перехватывают focus.
Recovery anchor фокусирует #source-file с инструкцией; Tab/Enter/Space сохраняют весь путь.

Native guard: beforeunload подключён только активной попытке; returnValue стандартное, текст
выбирает браузер. Capture click по ближайшему a[href] до Next delegated handler, только
обычный same-tab переход. Deny preventDefault/stopPropagation и НЕ abort. Accept синхронно
abort/fence и допускает исходный переход. Уже defaultPrevented/nonprimary/modifier/target blank/
download/hash-only не считаются уходом. Не патчить History API и не перемонтировать страницу
ради guard. Известные программные переходы uploader: только accepted push; перед ним
снять guard синхронно и one-shot flag. Остальные программные/history случаи проверять как
unmount и bounded recovery, не заявлять всеобщую защиту. Нет искусственного redirect после abort.

Abort complete лишь прекращает локальное ожидание; сервер мог уже принять запись. Сохранённый
manifest не очищать при неизвестном исходе; явный повтор Complete по ADR-002. Accepted ответ
не записывает status=queued в клиентское состояние: открыть существующую detail и читать
фактический screen. Серверный count/HEAD guard приходит отдельным SHA9b8b043; не редактировать
count/HEAD/queue/refunds в этом блоке; единственная новая правка video.ts — pre-transaction
account_scope по ADR-002.

VideoList uploading выводит обычную карточку/instruction без detail Link. VideoDetail для
uploading показывает отдельное нейтральное пояснение и recovery anchor, без active progress;
локальный stale исключает uploading. presentVideo исключает uploading из no_response,
stage_progress для него null; иные стадии/доступы/polling остаются действующими.

## Rationale
Локальный fence закрывает race на границе await без изменения server semantics. Native guard
различает отказ/согласие ухода и не требует нового SDK. Статус upload не свидетельствует
о живом File/байтах, поэтому неизвестный upload нельзя представлять как server processing.

## Consequences
Сохраняются действующие API/idempotency/parts и один React instance. Цена — явные проверки
на каждой async границе и браузерные различия dialogs/history. Потеря sessionStorage/manifest
не лечится навигационным guard; это оговорённый исход, не обещание server recovery.
Владелец: интегратор, повторная проверка при добавлении нового типа программного перехода.

## Confirmation
Все проверки pending, code/tests ещё не написаны этим блоком.
- tests/browser/upload-lifecycle.test.ts: `navigation_denial_keeps_put_alive`, `confirmed_leave_aborts_without_hidden_complete`, `unmounted_attempt_cannot_clear_or_redirect`, `success_redirect_is_once_without_guard`, `history_remount_uses_saved_session`, `modifier_and_hash_links_do_not_abort`.
- tests/browser/upload-lifecycle.test.ts: `active_beforeunload_reload_dismiss_and_accept` — после реального user click/keyboard (sticky activation), удержать hash/create/PUT/Complete и вызвать настоящий reload. Проверить native dialog.type=beforeunload: dismiss оставляет тот же document marker/URL/attempt и позволяет продолжить; accept создаёт новый document/remount и прежний bounded manifest. Для обеих ветвей отдельные активные попытки. `inactive_and_confirmed_leave_have_no_extra_beforeunload` проверяет cleanup после pause/accepted и confirm-accepted anchor: ровно один confirm, ноль последующего beforeunload. Synthetic dispatch и paused reload не являются positive oracle. Мутация `remove_beforeunload_registration` делает active reload test RED; конкретные Chromium/WebKit skips/native ограничения записываются отдельно.
- tests/browser/upload-lifecycle.test.ts: `pause_reselect_requires_separate_continue`, `keyboard_recovery_focus_and_live_status` — реальные UI/native input, Tab/Enter/Space; focus/status/alert assertions NFR-2, включая mismatch/storageBlocked/unknownComplete и отсутствие focus steal при ticks.
- tests/progress-screen.test.ts: `uploading_is_never_stale_processing`, `uploading_row_has_no_detail_link`, `other_processing_staleness_is_unchanged`.
- tests/browser/video-screen.test.ts: `uploading_has_recovery_instruction_without_progress`.
Метод: реальные DOM events/dialogs/unmount/remount; барьеры во время create/PUT/Complete;
затем опубликованный Next E2E на существующем stage. Успех: deny не abort; accept не инициирует
новый Complete; stale response не пишет/не redirect; uploading текст достоверен всегда.
Мутации: remove_beforeunload_registration, убрать fence, вернуть List Link, убрать один stale exclusion. Владелец проверки — QE.
