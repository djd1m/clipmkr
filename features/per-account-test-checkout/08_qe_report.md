# Авторский расширенный QE: per-account-test-checkout

Статус: Авторские проверки завершены; требуется независимое ревью root. Автор `gpt-6.1-sol high`; это не независимый QE. Root проводит `gpt-6-astra xhigh` после настоящего host prepare. Отчёт обновлён результатами завершённых read-only команд при неизменном source freeze. Текущий полный набор: 1546 PASS, 15 существующих S3 SKIP; native Chromium/WebKit 32/32 PASS; focused124/124 PASS.

## Требование → риск → сценарий → evidence → ограничение

| FR | Риск и сценарий | Реальная проверка | Ограничение |
|---|---|---|---|
| FR-1 | Лишний доступ: A получает свой intent, B и anonymous нет | real AuthService/PgAuthStore + PostgreSQL suite; native loadWebConfig → getRuntime/getBillingDependencies → HTTP handler → PG, A201/B503/anonymous401 | Только synthetic accounts/local provider; не настоящий shop |
| FR-2 | Body/query/header spoof: account_id/email/role/testMode не меняют identity; B не читает body | `two sessions enforce test checkout before body intent and provider`: bodyUsed=false, delta intents=0, provider create/get count=0; native HTTP spoof тоже отказан | BodyUsed непосредственно измеряется в handler/PG suite, native HTTP доказывает counts/status/SQL |
| FR-3 | LIVE вместо TEST | Config off/fake/testMode=false/live-key/legacy/provider absent; `test checkout handler never bypasses live mismatch`; TEST-mode mutant RED→GREEN | Driver live — имя прежнего adapter, реальные списания не запускались |
| FR-4 | UI/API drift, потеря callback, identity leak | Одна policy SSR/POST, runtime-forwarding и missing-callback runtime tests; реальные HTML+inline Flight и непустые отдельные text/x-component по Next Link, Chromium/WebKit A/B/A; HMAC стабилен A и различен A/B | Browser test transport прозрачно подаёт Cookie/XFF, bytes не подменяет; Secure-cookie/TLS отдельно NOT RUN |
| FR-5 | Неверная/недоставленная env открывает покупки | undefined (явный delete), empty, malformed/uppercase/whitespace/list/email/wildcard; cross-field startup отказ; readEnvironment→loadWebConfig; реальный synthetic compose только web; AM-5 negative missing key | Ошибки не включают UUID/key; private overlay не применялась |
| FR-6 | Дубли provider/grant, потеря старой оплаты при отзыве | Sequential retry и controlled overlap: один intent/key/payment/grant; revoked requery.test=false400 + delta event/payment/grant=0, затем TEST success1 и duplicate0; native restart с отозванным UUID завершает старый intent | HTTP create attempts могут быть >1; fixture не доказывает ЮKassa TTL |
| FR-7 | Изменение UI/ролей/баланса самим допуском | Existing UpgradeScreen/CSS не менялись; SSR actual buttons с валидными purchaseWindows; SQL до оплаты без новых credits/owner/paid; прежние stale-success/failure account-remount browser tests | Ручная owner/shop и deployment приёмка root остаётся отдельно |

## Команды и результаты

Node22 `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin`. Полные массивы argv, exit, duration и SHA-256 каждого текущего лога находятся в 07_code_changes/author-handoff.json. Профиль существующих isolated PG/Redis загружается без печати; S3 opt-in выключен. Никаких новых containers/MinIO/docker build/prune.

| Проверка | Наблюдение |
|---|---|
| `focused-am5-current` | exit 0, SHA-256 `baf98fddbb0918cd8ec2d6c72d9b9b7847b173721e2f5a8904f2553bdb62e917`; `focused-am5-current.log` |
| `full-current` | exit 0, SHA-256 `f57c66241708f5fe14771a503aeab57d89d14dd29a6f5595cd5011db5205e074`; `full-current.log` |
| `native-current` | exit 0, SHA-256 `ab4c7f17c7bb0d5b889d620c7cd729226772188aedda129546b92c3cff81f8f3`; `native-current.log` |
| `typecheck-current` | exit 0, SHA-256 `1b4b658aae5b9ff1fab2830785a99fb6149f6727dcfc8485f493c745a36ffc13`; `typecheck-current.log` |
| `lint-current` | exit 0, SHA-256 `03d26c6ef0841b6eac1a8fb620e782e15d97a1f4467dc4566747082c86361443`; `lint-current.log` |
| `build` | exit 0, SHA-256 `43666b5b817c646ab52671c9a83ef441b05620d153a830570d480da62c073941`; `build.log` |
| `env-wiring-current` | exit 0, SHA-256 `f956a290389dea838a726f2684522dc3e3342edcd471572b4a720bd03c1c21a7`; `env-wiring-current.log` |
| `diff-current` | exit 0, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; `diff-current.log` |
| `openspec-validate` | exit 0, SHA-256 `1780d1bc5d8c2ee69907a028379eb1dd04b16fe8dc09bf0b4fdf44f6fd88cc4a`; `openspec-validate.log` |

Первая полная попытка: `full-test` exit1, 1537 PASS/8 FAIL/15 SKIP; пять failures у synthetic wiring fixture и три у clip-music-choice потребителя общей fixture. Root согласовал AM-5 после независимой scope-проверки и K2; общий fixture изменён только после повторного literal context/admission. До изменения commonfixture `shared-fixture-am5-red` дал9FAIL/31PASS; это настоящий RED восьми исходных failures и нового missing-key control. Промежуточный `full-final` exit130 прерван до AM-5 и не является итоговым evidence. Текущий `full-current` запускается на frozen source.

Два настоящих full Next build (`build-raw-key`, `build`) прошли. В build есть прежнее предупреждение optional @valkey/valkey-glide от BullMQ; сборка завершилась exit0, dependency не устанавливалась. После последнего build production source не менялся; последующие AM-5 изменения затрагивают только тесты/общую synthetic fixture. Ни build, ни local fixture не считаются настоящим shop E2E.

## Реальные фальсификаторы

Изолированная копия из private mutations.private.json имеет те же изменяемые исходники; после каждого дефекта файл восстановлен и тот же сценарий выполнен GREEN. Основное дерево проверено hash-ами и не мутировало. Это семь адресных проверок, не общий mutation score.

| Дефект | Итог | RED receipt | Restore receipt |
|---|---|---|---|
| `exact-account` | RED→GREEN | exit 1, SHA-256 `6e4e491d83bef6b1579985e0e3cd4a51cc8f20dff06460d66c5451364d3c53f4`; `mutant-exact-account.log` | exit 0, SHA-256 `3090c6c5de40cafcf2f544cf351f2af5e0dd1d185f3c072200dfc13772cb61ee`; `restored-exact-account.log` |
| `test-mode` | RED→GREEN | exit 1, SHA-256 `67d9d6d92d4cb560b4a9ac45f81827eee31777e5a2fcf3a89d41f9c4cdf556a2`; `mutant-test-mode.log` | exit 0, SHA-256 `9d7fe706beafe928d96d9ccb3a488856a9d8411170a5668a23582d9800a88a9f`; `restored-test-mode.log` |
| `ssr-policy` | RED→GREEN | exit 1, SHA-256 `c61099b0ac21e9eb2240ce3751527cf04d22d1ff13bc86fc8407ffd569a5e0c8`; `mutant-ssr-policy.log` | exit 0, SHA-256 `2a1416499937b81e9edea6f712b0ca8ecc9965d212f4e286765ddd8fc7461cf0`; `restored-ssr-policy.log` |
| `runtime-callback-v2` | RED→GREEN | exit 1, SHA-256 `1556ad7f30cc37180d5ab46eebc0e6c2661045db3b1b8be6c10899609fcf94fa`; `mutant-runtime-callback-v2.log` | exit 0, SHA-256 `853df2d516ab6e374030f49dfde233864f47d15a795f346b73ebd81155ef2cb7`; `restored-runtime-callback-v2.log` |
| `webhook-test` | RED→GREEN | exit 1, SHA-256 `47a170201f9c7f83e5ef04a3173bff7b82367a970c8345d61366c4ed683c2c6a`; `mutant-webhook-test.log` | exit 0, SHA-256 `640a50baefdd98652a8baebee0cc1afd4c2098bed148489ab6660f5e55261be8`; `restored-webhook-test.log` |
| `provider-key` | RED→GREEN | exit 1, SHA-256 `eed7ed75444565d4025b5ea8bfaaa7f7acda26ce3212ff4e74126ffb313deef7`; `mutant-provider-key.log` | exit 0, SHA-256 `25647767a7723b57607d3d91afee094a8c5b7e4d4675ebad05b2ba7f6870e886`; `restored-provider-key.log` |
| `provider-duplicate` | RED→GREEN | exit 1, SHA-256 `9f5ce03d87be212023e85da371dc45d99320ec5419957b293348f21a327d5b72`; `mutant-provider-duplicate.log` | exit 0, SHA-256 `7cacb2047eaf71064fbc39bda3f46d63903dbb5556fe3e2c3167924c73302823`; `restored-provider-duplicate.log` |

QT-001 exact обратная мутация на frozen AM-5 копии: raw UUID key → full Next build → `raw-key-mutant-native` (ожидаемый exit1 на privacy), восстановление HMAC → full Next build → `raw-key-restored-native` (ожидаемый exit0). Фактический статус: RED→restoreGREEN; receipts/hash обеих сборок и обоих прогонов в handoff JSON. Основной sourceSet не меняется.

QT-001: `native-raw-key-red-4` exit1 на реальном HTML, synthetic UUID встречался один раз именно в serialized React key; raw-key-proof.private.json содержит путь и SHA HTML. Ошибки первых трёх попыток были только настройкой loopback/public origin/preflight и не доказывают privacy. HMAC применён после воспроизведения. После исправления native suite проверяет три direct HTML и минимум три непустых Flight response в каждом engine, фактические enabled/disabled controls и отсутствие UUID/key/email/common escaped forms в ответах/props/logs. Существующая account-remount regression проверяет delayed success и failure даже при игнорировании abort.

## Протоколы QE и code/spec anti-drift

Применены `code-impl`, `studio-extended-qe` и риск-выбранные методы shift-left, risk-based/testing boundaries, contract/security, regression, mutation и evidence honesty. Использовались host Vitest/Playwright/TypeScript/реальный PostgreSQL/Redis/local HTTP. AQE runtime/агенты/инсталляция, внешние DAST/S3/provider проверки не запускались. Прочитан code-critic для авторского self-check; независимым ревью это не является.

sourceSetDigest `471b3c3a69e711f43f81f07b847f360e720fa8cf1905095390307fcb135a01e5`. Все24 source targets с hash и17 changed files находятся в handoff JSON; семь immutable semantic dependencies совпадают с HEAD. Требования/ADR/архитектуру автор не менял; AM-4/AM-5 план менял только root. Последний coder context `eb8f2de14326291a178012e5bd281c1cfcb10dda36e9dee327c9c72efe10e3d2` совпал побайтно, admission получен настоящим pinned checker. OpenSpec delta SHA `1c8457610d97f282cea1d55f1f641f983c0798ee813a1cd7483f78926a3c5b6e` соответствует requirements-revision.json, FR и приёмочные границы не переписаны под код. Политика осталась session-only + TEST-only + единая SSR/API + no duplicate grant.

Изначально повторный admission дал admitted942f54d1… вместо переданного78bc8fb…; это явно сообщено root до реализации, literal context при этом совпал. Причина расхождения не утверждается. После разрешённых AM-5 gates получен новый фактический admitted363d018f…; финальный measured manifest digest `7d0032817aeed2d95acf812475dcba4ff07b4ac79135b06dde39a916630fba2e` не является самостоятельной QE-квитанцией.

Подтверждённый lesson записан только после native RED/GREEN: pinned dz teach --project /home/clipmkr --no-mirror, ID teach:ef4c120ef7d89cb8. Фактический teach прочитан, повторный recall вернул новый security lesson. Применение — полный HTML/Flight falsifier вместо одного renderToStaticMarkup и сохранение remount regression.

## NOT RUN и границы

Настоящий TEST shop и live charges, owner/manual приёмка, deployment/private overlay/Cloud.ru/DNS, реальные аккаунты/пароли/роли/credentials, commit/push — NOT RUN по заданному scope. 15 existing S3 SKIP полного набора не PASS. Native loopback не доказывает production TLS/Secure-cookie; account Cookie/XFF подаются прозрачным test transport, публичный synthetic HTTPS origin нужен действующему returnUrl guard. Native privacy относится к /upgrade HTML/Flight/props; существующий dashboard/upload account scope этой фичей не изменяется. Local provider oracle не доказывает 24h TTL и реальный магазин. Отдельные performance/load/chaos/WCAG сертификация и external vulnerability audit не проводились: новый путь использует прежний provider/SQL/UI, проверяются согласованные auth/config/ledger границы. В рабочей копии нет CI workflow/.gitlab-ci.yml; CI-parity ограничена реальными package scripts и явно заданными user commands, новые browser tests выбираются vitest.browser.config.ts отдельно от npm test.
