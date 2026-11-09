# Design

## Context

См. proposal.md. Canonical handler вызывает DB consumers после проверки провайдера; unknown intent уже фиксируется до ответа200. Ответ503 после этого не защищает повтор: он станет duplicate200. Подробный authoritative scope и tests — feature-adr06.

## Goals / Non-Goals

**Goals:** QA-only pre-ledger admission для payment/refund, без расширения финансовых прав; drain не зависит от текущего checkout allowlist.

**Non-Goals:** смена production semantics, schema, source/legacy/c, merchant callback, Caddy/Compose deployment в этой зависимости, новая платёжная платформа.

## Decisions

- Тонкий adapter передаёт в существующий createPaymentWebhookHandler обёртки applyPayment/recordRefund. После штатного verify и до consumer он проверяет параметризованным SELECT точную локальную пару payment_intent.id/provider_payment_id. Отказ бросает ошибку в существующую503 boundary. Канонические файлы остаются прежними.
- Новый Next route `/api/webhooks/yookassa-test` вызывает только QA adapter; точный existing route inventory guard расширяется этим путём, контроль plan writers сохраняется.
- Scope profile проверяет existing config: exact target DB host/name/role, RedisDB4/S3 namespace и TEST provider. Нет нового env или identity store. Снятие checkout exception не выключает callbacks уже созданных intent.
- Отвергнуты: post-commit status rewrite; глобальное изменение DB consumer; копирование source intent вQA; отдельный proxy/service; bypass provider verification.

## Risks / Trade-offs

- Событие до штатного provider ID binding →503 и повтор; тест проверяет последующий успех без ручного финансового исправления.
- Отзыв checkout → конфигурация TEST provider сохраняется до drain, identity allowance не является callback switch.
- Test provider fixture → доказывает component contract, real merchant delivery проверяет parent отдельно.
- Новый app route → exact allowlist двух route paths в existing guard, без нового plan writer; namespace/config negatives обязательны.

## Migration Plan

Зависимость выдаёт проверенный source patch и4-file manifest. Parent после собственного scope amendment/gates собирает immutable QA web, переключает свой Caddy exact route и повторяет узкий runtime smoke. Эти действия здесь не выполняются. Parent qe-primary-01 остаётся открытым до исходной независимой проверки; history не сбрасывается.
