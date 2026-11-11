## Context
M/12, manual-only после отмены optional-autorenew; источник решения owner-authority.md. LIVE012efb6 не выключается.

## Goals / Non-Goals
Goal: два bounded email события о конце текущего непрерывного оплаченного периода. Non-goals: автосписания, маркетинг, новые controls/financial states, полный юраудит.

## Decisions
Использовать ADR-001 и05_architecture.md: all payment entitlement intervals (base/addon/eligible legacy), компоненту покрывающую now, unique(account,end,offset), fixed recipient/payload/key после first attempt. SQL claim revalidates; network вне transaction; max3 attempts/<23h. Optional delivery flag=false. Checkout adapter false; оферта только exact approved replacement map.

## Risks / Trade-offs
Accepted != delivered; длительный outage/clock anomaly пропускает письмо; refund review suppresses. Состояние после committed dispatch нельзя атомарно отозвать у provider. Legal дата/§10.2 open до публикации.

## Migration Plan
Additive030 journal, default-off rollout после настоящих gates; rollback flag off, без data restore. Existing namespaces для PG/HTTP/browser QE, без реальных писем/платежей.

## Open Questions
LEGAL-1: согласовать exact draft, дату публикации/вступления и исполнение14-дневного уведомления до legal rollout.
