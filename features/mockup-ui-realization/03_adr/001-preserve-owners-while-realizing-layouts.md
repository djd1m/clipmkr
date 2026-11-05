# ADR-001: Реализовать композиции при стабильных владельцах состояния

## Status
Proposed; execution design для уже согласованных макетов. Не независимое подтверждение/кодовый gate. Пересмотреть при доказанной невозможности сохранить DOM identity или нужные действия.

## Context
Наблюдённая поставка bd91a08 сохранила legacy body вместо согласованной композиции. Новый пакет поглощает авторское сужение workspace-presentation FR-1/06 «no hero/listbox/compact dashboard»; владелец его не утверждал. Историю не переписываем и старый M не называем завершённым.

## Decision Drivers
D1 high: Cabinet/Montage имеют реальную различную структуру из style9ea8f63f. D2 high: File/controller/account/checkout state живут в прежнем owner. D3 high: реальные data/access/actions без новых API/DB/provider. D4 medium: минимум новых abstractions.

## Considered Options
A. Ещё один skin старой страницы: дешевле и меньше lifecycle edits; отклонён — воспроизводит наблюдённый дефект.
B. Две независимые React ветви Cabinet/Montage: проще повторить HTML; отклонён — дублирует и перемонтирует uploader/players/checkout.
C. Один стабильный UI owner/DOM roster, общие controls и CSS grid presentation: сложнее CSS, но переносит геометрию без сброса операций. Выбран.

## Decision
1. Uploader, VideoDetail, каждый ClipCard(key=clip_id), UpgradeScreen остаются одним экземпляром в стабильной позиции/type/key при preferences и штатном refresh. Нет key=theme/layout, branch из двух страниц, DOM reparent активного input/video, двойных hidden uploader/checkout.
2. Dashboard: краткий title/lead; реальный source-file row; create/pause/status рядом; native details «Настройки клипов» закрыт по умолчанию, дети всегда mounted. VideoList становится компактными recent rows. Реальные balance/max_source_seconds — отдельный aside; расширенные квоты доступны в details. Promotion/partner/account deletion/support остаются достижимы через подписанные закрытые секции/ссылки после основного workspace, без переноса прав в CSS.
3. Сохраняется существующий input type=file и его ref/handlers. Визуальный CTA вызывает native dialog через этот input в user gesture. Если native input скрыт ради точного row, видимый picker trigger получает ref; pause/cancel/mismatch focus направляется на него, с проверкой реального filechooser и File identity. Это явная presentation-замена прежнего focus-input target, не новый uploader. onChange capture/reset и before-picker invalidation сохраняются.
4. Общий WorkspaceHeader получает реальные authenticated data, nav и WorkspaceSettings. Он не читает role/account из preferences. Для dashboard/detail переиспользовать уже существующий remainingLimits read через один request-scoped React.cache wrapper; он key/account-scoped, не persistent/global user cache. Upgrade не получает новый SQL/service: использовать существующий readCreditBalance там, где snapshot ещё отсутствует, один authenticated SSR read; отсутствие/ошибка balance не превращается в фиктивный0. Точный consumer/read-count проверяется QCSD до code plan; нельзя создавать параллельный balance endpoint или самостоятельную арифметику.
5. Неодобренные blogger/owner/guest/public screens сохраняют действия и guards; новый bespoke redesign не выводится из согласования трёх экранов. Secondary forms collapse не означает conditional unmount. Гостевая форма открывается явно при «Гостю»; polling её повторно не раскрывает/скроллит.
6. UpgradeScreen меняет presentation в одном component: Cabinet — compact three offers; Montage — intro + numbered rows. Реальные CREDIT_SKUS/purchaseWindows/current plan/disabled reasons сохраняются. Цена/кредиты/срок/период/условие покупки и статус не прячутся ради screenshot. Длинные справочные объяснения можно раскрывать отдельно, offer-specific eligibility остаётся у CTA. TEST marker отражает actual config.

## Rationale
C удовлетворяет D1–D3: пользователь увидит согласованный workspace, операции не дублируются. Native controls вместо новой библиотеки ограничивают surface. Request-scoped reuse не заменяет server authorization и не кэширует данные между аккаунтами.

## Consequences
Positive: exact visual regions и один owner состояния. Negative: требуется осмысленная CSS/DOM декомпозиция и обновление focus oracle при скрытом input; paired visuals и lifecycle negative controls обязательны. Дополнительный upgrade balance read должен быть явно измерен, не скрыт в toggle. Follow-up ADR:002 media,003 truthful progress,004 visual acceptance.
After-action Review: root+владелец при ручной приёмке; повторить через месяц после принятия.

## Confirmation
Method: tests/browser/mockup-ui-realization.test.ts + actual stage runner paired screenshots; pending, не выполнено.
Monitoring: named region geometry/action/lifecycle checks на final SHA; network attribution H/I/P/F/U.
Success metric: все VC rows PASS, один uploader/checkout owner; toggle0new mutations/RPC/RSC; same input/File/key/options/active PUT; no role leakage.
Owner: implementer tests + independent primary/fleet reviewers; автор ADR не закрывает свой review.
Load-bearing property: real layout transfer without remount or hidden business operation.
