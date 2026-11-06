# QCSD testability R3: focused повторная проверка исходной роли

06.11.2026. **Собственный verdict: clean для ideation-дизайна.** Три исходных условия TST-01/02/03 самостоятельно перепроверены на текущих bytes; новая структурная дельта автора и его оценка новых рисков рассмотрены. Новых условий своей роли не выявил. Это не общий verdict QCSD, не закрытие принадлежащего другой роли RISK-03, не допуск реализации/apply и не результат платежа. Это продолжение исходной независимой сессии, без нового blind review; запрошены `gpt-6.1-terra xhigh`, фактические model ID/effort средствами сессии независимо не удостоверены. Исходные [отчёт R1](qcsd-testability.md) и [отчёт R2](qcsd-testability-r2.md) не изменены.

## R3: граница старого долга и нового TEST CJM

[Требования](../01_requirements.md:30), [ADR](../03_adr/001-align-test-callback-upstream.md:25), [архитектура P/C](../05_architecture.md:102) и [план AM-8](../06_implementation_plan.md:79) согласованно исключают из feature historical grant/payment/event/status mutation, old relay/POST, чужие account writes и зависимость нового CJM от закрытия долга. Старая задолженность только классифицируется read-only и откладывается как **DEFERRED/UNRESOLVED**, не выдаётся за исправленную. Техническое решение root не меняет OpenSpec; отдельное будущее исправление требует собственного scope и полномочий.

Перед route/new-CJM GO предусмотрены полный свежий BOTH-store inventory, классификация всех relevant событий по event time либо доказанной upper bound, отсутствие активных/неопределённых платежей и inflight, затем route health и fresh baseline sole approved target. Достоверно классифицированный неактивный terminal debt с истёкшим relevant event window сам по себе не требует старого grant; наличие unknown/inflight или неоднозначность owner/store/события означает STOP. Возраст intent сам по себе не доказывает возраст события; будущий refund/replay не считается невозможным. Проверка будущих ручных legacy действий включает store owner. Root facts и handoff — источники координатора, я самостоятельно DB/provider не проверял и фактическую полноту/достоверность inventory не подтверждаю.

После GO/baseline оператор связывает действия с **exact новым** intent утверждённого аккаунта: old/pre-GO и nonapproved должны отклоняться до POST/relay/mutating status GET. AM-8 предусматривает отрицательные входы и ноль business calls с положительным контролем нового разрешённого intent. Этот admission относится к QA/operator, а не к новому фильтру приложения; native provider traffic не изменяется. Запланированная фикстура и prose не доказывают, что фактический оператор соблюдает границу: будущему независимому QE понадобятся actual evidence и отсутствие бизнес-запросов на отрицательных входах, без предъявления незапущенного теста как PASS.

## Исходные условия и изменённые зависимости

- **TST-01:** [05 §O](../05_architecture.md:26) сохраняет backup/marker до записи, held inode, цикл short writes, truncate/fsync/readback, после ошибки или kill — restore либо STOP/incident. [06](../06_implementation_plan.md:53) требует real temp-file fault/SIGKILL fixtures фактического executor. Секция O/E/H побайтно совпадает с R2; аварийный автоматический restart всё ещё может прочитать partial config и вызвать downtime до ручного SSH recovery, а не исключён обещанием нулевого риска.
- **TST-02:** [05 §E](../05_architecture.md:68) и [AM-6](../06_implementation_plan.md:75) сохраняют независимое review actual source/launcher, captured immutable bytes, SHA-bound remote payload, ограничение импортов и отказ до записи при подмене. Непроверенный actual execution path блокирует apply. Самого executor и его final SHA сейчас нет; проверена только спецификация будущего binding.
- **TST-03:** [05 §C](../05_architecture.md:145) и [AM-7](../06_implementation_plan.md:77) сохраняют корреляцию нового approved intent с provider, ingress, main event/payment, единственным grant и fresh-session rights; unrelated grant/неверный store отвергается. Отдельно проверяются paid entitlement и фактический job/debit/allocation. Provider duplicate требует реального второго ingress; relay, pending и отмена не подменяют фактическую доставку/terminal outcome. Недостаток evidence — NOT VERIFIED. R3 ограничивает этот oracle новым intent и не превращает historical debt в новый grant.

Прочитаны все шесть запрошенных актуальных документов и actual author object. Сверка с архивом R2 показала, что O/E/H и AM-1/2/3/5/6/7 сохранены побайтно, AM-4 уточнён без разрешения historical writes, AM-8 добавляет проверяемую отрицательную границу. Остальные исходные условия других ролей рассмотрены как зависимости изменённого дизайна; их самостоятельной проверки и закрытия за другие роли не выполняю. Author `addressed` и `newRisks` оценены по фактическим текстам; новые серьёзные риски сверх описанных residual crash/downtime, неизвестной текущей полноты inventory и возможных будущих legacy событий не выявлены в границах этого focused review.

## Binding и границы

Host `ideation` R3: revision `332b191c064c613116338c9e594a4b30e7cd218f1b9d0e4edede4fe817bdca51`, nonce `ea916127-ff44-484b-87ed-008de79eb4d1`. SHA-256 входов пересчитаны самостоятельно:

| Вход | SHA-256 |
|---|---|
| `00_complexity_assessment.md` (manifest) | `1992d64456de6394b79cca9756dbeba5fb0dfb6372796a1adc21ce5263e45afd` |
| `01_requirements.md` (manifest) | `b856cccb4b677de5bd8bbd479fad3682a4c8209d21ec8c9210b258ab33053350` |
| `03_adr/001-align-test-callback-upstream.md` (manifest) | `d928de80700fd14ded42a8840998bb61ef1a829f83f1d0abb7ef3b8df613f8b5` |
| `05_architecture.md` (manifest) | `059622566fe8e50c1df1c2950f51fe6a0758a39d71dd3959c6c7114e92e25416` |
| `03.5_ideation_report.md` (вне manifest) | `210196cdc62cd6adb6dae13b9debdc63beadb5fda75cb54d45c50ca7f1445773` |
| `06_implementation_plan.md` (вне manifest) | `a3cb6c87e5b28d8e8cbb45b44e5da2dd10c968195e4c1563daac6f5a15894c03` |
| OpenSpec proposal / spec | `9e8503ffe9457372e92b4a32f4a20c78a6dfb8b5527960d1bb7de45d4d12e2cc` / `392b589b5651f5d78ab26ac808e9c8e4f5b517fa0e1ab80321888b0d26305cb6` |
| Private R3 handoff / root facts | `34cc46a2da4b231db7cc8f0c05e712f265324d54e06bfa66100c1088d7ac692d` / `4f5e895442207cde8764f98c89f7b84afe0b30c8f059a40b37e36b9a3825a009` |

Четыре manifest digest совпали с host; остальные hashes фиксируют дополнительно прочитанные inputs, не расширяя manifest. Полный R3 handoff и root facts прочитаны как переданные наблюдения, без переизмерения DB/provider. Фиксируются только собственные структурные verification этой ревизии: поле `implementationVerified=true` в phase ideation означает проверенный исправленный **дизайн**, не runtime или код.

Actual executor, tests, Caddy, SSH, сеть, БД, provider, реальная оплата, UI и публикация **NOT RUN**. Остаются будущие independent actual-source review/exact SHA и same-path fixtures, контроль и health существующего edge, полный свежий BOTH-store preflight, TEST isolation, разрешённый новый CJM, code/QE и code/spec anti-drift. Native prepare/evaluate и Git не запускались; агенты не создавались. Никаких утверждений о платёжной приёмке или публикации нет.
