## ADDED Requirements

### Requirement: Source-site имеет единственный проверяемый upstream
Система SHALL использовать для source-site только `n5-clipmaker-web-1:3000` как единственный безусловный upstream промежуточного proxy. Переносимый базовый `proxy/Caddyfile` и произвольное имя Compose-проекта сохраняются; фиксированное site имя не навязывается другим установкам.

#### Scenario: Известные общие сети
- **WHEN** proxy разделяет сети с несколькими контейнерами, имеющими alias `web`
- **THEN** site overlay выбирает точное имя main web, а admission требует единственную регистрацию этого имени у утверждённого main container во всём проверенном сетевом инвентаре

#### Scenario: Имя также неоднозначно или target не установлен
- **WHEN** выбранное точное имя имеет другого кандидата, main отсутствует, инвентарь неполон либо identity не совпадает
- **THEN** admission прекращается до сессии, checkout и последующей бизнес-операции

### Requirement: Проверки и управляемая замена сохраняются
Система SHALL сохранить точные disk/adapted/loaded bindings, отсутствие DNS/hosts overrides, artifact/store/TEST identity, доверенную XFF цепочку и health. Runtime замена single-file bind SHALL сохранять inode/container/PID, иметь проверенную резервную копию и восстановление через тот же inode при ошибке.

#### Scenario: Проверенный кандидат применяется после отдельных gates
- **WHEN** независимые review и root GO получены и свежий preflight установил mount/inode/identity/отсутствие активных платежей
- **THEN** backup, полная запись/truncate/fsync, Caddy validate/reload и loaded==adapted/health/XFF проверяются с устойчивой записью результата

#### Scenario: Не удалось подтвердить результат
- **WHEN** запись, validate/reload или контроль завершились ошибкой либо неизвестным состоянием
- **THEN** при known synchronous failure и доказанном control старые bytes восстанавливаются через тот же inode; timeout/unknown external completion вызывает incident STOP без последующих write/reload до выяснения completion/control; успешная оплата не заявляется

#### Scenario: Уже существует принятая callback operation record
- **WHEN** на диске сохранён известный healthy_unconfirmed/applied=false marker с точным binding и отдельным actual apply receipt
- **THEN** marker не стирается и не объявляется неизвестной операцией только по флагу; перед бизнес-действием требуется свежая canonical revalidate, а unknown/incomplete proxy operation блокирует новую запись
