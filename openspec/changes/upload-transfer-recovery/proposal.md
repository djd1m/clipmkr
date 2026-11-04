# Уточнение upload-transfer-recovery

Proposed delta для существующего change upload-transfer-recovery. При интеграции заменить
его spec новым текстом ниже и перенести актуальные feature docs с сохранением .fa-state lineage.

Путь «передача → пауза/повторный выбор того же файла → обработка → клипы» явно согласован
владельцем 04.11.2026. Полный 8-screen redesign не согласован. Предлагается bounded client
resume: account-scoped strict session v2 + полный incremental SHA-256 через noble2.4.0;
прежний key/multipart, native navigation guards и корректное представление uploading.
Legacy/утрата cache имеют честный ограниченный исход и отдельный явный запуск новой записи.
Server count/HEAD guard — dependency main12b2e175 (source-bound к авторскому9b8b043), не второй implementation.

Из-за 22 code targets tier повышен M→L, добавлены research/domain model/fleet plan.
QC/код/испытания pending. Реальные текстовые K1/K2 не закрывают их.
Существующий create input узко расширяется optional account_scope UUID: v2 всегда отправляет,
сервер проверяет auth scope до transaction/claim/quota/S3; mismatch409, malformed422, legacy
без поля совместим. Новые endpoint/test stack/DB запрещены: существующий clipmkr-stage-20261028, данные сохраняются.
Публичный HTTPS stage адрес ещё не установлен; DNS и E2E/delivery не объявляются готовыми.
