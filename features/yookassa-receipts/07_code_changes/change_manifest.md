# Чеки ЮKassa — манифест изменений

База: `e955e3f2e67e5663eec24dadeb828cacd18e9a9f`. Область: 16 targets актуального согласованного плана; нормативные документы и execution receipts ведёт координатор.

## Files Created

- packages/db/migrations/029_payment_receipt_snapshot.sql — nullable JSONB, строгий CHECK и расширение существующего immutable trigger без backfill.
- tests/yookassa-receipts.unit.test.ts — 6 проверок конфигурации, фактического JSON, live refusal, валидации и безопасных ошибок.
- tests/yookassa-receipts.integration.test.ts — 18 проверок настоящих PostgreSQL, handler/deps/runtime и локальных HTTP sockets.

## Files Modified

- packages/shared/src/tariff.ts — явные фискальные типы/parser и единое описание из действующего каталога.
- apps/web/src/server/environment.ts — whitelist трёх optional receipt env.
- apps/web/src/server/billing-runtime.ts — передача receipt config из WebConfig в действующий wiring.
- apps/web/src/server/billing-deps.ts — передача optional receiptConfig без расширения auth/session.
- apps/web/src/server/billing-handler.ts — канонический snapshot, bound GET, cutoff23h и статические ошибки/логи.
- apps/web/src/server/payments/provider.ts — additive optional receipt в CreatePaymentInput.
- apps/web/src/server/payments/yookassa.ts — одна точная RUB-позиция, синхронная валидация и обязательный receipt в real mode.
- packages/db/src/payments.ts — snapshot email под account lock, атомарный INSERT и canonical retry с required timestamp.
- docker-compose.yml — только optional web env без runtime activation.
- .env.example — комментарии без налоговых значений по умолчанию.
- tests/credit-packages.integration.test.ts — адресное исправление искусственного pre022 rehearsal и усиления029 count1 / legacy SQL NULL.

- tests/payments-guards.test.ts — fixture трёх optional receipt web env, positive presence и negative deletion controls с сохранённым TEST-exception control.
- tests/test-webhook-route.test.ts — вручную обновлённый fixed handler SHA, сверенные прежние ip/config pins и negative byte-drift control; operational bindings не менялись.

## Files Deleted

Нет.

## SHA-256 конечных файлов

| Файл | SHA-256 |
|---|---|
| `packages/shared/src/tariff.ts` | `83c3f98ab452c4e89f8dbf83aea375454da768402c9414b2f8fa2d6e8a10b601` |
| `apps/web/src/server/environment.ts` | `be0c936fea8ea1d8cc5ccdb3e023f4a20dffd3d7ee340a037657b1185a359aab` |
| `apps/web/src/server/billing-runtime.ts` | `d7cf1d10363239615d1b9b7dbfaaa4b9b53d239ace7cffbab62442415a2008e7` |
| `apps/web/src/server/billing-deps.ts` | `07e89c11cf014b1eff1d37b5a9d31eb4b57723ee3bc5279f00b03e6e99a11af3` |
| `apps/web/src/server/billing-handler.ts` | `006829ba5c6dfa94a03a02a806522e8938bedd651949a8e657021cb461c3054f` |
| `apps/web/src/server/payments/provider.ts` | `56e982b160bccee508b05b1c6501f0715bcb8fab5cf0adc8c3e3d22cac36bb1d` |
| `apps/web/src/server/payments/yookassa.ts` | `c70086c5d655c7c1489ea5cf73f489ed4235195a7e1b0ae8a40d8d97fbccbce5` |
| `packages/db/src/payments.ts` | `18ff73f049bc8199a3f73dc5d61d86f8ab0545aea59761825ddc65442494a998` |
| `packages/db/migrations/029_payment_receipt_snapshot.sql` | `364b826459442731e9f2c450bf2aebe1d4010ea8ba163139a471d0b06095b6f1` |
| `docker-compose.yml` | `3539729535adbf875402f88c0593ce1f032a6226e86db6da65e0d2f9758f996d` |
| `.env.example` | `5be8ef9d6639ff6f9fa5d9fc1a7c813ef4c652a43eb87d14498ea070fffbb70f` |
| `tests/yookassa-receipts.unit.test.ts` | `5775d7047c09a45b2e90247e5597ddf7ab4530f7a03bb69d0f33cba76b81ed95` |
| `tests/yookassa-receipts.integration.test.ts` | `6cb2a5bc88f881d963dda4b2639623c111a1e2e67d85529b7aa0652cca1d9a72` |
| `tests/credit-packages.integration.test.ts` | `79c41f1d8ecab73594e4c53c80404249158829e25c34d09da293dec58d2781ed` |
| `tests/payments-guards.test.ts` | `9b187dae68cc9bee19add5497a95fdb871491b3ff7fb275f48c4bfb3b3e85264` |
| `tests/test-webhook-route.test.ts` | `d2a46349f2fb2388557eeda216a77cb414c637f67228f4bf31ef10f48ae9e2f1` |

Служебные author-summary/change_manifest и qe-author-delta — авторская передача, не production targets и не независимая верификация. Хеш манифеста сообщается отдельно без самоссылки.
