# Тестовый checkout одного аккаунта

Подготовлен M design snapshot на source-базе `24b4b4a`, без runtime/DB/provider/deploy операций.
Поручение и граница отсутствия нового UI: `owner-authority.md`. User delta — exact path/hash в 01/JSON.
8 production/config файлов + 5 existing tests + existing provider fixture + 2 test-only файла; без новой таблицы, роли, endpoint, provider или UI.

Initial QCSD дал QL-01/QL-02/QT-001; structural rework ожидает нового measured prepare и focused review.
Root K1 canonical export FREE; новые test module names и K2 ещё pending;
Astra design проверяется Terra, Sol code — новой Astra. Этот README не является stage receipt.
Private identity/credentials не читались архитектором и не включены в документы. Существующий
native TEST flow будет доступен только configured session account при global checkout false.
