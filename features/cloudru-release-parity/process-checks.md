# Реальные проверки процесса

## Инструменты и хуки

Проектные версии: dz 0.8.58, feature-adr 1.5.25, OpenSpec 1.15.0.
Codex hooks: integrations-verify возвращает статический policy refusal. Это не
успешный live probe. Установщик поддерживает user-global hooks; проектная
установка не доказана. Gates вызываются явно; глобальные настройки не изменялись.

## K1 и совместимость приложения

Исходный dz name-check exit 2: scanner жёстко требует packages/@dzhechkov/*/src/*.ts,
которого у Clipmkr нет. Пустой sweep не трактовался как доступность имён.
В существующую nameCheckScan внесён небольшой воспроизводимый compatibility patch:
когда harness layout отсутствует, читается настоящий исходный код apps/packages/scripts
рекурсивно, без node_modules/dist/.next/.git; экспортные декларации разбирает прежний
парсер dz. Проверяются также существующие package scripts. Пустой/нечитаемый scan
по-прежнему отклоняется. Harness layout сохраняет исходное поведение.

Изменение инструмента внесено до нового продуктового кода как восстановление K1.
Installer применяет оба pinned patches идемпотентно. Реальный тест исходного кода
проверяет вложенный collision, новый export/module и пустой workspace; вместе с
существующей проверкой K2: 2/2 PASS (tool tests на Node 24 текущего хоста).
После patch фактический dz name-check --module release-candidate
--export loadCandidateProfile,validateReleaseManifest --project /home/clipmkr:
exit 0, free для всех трёх имён. Новые имена далее проверяются перед кодированием.
Это проверка деклараций, не полная семантика re-export; build/typecheck обязательны.

## Backup/restore

Созданы закрытые pg_dump custom-format основной, существующей тестовой, Cloud
и локальной stage БД. Все четыре реально восстановлены в PostgreSQL 16.4,
network none, без приложений и опубликованных портов. Сохранены полные journals,
counts, список колонок account и агрегатный SHA строк account из каждого snapshot.
Объёмы/идентификаторы, PII и секреты находятся только в операторском каталоге.
БД/volumes приложений не изменялись. Это ещё не проверка сохранности после apply.
