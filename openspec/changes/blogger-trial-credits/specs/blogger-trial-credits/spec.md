## ADDED Requirements

### Requirement: Общий пробный бюджет назначенного блогера
При authorized сохранении active credits_v1 блогера система SHALL поднять существующий
canonical signup/migration_trial grant до max(старый total_seconds, назначенный лимит).
По умолчанию лимит7200с, индивидуальный берётся из existing sourceLimitSeconds.

#### Scenario: Уже потрачены три минуты
- **GIVEN** trial total1800, remaining1620, reserved0 и default blogger limit7200
- **WHEN** владелец сохраняет роль или выполняется authorized backfill
- **THEN** тот же grant имеет total7200, remaining7020, reserved0
- **AND** charge/allocation history и paid grants остаются прежними

### Requirement: Повторы не восполняют израсходованные кредиты
Система SHALL вычислять прирост по историческому total, никогда по текущему остатку.
Понижение/отмена роли SHALL не отнимать уже предоставленный trial; повторное назначение
SHALL не повторять начисление. Явное повышение лимита владельцем SHALL добавлять только
разницу до ещё не предоставленного максимума, без периодического reset.

#### Scenario: Повтор, revoke и новый максимум
- **GIVEN** trial total7200, оставшиеся секунды потрачены частично или полностью
- **WHEN** роль сохраняется повторно, отключается и включается с тем же/меньшим лимитом
- **THEN** total/remaining/reserved не пополняются
- **AND** subsequent explicit limit9000 добавляет ровно1800 к total и remaining однократно

### Requirement: Trial отделён от покупок и legacy
Система SHALL изменять только canonical trial:<account> grant с source signup/migration_trial.
Paid/recovery grants, tariff/paid entitlements и исторические charges/refunds SHALL сохраняться.
Legacy accounts SHALL сохранять политику роли без автоматического credit opt-in.

#### Scenario: Малый лимит и купленные кредиты
- **GIVEN** canonical trial1800 и отдельный оплаченный grant
- **WHEN** назначен индивидуальный лимит120с или7200с
- **THEN** trial соответственно остаётся1800 или повышается7200, paid grant не меняется
- **AND** paid balance не уменьшает положенный trial прирост и пробные кредиты не дают paid rights

#### Scenario: Не найден корректный canonical trial
- **WHEN** isBlogger=true и credits_v1 account не имеет canonical trial либо его source/key/expiry/linkage противоречат native trial
- **THEN** сохранение отказывает без изменения роли, ledger и audit
- **AND** новая строка или guessed signup/migration provenance автоматически не создаётся
- **AND** isBlogger=false не требует trial и остаётся допустимым revoke без funding

### Requirement: Атомарность, authority и аудит
Система SHALL сохранить owner authorization и ordered account locks, затем credit lock и
trial row lock. Policy, additive delta и audit SHALL фиксироваться одной транзакцией.
Audit SHALL хранить before/after trial total и delta, actor/target и причину.

#### Scenario: Конкуренция и отказ audit
- **WHEN** конкурентны role saves, reserve/finalize либо запись audit отказывает
- **THEN** successful run не удваивает delta, consumed/reserved сохраняются
- **AND** audit failure откатывает role и grant; unauthorized/inactive не имеют эффектов

### Requirement: Безопасный адресный backfill
После verified deployment canonical service SHALL допускать один выбранный существующий
account под delegated server operator authority и проверенным active owner actor.
Optional expectedPolicy SHALL сравниваться после row locks; HTTP schema остаётся прежней.

#### Scenario: Политика изменилась после чтения
- **WHEN** role/limit/rate отличаются от expectedPolicy перед backfill
- **THEN** service возвращает conflict без effects
- **AND** account policy не перезаписывается старым snapshot

#### Scenario: Существующая политика совпала
- **WHEN** root admitted addressный backfill с прежними role/limit/rate
- **THEN** выполняется тот же canonical additive grant и audit с явной delegated-maintenance причиной
- **AND** cookies/password resets, массовый backfill и SQL credit patches не используются
