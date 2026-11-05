## ADDED Requirements

### Requirement: Восстановление частичного терминального результата
Система SHALL предложить владельцу записи существующее действие «Повторить», когда запись
терминально завершена частично (video done либо failed): хотя бы один клип готов и хотя бы один завершился отказом.
Система SHALL повторить только failed монтаж существующей записи, сохранив готовые результаты.

#### Scenario: Один из двух клипов не готов
- **GIVEN** собственная активная неудалённая запись, ready доступен по canonical expiry и имеет object_key, original finished_at известен, один clip failed, source/transcript сохранены, active attempts нет
- **WHEN** пользователь нажимает «Повторить»
- **THEN** создаётся одна новая серия render только для failed клипа
- **AND** готовый клип остаётся доступен для просмотра и скачивания до прежнего законного expiry
- **AND** STT и LLM не вызываются

### Requirement: Повторный монтаж не списывает запись повторно
Partial retry SHALL сохранить latest reserved/settled charge/cycle, allocations и balances
без нового расхода, даже при balance0/expired grants. Settled SHALL оставаться неизменным;
reserved SHALL допускать только первое штатное settlement того же charge, без нового
reserve/cycle/debit/refund. Missing/released ordinary credits_v1 SHALL дать отказ до reserve.

#### Scenario: Результат уже оплачен
- **GIVEN** запись credits_v1 с latest settled charge и доступным готовым клипом
- **WHEN** повторяются оставшиеся failed клипы
- **THEN** количество charge/allocation и остатки grant неизменны до и после повторной готовности

#### Scenario: Уже существующий reserved charge
- **GIVEN** latest reserved charge и готовый соседний clip
- **WHEN** retry и последующие terminal callbacks выполняются
- **THEN** retry не меняет финансовые rows, затем допускается ровно один canonical reserved→settled того же charge
- **AND** повторный finalize не меняет финансовое состояние, нового reserve/cycle/debit/refund нет

### Requirement: Авторитетные guards повторного запуска
Система SHALL транзакционно проверять owner/active account, actual clip/job/charge/source facts
и отсутствие active attempts. Guards одинаковы для done/failed-with-ready; zero-ready failed
сохраняет старый pipeline. Partial SHALL брать existing retention shared try-lease key50921012
до reread keys/expiry; concurrent retry не создаёт вторую серию.

#### Scenario: Watchdog завершил partial отказом
- **GIVEN** настоящий watchdog оставил video failed, done clip и failed sibling
- **WHEN** пользователь повторяет монтаж
- **THEN** missing/released charge, active rerender, stale job/fence и inactive/erasing account отвергаются без effects так же, как для done partial

#### Scenario: Очистка уже выбрала готовый клип
- **GIVEN** retentionTick держит existing exclusive lease между selection и storage erase
- **WHEN** partial retry пробует shared transaction lease
- **THEN** немедленный409 без mutations; после lease release новый запрос заново проверяет object_key и expiry

#### Scenario: Повтор запрещён
- **GIVEN** чужая, отсутствующая, удалённая/удаляемая запись, fully done, активная запись либо неконсистентный partial result
- **WHEN** отправляется video.retry
- **THEN** операция отвергается без очереди, новых attempts или кредитных изменений

#### Scenario: Источник исчез в S3 после проверки DB
- **GIVEN** DB source pointer/actual_bytes/transcript прошли admission, но физический объект недоступен
- **WHEN** штатный worker читает источник
- **THEN** применяется existing failure только неготового монтажа, ready clip сохраняется
- **AND** успешный retry ответ не выдаётся за доказательство завершённого render

### Requirement: Честный частичный результат
Экран SHALL показывать готовое и неготовое количество, доступность готового клипа, scope повтора
и состояние «Запускаем…». Успех всех клипов SHALL убрать действие повтора.

#### Scenario: Страница после перезагрузки
- **GIVEN** повтор запущен штатным video.retry
- **WHEN** пользователь перезагружает страницу
- **THEN** видит сохранённый готовый клип и актуальный монтаж оставшихся

### Requirement: Исходный срок готового результата
Retry SHALL сохранять original partial video.finished_at при старте, intermediate/terminal render progress
и watchdog terminalization. Existing free/paid/explicit expiry SHALL действовать без продления или pin expiry.

#### Scenario: Ready уже истёк или очищен
- **GIVEN** ready истёк, хотя bytes ещё существуют, либо object_key очищен, либо original anchor неизвестен
- **WHEN** partial retry запрошен
- **THEN** отказ409 без mutations и восстановления доступа

#### Scenario: Срок истёк во время retry
- **GIVEN** доступный ready прошёл admission
- **WHEN** во время retry пересекается canonical expiry
- **THEN** чтения становятся недоступными и штатная retention может очистить объект; retry и завершение не сдвигают срок

### Requirement: Ограниченная доставка после enqueue failure
Committed retry SHALL сохранять attempt при enqueue failure; существующий watchdog SHALL доставлять её
до/на updated_at+30мин, а после strict stale threshold завершать отказом до redelivery.

#### Scenario: Первый tick по обе стороны границы
- **GIVEN** enqueue после commit отказал
- **WHEN** первый успешный watchdog tick проходит до/ровно30мин либо позже
- **THEN** до/на границе доставляется same identity/fence; позже old attempt terminal failed и не доставляется, готовый сосед и original anchor сохранены
- **AND** последующий явный retry проходит общие partial guards и канонический одноразовый credit accounting

### Requirement: Месячная активность учитывает хотя бы один готовый клип
Отчёт SHALL учитывать уникальных привлечённых пользователей за месяц получения хотя бы
одного готового клипа, включая ранее пропущенные старые записи с частичной ошибкой.
Исторические показатели MAY увеличиться по решению владельца05.11.2026. Повторная
обработка SHALL сохранять исходный месяц активности; метрика только первой активации
не допускается.

#### Scenario: Повтор результата другого месяца
- **GIVEN** единственная готовая запись клиента относится к месяцу A
- **WHEN** в B она проходит partial retry, rendering и terminal success либо failed watchdog
- **THEN** клиент остаётся в A и только этот retry не добавляет его в B
- **AND** отдельная новая готовая запись в B учитывается в B; deleted/attribution/assigned_at filters и distinct сохраняются
- **AND** original finished_at, существующие attribution.activated_at и growth timestamps сохраняются; первое native pending→activated по-прежнему допустимо

#### Scenario: Историческая запись с частичной ошибкой
- **GIVEN** до изменения отчёта у привлечённого пользователя есть запись с готовым клипом за месяц A и общим статусом failed, которую прежний отчёт исключал
- **WHEN** рассчитывается активность за A по принятому владельцем правилу
- **THEN** пользователь SHALL учитываться в A один раз при сохранении действующих фильтров принадлежности и атрибуции
- **AND** последующий retry в B, его success или failure SHALL NOT сами по себе удалять активность из A или добавлять её в B
- **AND** расчёт SHALL NOT менять кредиты, платежи или финансовые начисления.
