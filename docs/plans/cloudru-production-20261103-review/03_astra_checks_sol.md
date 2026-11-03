> Публичная копия: идентификаторы инфраструктуры заменены обозначениями. SHA плана в отчёте относится к полной версии до этого редактирования.

# Перекрёстная проверка эксплуатационного ревью

03.11.2026. Reviewer `/root/cloud_plan_arch`; назначение `gpt-6-astra` — metadata, не runtime attestation. Проверен `/tmp/clipmkr-cloud-plan-ops-review.md` reviewer `gpt-6.1-sol` после собственного независимого первичного отчёта. Проект и инфраструктура не менялись, секреты не читались. Исходники перечитаны адресно; официальные Cloud.ru страницы проверены независимо. Проверка final plan будет добавлена после получения пути.

| Пункт | Вердикт | Сценарий и обязательная правка |
|---|---|---|
| OPS-01 | Подтверждено; оценка архитектурного reviewer — Critical | `instrumentation.ts:2`, `queue-runtime.ts:26`, `watchdog.ts:76,96`, `retention.ts:62` подтверждают автоматический немедленный tick и S3 erasure. Advisory lock защищает лишь одну БД. Изолировать clone/stage S3 permissions и фоновые writers до подключения final production data. Формулировка «очистить production-БД» допустима лишь после сохранённого проверенного restore artifact и отдельного явно заданного порядка; по умолчанию безопаснее новый stage volume/database без удаления старой. |
| OPS-02 | Подтверждено как риск конфигурации; не доказан текущий production defect | `ops/cloudru/Caddyfile.managed:10` заменяет XFF на remote.host и loopback; `server/ip.ts:10` выбирает length−1−hops; `shared/config.ts:73` default=2. Для двух элементов и hops=2 candidate отсутствует; при hops=1 через relay будет выбран IP relay. `billing-handler.ts:198` проверяет именно этот sourceIP. Реальный env может override hops, поэтому нельзя утверждать отказ всех нынешних запросов. В final plan нужна схема прямого/relay тракта и тесты клиента, spoofed XFF, webhook, rate-limit. |
| OPS-03 | Подтверждено как пробел инвентаризации; отсутствие живого маршрута НЕ доказано | В Git route `api/webhooks/yookassa/route.ts` есть, test-route нет. Это не доказывает отсутствие rewrite внешнего edge. `billing-handler.ts:191–200` и route подтверждают 404 при off и проверки тела/IP при включённом provider. Сообщение root о native400 и оплаченных тестах рассматривается как заявленное свидетельство, а не самостоятельно проверенный config. Обязательна read-only инвентаризация effective edge routing и target backend/shop/DB для hostname+path, сохранение ранее согласованного test endpoint; замена endpoint на n5 — только вариант, не необходимое исправление. Один HTTP400 сам по себе не доказывает доставку в правильный магазин. |
| OPS-04 | Подтверждено | `video.ts:129,144,169`, auth-store, watchdog и queue подтверждают продолжающиеся записи после запрета create. Final fence должен закрывать все ingress и фоновые writers, завершить/явно учесть multipart, delayed/deferred/rerender и pending payment. Согласовать PG/Redis, не смешивать strategy restore snapshot и requeue произвольно. |
| OPS-05 | Подтверждено | `retention.ts` удаляет реальные S3 objects; `auth-store.ts` и payment/credits/referral schema хранят изменяемую историю в PG. Старый dump не содержит новые записи. Нужны две явные rollback ветки, reverse freeze/restore и контроль совместимости digest/schema; отсутствие доказанного reverse restore означает roll-forward, а не простой DNS rollback. |
| OPS-06 | Подтверждено | Compose pgdata/redisdata и native migrator SHA показывают, что backup filename сам по себе не доказывает recoverability или совместимость. Нужно отдельно сохранить обе БД, media/config manifest и воспроизвести restore в изоляции с reconciliation ID/ledger/FK, временем/RPO/RTO. Текущая Cloud.ru dataset не заменяется поверх единственного экземпляра. |
| OPS-07 | Подтверждено; перечисленные hostname — inventory, не заранее доказанный дефект | Managed Caddy использует один host; `auth-handler.ts:10–20` содержит __Host cookie, `auth.ts:21` HMAC secret, `billing-handler.ts:89` строго проверяет Origin. Нужна матрица DNS/TLS/origin/proxy/session и сохранение production secret. Для каждого реально используемого hostname проверить A/AAAA/TTL/redirect; www может оказаться неиспользуемым, это следует установить, а не навязывать новый домен. |
| OPS-08 | Основной риск подтверждён; утверждение об обязательном Running для всякого backup требует уточнения | Cloud.ru CPU/RAM resize действительно перезагружает VM; SSH timeout не определяет причину. Правильны минимальный доступ, recovery path, backup до потенциально прерывающих действий, запрет расходов без отдельного решения. Но официальные документы дают разные предусловия для backup; см. ниже. |

## Уточнение OPS-08: конкретный путь Cloud backup

[VM guide create-backup](https://cloud.ru/docs/virtual-machines/ug/topics/guides__create-backup) говорит о статусе «Запущена». Однако [ограничения Evolution Backup](https://cloud.ru/docs/backup-evolution/ug/topics/overview__limitations) в разделе требований к ресурсам прямо допускают для создания копии статусы «Запущена» или «Остановлена» и диск «Доступен» либо «Используется». Поэтому утверждение «backup всегда только на running» слишком широкое. План должен назвать конкретный сервис/API и проверить его предусловия, отличать остановку writers от остановки VM и подтверждать готовность backup. Это уточнение не отменяет необходимости application-consistent PG/Redis backup.

[Изменение CPU/RAM](https://cloud.ru/docs/virtual-machines/ug/topics/guides__edit-cpu-ram) независимо подтверждает остановку и перезагрузку сервисов при resize. Состояние конкретной VM и факт resize данным reviewer не проверялись.

## Граница runtime-доказательств

Локально выполнен только `docker ps --format '{{.Names}} {{.Image}}'`: виден clipmkr-stage и сторонние proxy, но основной n5-clipmaker не найден в этом Docker context. Не выполнялось чтение env, секретов или произвольных чужих proxy config. У root запрошен путь/безопасная read-only команда для effective external edge блока clipmkr.ru/yookassa-test. До получения этого артефакта OPS-03 закрывать как проверенный runtime факт нельзя.

Ложноположительных основных рисков не обнаружено. Необходимы указанные ограничения формулировок OPS-02/03/07/08; все найденные проблемы относятся к готовности плана, а не доказывают уже случившуюся потерю данных или неисправность live deployment.

## Дополнение: получен артефакт текущего external edge

Самостоятельно прочитан `/tmp/clipmkr-active-edge-reviewed.txt`, предоставленный root как read-only извлечение текущей конфигурации внешнего сервера. В нём явно:

- `clipmkr.ru/api/webhooks/yookassa-test` переписывается в `/api/webhooks/yookassa` и направляется прямо в `TEST_WEB_CONTAINER:3000`;
- обычный `clipmkr.ru` идёт в `PROD_PROXY_CONTAINER:80`;
- `n5.clipmkr.ru` идёт в тот же test backend напрямую;
- test-тракты задают XFF `remote.host, local.host`; `www.clipmkr.ru` даёт 308 на canonical clipmkr.ru.

OPS-03 уточнён: владелец test-route найден на external edge, маршрута продукта в Git для этого не требуется. Недостающий пункт плана теперь — перенос/сохранение этой конкретной маршрутизации на время и после cutover с сохранением test-shop/DB принадлежности. Запрет механически отправлять test webhook в основной backend остаётся. Нельзя закрыть проверку effective hops и shop credentials одним конфигом: env backend этим reviewer не читались. Артефакт доказывает представленную конфигурацию; получение root с live сервера и факт её активной загрузки процессом отдельно в данной сессии не воспроизводились. Само наличие route больше не следует отмечать как неизвестное при учёте предоставленного runtime артефакта.
