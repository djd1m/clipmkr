## ADDED Requirements

### Requirement: Видимый widget сохраняет согласованное закрытие
Очистка support identity SHALL синхронно скрывать native widget до снятия родительских controls. Existing privacy/logout/epoch/failure guards SHALL сохраняться.

#### Scenario: Возврат фокуса из iframe
- **GIVEN** чат открыт и фокус внутри iframe
- **WHEN** фокус возвращается в страницу и запускается identity clear
- **THEN** iframe скрыт до удаления родительской кнопки, видимого окна без управления не остаётся

### Requirement: Обычное закрытие сохраняет текущий диалог
Явное close SHALL оставаться hide-only с возвратом focus; обычное повторное открытие SHALL NOT добавлять logout из-за исправления. Existing control и parent Escape SHALL работать на1440/390 при активном listener.

#### Scenario: Закрыть и открыть снова
- **WHEN** пользователь закрывает чат штатной кнопкой и открывает снова
- **THEN** native hide/show работают, история и draft не сбрасываются новым logout

### Requirement: Проверка реальной lifecycle границы
Регрессия SHALL исполнять настоящий SupportPanel и браузерный iframe focus с независимой DOM visibility. Проверка только mock-вызова hide либо source regex SHALL NOT считаться подтверждением отсутствия orphan.

#### Scenario: Предыдущая реализация
- **WHEN** тот же focus-return сценарий выполняется на baseline helper
- **THEN** тест различает видимый orphan и завершается behavioral failure
