# Проверенный промежуточный результат

03.11.2026. Это журнал выполнения, не акт завершения выпуска.

## Актуальное состояние после согласования общего ключа

Новая ревизия дизайна `88a51b4e4a3a5c8a19eda3941712c8fd424e34e4b645baf33068755e2b02984a`
закрыта тремя собственными focused QCSD проверками; реальные K1/K2 и допуск
24 code targets прошли. Подробности — в 03.5 и сохранённых gate JSON.
Прежние записи ниже отражают историю пересмотра, а не текущий запрет разработки.

Две сессии `gpt-6.1-terra` реализуют controller и SDK namespace в непересекающихся
файлах. Независимое финальное code review будет отдельным; проверка дизайна
моделью Terra не считается проверкой написанного ею кода.

Реально восстановленные Cloud/site dumps совпали с текущими строками всех девяти
таблиц сохранности: account/video/clip/payment/payment_intent/attribution/
credit_grant/video_credit_charge/credit_allocation. Для site исходные счётчики:
5 аккаунтов, 4 записи, 10 клипов, 6 платежей. Проверка копирования 24 объектов
в tests/site/ выполняется отдельно; исходные объекты не удаляются.

Подготовлены совместимые с Chrome H.264/AAC MP4 ровно 5400 и 7200 секунд;
длительности и контрольные суммы проверены ffprobe/SHA-256. Это тестовые файлы,
а не свидетельство уже завершённого Cloud pipeline.

Уточнение QT-07 по действующему core-cjm: месячный отчёт и оценки 20/30/null
принадлежат владельцу. Собственный кабинет блогера переиспользует существующий
PartnerService.dashboard с накопленными показателями; сверяются совместимые
показатели и принадлежность данных, одинаковая периодизация не предполагается.
Отдельный месячный API для блогера не добавляется.

Первый настоящий targeted прогон исправил прежние 7 wiring regression failures,
но выявил две новые проблемы: SQL bind нового January fixture и marker
в ответе MinIO. Исправления и повторные проверки выполняются; полного PASS пока нет.
Cloud/site application containers и production на этом этапе не переключались.

## История: revision pending — уточнения владельца 03.11.2026

Текущий design пересматривается: цели `cloud-c` и `site-test` доступны по SSH;
`localdevstage` исключён. Перечисленные ниже QCSD/K1/K2 и сверки двух test copies
относятся к прежнему снимку требований и не утверждают допуск новой ревизии.
Старые receipts и история сохраняются; новые prepare и три focused QCSD выполняет
root после design-ready. До них план не approved, реализация новых поправок не начата.

## Последующее решение владельца — общий ключ, только SDK boundary

После разъяснения границ владелец явно выбрал: «Нынешний общий ключ; ограничиваем
тесты в коде». Предыдущий проект non-admin key/tests/*/BucketPolicy/Cloud 403
отменён для текущего design. Общий key полностью сохраняет production-права;
новые SA/key/policy не создаются, provider-level IAM isolation не утверждается.
SDK/приложенческая namespace-граница и её реальная MinIO проверка обязательны.
Это owner exception к прежнему требованию IAM scope, а не доказательство scope.

По read-only проверке root: BucketPolicy отсутствует, CORS уже допускает c и n5
PUT, versioning disabled. Production storage settings не меняются. Cloud canary
оператор проверяет только внутри tests/cloud/ и tests/site/, без операций мутации
рабочих namespaces; 403 от общего ключа не ожидается и не требуется.

По actual Docker labels root: web/workers одного application compose project,
DB/Redis другого старого test infra project, production main отдельно. Не создавать
новые DB/Redis и не сводить projects в один. Profile должен связать applicationProject,
databaseProject/redisProject и pinned container/volume/network identities.
SQL использует имя активной test DB из application DATABASE_URL, равное binding.dbName,
и точный test DB container; POSTGRES_DB default отличается и не является источником.
Host DATABASE_URL должен разрешаться в этот DB container в test network, не main DB.

Root сообщил новую site-test sourceIdentity и live account SHA/full journal match
с реально восстановленным test.dump: 5 accounts, 28 migrations совпали. Этот новый
binding заменяет localstage как input второй цели. Это не утверждение уже выполненной
сверки всех media/payment/referral строк или namespace copy; они ещё нужны до apply.
Новых native gate receipts эта planner-сессия не создавала; codewriters приостановлены.

## Текущий checkpoint controller и регрессии — сведения root

Controller scripts/release-candidate.mjs с tests: 10/10 checkpoint на Node 22,
typecheck 0; prepare/validate/read-only inspect/source-sync. Apply/reconcile/rollback
blocked. Remote prototype в /tmp не интегрирован, fake 14+4 не live proof.
На source 71e7812 Dockerfile/health действительно build-tested 200/no-store/
immutable SHA/runtime override cannot forge. Полный suite завершился 7 failures
в 3 файлах из-за NEXT_PUBLIC_RELEASE_REVISION в wiring guard. Нужны точная build-time
классификация, wiring regression и повтор full suite; baseline full PASS отсутствует.
Ни appcode, ни infra/env/keys эта DOCS-сессия не меняла, commits не выполнялись.

## DESIGN_READY — проверка документов, не approval плана

Пересмотрены 01/02, ADR-001/002, добавлен ADR-003, уточнены 04/05/06,
README и OpenSpec proposal/design/tasks/spec. Все текущие зависимости нового
IAM key/production BucketPolicy/provider403 удалены. История прежнего design ниже.
00, .fa-state и review JSON не менялись. Планирование gpt-6.1-sol, coding gpt-6.1-terra.

Реально выполнена только форматная K2-команда закреплённого пакета:
`node node_modules/@dzhechkov/skills-feature-adr/templates/.claude/skills/feature-adr/scripts/check-plan-completeness.mjs features/cloudru-release-parity --tier=L --require-requirements`.
Exit 0: `K2 plan-completeness: PASS (0 failure(s), 0 warning(s), 1 skip(s))`;
3 ADR, 9 FR referenced, 19 targets, C4 skip — acid corpus в 00 не объявлен.
Это не native ideation approval, не существование/успех будущих tests и не полный
runtime PASS. Новые prepare/три actual focused QCSD, K1 storage-prefix/exports
и действительный checkpoint допуска coding выполняет root; writers до него paused.

Остаются: split-project/application DATABASE_URL binding proof и drift/full data
baseline; DB-whitelist/copy/size+SHA/pending multipart; реальный disk/incremental
images/archive admission и при нехватке отдельный cleanup plan; SDK/wiring code,
реальный MinIO wire/outside canary и Cloud inside-tests canary; исправление 7 failures
и full suite; интеграция remote apply/reconcile/rollback/acid; конкретное TEST shop
окно/UI-оператор/drain/native-replay-credits-referrals/drain/возврат callback;
A→B→A→B/CJM, расширенный QE/anti-drift и fresh cross-model review.

## Исторический снимок до уточнения targets и owner exception

- QCSD закрыт тремя независимыми ролями; K1 после проектного compatibility patch,
  K2 tier L с require-requirements и code-target admission прошли реальными командами.
- Четыре dump восстановлены в отдельном PostgreSQL без сети/приложений.
  Для обеих изменяемых test copies текущие полные schema journal и SHA строк
  account совпали с восстановленными snapshots. Связаны project, volume,
  PostgreSQL system identifier, DB OID/name и dump checksum; PII вне Git.
- На Cloud в disposable контейнерах с network none реально получены OOMKilled/137
  при лимите 64 MiB и ENOSPC/1 при tmpfs 8 MiB. Все семь прежних контейнеров
  сохранили IDs, image IDs, StartedAt, restart count и state; faults удалены.
  Это проверка локализации cgroup/tmpfs, не доказательство аварийного recovery runner.
- Из Git archive `71e7812b70017a3dff5c1c262233f0da90bb9901` собраны настоящие
  web и worker. В отдельной БД со схемой 28 запущен этот web: HTTP health 200,
  Cache-Control no-store, точный полный SHA. Попытка задать другой SHA в runtime
  env не изменила ответ; OCI revision и реальный container image ID сверены.
- Для регрессии подготовлены отдельные PostgreSQL 16, Redis 7 и MinIO без
  production credentials и платных provider keys. Полный прогон ещё выполняется.

## Исторические зависимости прежнего design (заменены разделами выше)

Runner: prepare/validate/read-only inspect и admission развиваются; полный
apply/reconcile/rollback и acid/QE ещё не завершены. Наличие сборки не означает
доставку на Cloud. A→B→A→B и полноценный Cloud CJM не выполнялись.

IAM read-only list вернул 403. Нужны отдельные тестовые S3 identities/buckets;
новые workers до доказательства изоляции не запускаются. Для native платежа
нужен отдельный тестовый магазин либо согласованное окно старого магазина;
действующий n5 callback самостоятельно не меняется.

Вторая test copy — текущий VPS разработки. Его прежний stage ошибочно содержал
основной public origin; новая test config должна использовать отдельный origin,
а read-only health снимается внутри его web. Эта настройка основного сайта
не касается. Production, n5, DNS и их активные сервисы в рамках этих шагов не менялись.

Закрытые operator receipts и шаблоны env хранятся вне репозитория. Их содержимое,
ключи, адреса инфраструктуры и подписанные media URL в этот журнал не включаются.
