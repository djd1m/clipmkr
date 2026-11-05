# Требования: Cloud.ru selection без reasoning

Исправление в пределах уже разрешённого настоящего CJM. Код на стадии планирования не менялся.

## Наблюдение и предел доказательства
У тестовой записи155s upload/pause/reload/reselect/Continue/Complete прошли, STT завершён; затем selection Cloud.ru V4 Pro достиг600s и запись завершилась failed/stalled (root runtime evidence). Это не успешное получение клипов.
Прочитаны реальные private provider probes: default32 completion tokens целиком reasoning, finish_reason=length; vendor thinking.type=disabled также32 reasoning/content=null. chat_template_kwargs.thinking=false дал6 output tokens/0reasoning, finish_reason=stop за2529ms. Existing transcript/prompt/validator с этим полем и probe-only max_tokens4096 дал2 валидных fragments за16550ms,666 output tokens/0reasoning. Последний опыт подтверждает candidate fix, но не uncapped production replay или p95/SLA.
Private evidence: /root/.config/clipmkr/release-parity-20261103/clipmkr-ru-ui-target/browser/provider-minimal-probe.private.jsonl; provider-thinking-probe.private.jsonl; provider-real-transcript-probe.private.jsonl. Файлы содержат результаты наблюдений, media/secrets не переносятся в Git.

## Functional requirements
FR-1. Только в Cloud.ru ветви JSON body существующего createSelector добавить ровно `chat_template_kwargs: { thinking: false }`. Уже выбранные endpoint/model/messages/stream:false/response_format сохраняются. Не добавлять vendor thinking, enable_thinking или max_tokens/max_completion_tokens/reasoning_effort и не менять deadline.
FR-2. OpenRouter payload не получает chat_template_kwargs или другие Cloud.ru-only параметры. Его json_schema/provider restrictions, model, request count и deadline сохраняются. Не вводить fallback/retry, provider/model switch, env/config keys, modules/exports, UI/DB/API/queue changes.
FR-3. Существующие parsing/validateFragments и failure handling не ослабляются: malformed JSON, content=null, refusal, finish_reason=length и invalid candidates/fields остаются отказами либо существующей валидированной фильтрацией. HTTP/transport/abort/timeout/dispatcher cleanup сохраняют прежние исходы и единственный request. После patch root выполняет uncapped replay через настоящий worker с прежним transcript/prompt/validator и настроенным provider; unit mocks его не заменяют.

## Acceptance
AC-1. Request-capture regression в существующем tests/cloudru-provider.test.ts проверяет точное field/value только для cloudru и отсутствие у OpenRouter; asserts не читают source substring. Тест RED на исходном payload/неверном key/vendor option и GREEN после single-field fix; дополнительного token cap нет.
AC-2. Существующие malformed/truncated/error/cancel/deadline tests проходят на окончательных bytes. Focused provider suite, worker/shared typecheck/build и применимые CI checks выполняются фактически. Новые API/DB/provider/UI изменения отсутствуют в diff.
AC-3. Приватный runtime replay использует тот же deployed source/image, actual uncapped worker request и existing validator; фиксирует duration/finishReason/usage/reasoningTokens/accepted fragments и terminal job result без secrets/transcript. Если fails/timeout — это FAIL, не «готово». Реальный render/play/download остаётся полным CJM после selection, его нельзя вывести из2 probe fragments или дать этим proof90/120min. Изменение исправляет request contract, не обещает верхнюю границу latency ниже существующих600s.

## OpenSpec binding
Delta: openspec/changes/cloudru-selection-thinking/proposal.md и specs/cloudru-selection-thinking/spec.md; SHA256 добавлены после записи ниже. Feature06 — единственный execution plan. UI gate exception не применяется и не требуется для этой S-фичи с обычными literal paths.

- `openspec/changes/cloudru-selection-thinking/proposal.md` SHA256 `224ae1d5c86003f46bab1e5aa72abb4426ca50290be15ddb719b54ddf8e1d0e6`
- `openspec/changes/cloudru-selection-thinking/specs/cloudru-selection-thinking/spec.md` SHA256 `f5120d4c84c382b751feb3b4fa34444b4129d7f388a583a51c794594480792b3`
