# Проверка реализации согласованного интерфейса

Статус: проверка выполняется. Полный feature GO не выдан. Разрешённая следующая цель — ограниченная тестовая выкладка web на https://clipmkr.ru после закрытия замечаний к исходникам и тестам. Cloud.ru требует ручной приёмки владельца.

## Предмет проверки и реальное исполнение

Выполнены настоящие проектные K1/K2, admission и plan checkpoints, описанные в07_gate_admission.md; base-ref153a9cd7d14d89776ab38bd83b04594bcb421d50 сохранён. Авторские задачи A/B/C, maintenance AM-6 и исправления ревью выполняли отдельные Codex CLI с запросом модели gpt-6.1-sol high. В каждый исходный prompt действительно включён полный успешный literal promptBlock действующей ревизии, а не только его hash. Операционные JSONL/PID/prompt hashes и результаты находятся вне Git в закрытом каталоге. Это свидетельство запуска с requested моделью; независимая runtime attestation модели недоступна.

Независимые quality/risk/testability роли запущены как gpt-6-astra xhigh в отдельных сессиях, изначально только с требованиями/ADR/архитектурой/планом. Свои отчёты они пишут самостоятельно. Это согласованный владельцем cross-model, не cross-family. Их начальная проверка исходников не объявляется закрытым native QE или fleet gate задним числом. Native full-QE convergence ещё не закрыт.

Переиспользованы действующие Uploader/uploadParts, remainingLimits, ClipCard/VideoDetail, UpgradeScreen/checkout, native details, React state/cache, Next Link и Playwright. Новых runtime-пакетов, API, схем БД и параллельных реализаций этих блоков нет.

## Требование → риск → проверка → наблюдение → граница

| Требование | Риск и фактическая проверка | Наблюдение | Граница |
|---|---|---|---|
| FR1/FR2, AM1 | Вместо композиции снова получилась оболочка: mounted actual upload/result/plans, именованные области, отказ на legacy body | Исходный авторский браузерный прогон16/16; независимый исходный82/82 вместе с upload lifecycle | Окончательные исправленные тесты и published matrix ещё проверяются |
| FR2/FR3, ADR003 | Ложный прогресс, потеря File/частей при preferences: native chooser, реальный slice receiver, ack-tail/duplicate/out-of-order/abort/reload | Автор A:30/30focused и66/66 Chromium/WebKit lifecycle; независимый82/82 подтверждает этот snapshot | Controlled transport; фактическая загрузка на новом опубликованном artifact выполняется отдельно |
| FR4/FR6, ADR002 | Пересоздание активного player: настоящий native media, второй клип, два polling ticks, рост currentTime, paused nonzero | B:85/85focused, C:16/16browser на соответствующих байтах | Поведение реального опубликованного player и selector каждого клипа проверяется отдельно; cloneNode mutant не доказывает React key=layout mutant |
| FR5/FR6/FR7 | Поздняя оплата A перенаправляет аккаунт B после реального remount | Независимый Chromium RED; добавлены AbortController+mounted+attempt guards после fetch/json и перед состоянием/навигацией. Независимые исходный probe и12case Chromium/WebKit StrictMode стали GREEN | Тестовый transport, без настоящего платежа; финальный delayed-success oracle отдельно исправляется |
| FR5 | Условия спрятаны, ошибка выше заголовка: visible DOM и реальные bounds обеих layouts | Независимое R2 закрыло оба замечания: условия рядом с CTA, ошибка после CTA | Не подтверждает готовность магазина или доставки webhook |
| QC-CONTENT, AM2 | Потеря четвёртой карточки/длинного текста:0/1/4 и160символов/80безпробельных, hide-fourth/clip-text controls | Mounted browser controls содержательны; для published подготовлены отдельные реальные аккаунты и визуальные записи | Визуальные метаданные синтетические, не выдаются за provider pipeline |
| QC-PALETTE, AM3 | Геометрия верна, но снова синий UI: computed actual role colors и blue mutants | Исправлен ошибочный oracle secondary Montage-ready; независимое R2 закрыло исходное замечание | Исправление mobile16rem oracle проверяется отдельно; required published paired review ещё впереди |
| QC-ORIGIN, AM5 | Перепутан сервер: точный origin/IP/project/container/image | Цель06: clipmkr.ru/194.85.249.105/n5-clipmaker. Свежие identity/config/data checks обязательны непосредственно перед apply | Этот документ не заменяет SSH/DNS/inspect witness |
| AM6 | Удаление ссылки или включение запрещённой оплаты стало незаметно после смены markup | Отдельный автор:7/7 и46/46; три изолированные мутации дают именованный RED; перестановка атрибутов остаётся GREEN | Source guard, не подмена mounted checkout tests |
| QC-QUOTA, AM4 | Label90/120/override есть, но серверный лимит не проверен | 5400/5401/7200/9000/9001 с настоящими providers остаются отдельной обязательной приёмкой. Исторический фактический5401s отказ зафиксирован у backend feature | Новый155s проход и старые boundary-baseline не закрывают эти строки |

Основные команды: `npm test -- <именованные файлы>`, `npm exec vitest -- run --config vitest.browser.config.ts <именованные browser файлы>`, `npm run typecheck`, `npm run lint`, `git diff --check`. Конкретные команды/время/байты собственных независимых прогонов:08_quality_review.md,08_risk_review.md,08_testability_review.md. Числа разных прогонов не складываются в выдуманный общий охват. Deselected из-за `-t` не называют выполненными тестами. Неудачные начальные проверки и их причины сохранены.

## Сохранность данных для тестовой выкладки

05.11.2026 перед подготовкой визуальных данных снят новый pg_dump:1105599bytes,SHA2562d00c0ab1044c02fe6939efe966f98aee73012d9e070435c554eac816c7d1b16. Проверен полным pg_restore в отдельную временную БД того же тестового кластера:26таблиц/600строк совпали по строковым SHA-256; volatile session исключена. Временная восстановленная БД удалена, новый контейнер не создавался.

Затем через настоящую регистрацию созданы3отдельных тестовых аккаунта. Добавлены только их5синтетических визуальных записей/5клипов;10media/thumbnail объектов скопированы и повторно прочитаны с проверкой SHA-256 под уникальными tests/site/mockup-ui-20261105/ ключами настоящего S3. Исходные600строк26таблиц повторно совпали; существующие аккаунты/записи/клипы не изменены. Эти записи предназначены для0/1/4/long-text визуальной матрицы; они не являются доказательством генерации. Настоящий provider E2E использует другую фактическую загрузку.

## Code/spec anti-drift

- FR1–FR8/ADR001: меняются тела трёх экранов в двух согласованных компоновках; настройки/аккаунт/гостевой пакет/CTA остаются существующими mounted disclosures. Кабинет по умолчанию, обе темы и обратимое переключение сохранены.
- ADR002: один keyed roster, выбор по clip id, прежний player остаётся владельцем состояния при preferences/polling. Выбор пользователем другого клипа отдельно останавливает предыдущий; автоматического play/seek при preferences нет.
- ADR003: показываются только подтверждённые уникальные multipart bytes; промежуточный v2 manifest не объявляется завершённым. Ошибки/пауза/повторный выбор/возобновление остаются отдельными состояниями.
- ADR004: pinned исходные HTML не менялись; stale синие PNG не стали источником палитры. Точные computed colors проверяются независимо от geometry.
- Серверные права/ownership/SQL/лимиты/цены/credit policy/payment mode/webhook/провайдеры/Cloud deployment не меняются этой UI-дельтой. Нельзя назвать выключенную продажу успешным checkout.
- Общий React.cache reader использует account как ключ и существующий remainingLimits. Реальный request-level SSR read-count/cross-account cache proof отдельно не выполнен; mock cache не выдаётся за него.

## Остаток и ограничения

Нужны окончательные независимые source/test admissions, канонический web build/image из точного Git SHA, app-only apply с сохранением DB/Redis/proxy/workers/config, опубликованная432матрица и независимый paired visual review, реальный upload→pipeline→play/download, оставшаяся core-CJM/границы/оплата/referrals/fleetQE и ручная приёмка владельца. Браузерные component fixtures не называются настоящим Next/provider/payment E2E. Автоматическая axe-проверка не является сертификацией WCAG. Полный feature/native QE/fleet gate и перенос Cloud пока не закрыты.


## Окончательный допуск исходников05.11

На29target bytes измерен freeze SHA25668ba189b05f6832c7883c8d2d5581fbf8ed948f8fd67b1e4de32b8fa42e2b131 (compact canonical JSON списка path/sha256). Все три независимых роли самостоятельно сверили29/29 и выдали limited SOURCE GO; это разрешение на уже согласованную тестовую web-выкладку, не полный feature GO. Quality F1–F4 и risk RISK-01/RISK-02 закрыты собственными повторными проверками первоначальных ролей. Mobile reference oracle исправлен по неизменённому HTML: исходные8ложных FAIL устранены,144/144 self-check PASS; desktop ceiling и ratio остаются проверяемыми.

Координатор на этом freeze реально выполнил плановый объединённый прогон11файлов:125/125PASS,90.89s, начало06:06:07UTC; npm run typecheck exit0; npm run lint exit0; git diff --check exit0. Свежий actual check-code-targets:admitted20d3e3be3c8fb820eab36be5b9fc9c6b71c799e79d9ef46e00e12e8777911a80,exit0,reasons пуст.

Окончательные независимые команды/слои сохранены в трёх08отчётах. В частности, testability выполнила22/22browser,55/55unit и144/144originalHTML checks. Её отдельный lifecycle filter дал13PASS/1FAIL/52deselected: однократное чтение progress DOM после network count допускает race с React commit. Повтор без изменения source:2/2PASS/64deselected. Это подтверждённый MEDIUM flaky oracle, не установленная product неисправность; bounded DOM poll оставлен отдельным test-only улучшением. Нельзя называть это доказательством отсутствия flakiness. Также остаются пробелы selector reachability mutant, настоящего React key-remount mutant и настоящего SSR cache readcount, явно описанные testability.

Два последних внешних author CLI были завершены TERM143 до terminal handoff. Причина не установлена; их запуск не переименован в completed. Координатор проверил отсутствие writer PID, забрал ownership и установил freeze; допуск основан на последующих реально выполненных собственных и независимых проверках окончательных байтов. Предыдущие RED/20из22 и частичные author-логи сохранены. Это не формальное nativeQE закрытие и не выдуманный terminal receipt.
