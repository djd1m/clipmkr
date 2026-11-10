# Изменения реализации хранения клипов

10.11.2026. Автор: gpt-6.1-sol high; author mail-unit — отдельная сессия той же модели в изолированной рабочей копии (это реализация, не независимый cross-model QE). Baseline: `68af4887f44290f0654db445636f390bbd3064d0`. Разрешение Step7 и настоящие pre-code gates: `../pre-code-checks.md`; history/receipts не подменялись. Последний план47targets; K2 PASS0failure0warning1skip (acid не объявлен), code admission `1e2a33e30eeba567337e9a00ecefdda797e667a325130a9bcea3a4a71362e207`. Native ideation closed revision `d9f16846074a4c1ddd1b735fb578e83174653cdf970c96bed3264fa340cc9432`.

## Что реализовано

- FR-1/2/7/8, ADR-001: первая готовность и provenance в добавляющей028; legacy min non-rerender/fallback/unknown. SQL/TS7/30суток, account-wide started payment windows без зависимости от баланса; прежние исключения/explicit cap. Роль блогера не вводит retention perk.
- FR-2/5/6, ADR-002: account→video→clip, повторное право после блокировки, durable claim перед S3, закрытие stale публикации. Все3clip prefixes до marker/null keys, неизменные source/history; media_recheck_at сохраняет late-PUT обязанность после первого успешного sweep, bounded fair hourly recheck.
- FR-3/5: UI/file/thumb/short/guest/music/CTA используют общий deadline/claim. Подпись получает absolute notAfter, один настоящий signingDate/floor TTL. Стиль сохранён, дата МСК и единое конечное состояние; недоступные действия скрыты. Тарифные/правовые тексты обновлены.
- FR-4, ADR-003: journal(dayMSK/video/offset), immutable provider payload/key, durable first_attempt_at до сети, lease/catch-up/bounded retry, текущий verified recipient. Реальный runtime path queue-runtime→watchdog→notice coordinator→существующий mailer. Verify/reset/SMTP поведение сохранено; reminder SMTP/disabled наблюдаемо недоступен.

## Реальные файлы

Пути ниже — actual diff из разрешённых targets; не каждый объявленный regression target потребовал правки.

| Файл | SHA-256 |
|---|---|
| `packages/shared/src/tariff.ts` | `bead2be00b001f9f64ab04148c42634eaab2567329f92b5e6211086684f0f20f` |
| `packages/db/src/plan.ts` | `cc738715a4db9f76c71d797be3c15d5b18556c89d3e7cff276d03dd41d07f5f9` |
| `packages/db/src/render.ts` | `81a35ce7131d2f88cbbfaadb102071844942f6d42c4827b699c5b140a86156a0` |
| `packages/db/migrations/028_clip_retention.sql` | `2778ae56998e3d2581775b504ed0918f50aaf9296e7bb8fb3369c2aaa9ddbaa9` |
| `apps/web/src/server/retention.ts` | `804427d35348f9ce07300086e3daade1c814d650cbf74a88c97b6641ef2ee77d` |
| `apps/web/src/server/retention-notices.ts` | `ee614923bbf95c260dfd73eaa272f1d914eda6180223046154dac4d5232c2cf5` |
| `apps/web/src/server/watchdog.ts` | `68f2978640262febf8e2eb94949ede17e8a7a7d14e7bdfee383c41556da9b44e` |
| `apps/web/src/server/support/mail.ts` | `3493af574090dd83bc6762232eca5c1ce500a9952b2759a0ad15077334b5d797` |
| `apps/web/src/server/screen.ts` | `5f6aaf6c46bf02c278b884a04714d538db07fa7d99e520f76499939e6c488802` |
| `apps/web/src/server/clip-file.ts` | `8ebe2f60c96bc6b29d41df26370c0a97315fa2a8cb56824755480cf56d34a23d` |
| `apps/web/src/server/short-link.ts` | `09eed6fd7a8b7b45a4f0d667d63ad32161ed187bd3d5f51e09d7e56cb513effa` |
| `apps/web/src/server/guest-pack.ts` | `b6eed665316354fbb58e9e040bb935e4217964ca170bee3064f642eda0586a32` |
| `apps/web/src/server/clip-music.ts` | `8031bf790fe20cdd97416ba2f8948658a04bed518cdc88473a3510be1674f759` |
| `apps/web/src/server/video-cta.ts` | `6bba836926aa84acd01554a692715a04921e28cba8aa823fa425dc2acd5493b3` |
| `apps/web/src/lib/screen-contract.ts` | `46679b9194673e88282a1f33feb78920ae7dd1810cda4ca6badb6e134e68c01b` |
| `apps/web/src/lib/legal-documents.ts` | `257fc8159c015730546d9e672a80aed548f4af989508adace5d29933b8881673` |
| `apps/web/src/app/clips/ClipCard.tsx` | `7a450be39c1b8e393db424bb20a3e97ac56799b339d5e08212fab393162ce9b4` |
| `apps/web/src/app/dashboard/ProInterest.tsx` | `9e293e11ea98da4d6daff098f869296182d56945cefb5622b7a3864ace4b92a2` |
| `tests/retention-policy.test.ts` | `adc0dfcfeac0949661dae33b62e761cd0251a2843fe9d44e57a41eb962003c2e` |
| `tests/retention-policy.integration.test.ts` | `28fa72ddac9e920b41d516e577642692633c8c07b0b175788a828818d93bcf88` |
| `tests/retention-notices.integration.test.ts` | `8bd3288417f05c036af1f31578477408a16b5d402e90c289b065c7af29ec00ed` |
| `tests/retention.integration.test.ts` | `c329da2ccfc415d5d5ecaf1253bba202f9780e28696f2f413e82b7ca767b8581` |
| `tests/render.integration.test.ts` | `cecc64a72a51fe655f4891d256cf26bda8191f52b4b2f1ae8669241cacba6006` |
| `tests/short-link.integration.test.ts` | `c6cde058c10f91f47038887ee5c41ad1a8cadb03ab758909b695005b1ca836c0` |
| `tests/support-mail-resend.test.ts` | `7aae0e363ca81c61c0048087a0bacb82511bcd5079d5e1bf18e6c92421ad4bcc` |
| `packages/s3/src/presign.ts` | `c3a0adff02383a264556bd4e59998cbb756ed4cccef35482c264f37343b3df3e` |
| `apps/web/src/server/screen-runtime.ts` | `af1203f377673acf8da11044834d2efcef870acca8a4a5d423a237cc34a8ffe3` |
| `apps/web/src/app/c/[code]/route.ts` | `44579231aad979ea533c489cb26a4b1c050222f9f9b86aa56ebd7fcfb2493c80` |
| `apps/web/src/server/short-link-handler.ts` | `c75b95c62bc059a4f0552e542c09de1b6fae27c0441f25f43f843c5d68281341` |
| `apps/web/src/server/showcase-file.ts` | `9610d4fd937b8b5bb4fac01af56b787c6388e042174e0c4d11ac35803ad418ad` |
| `apps/web/src/server/queue-runtime.ts` | `8b4b6474b8a751b5ee8f803036a812f612fb9053c68de2855a2718060f70b83a` |
| `tests/retention.test.ts` | `dae46080cfc2247f406f0443a78d2fba6c5456cac2504414bffdf0cf4b793cff` |
| `tests/progress-screen.test.ts` | `520d9d7ce39df696c21a726f7a073b1a0d5a8ced6d13358d8e186b63b7b34c65` |
| `tests/guest-pack.integration.test.ts` | `6cc2fd2893e3e8571c882f381cf1c886fd42187550695b0df43222019b1b2f3b` |
| `tests/paid-plan.integration.test.ts` | `4a765012270eb9a7bb19ff8e7d288df3d90e2cd39f12321106d050ee88cba8de` |
| `tests/short-link.test.ts` | `a7ac4353e29b6a544bd800e42cee0276d7aa2be29901e48bab24b5a4652b1b14` |
| `tests/legal-pages.test.ts` | `dd33d52ab27aaaa30c99870a32c27601c1c431ac7cb215e71ffabf678e984ec1` |
| `tests/clip-music-choice.integration.test.ts` | `d05f760e727d2cb7531c13bc2a5bffd9838c8ac6b5d9653479fb7d2789fb2dee` |
| `apps/web/src/app/videos/[videoId]/VideoDetail.tsx` | `c878b80619a14579f23ef8e9368dca3869ee1e9442d018d2c86d4233ca1a29da` |
| `apps/web/src/app/upgrade/UpgradeScreen.tsx` | `130aed675f71bd3fe993129e2fb6943a7cbc3d3c44aa730c6b3dcf6ea2043a12` |
| `apps/web/src/app/upgrade/return/ReturnScreen.tsx` | `5f5f162ea0efc40b1d5698b170120e0da8644a39242eb4a63ef923e1dcfd8764` |
| `apps/web/src/server/guest-page.ts` | `1208667cfab0ea244842e22fd4ca2de495cffe319775af35e842d925d4460810` |
| `apps/web/src/server/support/routes.ts` | `e109dd44c1d03f1263b9a4ed39113286bf4038aa62baa8ae2c5b5d8fca3c18f1` |
| `tests/clip-cta-rerender.integration.test.ts` | `00dd13e39eba70267231e0e438e965671738c0cbf9be02366a3df265e234c6f6` |
| `tests/watchdog-diagnostics.test.ts` | `34b019721a420e7fc66f51976eefdbd0f26b997def726c98dbf55706a4b798eb` |

## Границы

Никаких production migration/container/DNS/payment/email/cleanup операций и git commits. Тестовая миграция выполнялась только в отдельных synthetic *_test schema; Cloud S3 — только независимый transport fence и собственный `tests/site/<unique>/`. Старые signed URL/активные загрузки/локальные копии не отзываются. Бессрочные rechecks имеют цену S3 listing и backlog latency; физический SLO и inbox delivery не обещаются. Старый image rollback возвращает3-дневный cleanup и не считается совместимым rollback новой политики; release/rollback разрабатывает координатор.

Независимое code/QE и ручная приёмка ещё отдельные gates. Author-summary хранит фактические проверки, не сертификацию реализации.

## Repair по независимым условиям

После второго настоящего native QE все7условий сохранены в host;6проверены originating reviewers, RET-QP-002 остался открытым из-за CSS каскада гостевой страницы. Третий repair ограничен этим условием; окончательное закрытие требует реального browser и originating verification. Новый actual clock callback проходит из queue-runtime через весь watchdog в обе child стадии; окончательные решения берут clock после locks. Guarded reaper сохраняет accepted/live lease и работает при unavailable transport. Existing safe capture из support/routes вынесен в createSupportMailer и используется двумя runtime callers без нового env/outbox. Все purchase/return/guest consumers показывают согласованные сроки и effective guest date/state; недоступный global download-all скрыт, DOM listener сохранён, all-expired invitation заменено историей. Migration SQL не менялся: доказательство min/filter/fallback/unknown расширено tests+двумя мутациями. CTA/diagnostic lifecycle/error assertions сохранены на семи сутках.

`../qe-author-delta.json` addressed теперь содержит все7реальных host IDs;4дополнительных условия приняты поддерживаемым adoption во втором цикле и больше не являются newRisks.conditions. Третий source delta — только `[hidden]{display:none!important}` в существующем guest CSS: author display:inline-block больше не перебивает hidden. План/requirements/tests/exports не менялись. Unit25PASS проверяет прежнее поведение; координатор на финальном build подтвердил actual Chromium2/2guestPASS: active global isVisible=true, expired global isVisible=false, без недоступных действий/приглашения/player, точная дата МСК и active playback. Build exit0; source не менялся после него. Host/чужие entries/lineage автор не редактировал.
