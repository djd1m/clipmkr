# Финальная проверка плана v3: эксплуатационные границы

Дата: 03.11.2026. Сессия `/root/cloud_plan_ops`; запрошенная модель `gpt-6.1-sol` — metadata назначения, не runtime attestation. Проверен `/tmp/clipmkr-cloudru-production-plan-v3.ru.md`.

**SHA256: `b414bf99cb99d9b8f24b8473522de567571ecaf7451a0ffd0999d6bd5b44cb8c`.**

Входы: первичные исходники/документы, собственные OPS01–08, независимые A1–A7 и их crosscheck, новый `/tmp/clipmkr-active-edge-reviewed.txt`, текст v2 и минимальная delta v2→v3. Live Hub результаты приняты как предоставленные координатором read-only свидетельства; мной повторно API не вызывался. Облако/проект не менялись, секреты не читались.

## Вердикт

**BLOCKING-пробелов текста в проверенной области не осталось.** План пригоден как документ для отдельного согласования и подготовки исполнимого runbook. Он явно запрещает исполнение до закрытия фактических STOP gates; это не GO на миграцию, resize, расходы или изменение DNS.

## Матрица OPS

| Finding | Закрытие в плане | Статус текста |
|---|---|---|
| OPS01: clone retention→production S3 | G2 требует отдельные бакеты/IAM/Redis, restore-only без web/worker, negative canary, финальный prod только после fence | Закрыто |
| OPS02: XFF/relay/webhook IP | §5 прямо объясняет потерю IP managed Caddy и недостаточную default chain, требует отдельных прямого/relay трактов, allowlist proxy и spoof/IP/webhook проверки | Закрыто проверяемым gate; actual config ещё не готова |
| OPS03: неизвестный test route | Новая live edge выдержка подтверждает handle `/api/webhooks/yookassa-test`, rewrite в native route и test backend; §5 требует сохранить публичный маршрут и подготовить межсерверный доступ к test на VPS | Закрыто; первичная неопределённость разрешена новым доказательством |
| OPS04: неполный freeze | P3/P4 и freeze/drain/fence включают auth/reset, multipart, retry/delete, guest/referral/operator, webhook и фоновые процессы; контролируются незавершённые PUT и возраст attempts | Закрыто |
| OPS05: rollback после записей | §7 разделяет R1/R2, относит фоновые/control writes к R2, запрещает потерю новых данных старым snapshot и требует reverse restore/compatibility либо roll-forward | Закрыто |
| OPS06: backup→restore | §4 задаёт artifact manifest, обе БД, roles/passwords, фактический Redis persistence, native migrator, reconciliation до writers и внешний backup | Закрыто |
| OPS07: DNS/TLS/origin/cookie | §5 задаёт A/AAAA/TTL/canonical/TLS SNI и Host, production origin/secret, host-cookie, HMAC/CORS, прямой/relay matrix | Закрыто проверяемыми gates |
| OPS08: доступ/resize/snapshot | G0 требует штатный доступ/аварийный путь/inventory; §7 требует backup/restore перед resize и выбор конкретного Backup сервиса/API с фактическими предусловиями | Закрыто; vm_exec sessionguard корректно отделён от SSH timeout |

## Матрица архитектурного ревью

| Finding | Закрытие | Статус |
|---|---|---|
| A1 | G2 + fence старых writers; отсутствие трафика не считается изоляцией | Закрыто |
| A2 | Полный freeze и сохранение production bucket/key/upload_id; pending callbacks и direct PUT отдельно | Закрыто |
| A3 | G1 сохраняет обе БД отдельно и требует решения о Cloud.ru dataset до замены | Закрыто |
| A4 | §4 запрещает Suspended по текущему коду, требует реальный lifecycle/IAM/inventory и не объявляет условный showcase ущерб фактом | Закрыто |
| A5 | §5 сохраняет SESSION_SECRET, прежнюю host-session, referral cookie и guest-file HMAC tickets с TTL | Закрыто |
| A6 | Digest/journal/migrator/reconciliation, признание ограничений старого migrator и rollback compatibility | Закрыто |
| A7 | Выбранный проверенный Redis способ, multi-part persistence, все DB/queue states и stalled gate | Закрыто |

Прочитаны оба crosscheck: `/tmp/clipmkr-cloud-plan-ops-crosscheck.md` и `/tmp/clipmkr-cloud-plan-arch-crosscheck.md`. Они не меняют эти результаты: условность A4, guest/referral HMAC, PG roles/physical password, Redis AOF и уточнения OPS02/03/07/08 отражены в v3. Чужие сведения о runtime рассматриваются с указанными в них границами доказательства, а не как воспроизведённые мной проверки.

## Особые проверки

**DNS/TLS/IP.** Одной записи A недостаточно, и v3 этого не предполагает: требуется AAAA inventory, сертификат до cutover, renewal обоих TLS endpoints, правильный SNI/Host, доверенная relay chain и отсутствие fallback старого приложения. Конкретную выдачу сертификата и Caddy-конфигурацию ещё предстоит спроектировать/проверить в P2; их отсутствие сейчас является открытым execution gate, а не обещанием готовой инфраструктуры. В реализации нельзя использовать upstream по публичному clipmkr.ru без доказательства отсутствия DNS relay loop.

**Webhook preservation.** Live excerpt действительно подтверждает внешний test handle на clipmkr.ru и штатный native rewrite; отсутствие Next test-route было корректной первичной границей знания, а не доказательством отсутствия webhook. Новый edge обязан направлять этот handle к тому же test dataset/shop на VPS через реальный доступный upstream, с корректной IP цепочкой. Docker DNS старого хоста не переносится, это явно учтено. Такой маршрут нужен и на старом, и на новом публичном пути во время DNS convergence; текущая таблица «до/во время/после» и проверка межсерверного пути покрывают это обязательство. Main off остаётся off, 404 не маскируется как успешный callback.

**RPO0 и rollback.** Это предложенная цель, а не доказанная гарантия. R1 допускается только при доказанном отсутствии любых новых production PG/S3 изменений, включая фоновые: возвращается исходное согласованное состояние; истёкшее время и прямые S3 PUT требуют инвентаризации, а не слепого возврата snapshot. R2 сохраняет последнюю принятую историю после нового freeze/fence, возвращает полное актуальное PG/Redis/media состояние и проходит reconciliation; при недоказанном reverse restore план выбирает roll-forward. Так RPO0 не достигается ценой утраты новых аккаунтов/оплат. Любые контрольные записи включают R2. Сроки измеряются отдельно, не обещан одновременно мгновенный возврат DNS и отсутствие потерь.

**Состояние ВМ для Backup.** Мой первичный отчёт цитировал VM guide с running. Новая версия корректно фиксирует конфликт/различие документации и не превращает эту цитату в универсальное требование. Перед операцией выбирается конкретный сервис/API и проверяется его актуальная precondition, отдельно от остановки writers/контейнеров. Это достаточное закрытие как плана; фактический выбор метода и разрешённого VM-state ещё должен стать частью execution runbook. Не следует по этому ревью останавливать/запускать ВМ ради backup.

## Фактические открытые STOP gates

- Штатный доступ к ОС/maintenance session и аварийная консоль, inventory ресурсов/свободного диска и всех writers.
- Две проверенные backup, решение по Cloud.ru dataset, изолированный restore и reverse restore, согласованные роли/права и digests.
- Реальные S3 IAM/lifecycle/versioning/CORS, перенос test dataset на отдельный bucket без production permissions.
- Конкретные TLS/direct/relay/XFF и test-webhook upstream, проверенные до cutover.
- Reconciliation/CJM, budget/resource gates, численные окна/RPO/RTO и GO/STOP owner.

Они прямо запрещают старт до закрытия. Их нельзя закрыть наличием этого отчёта.

## Ограничения

Это статическое ревью плана и предоставленной edge выдержки, без выполнения restore/CJM/rollout и проверки текущих секретов/содержимого БД. Cloud.ru API/SSH мной не перепроверялись. Документ не является разрешением на изменения. Вне моего scope остаются детали полного продуктового CJM, проверяемые отдельным архитектурным reviewer.

## Проверка окончательной delta v2→v3

Прочитан полный diff: добавлены freeze по фактическим изменениям независимо от HTTP-метода, фиксированный IP/независимое имя relay upstream с основным Host/SNI и проверкой сертификата, запрет DNS proxy-loop, inventory support/helpdesk и защита его БД/доступа/секретов от превращения в stage dataset. Эти изменения закрывают последние неблокирующие уточнения и не расширяют разрешение на перенос: судьба helpdesk решается отдельно, другие проекты VPS не переносятся. Live edge действительно содержит отдельный `support.clipmkr.ru` upstream, что обосновывает inventory зависимости, но не доказывает конкретную нынешнюю DNS CNAME запись. V3 требует её проверить и не утверждает её наличие. Новых блокирующих замечаний нет; матрица закрытия и открытые фактические STOP gates остаются действительными.
