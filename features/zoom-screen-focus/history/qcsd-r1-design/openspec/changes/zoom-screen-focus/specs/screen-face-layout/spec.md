## ADDED Requirements

### Requirement: Screen and face layout preserves the selected action
Продукт MUST поддерживать явный режим «Экран + лицо» с вариантом03 по умолчанию и
вариантами01/02 в дополнительных настройках. У screen/action и камеры MUST быть
отдельные проверяемые области, зависящие от размеров исходника. Продукт MUST позволять
уточнение области и просмотр всей длительности перед применением; координаты одного
Zoom-файла MUST NOT становиться универсальным алгоритмом. Старый podcast режим сохраняется.

#### Scenario: Selecting a layout is a draft
- **GIVEN** готовый клип и открытые настройки screen+face
- **WHEN** пользователь выбирает01,02 или03 либо отменяет выбор
- **THEN** меняется только черновик/предпросмотр; RPC mutation, render job и списания отсутствуют

#### Scenario: Automatic camera seed is prepared once
- **GIVEN** владелец готового клипа явно включает режим «Экран + лицо»
- **WHEN** подтверждённый cache для clip/source revision отсутствует
- **THEN** существующий worker может выполнить идемпотентную подготовку seed с ограничением попыток/времени и низким приоритетом
- **AND** подготовка не создаёт render attempt, не меняет опубликованный MP4 и не расходует source/rerender quota
- **AND** повторное открытие/refresh и radio changes используют cache/status без новой операции анализа
- **AND** при достаточных наблюдениях предлагается camera ROI; ручное уточнение остаётся необязательным

#### Scenario: Camera or reliable action detection is unavailable
- **GIVEN** камера отсутствует, лицо не найдено или область действия не подтверждена
- **WHEN** строится screen+face результат
- **THEN** экран сохраняется без podcast center crop; лицо не подменяется; ограничение объясняется
- **AND** при неуверенной области действия сохраняется полный выбранный экран и доступно уточнение

### Requirement: Explicit apply preserves published clips and source credits
Готовый клип MUST меняться только после явного подтверждения выбранной области и условий
пересборки. Прежний MP4 MUST оставаться доступным до успешной публикации в пределах срока
хранения. Pending и published settings/version MUST различаться. Повтор/конкуренция MUST NOT
создавать повторный source charge или вторую принятую операцию; доступ/квоту проверяет сервер.

#### Scenario: Concurrent apply or failed publication
- **GIVEN** готовый оплаченный clip и два одинаковых подтверждения
- **WHEN** запросы исполняются одновременно или один повторён после timeout
- **THEN** принимается одна пересборка, STT/select/source credits не повторяются
- **AND** stale fence или ошибка публикации оставляют старый файл доступным

### Requirement: Timeline and overlays preserve action context
Экран, камера, звук, субтитры и эффекты MUST использовать общий cut_plan. Надписи MUST
располагаться вне выбранной области действия, обязательная метка MUST оставаться последним
слоем. Читаемость MUST оцениваться на390px по движущемуся результату, а не обещаться по1080px export.

#### Scenario: Changed windows and missing camera intervals
- **GIVEN** движущийся источник со сменой окна, меню и интервалами без камеры
- **WHEN** рендерятся01/02/03 и применяется compact timeline
- **THEN** preview/download сохраняют отмеченное действие, синхронизацию и заявленный fallback
