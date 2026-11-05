# Независимое QCSD security review — ideation

**Вердикт: CONDITIONAL.** Одно существенное условие UXS-SEC-001 к проекту отдельной страницы статистики. Это source-backed риск противоречия в проекте, а не доказанный дефект будущего кода или обход серверной блокировки. Стадия до кода; отсутствующие pages и тесты не являются находками.

## Происхождение и границы

- Роль `qcsd-security`, независимая новая сессия без истории кодирования; по заданию запрошены `gpt-6.1-terra`, `xhigh`, автор архитектуры — Astra. Самостоятельного provider attestation модели/effort у меня нет. `owner-exception` — временный cross-model режим владельца, не заявление о cross-family.
- Прочитаны governance, core-CJM, требования, owner approval, reuse inventory, ADR 001–003, DDD и архитектура; root06 рассматривался только как предложенный план. Предыдущие verdict/отчёты автора и других reviewer не использовались. Исходники и тесты ниже выбраны самостоятельно; фактический запуск не проводился.
- Reference Mode: pinned `feature-adr/modules/03.5-ideation-swarm.md`, `qe-ref-qcsd-ideation-swarm/REFERENCE.md` и security reference; `studio-extended-qe/SKILL.md`, его testing/process prerequisites. HAS_UI=true, HAS_SECURITY=true, HAS_UX=true; эта сессия исполняет только security perspective. Методы: STRIDE, требования → риск → негативный сценарий → наблюдаемое доказательство; AQE runtime и upstream agents не запускались.
- Approval `owner-approval.md:29–42` относится к конкретному HTML и не закрывает gates. Макет → компонент → проверка должны совпадать по state/theme/layout/width; account и blogger stats — самостоятельные экраны. Полная визуальная проверка вне роли и не выполнялась.

## Самостоятельные измерения

- `sha256sum -c features/ux-simplification/implementation-design-inputs.sha256`: **68/68 OK**; SHA-256 самого manifest `19be12bbca56f2ae07215425fe8894391815c68c7477fe9c9aea2cea9b8bcc92`.
- HTML `docs/design/2026-11-05-ux-simplification.html`: `a85b3f073a335871e421ea2079269fa19c71f42a263d7b0bd17ae30469c50e68`; approval: `15441d0e685f4eb6cf32d7b9b3f61fe7eaada763857858d87a5e8ac967c7efcc`.
- Host nonce `d7e7f78a-02d9-49b8-b3f9-69d38439b5a0`; повторно измерены все 7 path/digest snapshot, затем независимо вычислен SHA-256 compact JSON массива. Фактическая revision `98cdb00fd3cb95ce461cad4662780a8c5f7695558d167cfe87210cdaa675c008` совпадает с host. Nonce — идентификатор снимка, не аттестация личности.
- Snapshot: root00 `42869bc54a9215823f3b3c0fbc8ec3dfec5facbba7c703a986950dc3af8f2cb5`; root01 `5227676066e361027801a8b2c0ca62cbb29ef3a012502540e9e406c329850c32`; ADR-001 `495d29daf2423437772ff8c37cff970d641720ef97e7f89706b389d74fe0e2a7`; ADR-002 `4f0d7b62e44f9241441d7e1ffc54f464806b4dcaf19a8aed985ce6c000a983d1`; ADR-003 `49cdacf09b5c554b8efa58cd0742201a220065d9e39c5d871f1a838249162cb8`; DDD `d2a46aa42c7de2dbaac606458df33e2ce5cf35a08ec1948d08400d35760e6637`; architecture `3516c4a9fdd02adde108f982958250818e69af48fa6fc75d465f9a6bbc7cbae4`.

## UXS-SEC-001 — идентификация заблокированной личной ссылки в statistics

**Severity WARNING; classification structural; owner qcsd-security.** Затронутый scope host manifest: `features/ux-simplification/03_adr/001-place-context-in-existing-pages.md`, `features/ux-simplification/05_architecture.md`.

**Сценарий и evidence.** ADR-001:30–32 требует сохранять существующее blocked/copy поведение и переиспользовать `PartnerSummary`, но statistics должен читать `partner.dashboard` без `ensurePersonalLink` и не зависеть от `personalLink`; архитектура:15,156–157,183–184 повторяет разделение. Сейчас `apps/web/src/app/dashboard/PartnerPanel.tsx:10–18,81–82,110–111` запрещает кнопку копирования именно по `blockedPersonalId`, полученному из `personalLink`. При этом `apps/web/src/server/partner.ts:119–126,153` возвращает список кодов с `status`, но без явного признака personal; фильтрованный ответ содержит только выбранный код. Собственный исходный browser test `tests/browser/blogger-auto-link.test.ts:239–265` прямо фиксирует отсутствие кнопки копирования blocked personal и сохранение копирования активной дополнительной ссылки.

Если blogger откроет отдельную statistics напрямую или обновит её, прежний `personalLink` на странице отсутствует. Наивное переиспользование `PartnerSummary` без дополнительного проектного решения передаст `blockedPersonalId=undefined`, вследствие чего заблокированная личная ссылка получит кнопку копирования. Взаимодействие с фильтром и доступностью данных осложняет надёжное определение identity. Это возможная регрессия защиты от распространения заведомо недействительной ссылки и противоречие preserve-требованию; сервер `partner.ts:77–81` всё равно отклоняет применение blocked code. Server authorization bypass и фактический browser defect здесь не утверждаются.

**Требуемое смягчение.** Дополнить ADR и архитектуру проверяемым способом определить/защитить blocked personal при прямом входе, reload, фильтрации и отказах получения данных без мутации `ensurePersonalLink` на statistics, нового API/DB/pkg или расширения прав. Уточнить сохранение доступной копии активной дополнительной ссылки и прежнего legacy non-personal поведения. Если существующих данных недостаточно, явно перепроектировать решение и gates, не подразумевать несуществующий DTO-флаг.

**Confirmation после поправки.** Независимо проверить уточнённые ADR/architecture на текущем nonce/revision, затем при реализации: blogger с blocked personal + active campaign, direct stats/reload и оба фильтра — нет copy для blocked personal, copy active campaign работает, статистика сохранена; отказы/пустой список fail closed по неизвестной identity, ни одного `ensurePersonalLink` на statistics; дополнительно обычный non-personal flow и owner/non-blogger direct URL. Сценарий планируется, не выполнялся; собственного verification `true` нет.

## STRIDE: проверенный дизайн и источники

| Угроза | Дизайн и выборочное source evidence | Состояние |
|---|---|---|
| Spoofing / elevation | FR-4 и ADR-001:28–30 требуют `pageAccount`, server `getBloggerPolicy`, non-blogger page 404 и исключают повышение owner без blogger-флага. `dashboard/layout.tsx:11–17`, `server/page-account.ts:4–8` показывают существующую сессионную границу. | Проектируемые direct route/auth/erasure проверки описаны; серверный/browser прогон NOT RUN. |
| Information disclosure | `server/screen.ts:57–69` фильтрует video по владельцу и возвращает 404; `server/partner.ts:119–125` ограничивает codes своим аккаунтом и имеет сохранённое исключение foreign-code 403. | Не обобщать 404 на этот существующий 403; cross-account медиа и stats требуют реального исполнения. |
| Tampering / repudiation | ADR-002:23–29 связывает consent с именем, IDs, доступностью, hash/version и запрещает мутацию при раскрытии. `server/guest-pack.ts:10–13,30–50` проверяет текст, ownership и клипы до записи; `GuestPacks.tsx:21–28,32–43,54–62` показывает необходимость запланированного reset. | Это проектируемое исправление, не результат runtime. Проверить preselect, poll, stale payload и busy races. |
| Tampering / disclosure checkout | `upgrade/page.tsx:19–29` задаёт account key, TEST и eligibility; `UpgradeScreen.tsx:24–55` использует abort/alive; `billing-handler.ts:100–119,159–171` получает session, проверяет eligibility, выбирает серверную цену и изолирует intent. | A/B delayed response, foreign intent, TEST и подмена цены — будущие проверки; provider не вызывался. |
| Tampering / deletion | `AccountDeletion.tsx:24–43` показывает checkbox, необратимость, 72 часа и сохранение чужих копий; ADR-001:28 требует сохранять их при переносе. | Нужен browser regression полного текста рядом с действием и отказа без подтверждения; не измерялось. |
| Injection / disclosure | `CtaFields.tsx:6–10` использует общий parser, `packages/shared/src/cta.ts:47–49` ограничивает HTTPS и credentials; `short-link-handler.ts:22–33` экранирует значения. Архитектура:135,167 сохраняет ownership и запрет приватных media/подписанных URL в артефактах. | Устойчивость нового DOM/URL к вредоносным значениям и утечки в маршрутах/скриншотах нужно проверить на реализации; это не полный аудит XSS/SSRF. |
| Denial / recovery | `server/screen.ts:39–46,53` формирует `next_action`; архитектура:129 запрещает выводить retry из числа клипов и помечает backend recovery зависимостью. | Ни retry, ни отсутствие двойного списания/STT не доказаны текущим review. |

Метрики роли: 6 категорий STRIDE рассмотрены; 1 condition WARNING, 0 BLOCKER/CRITICAL/HIGH в пределах выбранных источников; это подсчёт находок, не security score и не доказательство отсутствия других уязвимостей. 22 targets и отсутствие нового API/DB/pkg — ограничения дизайна, а не проверка выполненного diff.

## Пределы и дальнейшие gates

Только статическое чтение и измерение байтов; тесты, браузер, network/runtime, provider, БД, S3, SSH и deployment не запускались. Исходные тесты являются описанием будущих/существующих проверок, а не их успешным результатом. Design review не доказывает WCAG pass, UI E2E, UMUX, безопасность production или существование будущих guards. Требуются исправление и независимое подтверждение UXS-SEC-001, настоящая convergence всех ролей, K1/K2 и plan checkpoints до Step7; этот отчёт не разрешает реализацию или поставку.
