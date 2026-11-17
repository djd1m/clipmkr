# Требования соответствия исходной композиции01/02

## Purpose

Исправить подтверждённое расхождение01/02 с исходными макетами владельца и сделать визуальный эталон обязательным проверяемым входом выпуска без повреждения существующих готовых материалов.

## ADDED Requirements

### Requirement: Original composition is the acceptance reference

Для нового явно применяемого оформления01/02 продукт MUST воспроизводить композицию неизменённого оригинального макета11.11:01 сохраняет целый выбранный screen с камерой справа поверх;02 показывает камеру справа сверху отдельно от увеличенной рабочей области ниже. Эталон MUST быть закреплён revision/SHA и независимыми координатами; поздний ADR MUST NOT подменять этот визуальный вход. Надписи исследовательского макета не создают требований новых титров.

#### Scenario: Original01 on the reference source
- **GIVEN** подтверждены screen и camera контрольного источника оригинального макета
- **WHEN** пользователь просматривает и явно применяет новое01
- **THEN** screen сохранён целиком, camera справа поверх него с исходными относительными размерами/положением
- **AND** preview и готовый MP4 соответствуют эталону с допуском чётного растерного округления≤2px на1080×1920

#### Scenario: Original02 on the reference source
- **GIVEN** подтверждена рабочая область930×704 контрольного источника1816×968 и camera320×180
- **WHEN** пользователь просматривает и явно применяет новое02
- **THEN** camera показана справа сверху, рабочая область ниже занимает полную ширину без изменения её пропорций
- **AND** расположение и масштаб соответствуют исходному макету с тем же допуском

#### Scenario: Other source geometry
- **GIVEN** другой размер/соотношение сторон или camera недоступна
- **WHEN** формируется новое01/02
- **THEN** области зависят от реальных размеров source, сохраняют пропорции и действующий честный fallback
- **AND** координаты контрольной Zoom-записи не применяются как универсальный автоматический алгоритм

### Requirement: Selecting a layout remains explicit and preserves old media

Продукт MUST сохранять существующие MP4 и прежнюю геометрию их последующих music/CTA пересборок до отдельного явного применения нового оформления.03/legacy MUST сохранять прежнее поведение. Переключение варианта MUST оставаться локальным черновиком без render/source credit/rerender quota debit.

#### Scenario: Change music on old01 or02
- **GIVEN** готовый клип с прежней композицией01/02
- **WHEN** пользователь меняет только музыку или призыв
- **THEN** выбранная ранее геометрия сохраняется, новая композиция не применяется незаметно

#### Scenario: Apply corrected composition
- **GIVEN** готовый клип и просмотренное новое оформление
- **WHEN** пользователь явно подтверждает пересборку
- **THEN** новая композиция применяется только к этому клипу, старый файл доступен до успешной публикации
- **AND** повторы/двуклик не вызывают второго списания и второго принятого намерения

#### Scenario: Choosing a work region
- **GIVEN** рабочая область для02 не подтверждена
- **WHEN** пользователь переключает01 на02
- **THEN** приложение не выдумывает область действия и явно показывает фактически выбранный screen
- **AND** пользователь может уточнить рабочую область необходимого соотношения сторон; новые controls требуют отдельного конкретного UI-макета до реализации

### Requirement: Visual drift blocks delivery

Выпуск MUST проверять original reference, canvas preview и конечный MP4 на одной проверяемой ревизии. Выпуск MUST блокироваться при несоответствии эталону, незакрытом значимом независимом замечании или отсутствии доступного владельцу QA-примера. Изменение эталона MUST требовать отдельного явного согласования владельца.

#### Scenario: Wrong implementation is rejected
- **GIVEN** камера01 вынесена над экраном либо панели02 поменяны местами/экран02 уменьшен относительно эталона
- **WHEN** выполняются обязательные визуальные проверки
- **THEN** возникает содержательный RED по геометрии/медиа, а не skip/no-match/import error
- **AND** выпуск запрещён, даже если тесты позднего ошибочного ADR проходят

#### Scenario: Independent comparison before owner acceptance
- **GIVEN** готов исправленный артефакт для clipmkr.ru
- **WHEN** выполняются финальный QE и подготовка владельцу
- **THEN** отдельная модель без контекста кодирования сравнивает оригинал, preview и MP4
- **AND** владелец получает URL записи в проверенной учётке и инструкцию Play/download, а визуальная приёмка отмечается отдельно от автоматического PASS


### Requirement: Release qualifies the actual application database before admission pause

Исполнитель MUST до закрытия admissions подтвердить фактическую БД всех четырёх runtime services и отдельно существующую административную учётную запись мигратора. Runtime DATABASE_URL и права приложения MUST оставаться ограниченными и неизменными. Backup MUST использовать явно подтверждённую app DB, а не POSTGRES_DB по умолчанию. Неизвестное или неподходящее подключение MUST отказать до pause и до cleanup, который мог бы остановить здоровый сайт.

#### Scenario: Restricted application role and a different container default database
- **GIVEN** web и три workers используют одну фактическую app DB, runtime role не имеет DDL, а POSTGRES_DB обозначает другую БД
- **WHEN** выполняется квалификация выпуска
- **THEN** app DB определяется через действительные runtime SQL/DNS bindings, отдельно проверяется existing admin connection к той же БД
- **AND** отказ qualification не вызывает Caddy persist/load, stop, pause или automatic close

#### Scenario: Bound backup and administrative migration
- **GIVEN** квалифицированы actual app DB и existing admin role, writers остановлены по штатному bounded пути
- **WHEN** сохраняется backup и применяется033
- **THEN** pg_dump явно выбирает actual app DB; свежий actual archive имеет terminal exit, SHA и native TOC с подтверждённой DB identity
- **AND** isolated realPG test восстанавливает только собственный synthetic fixture dump и доказывает поведение helper; восстановление свежего production dump этим тестом не заявляется
- **AND** existing transactional migrate(pool) из pinned candidate получает transient admin connection через stdin, без admin DSN/password в argv, Docker Config.Env или runtime env
- **AND** прежний journal и данные сохранены,033 добавлена один раз; runtime DSN/role/grants не меняются

- **AND** initial candidate допускает только pending033; already-applied033 с exact SHA допускает idempotent forward/recovery без новых pending entries; rollback C0 требует033 exact и не вызывает DDL; неизвестные/другие pending entries запрещены
- **AND** admin authority означает superuser либо effective inherited ownership без SET ROLE, а unqualified journal/intent разрешаются в ожидаемые public objects; runtime search_path не меняется
