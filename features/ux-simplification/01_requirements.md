# Текущие требования реализации UI трёх ролей

05.11.2026. Canonical implementation input, L14/22 targets. [Owner evidence](owner-approval.md): **«Да, реализовать этот макет»**, вопрос `call_f0a94c16c93f49b38617215d46b23b7a`, пункт0. Approval получен; повторный запрос не требуется. Архитектурное review/QCSD/K1/K2 ещё не пройдены.

## Точные источники

- Approved HTML: `docs/design/2026-11-05-ux-simplification.html`, SHA-256 `a85b3f073a335871e421ea2079269fa19c71f42a263d7b0bd17ae30469c50e68`.
- Approval: `features/ux-simplification/owner-approval.md`, SHA-256 `15441d0e685f4eb6cf32d7b9b3f61fe7eaada763857858d87a5e8ac967c7efcc`.
- Current OpenSpec: `openspec/changes/ux-simplification/specs/progressive-disclosure/spec.md`, SHA-256 `37eacc8bde59a60ab461c64b9d6709e50c897d3a6960d53f768c7867880d4285`.
- Current proposal: `openspec/changes/ux-simplification/proposal.md`, SHA-256 `7313abc4c4b238a7714cb32ded43c6bb5f533aad8f47f8dc2aa5f66eed47c0c3`.
- `AGENTS.md`, `docs/acceptance/core-cjm.md`, `docs/plans/2026-11-05-ui-recovery-cloud-delivery.md` определяют приёмку и порядок поставки.

Историческая research-редакция: Git `a4488b4caf602f093a0cc3393b4903e210cb3989:features/ux-simplification/` (одноимённый файл), [исторический manifest](design-review-inputs.sha256), [исследование](03_reference_research.md), [аудиты](audits/regular.md). Старые receipts неизменны; их hashes относятся к той ревизии, не к текущему implementation пакету. Nested `implementation-inputs/` сохраняется как подготовительный источник, canonical root00/01/02 — текущие execution inputs.

## Функциональные требования и проверяемая приёмка

| ID | Требование | Проверяемый результат |
|---|---|---|
| FR-1 | Все21 семейство — change/preserve/regression | Матрица root05 без пропусков; evidence соответствует фактической ревизии, source reading не browser PASS |
| FR-2 | Основной upload→processing→ready путь со стандартными настройками | Один явный старт, picker не отправляет, file limit/cost видимы до старта; параметры false/true/true/none; неподдержанных источников нет |
| FR-3 | Вторичные возможности и значения сохранены | Summary отличий; закрытие/Play/poll/preferences/выбор клипа не теряют mounted draft/player. Music по clip_id, CTA по video_id; apply/save явные |
| FR-4 | Роли и самостоятельные approved состояния | Account из отдельного header Link → отдельный экран; blogger personal link/copy всегда на dashboard, «Статистика» → отдельный экран с back. Не длинные inline sections. Owner tools только owner; lookup/назначение/reason открыты, limit/rate secondary. Guards серверные |
| FR-5 | Критическое видно рядом с действием | Upload/recovery/error/partial/player/download/expiry/cost/checkout terms/consent/deletion consequences не исчезают в advanced. Hidden invalid раскрыть+фокус, mutation не отправлять. Retry только server next_action |
| FR-6 | Текущий стиль и preferences | Workspace default, saved studio/theme и SSR/document lifecycle сохранены;320/390/1440,200% text zoom; neutral green tokens/font system прежние, layout не дублирует React tree |
| FR-7 | Реализация соответствует exact approved HTML | Макет→компонент→проверка, одинаковые state/theme/layout/width; account/settings и blogger/stats проверяются как самостоятельные экраны. Local smoke, independent QE и опубликованный E2E различены |

## Обязательные границы

Presentation routes `/dashboard/account`, `/dashboard/partner` — техническая конкретизация approved states, не новый API/сервис. Account доступен authenticated пользователю; blogger stats direct URL проверяет server blogger policy и не повышает owner без blogger-флага. Existing ordinary non-personal partner flow и его права сохраняются. Статистика честно all-time, monthly reward API не вводится. Media/auto-link private404 и existing partner foreign-code exception не переписываются.

90/120мин и индивидуальный integer2–1440/null→120 проверяет сервер; limit не равен credit balance. Rate null/20/30, reason required. Цены/CREDIT_SKUS, purchaseWindows, authorization/checkout eligibility/TEST exception серверные/канонические, не из HTML. Нет новой подписки, quota/DB/provider/pkg изменений.

Guest consent действителен только для текущих recipient/clip IDs/hash/version: изменение payload, новый пакет или потеря доступности выбранного клипа требуют новой галочки; create/send/copy/revoke различны. Auto-link и personal TEST checkout переиспользуются, не реализуются заново.

Recovery backend отдельный блок: не обещать отсутствующий partial retry, отсутствие double charge/STT проверяется в его настоящем контракте. Keyboard/back/direct URL/reload/errors/busy/long text обязательны. Upload navigation guard сохраняется при новых ссылках. Полный route transition не создаёт обещания persistence unsaved media draft после ухода, но не оправдывает remount при polling/settings внутри записи.

## Поставка и статус

Сначала gates и код, тестовая поставка/проверка на clipmkr.ru, инструкция и ручная приёмка владельца; потом отдельная доставка того же артефакта на c.clipmkr.ru с сохранением обоих datasets. Без DNS-switch, слепого merge по email и перезаписи Cloud-БД. Эта коррекция — только документы; реализация, QE и runtime НЕ выполнены.
