# Реальные изменения QA callback guard

Автор: `gpt-6.1-sol high`, отдельный code-author; самостоятельное PASS не означает независимую приёмку. Вход: замороженный `06_implementation_plan.md` SHA-256 `ce9c300bc6dff543eb3766aad59307ad51e3d1977bde230ed9f8c48ce6ca85f7`, native plan inputHash `3399783e965b63645c66ca25d44102719b422da2b564091bf58a6c8a2b998fc9`.

Созданы:

- `apps/web/src/server/relocation-test-webhook.ts` — exact QA profile и параметризованный pre-consumer SELECT на обоих financial paths; raw/IP/provider verification остаётся canonical.
- `apps/web/src/app/api/webhooks/yookassa-test/route.ts` — wiring существующих runtime/dependencies; startup exception возвращает 503/no-store без деталей.
- `tests/relocation-test-webhook.integration.test.ts` — 8 обязательных real-PostgreSQL tests с настоящим HTTP provider adapter; negative guard seam отдельно подписан.

Изменён `tests/payments-guards.test.ts`: добавлен только точный QA webhook route и sorted directory allowlist; существующие 3 plan writers сохранены. Удалённых файлов нет. Новых dependencies/env/schema/containers нет.

| Code target | SHA-256 |
|---|---|
| `apps/web/src/server/relocation-test-webhook.ts` | `c726aeb878b680f43c563a1d085cff5809ef4a187830e66ae53aab806c71cd47` |
| `apps/web/src/app/api/webhooks/yookassa-test/route.ts` | `b008e47398fd55d99fc38f53537dd72e6df4c70463647ea49ba3cf8199ce134d` |
| `tests/relocation-test-webhook.integration.test.ts` | `1619f5c605ad5b819514b962d483a56da5e22be8a1580263c0746f2a926e7782` |
| `tests/payments-guards.test.ts` | `7aa384ab9b3a89af01560d7f70af8bf3750f0b0672d6de2cbed90a2c1151795b` |

Canonical handler SHA-256 сохранился `2fcef1bf93e3d300c8d94b17ff73e8a81c1630f9477d64b1ca9f1e52c7af10a0`; `tests/test-webhook-route.test.ts` не изменён. Canonical handler/deps/runtime/provider/financial SQL, Caddy/Compose, source/legacy/c, merchant/DNS не менялись автором. Чужие coordinator edits в parent feature не входят в эти 4 code targets.

Admission фактически `admitted`, manifestDigest `64bb3e580b1fce8823585fe16ce8f3ef5cb1ab06c8b4fcb5bdd2894e5e2fa9a3`; coder-context фактически `complete`, digest `9707afe839afde936ea2ac54f674032928a4a5166a50279e3ac6ba2df924d122`. HEAD выбран в отсутствовавший child `.fa-state/base-ref` до редактирования; parent history не редактировалась.

Проверки и ограничения — в `../08_qe_report.md`. Deployment, independent closure и parent originating `qe-primary-01` не заявлены этим manifest.
