# ADR-002: Сохранять intent отдельно от опубликованного MP4

## Status
proposed — инженерный выбор для QCSD; обратим до миграции. Пересмотреть при появлении пакетных layout changes или нескольких simultaneous render intents на один clip. Requirements: ZF-07, ZF-08, ZF-10; AC05, AC06.

## Context
Готовый `clip` уже имеет `render_version`, `render_fence`, immutable versioned object key, music settings и `job_attempt.rerender`. Music/CTA сохраняют quota+lease одной PostgreSQL транзакцией, затем посылают identity в BullMQ. Эти механизмы сохраняют старый MP4 до успеха, однако повтор нового apply после timeout должен узнавать принятую операцию даже после её завершения. Только client draft или последний request key на clip этого не обеспечивают после следующего выбора.

## Decision Drivers
1. HIGH: одна принятая операция и одна quota debit на один request identity, независимо от retry/timeout.
2. HIGH: old MP4 и published layout остаются доступными при fail/stale publication.
3. HIGH: ownership/retention, zero source-credit charge, no STT/select.
4. MEDIUM: reuse queue/attempt/fence; не переносить music/CTA в новый framework.

## Considered Options
| Вариант | Плюсы | Минусы | D1/D2/D3/D4 |
|---|---|---|---|
| Менять layout на clip сразу, один last_request_key | Минимальная миграция | Поздний retry после другого apply не узнаётся; pending подменяет published | −/−/+/+ |
| Универсальная render orchestration subsystem | Единая модель всех настроек, extensible | Переписывает рабочие music/CTA и повышает риск вне scope | +/+/+/− |
| Малый layout intent + существующие attempts | Durable replay, точный snapshot, аддитивно | Одна таблица и projection join; надо тестировать status derivation | +/+/+/+ |

## Decision
Добавить `clip_layout_intent` и nullable `clip.rendered_layout` (versioned `{requested:ScreenFaceLayoutV1,resolved:{cameraVisible,reason}}`); оставить `job_attempt`, render queue, `render_fence`, `render_version` каноническим исполнением.

Таблица содержит `clip_id uuid REFERENCES clip(id) ON DELETE CASCADE`, `request_key uuid`, `source_revision text` с CHECK64 lowercase hex, `base_render_version integer CHECK >=1`, `render_version integer CHECK > base_render_version`, `series_no integer CHECK >=1`, `layout jsonb NOT NULL`, `created_at timestamptz DEFAULT now()`. Primary key `(clip_id,request_key)`, UNIQUE `(clip_id,render_version)`, UNIQUE `(clip_id,series_no)`. JSONB CHECK допускает только объект с поддерживаемыми `version=1`, `mode=screen-face`; полный closed schema проверяется shared validator при входе и DB чтении. Не дублировать status/current_fence/queue payload в таблице: accepted status выводится из render attempts этой серии, published — из current object key/version. Сохранённая строка остаётся доступной для exact replay до удаления clip.

`clip.setLayout` получает `{clip_id,request_key,expected_render_version,expected_source_revision,layout,reviewed_full_clip:true}`. Layout canonicalization детерминирована: normalized числа округлены до6 decimal places, неизвестные поля/NaN/coercion запрещены. Требования к ROI — ADR-001.

Последовательность в одной транзакции: validate → authorized video lock → clip lock → lookup `(clip_id,key)` → eligibility/version/active checks → quota rerender1 → increment `render_version` → `leaseAttemptTx(...,'render',...,true)` → insert intent с той же series/version → commit. Lock ownership берёт существующий порядок video→clip; не вводить clip→video и не брать credit-account lock после video. Existing lockRender остаётся credit-account→video→clip, financial writers не вызываются из apply.

Перед новым admission сервер сверяет opaque sourceRevision по canonical Original helper; mismatch409 без quota. Exact replay после ownership: равные expected source revision, expected render version и canonical layout возвращают существующие accepted version/status без quota/new lease, даже если другая версия уже опубликована. Иной payload с тем же key →409; два разных keys с одним expected version → один accepted, второй409 без debit. Expected version — текущая `clip.render_version` из screen DTO, не version из названия старого MP4. UI создаёт один key при подтверждении, держит его при сетевой ошибке; повторное осмысленное apply создаёт новый key только после resolution предыдущего.

`getRenderInput` под существующим fence берёт layout из intent, совпадающего с `clip.render_version`, либо `clip.rendered_layout` для music/CTA rerender. NULL для legacy означает прежнюю ветку. Worker передаёт этот snapshot в renderer и включает canonical config/version в immutable storage contract hash. При accepted publish одновременно заменяет MP4/thumb keys и `rendered_layout` **точно снимком этой попытки**. У stale attempt нет права обновить settings. Поле published layout не меняется при fail/retry/watchdog; поэтому не нужен новый rollback поля layout. Existing music rollback сохраняется.

Существующие `ClipMusicService` и `VideoCtaService` уже проверяют active render под video lock. Pixel-changing CTA блокируется на время layout; music того же clip — также. Изменение CTA URL без изменения pixels допустимо по действующему контракту. После layout success music/CTA используют последний published layout; не возвращают podcast framing.

## Rationale
- D1: история idempotency на clip покрывает поздние дубликаты; один last key покрывает только соседние запросы.
- D2: pending config живёт в intent, опубликованное поле меняет только existing fenced publish.
- D3: `checkAndConsumeQuota(...,'rerender',1)` — единственный расход; source charge, transcript и selection неизменны.
- D4: новый application service wrapper для RPC допустим, новая очередь/worker orchestration — не нужна для apply. Никакой общей миграции music/CTA.

## Consequences
### Positive
Повтор после crash/Redis failure восстанавливается сторожем; всё rollback при quota refusal/failed lease. Legacy rows остаются NULL без backfill/массовой пересборки.
### Negative / Accepted Downsides
Intent rows растут по числу apply, ограниченному existing quota; сохраняются до clip/account erasure. Добавляется join в input/projection. Старый web/worker не знает новый layout: additive schema совместима с legacy, но при rollout новый web не включать до нового worker; откат с active layout attempt требует drain, иначе старый worker может собрать podcast pixels. Это deployment constraint, не новый runtime feature flag.
### Follow-up ADRs
ADR-001 задаёт config; ADR-003 — локальный draft. Универсальный render intent для music/CTA сейчас не требуется.
### After-action Review
Owner: координатор Clipmkr + владелец продукта. Срок: через30 дней после приёмки; сверить failed/stale/replay outcomes и объём intent rows.

## Confirmation
- Method: настоящие PostgreSQL tests + existing create-only storage integration; queue fault injection на локальном стенде.
- Monitoring: structured accepted/replayed/conflict/fallback events и существующие render/stale_attempt_result; без URL/частного source.
- Success metric: exact retry/concurrency дают ровно1 intent,1 quota debit,1 accepted series; STT/select/source credit deltas0; fail/stale сохраняют old keys и published layout.
- Owner: автор реализации; независимый QE проверяет falsifiers.
- Load-bearing property: idempotency, ownership, quota atomicity и fenced publication сохраняют данные и деньги.
- Required automated check: `tests/clip-layout.integration.test.ts`, `tests/render.integration.test.ts`, `tests/render-storage.test.ts`, `tests/clip-music-choice.integration.test.ts`, `tests/clip-cta-rerender.integration.test.ts`.
