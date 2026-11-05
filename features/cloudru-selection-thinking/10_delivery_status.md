# Поставка ограниченного исправления и code/spec anti-drift

04.11.2026. Это протокол координатора, отдельный от независимых исходных заключений08/09. Согласованный редизайн сюда не входит и не объявляется реализованным.

## Фактическая поставка

На тестовом `https://clipmkr.ru` развёрнут исходный commit `ebb590260b2df9151b9df62098488e2aaac3ee21`. GitHub, GitLab и GitVerse readback ветки `fix/cloudru-selection-thinking-20261104` подтвердили этот SHA до добавления runtime-документов. Последующие документальные commits не являются новым runtime revision.

Worker image ID: `sha256:6e66c8717b0f7d31c720d63db14d5841b9ec7d9cd965d9a3f2c3ac0cb1ae8800`; web image ID: `sha256:a2245bd2896244a40efaad550d32880d9a25109b1fcb8b6787169cd4c44bd2b6`. Образы собраны canonical Dockerfile из git archive точного commit, проверены существующим production dependency guard, переданы существующему test host и сверены по ID/layers/revision. Это не полная reproducible-build аттестация.

Перед app-only compose update проверены фактический test origin/проект, отсутствие активной обработки, неизменность env и определений DB/Redis, существующие port guards. Новая pg_dump Fc backup проверена через pg_restore --list; полный restore именно этой новой копии не выполнялся. Обновлены только web и три worker services, без миграций, --remove-orphans и пересоздания DB/Redis/proxy. Их container IDs сохранились. Старые app images сохранены для отката. Cloud.ru deployment, production/DNS переключение не выполнялись.

## Code/spec anti-drift

- FR-1/AC-1: diff опубликованного app source относительно предыдущего bd91a08 содержит одну изменённую строку в Cloud.ru-only ветви provider.ts: chat_template_kwargs.thinking=false. Отсутствуют новые token caps, model/provider/config/deadline изменения. Existing request-capture asserts проверяют payload, а не поиск строки в source.
- FR-2/AC-2: OpenRouter, UI, DB, queue и schema не изменены. Второй code target — existing provider test; новых modules/exports нет. Авторские59 focused checks и независимые24 checks/6 выбранных мутаций разделены в08; их не называют полным integration suite.
- FR-3/AC-3: настоящий uncapped replay использовал compiled deployed selector и существующий validator: HTTP200,5592ms,0reasoning,1 validated fragment. Независимая проверка реального UIretry той же записи подтвердила terminal done и2клипа. Это разные запросы: diagnostic usage не присвоен UIjob. Parsing/validation/error semantics не ослаблены.
- Runtime09: оба клипа воспроизводятся в Chromium/WebKit, оба скачаны в Chromium и проверены ffprobe; WebKit download воспроизводимо не принят, причина не установлена. Runtime overall PARTIAL; исправление selection подтверждено, полный CJM/редизайн/90–120min/payment/blogger/manual acceptance не заявлены.

Private command/image/config/backup evidence: `/root/.config/clipmkr/release-parity-20261103/clipmkr-ru-ui-target/`, независимые browser evidence: `/tmp/clipmkr-independent-runtime-20261104/`. Secrets, media, signed URLs и auth state в Git не включены.

## Обучение и оставшиеся условия

Actual project-pinned recall по Cloud.ru reasoning перед teach вернул0совпадений. Evidence-backed teach сохранился в общем `/home/clipmkr/.dz` с ID `teach:3f027ea3e4e59c20`; повторный recall фактически вернул этот урок. Для замечания о замене утверждённого макета оболочкой повторный recall вернул существующий `teach:820581d93a5cf7df`; дубликат не создавался.

UI-фича остаётся WAITING OWNER EXCEPTION по собственному07: native K1 NOT ESTABLISHED, native K2 FAIL из-за поддержки Next.js; проверенные projections не переименованы в native PASS. Ни checkpoint hook, ни эти runtime-доказательства не разрешают реализацию UI в обход действующего запрета. Полная готовность продукта и срок её достижения этим документом не подтверждаются.
