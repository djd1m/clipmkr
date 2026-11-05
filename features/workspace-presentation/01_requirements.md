# Первый инкремент рабочей оболочки

Статус: proposed после авторской интеграции Q1–Q6/R1–R6/T1–T5; исходные QC CONDITIONAL,
formal snapshot/convergence ещё не закрыт. Код не написан. Источники владельца:
AGENTS.md, core-cjm, docs/design/2026-11-04-owner-choice.md и layout-settings.md.
Владелец выбрал Кабинет по умолчанию, обратимый выбор Монтажной, независимую тему,
нейтральные поверхности/зелёный акцент и сохранение текущего состояния при переключении.
Он также отдельно согласовал upload→pause/reselect→processing→clips; весь 8-screen redesign
не согласован. Исключение hero/listbox из этого инкремента и точный перенос CTA — предложения
координатора по минимальной реализации, не запреты/указания владельца.

### FR-1: Настройки и ограниченный визуальный результат
MUST. Нативные details/summary «Настройки», подписанный select «Компоновка» и существующий
ThemeToggle; workspace по умолчанию, studio обратимо, без изменения URL/проекта/экрана.
Первый инкремент — оболочка/preferences/нейтральная палитра на действующих блоках.
Это не полный перенос UX трёх экранов, выбранного hero-preview или всех восьми экранов.

| Экран | Кабинет на широкой ширине | Монтажная на широкой ширине | Сохраняется / отложено |
|---|---|---|---|
| dashboard | Навигация сверху, ограниченная по ширине рабочая область, upload intro/controls две колонки | Та же верхняя навигация, более широкий контент, intro/controls в асимметричной сетке | Порядок support→Uploader→Limits→ProInterest→Partner→VideoList→Deletion прежний; компактные «Последние записи» демо не обещаны |
| результат | Те же ClipCard в двух колонках | Те же ClipCard в трёх колонках при достаточной ширине | Нет нового hero/listbox/selectedClipId; прежние плееры/действия/гостевая форма/polling |
| пакеты | Существующие package sections в колонках при достаточной ширине | Те же sections строками одна под другой | Сохраняются все цены/даты/условия/disabled/busy, никакой демо-каталог |

На <768px оба вида сводятся к одной естественной колонке; внутри карточек container queries
сохраняются. Breakpoints ≥768/1024 уточняются CSS по реальной доступной ширине, без CSS order,
меняющего порядок чтения/Tab. Главное отличие desktop — вышеуказанная геометрия, не новый UX.
AC: видны заявленные геометрические различия, на 320 нет потери действий/overflow; все старые блоки доступны.

### FR-2: Cookie, SSR и живой документ
MUST. n5_workspace_layout отдельно от n5_theme. Ровно один точный studio → studio; все иное,
включая duplicates/encoding/padding/garbage → workspace. Writer также допускает только enum.
Тема сохраняет существующий строгий parser/default dark. Account/session/owner не берутся
из предпочтений; browser preference общая для браузера, не новая account-настройка.
Raw SSR даёт оба html attributes/соответствующие option/aria-pressed/meta до hydration.
В текущем живом Document каноничен document-scoped browser store; toggle обновляет его,
DOM и контролы, пробует cookie write+readback. Persisted Next layouts/back/forward/реальные
Link и LimitsPanel focus/30s refresh не заменяют выбор stale initial props. Нет router.refresh
от toggle. При denied cookie (throw И silent no-op) выбор согласован до hard reload, включая
soft navigation/фоновые refresh; hard reload начинает новый документ с saved cookie/default.
AC: четыре сочетания, прогретые маршруты dashboard→detail→upgrade→Back/Forward, focus/30s,
первый следующий клик реально меняет значение; auth cookie не перезаписывается.

### FR-3: Сохранность текущей загрузки
MUST. Один VideoUploader, те же React type/предки/key при toggle и штатном refresh.
File/input identity, video_id, options, busy и текущая передача сохраняются. Workspace не
меняет resume schema/transport/navigation guards recovery-фичи. Coordinator предлагает
перенести существующие create/pause раньше длинных параметров в том же DOM, только после
интеграции recovery L и без изменения её hooks/handlers; это технический presentation edit.
AC: настоящий File; одна часть уже 2xx, другая pending, URLs не expired; четыре toggle и focus/
30s refresh без abort именно upload и повторной подтверждённой части; один create в здоровом
сценарии. После release — одна штатная complete/navigation. Осознанная pause/resume — отдельно,
не обязана иметь create=1 из-за допустимого refresh подписей/продолжения.

### FR-4: Сохранять действующие данные и права
MUST. Все операции/данные Uploader, VideoDetail/ClipCard, UpgradeScreen и dashboard блоков
переиспользуются. Mock числа/цены/лимиты из HTML не переносятся. Layout/theme не создают
upload/payment/job и не меняют quotas/roles. Сохраняются erasure до auth, redirects, owner gate,
чужая запись 404; проверяются anonymous/ordinary/owner/blogger/erasure с обоими layout и мусором.
AC: прежние access outcomes и существующие ввод/controls; без расширения бизнес-проверок core-cjm.

### FR-5: Плеер и локальное состояние результата
MUST. ClipCard keyed clip_id, неизменный fileVersion в контрольном окне. Второй декодируемый
клип играет: тот же video DOM/src/version, paused=false и currentTime растёт после toggle,
а не равенство времени. Paused на ненулевой позиции сохраняется отдельно. guestPreselect
и заполненные имя/согласие сохраняются без submit; это не выбор hero-preview. Два poll ticks
обновляют UI по существующему циклу, не крадут фокус/повторно скроллят форму.
AC: readiness/play/time preconditions установлены; при отсутствии playable media исход 2.

### FR-6: Нейтральная scoped палитра
MUST. Технический эталон первого инкремента: точные нейтрали (R=G=B) только для canvas,
surface/surface2/поля/hover; зелёный акцент, семантические ошибки/success/focus и медиа из
этого равенства исключены. Цвета literal только в двух root token blocks; aliases scoped.
Проверить computed html/body/nav/upload/fields/clip/package, производные field/running tokens,
текст внутри shell, внешний тестовый banner/SupportLauncher. Public /,/c/,/g/,/upgrade/return
до/после выхода из shell не меняются. Адресная панель остаётся прежней THEME_COLOR — техническое
упрощение, не утверждение об отдельном согласии владельца.
AC: одинаковый набор новых root tokens; прежний theme.test не ослаблен; контраст ниже не пропущен.

### NFR-1: Адаптивность/доступность и различимые состояния
MUST. 192 лёгких geometry cases: 2 вида×2 темы×3 экрана×8 widths(320/360/390/414/672/768/1024/1440)×2 engines.
R9 отдельно на 390×844/375×667/360×740 при обычном тексте, closed settings, scrollY=0 ДО click/
focus/domRules: idle без File — file input; ready File — enabled create/continue; busy — pause+status;
ready result — действия первой реально доступной карточки, partial/empty отдельно; packages
sales-on — покупка с идентифицируемым offer/условиями, sales-off/owner/catalogOnly/no-dates —
объяснение и enabled возврат. Disabled purchase не доказательство доступной покупки.
Все цели в обеих осях viewport, не перекрыты (hit-test), enabled где действие допустимо.
Если каталог не помещается без скрытия условий/нарушения Tab, фиксируется открытый UX gap;
первый shell-инкремент не объявляется полной R9/UX-поставкой и не «исправляется» ослаблением теста.
При text enlargement200% вертикальная прокрутка допустима, все действия достижимы без clipping;
настоящий page zoom200%/эффективные320 и мобильная OS-клавиатура проверяются отдельно вручную.
Текст≥4.5:1, распознаваемая граница контрола/реальный focus≥3:1; axe incomplete не успех.
Keyboard summary/select/theme + ShiftTab, нет focus trap/hidden duplicate/принудительного h1/scrollTo.

### NFR-2: Причинная атрибуция и предел доказательства
MUST. Toggle не инициирует дополнительный RPC/RSC refresh/navigation/mutation. Это причинное
утверждение: известны initial Partner fetch/prefetch, VideoDetail5s polls, LimitsPanel30s/focus
refresh, PUT и Complete после release. Не исключать все GET/RSC и не вычитать средний baseline.
Управляемые фазы проверяют операции по endpoint/method/ordinal/причине; неизвестный request — fail.
Browser guard установлен до первого action/navigation, считает попытку ДО fulfill/abort.
Он блокирует неожиданные mutations (checkout/retry/rerender/link/guest/upload) и external redirect,
но не доказывает отсутствие серверных provider calls/jobs/DB reserves без backend evidence.
Auth/storage/media/URL preconditions обязательны; нет auto seed/контейнеров/платных вызовов.

### NFR-3: Минимальность и существующий стенд ручной приёмки
MUST. Чистый CSS/Next/React, без новых DB/API/packages/provider. Один writer worktree, manifests
не меняются. Уточнение владельца04.11.2026 20:15 UTC заменяет прежний обязательный77 target:
ручная приёмка именно https://clipmkr.ru, существующий VPS194.85.249.105, compose n5-clipmaker,
service web (наблюдавшийся контейнер n5-clipmaker-web-1). DB/Redis volumes, сессии, данные/config
сохраняются. Новый stack/пустые DB/Redis/down-v/reset/auto seed запрещены. Origin/DNS текущего
clipmkr.ru уже подтверждены root; никакого DNS переключения для этой поставки не требуется.
Последовательность: backup/runtime inventory→app-only изменение этого существующего web→E2E
на clipmkr.ru→ссылка/инструкция→ручная приёмка владельца→тот же проверенный artifact Cloud.
До приёмки Cloud не публикуется. Существующие minio/testminio исторические контейнеры не удаляются
и не используются как S3 proof. Stage evidence требует фактических TLS/auth/owned data/media/SHA.
Exact legacy pair clipmkr-stage-20261028 + https://77.83.87.178 допускается только для дополнительного
internal regression, не для замены owner manual acceptance; root подтвердил TLS/SANIP и stub200,
это ещё не app E2E. n5.clipmkr.ru/n5-referral-paytest — другой проект и не цель этого изменения.
Runner принимает лишь эти два точных project/origin pair; arbitrary/cross-pair input→NOT ESTABLISHED.
Unit/документы возможны раньше; runtime/manual evidence не выдумывается. Старые receipts сохраняются
как история прежнего target, новое уточнение не делает прежние запуски выполненными на новом адресе.

OpenSpec delivery delta: `openspec/changes/workspace-presentation/specs/workspace-presentation/spec.md`,
SHA-256 `93441bd01c1faff2acf02cd70ffcd9af18b3ee2967a70568d019b89db2a8434e` (AM-10, owner-steer04.11.2026 20:15 UTC).
