# Cloud.ru selection: отключить reasoning одним request field

## Why
Реальный короткий upload дошёл до STT, но selection DeepSeek-V4-Pro достиг600s. Provider probes показали reasoning-only output по умолчанию и валидный короткий JSON при chat_template_kwargs.thinking=false. Это candidate fix; production uncapped replay ещё требуется.

## What Changes
В существующей Cloud.ru ветви createSelector добавить только chat_template_kwargs:{thinking:false}. OpenRouter, endpoint/model/prompt/validator/deadlines/token limits/queue/DB/UI не меняются. Request-capture regression для обеих ветвей и existing negative tests защищают границу.

## Impact
Два существующих файла: apps/worker/src/llm/provider.ts и tests/cloudru-provider.test.ts; новых modules/exports нет. Authoritative requirements/execution/QE: features/cloudru-selection-thinking. Отдельный UI gate не обходится. Реальные provider evidence и весь дальнейший CJM отмечаются отдельно от unit PASS.
