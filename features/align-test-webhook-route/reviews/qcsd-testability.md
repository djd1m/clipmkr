# Независимый QCSD ideation: тестопригодность TEST webhook

Дата 05.11.2026. Вердикт роли: **CONDITIONAL**, три структурных условия HIGH открыты. Это оценка только дизайна, не допуск к реализации или применению; общий verdict QCSD принадлежит координатору после остальных ролей. Оценка 68,1/100 — среднее десяти обоснованных эвристических оценок, не процент покрытия и не результат тестов. В модуле 03.5 диапазон 40–79 соответствует CONDITIONAL. Ни одно условие не закрыто этим отчётом.

Независимая свежая сессия, без истории кодирования и прежних авторских/чужих reviewer verdicts. Запрошены `gpt-6.1-terra xhigh`; механизм, удостоверяющий фактический model ID и effort, этой сессии не предоставлен, поэтому фактические ID/effort здесь независимо не подтверждены. Автор дизайна заявлен `gpt-6-astra xhigh`, будущий автор кода `gpt-6.1-sol high`; различие моделей нельзя считать технически удостоверенным одной этой записью. `owner-exception` — назначенная host family, а не заявление о cross-family. Других агентов не запускал.

## 10 принципов тестопригодности

| Принцип | /100 | Дизайн и ограничение |
|---|---:|---|
| Наблюдаемость | 65 | Предусмотрены SHA/inode, health, identity и ledger delta; связь конкретного TEST платежа, callback и каждого изменения прав ещё недостаточно определена (TST-03). |
| Управляемость | 60 | Есть candidate и temp fixtures, ограниченный аккаунт и preflight; доступность реальных repeat/failed/cancel исходов не установлена и не должна имитироваться. |
| Разложимость | 78 | Один fragment, один test, три READ-ONLY owner и отдельный оператор позволяют разделять проверки; фикстурная state machine не доказывает поведение оператора. |
| Простота | 75 | Один upstream без миграции и сети; сохранение inode требует аккуратного неатомарного fd write и recovery. |
| Стабильность | 60 | SHA/inode under lock и validation уменьшают drift; прерывание посреди write/truncate/fsync и recovery остаются недостаточно определены (TST-01). |
| Информация | 67 | Есть scoped bytes, binding inputs, source/candidate hashes и отдельные private evidence; фактический executor и свежие runtime identity ещё отсутствуют. |
| Коммуникация | 73 | FR и Acid привязаны к ожидаемым отрицательным случаям; нужно уточнить доступный оракул конкретного платежа и прекращение при нехватке свидетельств (TST-03). |
| Связь с предыдущей работой | 70 | Повторное использование handler/IP/config и текущего proxy; старые артефакты и fixture сами по себе не доказывают актуальный store или trust chain. |
| Время | 55 | Последовательные независимые gates и настоящий provider CJM имеют внешние зависимости; фиксированного достаточного времени или доступности повторной доставки не доказано. При нехватке — NOT VERIFIED, а не PASS. |
| Ответственность | 78 | Называются оператор, координатор и независимый reviewer; фактический частный исполнитель ещё не написан и путь от проверенных bytes к исполняемым требует точного оракула (TST-02). |

## Условия для исправления и повторной независимой проверки

**TST-01 — HIGH, structural: частичная запись и прерывание.** [05_architecture.md:20](../05_architecture.md) задаёт сравнение и привязку файла, а [06_implementation_plan.md:15](../06_implementation_plan.md) и [06_implementation_plan.md:41](../06_implementation_plan.md) называют инъекцию ошибок validate/reload/health и ошибку после записи. Не определён наблюдаемый исход короткой/неполной записи, ошибки truncate/fsync или гибели процесса в процессе перезаписи bound inode. Это пробел контракта, а не доказанный runtime дефект. Уточнить обработку синхронных сбоев и отдельный безопасный порядок обнаружения незавершённой операции после потери процесса: запрет считать конфигурацию применённой, отсутствие reload непроверенных bytes, восстановление из проверенного backup тем же inode либо STOP/инцидент, если безопасное восстановление не подтверждено. В изолированной временной фикстуре задать отрицательные проверки short write, write/truncate/fsync failure и прерывания с проверкой итоговых bytes/inode и порядка validate/reload; различать их от фактического доказательства поведения частного оператора. Никакой инъекции отказа в рабочий edge не требуется для закрытия design-review.

**TST-02 — HIGH, structural: связывание проверки с исполняемым оператором.** [05_architecture.md:20](../05_architecture.md) связывает fragment с полным файлом и требует проверки исходного SHA; [06_implementation_plan.md:15](../06_implementation_plan.md) и [06_implementation_plan.md:53](../06_implementation_plan.md) требуют source review и точный SHA будущего executor. Однако не задана проверяемая связь независимо просмотренных bytes с теми, что реально исполняются, включая отказ при подмене между проверкой и запуском. В дизайне зафиксировать способ передачи/проверки исполняемого артефакта на границе запуска, отказ при несовпадении и приватную фиксацию reviewed/executed SHA; binding должен охватывать исполняемые зависимости, если они определяют логику изменения. Отрицательный сценарий: после review подменён executor или исполняемая зависимость — запись не начинается. До реального независимого review фактического executor и evidence его binding apply остаётся закрыт; проверка отдельной mock state machine этот gate не заменяет. Способ выбрать без добавления новых repo WRITE targets.

**TST-03 — HIGH, structural: связанный oracle provider → main ledger → права.** [01_requirements.md:15](../01_requirements.md) и [01_requirements.md:16](../01_requirements.md) требуют правильный store, один grant и отсутствие двойного grant, а [06_implementation_plan.md:18](../06_implementation_plan.md) упоминает ledger delta и настоящий provider. Нет явного требования связать конкретный созданный main checkout payment с provider outcome, полученным и обработанным callback, before/after начислениями в main store и состоянием прав после re-login; отдельные несвязанные наблюдения либо один return URL могли бы выглядеть успешными. Уточнить минимальный приватный корреляционный evidence и критерии отрицания: тот же TEST payment/аккаунт, подтверждённая обработка в main store, единственный положительный grant; для реально доставленного duplicate — нулевой дополнительный delta; для реально наблюдаемого fail/cancel — нулевой grant; подтвердить, что предъявленный результат относится к main, а не legacy store. Не публиковать идентификаторы и секреты. Если независимая доставка повторного события или нужный исход TEST provider недоступны, отметить соответствующий сценарий NOT VERIFIED и не выдавать mock за интеграционную приёмку. Этот сценарий не предполагает существования конкретной функции повторной отправки у провайдера.

## Границы доказательств и будущие проверки

- Candidate: 1 замена upstream, exactBefore/exactAfter по одному разу, все остальные bytes включая alias/rewrite/XFF равны. Негативные примеры: legacy upstream, второй изменённый блок, spoofed XFF/trustedProxyHops, stale source SHA/inode, недоступный существующий proxy. Native chain и применимый provider IP требуют отдельной фактической проверки; вымышленный сетевой результат не годится.
- Только `deploy/test-webhook-route.caddy` и `tests/test-webhook-route.test.ts` — будущие WRITE; `apps/web/src/server/billing-handler.ts`, `apps/web/src/server/ip.ts`, `packages/shared/src/config.ts` — READ-ONLY inputs. Repo fixtures и fake provider дают лишь локальную отрицательную проверку, а не доказательство реального store, executor, Caddy или оплаты.
- Перед применением остаются независимые QCSD/security и установленные проектом gates, K1/K2 на актуальных bytes, source review реального executor и его binding, приватный backup/validate и свежие network/store/XFF/isolation checks. После допуска — только существующий edge и утверждённый TEST account при global=false/test=true/test_ key; иначе STOP. Провал rollback — инцидент. Полный настоящий TEST CJM включает usable paid capability, duplicate, failure/cancel и re-login; без соответствующих evidence он не принят. LIVE/global/DNS/Cloud и UI вне полномочий этой проверки.
- Actual runtime, Caddy validate/reload/rollback, provider/payment, tests, DB и SSH здесь **NOT RUN**. Не проверял фактический executor: его ещё нет. Private read-only records и секреты не исследовались; указанная входом диагностика о разных DB и одном TEST shop использована как утверждение документа, а не переизмерение. Нет утверждений об actual health, корректном XFF либо успешной оплате. AQE reference только прочитан; AQE runtime и persistence не запускались. Этот документ не создаёт approval/checkpoint и не закрывает code/spec anti-drift после будущей реализации.

## Привязка входов SHA-256

Host prepare: phase `ideation`, revision `e217b4276558585c1a18650ef9393ee7fa226d12dad54f3aab46fcc4ce7a9ebb`, nonce `66d274c2-f074-4e84-be30-5a85637243e7`. Пересчитаны bytes всех четырёх manifest входов; совпадают с host:

| Вход | SHA-256 |
|---|---|
| `00_complexity_assessment.md` | `bd97ab735116c5bec9d0c4b6a828cf5664d48fb4bd076cb0a784441869c3bf22` |
| `01_requirements.md` | `376ffdaac81134f21c6cc344f87eb6efb57004c65738a2f5e31a9dc20a249bb4` |
| `03_adr/001-align-test-callback-upstream.md` | `d39b9887fc50febb7c38dc07bb9e20c87e255b1484f4c847e78597cdc5d95d3a` |
| `05_architecture.md` | `8e82292a823252246e8c9d2f79bed009f5cde10d4f397710ab8b97eccbc4fcbe` |
| `02_reuse_inventory.md` | `bd85eb42fa8ed131dba30a8a58cbfa4df83dc39a339ffe01e5f7ccdb556c0ae3` |
| `06_implementation_plan.md` (прочитан, вне manifest) | `f1d8d2c9d054dfbe561b902532dfc2824b4e09c6950acf0d0c76656fe50e015f` |
| `planning-status.md` | `7ddfb75757ae310473d59651201f6d31b8818cc7aca1ce5dbcb2e47e9f3a4747` |
| OpenSpec `proposal.md` | `9e8503ffe9457372e92b4a32f4a20c78a6dfb8b5527960d1bb7de45d4d12e2cc` |
| OpenSpec `spec.md` | `392b589b5651f5d78ab26ac808e9c8e4f5b517fa0e1ab80321888b0d26305cb6` |
| `AGENTS.md` | `870d72ea5a78624c45ff3f0afaf9cc72facc6c4f8ddaa1e2a6d163265e92b3ca` |
| `CLAUDE.md` | `1f0fbd7865088dd2454a201025b5d9ce3fda4bb37732b26df023e54e4631fbc1` |
| `docs/review-policy.md` | `625437b5b0fdc3c418fb88929efdc7069ad7247dc41e80a987237ba1801e2775` |
| `docs/model-matrix.md` | `e78af9664347226c0c30427d5a7aad58de753d3c5d91bb98a2f0357b0fe26e94` |
| `docs/acceptance/core-cjm.md` | `57959d202a7b92f7ce1b0a2b06255435422e0012b28d53f2d1d176912f62be5a` |
| pinned feature-adr `SKILL.md` | `e802a99edc2a83511fda898575539139e764cbd2f315d75c408c10de03085775` |
| pinned `modules/03.5-ideation-swarm.md` | `abc381bbe9897c3321110b63f8c82a02782a6361c41233743a16f5d0aa3f34d5` |
| pinned AQE `qe-ref-qcsd-ideation-swarm/REFERENCE.md` | `51e130790da856b53d67420070eb734c042dd0ad613dca7b76685b5758d0fe50` |

Conditions привязаны к manifest путям 01/05; 06 и остальные вне manifest — дополнительное прочитанное evidence, не охваченное host revision. После исправления обязательны новый host snapshot и проверка исходным независимым reviewer этих условий: `implementationVerified` в ideation означает проверку исправленного дизайна, а не тестирование реализации.

Самопроверка собственной записи: две предварительные попытки запуска проверочного JavaScript завершились ошибками импорта (`node:fs` и неверный путь к модулю); они не являются результатом проверки. Исправленный read-only вызов `evaluateReviewConvergence` для собственной записи, actual host и пересчитанного manifest, `originOnly=true`, exit 0, вернул **unresolved** ровно `TST-01`, `TST-02`, `TST-03`, без contract/format reasons. Это проверка структуры и привязки собственной записи, не общий gate и не закрытие условий; чужие вердикты для оценки не использовались.
