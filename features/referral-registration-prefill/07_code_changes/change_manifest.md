# Изменения согласованной регистрации по приглашению

База `74ea7a6bae354a1cf1fdaec1af01a957cd421137`, ветка `feat/referral-registration-20261111`. Автор реализации `gpt-6.1-sol high`. Root GO получен после настоящих originating QCSD/K1/K2/admission и6 supported checkpoints. Это manifest фактического кода, не независимый QE/приёмка/выкладка.

## Контракты

- FR-1/FR-5/NFR-1: server-only `readReferralPrefill` проверяет raw header через canonical parser, active lookup без recordView и безопасно деградирует; request-scoped Page → Landing → одна AuthForm.
- FR-2/FR-4: sticky manual intent, untouched `{}`, manual `{code}`, empty fallback; existing skip и normal-login сохранены, mode changes сохраняют DOM/draft.
- FR-3: `PartnerService.apply` возвращает `applied_code` из locked выбранной строки только после COMMIT и совпадения persisted partner_code_id/status/reject_reason/self guard; общий Attribution и SQL mutations не менялись.
- FR-3/NFR-2: local unknown-reply check, transient `created_with_referral` в прежнем AuthFlow, обе утверждённые строки с реальным reply code. Null/rejected/missing-code/discard — generic, ошибки — прежний retry.
- Canonical blogger dashboard и owner report не изменялись; native acceptance читает обе проекции после того же настоящего signup.

## Snapshot

Source set (10 editable paths), SHA256 canonical sorted JSON: `7e72ce272e165e3c1689f0ff1fa4edfe5a9521bbfa6c15541205a04058ea5ca9`. Все остальные12 paths плана readonly и не менялись. Никаких DDL/dependencies/config/endpoint/policy/financial changes.

| Path | SHA256 |
|---|---|
| `apps/web/src/server/referral-prefill.ts` | `1fb7a2fd1c6c64afc38d7688fb38a4c4b06ce15e0c0698144495168cd7b34c13` |
| `apps/web/src/app/page.tsx` | `650b1cadab3bcae962919575d867d8e0d2e411df6247500862a8d029d7793430` |
| `apps/web/src/app/Landing.tsx` | `fd04a2bf9c8feb6acc752b469a8072636c748471a2fa4362999a0564983ea392` |
| `apps/web/src/app/AuthForm.tsx` | `e1a9c65e55bce3ce1f2e251477d617d3fb0f062190753a7abb825fd12876fe3d` |
| `apps/web/src/app/AuthFlow.tsx` | `e8d44642f4488f449d1d4bf4393f8b64e9cf57879c71dedaf9e6114239a4770d` |
| `apps/web/src/app/globals.css` | `0e9afb945b249c185b07c9e6a0f3d70bee750afd0be5577b8f64889c471aba8e` |
| `apps/web/src/server/partner.ts` | `f76881584001b33f99c4731909fffc5a19073d69b483b2b3b8f4dfcbf4b8b88a` |
| `tests/referral-prefill.test.ts` | `e5fb1dda60d768b1823b94eb897f3a9c7f94ed636b43729e2806fdfd08c7b168` |
| `tests/browser/public-entry-cabinet.test.ts` | `66ff8708c4fe7a5c39f70264cce874393ee29abcd149fdc615e2f5467c069cba` |
| `tests/browser/repeat-registration-next.test.ts` | `69c8a6363a8bbe56f33f468138ddf056ed5bdaff258d5c108ea1d366b9131cb4` |

## Anchors и anti-drift

Inline LEGACY_SOURCE/SHA `6b97da09ffc9c34dda5bcd814a188f964979fc75499e3518fbe93a3b6e9d2a77` и замороженная Specification не менялись. Source guards/replacement SQL/mutation script не подгонялись. Единственное старое UI-ожидание обновлено по R2: новый аккаунт с успешным ручным code получает подтверждённый двухстрочный notice; historical legacy assertions неизменны. Fill helper раскрывает details только если закрыт: это сохраняет введённый draft и видимость при новом autofill.

Первый общий native/component запуск дал6 отказов нового test-only `external=[]`: baseline harness уже включает consent и намеренно abort-ит analytics SDK. Исправление ограничено новым oracle: ожидаемые заблокированные `mc.yandex.ru` попытки отличаются от неожиданных host, полный abort external сохранён. Добавлены pageerror oracle и private synthetic screenshots. Менялся только native test file; application bytes/build/core/component/mutation proofs сохраняются. Повторяется только затронутый native suite, tests TypeScript и lint. Не выдаём старый failed aggregate за green новой ревизии.

Проверенные dependency sources: installed tree `/tmp/clipmkr-manual-billing-reminders-20261111/node_modules`, подключён обратимой ссылкой; package-lock/manifests и48 shared/db/s3/queue source files идентичны текущему WT. Первичный typecheck с canonical old installed dist был неуспешен; это отдельно сохранено, не скрыто. Чужие trees/source/dist не изменялись, npm install/upgrade не выполнялись. Fresh web build создан именно в этом WT.

Независимый SOURCE/QE, финальные process/spec ledger updates, commit/merge/push и поставка принадлежат root; текущий manifest их не закрывает.

Дополнительная найденная причина native-only отказа: прежний fixture addInitScript выполнялся также в opaque analytics iframe и бросал SecurityError на localStorage. Независимый минимальный counterexample в Chromium/WebKit воспроизвёл ошибку, а top-frame guard убрал её при сохранении positive top-document instrumentation. Исправлен только fixture; pageerror oracle не снят/не фильтруется. После изменения общего fixture необходим повтор всех18 native tests; приложение не пересобирается, поскольку его bytes прежние.
