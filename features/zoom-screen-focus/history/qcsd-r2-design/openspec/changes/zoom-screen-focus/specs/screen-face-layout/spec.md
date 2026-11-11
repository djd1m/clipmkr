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
- **THEN** экран сохраняется без podcast center crop; camera показывает только moving pixels подтверждённой ROI этого source в тот же момент и не выбирает лицо вне неё; ограничение объясняется
- **AND** при отрицательном0,5s sample в camera ROI или ошибке анализа camera скрывается на всём retained clip; screen/focus сохраняются
- **AND** смена человека внутри ROI и исчезновение между samples не гарантированно распознаются; это явно объясняется в preview/confirmation, без обещания identity detection
- **AND** при неподтверждённой области действия сохраняется полный выбранный экран и доступно необязательное уточнение


#### Scenario: Initial focus is explicit and safe
- **GIVEN** первый вход в03 без ранее подтверждённого focus текущего source
- **WHEN** готово preview, в том числе при уверенном camera seed
- **THEN** screen равен всему ориентированному source, focus=null; виден whole-screen fallback с текстом «Показан весь экран; для крупного плана можно уточнить область»
- **AND** camera seed заполняет только camera, не выдаётся за распознавание действия; неоднозначность оставляет camera=null с объяснением
- **AND** прежде подтверждённый focus той же source revision восстанавливается автоматически; ручное рисование не обязательно для применения пригодного whole-screen/сохранённого focus

#### Scenario: Identity replacement and short disappearance remain within the source ROI
- **GIVEN** лицо A заменено B внутри camera ROI либо ROI кратко пуста между0,20 и0,30s, а samples0/0,5s положительны
- **WHEN** строится camera output
- **THEN** каждый показанный camera кадр берётся из текущего source crop; нельзя заморозить A или взять другое лицо снаружи
- **AND** продукт не обещает veto по личности/неизмеренному интервалу; preview и confirmation предъявляют этот предел до apply

### Requirement: Accessible controls and draft lifecycle stay truthful
Продукт MUST сохранять draft отдельно от принятого intent и published settings. ROI controls MUST
иметь доступные имена текущей цели, корректные единицы/значения/границы после нормализации и clamp.
Confirmation MUST иметь доступное имя, предсказуемый focus и отмену без apply; async изменения MUST
объявляться по переходу состояния, без перехвата focus и повторов неизменного polling.

#### Scenario: Camera selection and clamped controls match the actual crop
- **GIVEN** клавиатурой выбрана camera или screen и крайнее значение width/x/y
- **WHEN** нормализация зажимает другую координату либо пользователь меняет цель
- **THEN** preview, видимые проценты, accessible name/value/min/max соответствуют одной фактической ROI текущей цели
- **AND** details/radio/ROI имеют видимый focus; Escape/отмена confirmation возвращают focus к доступному invoker и не выполняют apply

#### Scenario: Dirty draft survives return and refresh
- **GIVEN** изменённый draft и доступное sessionStorage текущей вкладки
- **WHEN** поздний seed/polling, close/open, смена clip/возврат, внутренняя навигация/back или reload
- **THEN** draft восстанавливается только после авторизованной проверки того же account/clip/sourceRevision; он явно назван неприменённым, reviewed сброшен
- **AND** новый published version вызывает явный конфликт без подмены draft; accepted intent читается отдельно с сервера

#### Scenario: Local storage cannot preserve the draft
- **GIVEN** storage заблокирован, запись/read-back не удалась либо сохранённый envelope повреждён
- **WHEN** пользователь изменяет draft или возвращается после ухода
- **THEN** до возможной потери показано постоянное предупреждение; native beforeunload и управляемый leave-confirm сохраняют draft при отмене
- **AND** после reload/возврата причина отсутствия восстановленного draft явно показана; восстановление при недоступном storage и отмена SPA Back не обещаются

#### Scenario: Any media play pauses the other players
- **GIVEN** preview, published clip и Original player, включая уже selected clip
- **WHEN** запускается любой один из них
- **THEN** остальные приостанавливаются на каждом play; close/change clip останавливает preview, polling сохраняет identity published nodes и dirty draft

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
