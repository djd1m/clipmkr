# Проверка реализации упрощённого UI — история и текущая ревизия

05.11.2026. Исторический первый статус: Step8 ещё не закрыт. Актуальный результат и границы приведены ниже. Предыдущая авторская проверка передачи HTML сохранена без изменения в [history/design-handoff/08_qe_report.md](history/design-handoff/08_qe_report.md), SHA-256 `5b6fa89707469cf9dcb827fa17ddcf4342d06a286941eec2f054a3843aaea6b4`. Она не была независимым продуктовым QE и не используется как его замена.

Автор реализации — gpt-6.1-sol high. Независимые проверки — gpt-6-astra xhigh, новые сессии, сначала согласованные документы. Действует разрешённое владельцем cross-model исключение; cross-family не заявляется. Применяются pinned feature-adr, проектный dz и методы расширенного QE без AQE runtime.

## Текущая граница доказательств

| Проверка | Наблюдение | Ограничение |
|---|---|---|
| Основной regression mustRun | 130/130 PASS на версии до последней правки PartnerPanel | Итоговая привязка и impact-анализ ещё выполняются |
| Вход и восстановление | 34/34 PASS в browser fixtures | Не проверка доставки нового письма или Windows Chrome |
| Owner cabinet | 8/8 PASS, строгий text200% и hidden-invalid сохранены | Реальные PostgreSQL/HTTP и mounted React fixture, не published UI |
| UX полный прогон | 49/49 PASS на build n0mVfHFrUQZdCnxGPTX_A после исправления race | Formal review выявил четыре других дефекта, этот suite не доказывает их отсутствие |
| Guard отрицательный контроль | При фактическом отключении capture listener Chromium assertion confirms0vs1 RED; затем без вмешательства PASS обоих engines | Целевая runtime-проверка, не общий mutation score и не WebKit negative |
| Локальный реальный pipeline | Две свои записи прошли STT/select/render, по два клипа; воспроизведение currentTime>1 и backend file SHA/ffprobe подтверждены | Обычный upload имел seeded client-resume и не закрывает чистый CJM; блогер загрузил файл нативно. Только короткий smoke155 секунд |
| Скачивание локальным браузером | NOT_ESTABLISHED в приватном HTTPS route harness | Backend GET не заменяет Download.saveAs; обязательна проверка на опубликованном сайте |
| Source/Cloud публикация | Новый UI пока не опубликован | Cloud.ru и DNS в текущем блоке не изменяются |
| TEST оплата | Подготовка, реальный E2E ещё NOT RUN | Только разрешённый аккаунт/тестовый магазин; глобальная оплата остаётся выключена |

## Что ещё необходимо для закрытия

Стабильные source/tests, новая сборка после последней правки статистики; полный UX и адаптированные прежние harness suites; native review prepare до формального независимого ревью, originating receipts и настоящий evaluate closed; требование→риск→проверка→результат→граница для FR1–7/ADR/AM1–13 и QE-R1 TASK10–13/всех21 семейств; code/spec anti-drift; независимый Step9; публикация только web на clipmkr.ru; нативная опубликованная загрузка/Play/скачивание и TEST платёж; инструкция ручной проверки владельцу.

Секреты, cookie, подписанные S3 URL, приватные исходные медиа и сырые чувствительные логи в публичный отчёт не включаются. Полные журналы сохраняются локально с закрытыми правами. Наличие этого документа не является разрешением, успешным checkpoint или вердиктом.

## Первый формальный раунд и корректирующий блок

Фактический native evaluate после исправления только формы reviewer metadata: **unresolved6, rounds1**, revision `0c807d4d6102de9be726e5b437aa8fc2e839ae5269b6e0407d5cb50b7ff03f3e`. Предшествующие contract-invalid/duplicate-condition отказы сохранены; не успешные review cycles. Все замечания принадлежат originating reviewers; автор и координатор не закрывали их за проверяющих.

| Условия | Подтверждённый дефект | Наблюдение до исправления |
|---|---|---|
| UXQE-P1-FOCUS, QA-ARCH-01 | Focus вызывается до видимого DOM commit гостевого пакета | Observer перед fill: поле видно, activeElement остаётся кнопкой, initial/reopen Chromium/WebKit; прежний тест проходил, сам fill маскировал пробел |
| UXQE-P2-CTA-FEEDBACK, QA-ARCH-02 | Pending/result VideoCtaForm скрываются при закрытии редактирования | Source ownership и missing hold-close oracle подтверждены независимыми ролями; runtime регрессия назначена TASK11 |
| QE-SEC-001 | Standalone blogger stats сохраняют identity A после native same-document RSC refresh B | Настоящий Next Flight200 содержит B; DOM/copy ещё A, private native probe RED; не server IDOR |
| QE-SEC-002 | Подтверждение удаления A переносится на новый аккаунт B | Настоящий B email/Flight200, checked=true/delete enabled. Удаление не нажималось, mutations0, jobs0 |

Проспективный план QE-R1 сохраняет WRITE25: unchanged VideoList переведён READ-ONLY, CtaFields допущен WRITE; добавлены неизменные AccountDeletion/SignOut review inputs. Measurement39 =25+14. Пinned K2 PASS0 (0 failures/warnings/skips), target admission0, context complete `bc59dec884569156dd646a2d010d46b1af7f050201e468487ef945bebbd61f14`, настоящий plan checkpoint0. Native begin-repair подготовил второй цикл с прежними тремя originating ролями; это ещё не второй verdict и не closure. Исправление и собственная перепроверка каждого условия пока выполняются. Старые06/07 и raw evidence сохраняются; никакого reset review authority.


## Актуальный результат исправлений QE-R1 (06.11 UTC)

BUILD_ID `wDQ3dyU30GkdLVZffQCHK`. Координатор заново вычислил SHA-256 всех 153 app-source файлов: совпадений 153, расхождений 0. План `9ff050853d8cca7d7dfa8b6b55fa8ad04f7f0674766189e2a4eb2b90a963c66f`,25 WRITE + 14 READ-ONLY; изменены 24 code/test paths, UpgradeScreen переиспользован без изменения. Старые промежуточные статусы выше сохранены как история.

| Реальный прогон | Результат и граница |
|---|---|
| Полный UX current |73/73 PASS; native Next + Chromium/WebKit; `qe-20261105T233943Z-2e497c33` |
| CTA/Card/music/progress/workspace |111/111 PASS; `qe-20261105T233648Z-d0e58661` |
| Focus и CTA negative→positive |20 semantic RED→20GREEN; separate native setup failure в первом batch не считается дефектом приложения |
| Native account/consent |4RED на Chromium→4GREEN, каждое GREEN включает обе engines; `qe-20261105T233916Z-de2854ca` |
| Автоссылка |20/20 PASS, реальный HTTP/PostgreSQL; `qe-20261105T232923Z-a0d50715` |
| Персональная TEST capability |2/2 PASS; native Next с фиктивным TEST provider, не настоящий магазин; `qe-20261105T232818Z-a4369a7a` |
| Статика/production build |typecheck/lint/build exit0; актуальные `/tmp/ux-qer1-final-typecheck2.log`, `…final-lint2.log`, `…build.log` |
| Independent security |Собственные повторные native probes2/2GREEN, настоящий B Flight/DOM/copy и сброс согласия; ни одного DELETE/POST/job. `qe-20261105T234934Z-e2412661` |

Raw evidence хранится закрыто в каталоге текущей поставки; указаны basename без cookie, PII, ключей и подписанных URL. Не суммировать перекрывающиеся целевые и полные suites как независимые новые сценарии. Предыдущие130/34/8/48/67 и realS3 guest11 — прежние квалифицированные результаты; их reuse требует impact/hash привязки, не названы повторным запуском на новом build.

### Code/spec anti-drift и Confirmation

- FR1/FR7: матрица 21 семейств в `07_code_changes/change_manifest.md`, actual changed 24 paths и сохранить неизменные контракты; финальный fleet проверяет полноту цепочек. Approved HTML и точная OpenSpec revision прежние. Pixel-perfect, line/branch coverage%, WCAG, p95 и физический Windows Chrome не измерялись.
- FR2/FR5: один явный старт; picker не отправляет; предел/стоимость видимы; native holdPUT/cancel/leave/history и unknownComplete покрыты текущимUX. Backend лимиты90/120/индивидуальный не меняются. Короткий155 секунд smoke не доказывает длительные граничные записи.
- FR3/ADR002: один owner каждого draft/RPC/player; immutable music baseline и generation fence; предупреждения до mutation; CTA status проецируется за пределы скрытого editor без второго RPC. Focus после commit и по nonce; polling не крадёт фокус. AM2/6/10 и TASK10/11 подтверждены current73/111 и focused20RED→GREEN.
- FR4/ADR001: отдельные account/stats SSR surfaces с прежними server readers/guards; ordinary/owner/blogger/TEST/error states. Stable HMAC account boundaries сохраняют same-account draft, сбрасывают client identity/consent при смене аккаунта. Поздний A200 после B Flight не возвращает A DOM/copy. AM3/4/7/8/9 и TASK12/13 подтверждены native4/auto-link20/current73; owner8 прежний, не rerun.
- FR6/ADR003: scoped прежние neutral/green токены, сохранённые theme/layout; один React tree; current mobile/desktop/text200% assertions. Account и stats — самостоятельные scenes; fixture screenshots не опубликованный CJM.
- AM1/5: настоящий native Next navigation guard; фактический negative control guard RED и positive обе engines. AM11–13 и TASK7–9 сохраняют существующие assertions в адаптированных harness, без изменения продуктовых API.
- Все 14 READONLY inputs побайтно исходные. Нет product server/API/DB/migration/env/package/provider/worker diff. Поддержка, auth, media storage и billing ledger переиспользованы. Процессный main9a927ea интегрирован до текущего QE; он не приписывается UI-автору.

### Остаточные обязательства поставки

Финальное native evaluate, собственная архитектурная verification, Step9, immutable web-only image/backup+restore/preflight, публикация clipmkr.ru и опубликованный native CJM ещё выполняются. Реальный TEST provider callback и paid job отдельно от UI deployment. Исторический TEST ledger debt и partial-render recovery не исправлены этой UI-фичей. Локальный backend GET не заменяет native browser Download.saveAs. Cloud.ru, DNS и пользовательские данные не переносятся. Инструкция ручной проверки подготовлена в `manual-acceptance.md`; владелец ещё не выполнил приёмку.


## Итоговый формальный Step8

06.11.2026: фактический `npm run dz -- qe-rounds --source native --action evaluate` завершился **exit 0 / closed**, rounds = 2; revision `53c76705ddbff5ed55a5d709fe64aecfed791ae640ba51b6e38f08f0a89ace7a`, nonce `388892aa-f209-44e4-85ca-e4fb063a842c`, unresolved = 0, reasons = 0. История первого unresolved и двух metadata-отказов сохранена. Все три originating модели `gpt-6-astra xhigh` собственноручно проверили свои условия и полный delta из 11 путей; координатор чужие подтверждения не создавал.

| Роль | Собственный итог | SHA-256 отчёта |
|---|---|---|
| qe-primary |CLEAN, UXQE-P1-FOCUS/UXQE-P2-CTA-FEEDBACK verified |038f36c6a5702f3415d9edd022eb7ac4ff4cd98fdc9a3f662b5975484a1b0990 |
| qe-security |CLEAN, QE-SEC-001/002 verified |ef5a760717bd5ed78a0c640dbf0366aefb93382a351745b36272d75ad361e3a9 |
| qe-architecture |CLEAN, QA-ARCH-01/02 verified |3b9ef93b060381017cc129ba915a4c5907702bc929c83e9bb77ee95c7f93a461 |

Каждая роль сохранила исходные условия, подтвердила текущий snapshot из 64 входов и structural delta, проверила новую оценку рисков автора. В архитектурном отчёте также 164 backend inputs без расхождений. Scope/code-spec anti-drift подтверждён для UI-фичи; **это допуск к финальному Step9 и подготовке source-публикации**, не выполненный опубликованный CJM, не TEST оплата и не приёмка владельца. Реальные usage/cost неизвестны, нулевые значения не приписываются.


### Проверка после checkpoint
Поддерживаемая команда записала реальный code и qe checkpoint (обе exit0). Повторный native evaluate после записи qe снова **closed/exit0**, с checkpointClosure digest `aa5e529db3e37e380ede3249dace1cebb0527c71ffdb1682f0320cd84fa98a02`. Буквенная/численная оценка отсутствовала у reviewer и записана null, не выдумана.

Отдельный `dz guard check --op publish --json` вернул exit0/**warn**, не PASS: soft agents-md-policy-sync (10 отсутствующих anchors), несколько generic проверок NOT ESTABLISHED и отсутствие audit store в worktree. Force не применён, AGENTS/CLAUDE ради прохождения не переписаны. Настоящее feature-specific native closure подтверждено отдельно; общий guard не заменяет Step9 или опубликованную приёмку.


## Третья ревизия: сравнение owner report с согласованным HTML

После первого Step9 добавлена уже требуемая FR-7/AM-8 проверка: она воспроизвела расхождения композиции и типографики owner report и основных метрик. Предыдущие RED (75 PASS / 2 FAIL и отдельный alignment failure) сохранены, их результаты не переименованы в успешные. Исправлены четыре допущенных пути: BloggerAdmin.tsx, globals.css, UX browser test и существующий presentation helper. Требования, ADR, canonical план `9ff050853d8cca7d7dfa8b6b55fa8ad04f7f0674766189e2a4eb2b90a963c66f`, approved HTML `a85b3f073a335871e421ea2079269fa19c71f42a263d7b0bd17ae30469c50e68` и 14 READONLY inputs неизменны. Новых зависимостей/API/БД/worker изменений нет.

На итоговом build `3BcaqHtdrkW2fAp0Y8tMU` фактически выполнены: полный UX **77/77**, owner cabinet **8/8**, workspace **12/12**; typecheck, lint и build — exit0. Числа 111 unit / 20 auto-link / 2 checkout / 48 billing относятся к ранее измеренным прогонам и повторно не приписываются этой сборке. Для локальных helpers прочитан JSON с 4 PASS, но пустой stdout не используется как самостоятельный execution receipt.

Owner report сопоставлен с утверждённой композицией в 16 сочетаниях ширины/темы/компоновки/движка; статистика — в 24 normal scenes. Шесть served-DOM negative controls (три смысловые подмены × два движка) обнаружены; после точного восстановления DOM clean comparison снова прошёл. Проверка не объявляется полной визуальной идентичностью, WCAG-сертификацией или измеренной line/branch coverage.

Подготовлен настоящий native R3 snapshot `aff607f78828e6880976f272ea2db25c09e0c4c55cc1ac64b25593bf3b8cd8e1`, nonce `2399e8b6-aa2e-4ff8-b2df-811a2dedb8b1`, cycle `3dad672c-7cfe-4524-bea8-0d4e2bacf35e`. Выполняется собственная перепроверка трёх originating reviewers с сохранением исходных условий и полной историей. Старый R2 closed — исторический факт, а не автоматически перенесённый допуск. Итог native evaluate и второй Step9 будут записаны по фактическим результатам.


### Фактическое закрытие R3

Настоящий native evaluate завершился **closed / exit0**, rounds3, unresolved0/reasons0 на revision `aff607f78828e6880976f272ea2db25c09e0c4c55cc1ac64b25593bf3b8cd8e1`. Достигнут потолок трёх циклов; новый цикл/сброс истории не выполнялся. Все три originating reviewers собственноручно подтвердили исходные условия на текущей ревизии и полную delta4, включая affected неизменный PartnerPanel; исходные формулировки сохранены.

| Роль | Собственный вердикт | SHA-256 текущего отчёта |
|---|---|---|
| qe-primary | CLEAN |321f4c13631b4fe269190e206579ff8753266dc2bbde7cfeb6a78e601307b7f4|
| qe-security | CLEAN |9a476227c5da3550be9a6a5c0ec4581b0dc4b4f8942df108519d457db0e9fbf8|
| qe-architecture | CLEAN |3733e90e54c9c558d167658800a227195f9ffe151bf619e714a915d233d38f5d|

Сопоставлены все64 manifest inputs,153 app hashes и14 READONLY; изменены только два app файла и два test/helper относительно R2,151 прочий app input неизменен. Дополнительное уточнение исторического RED: alignment прогон содержал4FAIL (две matrix и две baseline проверки), а не2. Нынешний допуск относится к source реализации UI; второй Step9 и опубликованные сценарии ещё выполняются. Письменная ручная приёмка владельца не подменяется автоматикой.
