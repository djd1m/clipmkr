# Исследование переиспользования

Статус: авторское статическое исследование, не два независимых research-агента/QC.
База: /home/clipmkr HEAD 5455b1b3e3a938ee0f28ab40fe67914dfcdb3c11;
архитекторский private receipt прочитан как вход, его runtime-выводы не повторены как свои тесты.

## Действующий Clipmkr

| Код | Наблюдаемая гарантия | Решение |
|---|---|---|
| Uploader.tsx:11–25 | fingerprint=name:size:mtime; общий sessionStorage; cleanup abort | Заменить только identity/cache/lifecycle; транспорт оставить |
| Uploader.tsx:37–62 | Один key/options, flushSync video_id до PUT; parts до Complete; router.push/refresh | Сохранить порядок, добавить durable gates и fencing каждого await |
| lib/upload-parts.ts:9–51 | 3 параллельных PUT, allSettled, пропуск completed_parts, refresh прежним create | Переиспользовать целиком; не заменять tus/Uppy/свой multipart |
| server/video.ts:38–111 | account+idempotency UNIQUE, один upload_id, ListParts | Источник server ownership/parts; новый helper не претендует на серверную авторизацию |
| server/video.ts:129–184 | admitted до сети/под lock, HEAD recovery, publish после commit | Repeat Complete существующий, не новый endpoint |
| server/page-account.ts | Возвращает session.account_id UUID | Передать accountScope в существующий Uploader через dashboard/page.tsx |
| server/screen.ts:34–52 + VideoDetail.tsx:90–92 | Два независимых stale расчёта ошибочно охватывают uploading | Исправить оба; local phase не выводить из updated_at |
| VideoList.tsx:7–13 | Link для всех статусов | uploading — обычный section/div тех же классов с инструкцией |
| tests/browser/upload-lifecycle.test.ts | Vite+Playwright hydrate real Uploader/transport, router.push лишь массив | Расширить существующую fixture настоящим unmount/remount/history; массив недостаточен |
| tests/music/teaser/compaction-uploader.test.ts | Hook-host без DOM, legacy key/fake File/VideoUploader() | Явно адаптировать к account scope/v2/async hash; не отключать проверки options |
| tests/pack-shot-uploader.test.ts | SSR без обязательных props | Передать fixture accountScope, сохранить доступность/CC0 assertions |
| tests/clip-cta.test.ts:246–253 | Source guard старого readCtaKind(saved) и regex resumed | Заменить schema/behavior проверкой immutable CTA v2; не ослаблять контракт |

## Доноры проектов 1–8

Архитекторский отчёт уже содержит поиск 01/02/03/03a/04/05/06/08. Автор дополнительно
прочитал следующие наиболее подходящие исходники; отсутствие результата не объявляется
доказательством отсутствия кода во всех ветках/удалённых репозиториях.

| Донор в /home/2026-AUG-PU-Projects/projects | Результат |
|---|---|
| 01-testimonials-senja | В apps есть SSO SHA/платёжная идемпотентность, не browser multipart-resume; новый перенос не нужен |
| 02-review-qr-reputation, 03/03a-affiliate-rewardful | По исследованию архитектора нет подходящего streaming browser-resume; их атрибуция/платежи не относятся к этой фиче |
| 04-calorie-vision-cal-ai/apps/web/app/capture-upload.ts:45–88 | Полезный принцип повторного POST с прежним key; transport одного фото не заменяет N5 multipart |
| 05-podcast-clips-opus | Предшественник действующего N5; не копировать старую реализацию поверх текущих fixes |
| 06-rag-sales-chatbase/apps/web/src/server/source-upload-handler.ts:1–12,58–76 | Серверный PDF upload сам адаптирован из N5, иной POST boundary; browser helper отсутствует в прочитанном файле |
| 07-cold-email-warmup | Локально есть README проекта; подходящие runtime-исходники этим исследованием не установлены |
| 08-interior-ai-redesign/apps/web/src/lib/upload-asset.ts:6–14 | Один fetch приватного asset, не resume; серверные права оставляет серверу |
| 08-interior-ai-redesign/packages/adapters/src/assets.ts:8–9 | SHA всех байтов Node file stream: переиспользовать принцип bounded update, Node fs/crypto нельзя перенести в browser bundle |

## OSS и первичные источники

Выбран узкий incremental SHA-256, а не новый upload framework. В первичном package.json
тега 2.4.0 подтверждены точная версия, MIT, ESM и Node >=20.19; проект Node22 подходит.
[Package metadata 2.4.0](https://raw.githubusercontent.com/paulmillr/noble-hashes/2.4.0/package.json).

README того же тега показывает sub-import @noble/hashes/sha2.js и последовательные
create/update/digest. Это соответствует bounded sequential slice reads.
[API 2.4.0](https://raw.githubusercontent.com/paulmillr/noble-hashes/2.4.0/README.md).
Пакет в текущем запуске не устанавливался и не тестировался; browser/build compatibility
подтверждает будущий кодовый этап. Маркетинговое слово audited не означает аудит нашего helper.

Альтернативы: WebCrypto digest не даёт выбранного incremental update API и whole-file buffering
2GB не подходит; собственная реализация SHA запрещена; Uppy/tus потребовали бы нового
протокола/слоя без необходимости; Node crypto остаётся тестовым независимым oracle,
но не browser runtime. Чистый adapter 4MiB Blob slices + поддерживаемый OSS минимален.

## Антипаттерны и ограничение

Не считать metadata/ETag содержательным hash. Не вычислять sample hash и не присваивать hash
нового File старым уже принятым legacy parts. Не сохранять signed URLs. Не запускать complete
после abort и не создавать новый key при generic retry. Не добавлять DB/API/lease для recovery-loss.
Полная утрата browser metadata требует другого feature; bounded-план сообщает ограничение.

## Уточнение исходников зависимости и create-контракта после QC 04.11.2026
Исходная база исследования выше сохранена исторически. Текущий worktree/main HEAD
12b2e17577fcabf923f37b8814046357fd12b78a содержит count/HEAD с теми же двумя исходниками,
что авторский9b8b043; diff exit0, точные SHA256 в00. Runtime receipts заново не получены.
UTR-RISK-001 требует optional account_scope UUID в действующем create input и сравнение
с auth до transaction/claim/quota/S3; это честное узкое API amendment без endpoint/DB,
а не server recovery. Preflightalone оставляет TOCTOU. См. FR-4/ADR-002/TASK-3a.
