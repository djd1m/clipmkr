# ADR-001: один артефакт выпуска для явных тестовых целей

Status: proposed; revision pending focused QCSD; обратимо совместимым manifest.
Дата: 03.11.2026. Требования FR-1, FR-3, FR-5, FR-6, FR-7, FR-9.

## Context

Controller workspace и сервер нынешнего сайта физически различаются по inventory.
Владелец под «этим VPS» понимает site-server, где разработка и сайт — один сервер.
Ручная правка контейнера не обновляет Git и остальные цели. Требуется единая
версия на Cloud и существующем n5 test, без создания ещё одного dev-контура.

## Decision drivers

Сохранность данных, проверяемое происхождение, единый стек и минимальный код.

## Considered options

| Вариант | Преимущества | Ограничения |
|---|---|---|
| Git + Docker save/load + Compose, небольшой runner | Уже доступны, один артефакт, контролируемые цели | Частичный успех двух хостов не атомарен; нужны receipts |
| Новый CI/registry-продукт | Готовые очереди и интерфейс релизов | Новая интеграция и секреты, registry пока не настроен |
| Независимая сборка на каждом хосте | Простая передача исходников | Сложнее доказать идентичность, дефицит диска исходного сайта |

## Decision

Переиспользовать Git, Docker и SSH. Чистый полный SHA → один набор web/worker
образов с OCI revision → manifest с SHA, image IDs и checksum доставки → явно
разрешённые тестовые цели → сверка реально запущенных image IDs и health.
Registry RepoDigest, локальный image ID и checksum tar — разные поля.
Отсутствующая цель не означает production. Никаких bootstrap, prune, down -v
или неявного переключения домена в команде выпуска. Результаты целей независимы;
ошибка одной даёт ненулевой итог с сохранением частичного состояния.

Правки и запуск controller выполняются из `/home/clipmkr`. Allowlist содержит
только `cloud-c` и `site-test`; оба executor работают через SSH. `site-test` —
существующий n5 test на site-server; localdevstage исключён, локальный executor
не является альтернативой SSH. `clipmkr.ru`, main containers и DNS не переключаются.
Обе цели получают один image set и исходный архив того же SHA, отдельно от
секретных профилей. Source-sync не пишет поверх live source/env/данных и сверяет
checksum/inventory до admission. Откат возвращает
совместимый manifest приложения и сохраняет БД/volumes. Для автоматического
отката требуются одинаковые полные schema journal SHA; начальный переход 26→28
не откатывается на старый образ автоматически. Повторный релиз проверяется
между двумя выпусками новой версии при одной схеме.

Перед remote apply фиксируются приватный state и lock цели; после обрыва SSH
результат unknown. Следующий вызов сначала сверяет runtime/state/schema, а не
повторяет миграцию/контейнерные действия вслепую. Ключ и transient unit проверяются
в preflight; продление разрешения не выполняется автоматически.

Site journal уже 28; переход 26→28 требуется только Cloud. До передачи/apply
нужен фактический disk admission по source/image archives, incremental layers и
пиковому месту распаковки при сохранении rollback images; 3,6 ГБ/97% не дают
заранее достаточности. Global prune/чужие проекты/rollback images не удаляются.

Health immutable revision уже подтверждён настоящей сборкой `71e7812` (200,
no-store, runtime override не подменяет SHA). Wiring guard должен отличать точный
build-time NEXT_PUBLIC_RELEASE_REVISION от runtime-required переменных и проверять
Dockerfile ARG/ENV/Next build. Нельзя просто исключить все NEXT_PUBLIC_* или удалить
runtime guard. Семь failures полного suite — открытая регрессия FR-9.

## Consequences

Плюсы: проверяемый выпуск без нового продукта, одинаковые образы на целях.
Минусы: небольшой ops-runner нужно поддерживать; перенос образов занимает время;
автоматической распределённой транзакции нет. Частичный результат явно виден.

## Confirmation

1. `tests/release-candidate.test.ts`: отказ production/неизвестной цели,
   неверного SHA/manifest/image ID; успех только после проверки каждой цели.
2. `tests/release-candidate-acid.test.ts`: внедрённый дефект пропуска цели или
   подмены образа должен сделать проверку красной.
3. Настоящий повторный выпуск после отдельного коммита меняет наблюдаемую версию
   на обеих выбранных тестовых целях; откат возвращает предыдущую версию.
4. `tests/wiring.test.ts`: точная build-time классификация/проводка; отсутствующая
   runtime-required переменная, динамическое чтение и сломанный build binding дают отказ.

Load-bearing property: команда кандидата не способна молча выбрать production
или объявить одинаковыми разные реально запущенные артефакты.
Owner: оператор выпуска; независимое QE проверяет код и живые receipts.

## Review

Выбор двух SSH-целей уточнён владельцем; новые prepare/три focused QCSD ещё впереди.
Старый ideationclosed относится к старому снимку. План не approved до новых QCSD.
Пересмотреть при появлении registry или нового штатного режима обслуживания Hub.

## Уточнение binding существующего site-test

Одна SSH-цель включает applicationProject web/workers и другой databaseProject/
redisProject старого test infra; production main отдельный. Профили фиксируют
каждый project, exact container/volume/network identity и binding.dbName.
Не требовать одного compose project, не создавать/up DB/Redis. SQL подключается
к database из application DATABASE_URL (не POSTGRES_DB default), сверяет dbName
и host → pinned test DB container в test network. Main DB/mismatch запрещены.
App-only Compose/migrator не поднимают dependencies, existing networks сохраняются.
`tests/release-candidate.test.ts` проверяет valid split topology и negative binding.
