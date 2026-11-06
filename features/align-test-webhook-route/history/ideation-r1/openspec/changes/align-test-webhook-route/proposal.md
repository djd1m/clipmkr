# Выравнивание TEST webhook с основным checkout

## Why

Read-only диагностика 05.11.2026 установила: публичный TEST alias направлен старому приложению, которое использует другую business DB, хотя TEST shop совпадает. Это не доказательство успешной оплаты или начисления.

## What Changes

- Сохранить `/api/webhooks/yookassa-test` и rewrite в `/api/webhooks/yookassa`.
- Заменить только upstream этого handle на существующий upstream обычного `clipmkr.ru`.
- Сохранить глобальное выключение продаж и единственный утверждённый TEST аккаунт, test=true и test_ ключ.
- Проверять точные bytes, routing, XFF, владелец business store, ограниченный реальный TEST CJM и rollback.

## Impact

Авторитетные decisions/execution plan: `features/align-test-webhook-route/`. Планируемые code targets: `deploy/test-webhook-route.caddy`, `tests/test-webhook-route.test.ts`. App/worker/env/DB/DNS и Cloud не меняются. Legacy контейнер и его данные сохраняются. Этот proposal — требования, а не разрешение apply или успешный checkpoint.
