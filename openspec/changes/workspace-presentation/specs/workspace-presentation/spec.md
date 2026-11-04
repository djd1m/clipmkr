## ADDED Requirements

### Requirement: Ограниченная рабочая оболочка и независимые предпочтения

Система MUST открывать Кабинет по умолчанию и позволять Настройки→Компоновка→Монтажная→обратно,
отдельно менять существующую тему. Первый инкремент MUST явно сохранять действующие блоки:
Dashboard порядок прежний, ClipCard вместо нового hero/listbox, все реальные условия пакетов.
Геометрия двух desktop видов определяется FR-1; на узкой ширине естественная одна колонка.
Полный UX макета не объявляется перенесённым этим изменением.

#### Scenario: Первый инкремент и данные
- **GIVEN** действующие upload/result/packages
- **WHEN** меняется вид
- **THEN** меняется общая оболочка/геометрия, цены/права/данные/действия прежние
- **AND** выбранный hero/listbox и компактные demo records не имитируются новыми состояниями

### Requirement: Строгая cookie, SSR и сохранённые Next layouts

Система MUST использовать отдельные strict n5_workspace_layout/n5_theme, без изменения account/
auth источников. Неоднозначный layout cookie MUST давать workspace; writer MUST выдавать enum.
Raw SSR и hydration MUST совпадать с saved/default. Один browser snapshot текущего Document
MUST согласовывать attrs/select/aria/meta/computed view при soft navigation/cache/refresh.

#### Scenario: Cached Link и фоновые обновления
- **GIVEN** посещённые dashboard/detail/upgrade и выбранные layout/theme
- **WHEN** пользователь меняет preferences, возвращается Back/Forward/реальными Link и проходит focus/30s refresh
- **THEN** controls/attrs/meta согласованы; первое следующее переключение действительно меняет выбор
- **AND** toggle сам не вызывает router refresh/request/navigation

#### Scenario: Cookie write denied
- **GIVEN** preference setter бросает SecurityError либо молча не пишет, auth остаётся валиден
- **WHEN** пользователь меняет оба предпочтения, делает soft navigation и штатный refresh
- **THEN** выбор сохраняется в живом Document, виден честный fallback, ошибок страницы нет
- **AND** hard reload начинает новый Document с фактически saved cookie/default

### Requirement: React identity и причинные сетевые границы

Смена вида/темы MUST сохранять единственный Uploader, File/input, options/video_id/current PUT,
ClipCard/video DOM/версию и guest form. Browser evidence MUST отличать toggle-caused requests
от initial fetch/prefetch,5s polling,30s/focus refresh и штатного Complete после release.
Нельзя доказывать server provider/jobs/DB absence только browser interception.

#### Scenario: Confirmed и pending часть
- **GIVEN** настоящий File, один part уже2xx, второй pending, URL не истёк
- **WHEN** дважды меняется layout/theme и выполняется штатный LimitsPanel refresh
- **THEN** прежние input/File/video/options/PUT живы, confirmed part не повторяется
- **AND** после release штатный Complete ровно один и переход на существующую owned запись

#### Scenario: Второй играющий клип
- **GIVEN** два decoded synthetic clip, второй играет с растущим временем и fixed version, guest form заполнена
- **WHEN** меняются preferences и проходят два poll ticks
- **THEN** тот же video продолжает играть без reset, guest selection/name/consent сохранены
- **AND** фокус/scroll формы не перехватываются; paused nonzero проверяется отдельно

#### Scenario: Toggle между ticks
- **GIVEN** законные initial/background requests уже размечены и PUT удерживается
- **WHEN** выполняется только toggle
- **THEN** нет дополнительных RPC/RSC/navigation/mutation, unknown попытка считается fail до backend
- **AND** отдельные разрешённые poll/refresh/release phases продолжают работать

### Requirement: Реальные preconditions доступности и безопасная fixture

Система MUST сохранять естественный DOM/Tab порядок и доступные native настройки. R9 MUST
измерять исходную scroll0 геометрию/enabled/hit-test для конкретного состояния; disabled purchase
не считается действием, empty result не считается ready clip. Text200%/actual page zoom/mobile
OS keyboard и focus/control contrast MUST иметь отдельное evidence за пределами primitives.
Fixture MUST иметь real HTTPS/auth/owned SSR records/safe decoded media/даты/роли/SHA; runner
не запускает seed/paid pipeline/новыеcontainers и при отсутствии precondition возвращает2.

#### Scenario: Каталог недоступен для покупки
- **GIVEN** ownerUnlimited/salesOff/catalogOnly либо отсутствуют purchase dates
- **WHEN** проверяется первый экран
- **THEN** ожидаются понятное объяснение/доступный возврат, а не выключенная кнопка как успех покупки

#### Scenario: Нет подтверждённого стенда или media
- **GIVEN** public stage access либо owned records/roles/media ещё не подготовлены
- **WHEN** runner preflight выполняется
- **THEN** результат NOT ESTABLISHED/2, без auto seed/new stack/выдуманного URL/PASS

### Requirement: Существующие доступы, палитра и поставка

Auth/owner/erasure/foreign404 MUST сохраняться при любом/невалидном preference.
Нейтральные surfaces/derived fields/body и зелёный акцент MUST оставаться scoped,
public routes/banner/support контраст MUST проверяться. Только existing stage 77.83.87.178
clipmkr-stage-20261028 с сохранением данных; Cloud только после ручной приёмки.

#### Scenario: Доступы и уход из shell
- **GIVEN** anonymous/ordinary/owner/blogger/erasure и разные preference cookies
- **WHEN** открывается разрешённый/чужой маршрут и затем public page
- **THEN** прежние redirects/404/controls/erasure-only сохраняются, workspace styles не протекают в public
