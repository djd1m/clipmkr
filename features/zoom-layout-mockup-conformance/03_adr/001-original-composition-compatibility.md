# ADR-001: Версионировать исправленную композицию 01/02 и сохранить прежние снимки

Статус: **Proposed**, 16.11.2026; обратимо до первой записи v2. После записи v2 откат допустим только на бинарник, который умеет читать и рендерить v2. Это предложение для независимой проверки и владельца, не successful stage, K1/K2 или разрешение писать код.

## Контекст

На исходной ревизии `e6a5dafdcf7027939586634a31f09bd8013fc120` request имеет строгую форму `{version:1,mode:'screen-face',variant,screen,focus,camera}`. Parser отвергает лишние поля и другую версию. `clip_layout_intent.layout` ограничен migration032 версией 1; опубликованный `clip.rendered_layout` имеет отдельный envelope `{version:1,requested,resolved}`. `getRenderInput` и fenced publication сравнивают canonical request, выбранный через `COALESCE(i.layout,c.rendered_layout->'requested')`.

`ClipMusicService.setMusic` и `VideoCtaService.setCta` повышают `render_version`, но нового layout intent не создают. Следующий render получает `requested` опубликованного клипа. Поэтому глобальная смена геометрии v1 незаметно изменит старый 01/02 после music/CTA. Неизменность текущего MP4 сама по себе не обеспечивает совместимость.

В [аудите](../../zoom-screen-focus/14_variants_01_02_mockup_audit_20261116.md) native MP4 расходятся с оригиналом: 01 camera сверху по центру вместо правого PiP; 02 camera снизу, screen уменьшен и находится сверху. Исходный [HTML](https://github.com/djd1m/clipmkr/blob/9e19f5746a28bad89c9551ce8cd9934f0f0a4f8e/docs/research/zoom-screen-layout/mockup.html) имеет SHA256 `7b83572176b7c48c38c5d9d3ed141148c482cc11bb98493c07fcef59fe6f4ad0`. Поздний ADR не заменяет этот oracle. Исследовательские ROI принадлежат одному source1816×968, а не всем записям.

## Драйверы по приоритету

1. Сохранить сохранённые композиции и replay intent, включая music/CTA.
2. Вернуть новую 01/02 к оригинальной геометрии с независимой визуальной проверкой.
3. Ограничить diff существующими parser/planner/DB/UI/FFmpeg; не добавлять framework, таблицы, detector или зависимость.
4. Обеспечить проверяемый откат на текущем VPS без потери данных.

## Decision

Решение. Заголовок нормализован16.11 для обязательного build-coder-context; содержание решения не изменено.

**Использовать существующее поле request.version как версию композиции.** Добавить `ScreenFaceLayoutV2` и union `ScreenFaceLayout = ScreenFaceLayoutV1 | ScreenFaceLayoutV2` в существующий shared-модуль. V2 допускает только `variant:'01'|'02'` и `focus:null`; `screen` является явно выбранной областью, camera — существующей подтверждаемой областью либо null. Ключи, canonical порядок и округление ROI остаются прежними. У V1 сохраняются прежняя семантика, допустимый non-null focus для 01/02 и все варианты 01/02/03. V2+03 отвергается: 03 остаётся только V1.

`parseScreenFaceLayout` принимает обе явные версии; строковые номера, отсутствующая/неизвестная версия, лишние поля, non-null focus у v2 и недопустимые ROI отвергаются. Никакого default-to-latest или upgrade-on-read. `parsePublishedLayout` сохраняет envelope `version:1`, но проверяет вложенный request через union parser. Render artifact `render_version` остаётся номером попытки/публикации и не заменяет версию композиции.

Planner ветвится по request.version **до** variant: V1 идёт по прежней реализации, V2 — по новой узкой ветке 01/02. Новый canvas/FFmpeg путь использует весь 1080×1920; нынешний clip y400..1200 для него непригоден. При этом общий код contain/выравнивания/валидации источника переиспользуется; V1 branch и legacy null dispatch сохраняют прежние результаты.

Новая migration `033_clip_layout_composition_v2.sql` изменяет только именованный CHECK `clip_layout_intent_layout_check`: разрешает числовые JSON versions 1/2, mode screen-face и для v2 variant01/02 + `focus:null`, с внешним `IS TRUE`, чтобы SQL NULL не принимал неполную форму. Type/ROI/exact-key проверки остаются строгой границей parser; БД не объявляется его полной копией. Старые сериализованные корректные v1 принимаются. На preflight отдельно выявить любые строки, которые parser не принимает; при обнаружении остановиться, не переписывать и не нормализовать их в миграции. Migration032 и её journal SHA неизменны. Envelope CHECK `clip_rendered_layout_shape` не требует расширения: наружная version остаётся 1; тест проверяет новый nested request через app parser и фактическую БД.

Ни backfill, ни перерендер существующих MP4 не выполняются. Переход в v2 — только локальное действие пользователя «Использовать исправленную композицию» для сохранённого старого 01/02 либо выбор 01/02 из другого варианта, затем существующее явное подтверждение пересборки. Открытие/refresh/poll/replay, музыка, CTA, изменение x/y старого v1 не переключают версию. При переходе в 03 явно создаётся v1 variant03. Сохранённый submitted request всегда повторяется байт-в-байт в своей canonical версии; переключение черновика его не переписывает.

UI хранит существующий envelope version1 и sessionStorage prefix; внутри layout/submitted.layout допускает union. Envelope, layout version и draftVersion — разные счётчики. Старый v1 draft восстанавливается как v1. Для v2-02 выбор radio сохраняет ROI как черновик и показывает: «Показан прежний экран; для крупного плана уточните область». Ручная правка ROI и существующий reviewed_full_clip в окончательном диалоге подтверждают выбор, дополнительный checkbox не нужен. Новый независимый control «Высота» и эти состояния проходят конкретный UI mockup и одобрение до UI-кода. В production не появляется preset930×704 для всех записей.

### Дополнение Decision QER-03/QER-04,17.11.2026

Для выпуска разделить runtime DML и admin DDL. До pauseAttempted и любых Caddy/stop операций отдельная readonly qualification связывает четыре runtime SQL/DNS назначения с exact bound DB container и app database name/OID. Admin connection с существующими credentials того же DB container отдельно подтверждает system_identifier, name/OID/schema/search_path, prior journal и authority. Restricted app не получает повышенных прав.

Backup переиспользует existing explicit actualDB pg_dump/TOC pattern. Canonical exported migrate(pool) исполняется из pinned candidate в ephemeral Node с network=container:<boundDB>, без приложения/providers/volumes; Pool(config) получает admin connection только через bounded stdin JSON. Admin secret остаётся в памяти родителя/ребёнка, не попадает в argv/envfile/Docker Config.Env или runtime DATABASE_URL. Не вводятся новый migration engine, secret manager, persistent admin profile или GRANT. Existing032/prior hashes должны совпасть. Initial candidate допускает pending033; already033 exact допускает idempotent forward/recovery при отсутствии других pending entries; rollbackC0 требует033 exact и не вызывает DDL. Unknown/other pending entries отвергаются. Effective inherited ownership/superuser проверяется без SET ROLE, не по одному MEMBER; admin Pool использует trusted search_path=public, journal/intent разрешаются в exact public objects, runtime search_path не меняется. Qualification ошибка до pause не вызывает automatic close; после реально начатого pause действует прежняя fail-closed ветка.

## Альтернативы

| Вариант | Плюсы | Причина отказа / цена |
|---|---|---|
| Изменить planner v1 | Самый короткий diff | Меняет старые клипы при music/CTA; нет воспроизводимости |
| Добавить optional compositionRevision в v1 | Аддитивный вид | Ломает exact-key parser, всё равно требует миграции/типов; смешивает implicit default с историей |
| Сохранить resolved rectangles в каждом MP4 envelope | Полный снимок координат | Новый контракт данных и больше миграции; не нужен для двух фиксированных алгоритмов |
| Request v2, старый v1 заморожен | Явный dispatch; использует существующее поле и intent | Нужны union consumers, один CHECK migration и совместимый rollback image — выбран |

## Последствия и откат

Утверждённые старые 01/02 будут выглядеть по-прежнему; исправление не маскирует историю как уже соответствующую оригиналу. Новый v2-01 намеренно перекрывает угол screen камерой; прежнее правило non-overlap распространяется на v1/03, не на новый PiP. Сохранение содержимого source crop не гарантирует видимость текста под PiP. Смена camera detector не входит в эту работу.

Поставка имеет два фиксированных артефакта: **C0 compatibility** (union reader, migration033, v2 planner/render/preview, но UI ещё не предлагает v2) и **C1 candidate** (тот же backend плюс согласованное создание v2 в UI). C1 проходит один общий набор; C0 получает отдельные проверки совместимости на своей ревизии. C0 не публикуется как завершённая фича; это проверенный rollback artifact. После появления v2 допустим rollback C1→C0 без down migration и без преобразования JSON. C0 показывает сохранённый v2 и повторяет pending submitted v2; редактирование такого v2 отключено с notice, чтобы прежний radio handler не создал недопустимый v2+03. При отказе самого v2 renderer остановить приём новых layout/music/CTA rerender и video worker на ограниченное время, сохранить готовые MP4/DB/S3 и вернуть работоспособный совместимый artifact; текущий pre-v2 image использовать нельзя. Точный порядок и проверки — в плане.

## Confirmation

Владелец подтверждения: независимый QE `gpt-6-astra xhigh` для будущего кода Sol; проверка этого ADR/плана — `gpt-6.1-terra xhigh`. Метод: реальные PG/FFmpeg/browser проверки и original oracle. Success: все названные сценарии выполняются на зафиксированном source/image SHA, обязательные проверки не skip/no-match. Monitoring: existing render log дополнен composition_version; число отказов parser/publication и render failures сопоставляется до/после выпуска. Ни одна проверка сейчас не объявлена выполненной.

| Свойство | Будущий исполнимый тест |
|---|---|
| Строгий union, no implicit upgrade, canonical equality различает v1/v2 | `v2_parser_is_strict_and_v1_canonical_bytes_are_unchanged` в `tests/screen-layout.test.ts` |
| Populated032→033, правильные CHECK и повтор migration | `033_preserves_v1_rows_and_accepts_only_supported_v2_intents` в `tests/clip-layout.integration.test.ts` |
| Music сохраняет выбранную версию и published snapshot | `music_rerender_preserves_each_published_composition_version` в `tests/clip-music-choice.integration.test.ts` |
| CTA для mixed клипов сохраняет каждую версию, счётчики и cut_plan | `cta_rerender_preserves_mixed_composition_versions` в `tests/clip-cta-rerender.integration.test.ts` |
| Подстановка v2 вместо ожидаемого v1 не публикуется | `publication_rejects_composition_version_substitution` в `tests/clip-layout.integration.test.ts` |
| Старый draft/unknown replay и новый opt-in разделены | `legacy_layout_changes_version_only_after_explicit_upgrade` в `tests/browser/clip-layout.test.ts` |
| Original oracle замечает прежний drift и проходит на новой 01/02 | `original_mockup_01_02_composition_conformance` в `tests/screen-layout-conformance.test.ts` |
| Native/canvas не режут новый полный кадр | `v2_native_and_canvas_cover_original_composition_extents` в `tests/browser/clip-layout.test.ts` |

BDD: Given опубликованный v1-02 и клип v2-01 одной записи, When пользователь меняет CTA, Then оба новых задания получают свои прежние request.version/ROI; никакой второй layout intent или upgrade не появляется. Given неизвестный исход submitted v1, When пользователь переключил черновик на v2 и повторил запрос, Then повтор использует прежний v1/key, новый draft ждёт отдельного применения.

Риск HIGH: смешанный deploy reader/writer. Снижение: вначале остановить новые admissions и дождаться terminal running jobs; миграция и все v2 readers до v2 writer, затем smoke и открытие. При недоступной БД переход не начинается. Проверки изолируемы через PG fixtures без реального списания денег; отсутствие инфраструктуры — INCONCLUSIVE. После VPS приёмки провести один review фактических времени/ошибок и записать подтверждённый урок pinned dz, не открывая исторические циклы `zoom-screen-focus` заново.


### Confirmation QER-03/QER-04 (ещё не выполнена)

`tests/zoom-layout-database.integration.test.ts`: actual_database_backup_ignores_container_default_and_restores_exact_rows; admin033_preserves_restricted_runtime_and_prior_journal. `tests/zoom-layout-release.test.ts` через единую fixture/support: database_qualification_failure_has_zero_pause_close_or_stop; database_identity_or_authority_drift_blocks_backup_and_migration. Проверки обязаны использовать actual helper и canonical migrate, реальные две own logical DB/restricted role на existing QE PostgreSQL, без нового DB/Redis stack или постоянных services; ephemeral pinned Node для реального stdin boundary допустим. Ни synthetic unit PASS, ни прежний compatibility run не заменяет эту границу. До независимого review дополнения, actual K1/K2 и root authorization implementation NOT STARTED.
