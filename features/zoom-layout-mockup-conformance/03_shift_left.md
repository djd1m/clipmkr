# Shift-left перед QCSD

Требования MC-01…08, ADR-001 и архитектура имеют наблюдаемые проверки в TASK-01…08 плана. Подтверждённые потребители: strict request parser, intent/publication SQL constraints, music/CTA COALESCE, canvas clipping и native pane. Независимый plan reviewer прочитал их и закрыл P1 bounded entrypoint на уровне плана; будущий executor ещё не существует.

Основные ранние проверки: реальный libass/drawtext bbox до K2; неправильная старая композиция даёт отдельный behavioural RED; expectation извлекается из immutable original; v1/03/music/CTA byte/semantic compatibility; открытие старого клипа без implicit upgrade; invalid release evidence останавливает сам executor до write. Исторические receipts не используются как текущий PASS. Выполнен pinned dz recall по original/mockup/compatibility, 10 реальных результатов SQLite; уроки99a7cc53301d60e1/de3e9e3d84558cec применены в плане.

HAS_UI=true, HAS_UX=true, HAS_SECURITY=false: существующая авторизация/доступ не расширяются; штатные foreign-account negatives сохраняются. Для M активны три core роли QCSD, UI/UX рассматриваются внутри quality/testability. Условные отдельные роли обязательны только при L/XL.
