# QCSD: качество по HTSM — zoom-layout-mockup-conformance

Дата: 16.11.2026. Роль `qcsd-quality`; отдельная сессия `/root/conformance_qcsd_quality`, модель `gpt-6-astra`, effort `xhigh`, family `owner-exception`. Область — ideation: требования, ADR, архитектура, план и проверяемость будущих результатов. Продуктовый код не изменялся; тесты, рендеры, миграции и deploy не запускались.

**Вывод роли: GO / clean на уровне ideation.** Оценены 10/10 категорий HTSM; взвешенная проверяемость плана **90,8/100**. Новых условий исправления дизайна не выявлено. Это не финальный вердикт всего QCSD, не K1/K2, не подтверждение реализации или готовности выпуска. Обязательная квалификация типографики остаётся незавершённым запланированным барьером до K2, а не доказанным дефектом.

## Независимость и входы

Этот запуск контекстно независим: получил документы и самостоятельно посмотрел затронутые существующие контракты. ADR/архитектуру план называет работой Astra; данная Astra-сессия **не является cross-model проверкой этих документов**. По уточнению координатора это дополнительная обязательная core-роль QCSD; отдельная Terra-проверка планового пакета сохраняется отдельным основанием. Её отчёт/выводы не использовались как доказательство. Будущий Sol-код требует собственного свежего Astra code review/QE.

Прочитаны `AGENTS.md`, применимые требования `CLAUDE.md`, `docs/acceptance/core-cjm.md`, `docs/review-policy.md`, `docs/model-matrix.md`, установленный `modules/03.5-ideation-swarm.md` и его pinned reference. Применяются пороги установленного feature-adr module, а не отличающиеся пороги upstream reference.

Основные входы: `00_complexity_assessment.md`, `01_requirements.md`, весь `03_adr/001-original-composition-compatibility.md`, `05_architecture.md`, `06_implementation_plan.md`, `owner-approval.md`, `03_shift_left.md`, OpenSpec delta `openspec/changes/zoom-layout-mockup-conformance/specs/screen-face-layout/spec.md`. Все пути без префикса относятся к текущей feature.

Binding прочитан из actual host-файла; четыре digest manifest самостоятельно пересчитаны и совпали:

- Phase `ideation`, nonce `648a76dc-4aa9-40f4-8604-5d803fb9061e`.
- Manifest revision `a1a7daea0e719964423c5250f716ad6b7858ef1e8799f86471c90cd92ee133bb`.
- Рабочий Git HEAD `0cbe2e9194eaff9597341f91f04528097da2711a`; manifest revision не является Git SHA.
- Дополнительный план SHA256 `1e15df4b27845f08c7ddec31220fe3deac8c769f351d18d55fafbc9665132722`.
- Approval SHA256 `9cff0de2d45731d4c0c082d5716735645739940ee3d6cb0d2fa80f1d5097caa6`.
- OpenSpec delta SHA256 `f080b63cb5d39d38b5f4768fc5d4038a09b325eb69e9e3d92a9bc1cdea05912e` совпал с требованиями.

Флаги scope: HAS_UI=true, HAS_UX=true. Новая auth/security функциональность отсутствует; HAS_SECURITY=false в смысле классификации feature, но существующие access/foreign-account и parser границы проверяются ниже. Tier M — три core роли, без дополнительных conditional agents.

## Все десять категорий HTSM

Вес отражает относительный риск данного изменения и суммарно равен 100%. Проверяемость 0–100 оценивает ясность наблюдаемого критерия, управление входом и предусмотренную проверку; это экспертная оценка плана, не измеренная доля пройденных тестов. Вклад = вес × проверяемость / 100.

| Категория | Вес | Проверяемость | Вклад | Критерий качества и предусмотренное доказательство |
|---|---:|---:|---:|---|
| Capability | 20% | 94 | 18,80 | MC-01…05: original01/02 на контрольных ROI, ≤2px на 1080×1920, contain для иных aspect. TASK-02/04: независимый original oracle, содержательный RED прежней геометрии, native/canvas extent checks. |
| Reliability | 16% | 92 | 14,72 | MC-06/07: old MP4 доступен до успешной публикации, replay не меняет request/version и не удваивает debit, no-camera/unsupported fallback. TASK-03/05: real PG concurrency/replay/publication negatives; TASK-04: движущиеся маркеры и единый timebase. |
| Usability | 14% | 88 | 12,32 | MC-04/05: local draft, явный upgrade, достижимая независимая height, честный текст прежней ROI, reviewed reset. TASK-05 + browser matrix: 360/390/1440, keyboard/focus/contrast, reload/poll/logout; отдельно полный просмотр и скачивание на VPS. |
| Charisma | 14% | 90 | 12,60 | MC-01/02/03/07: исходная композиция, живой PiP, отсутствие обрезки панелей, читаемые overlays. TASK-01: реальные glyph/plate bbox до K2; TASK-04: raster mask; TASK-08: кадры 0/10/19с и непрерывное воспроизведение. Screenshot с заглушкой не выдаётся за проверку частного видео. |
| Security | 8% | 90 | 7,20 | Сохраняются авторизация/foreign404, строгие API/storage JSON, account-scoped drafts, закрытые source/media. TASK-03/05: invalid version/keys/focus/ROI, version-substitution, foreign/stale/expired scenarios; evidence исключает URL/секреты. Нового auth-протокола нет. |
| Scalability | 3% | 80 | 2,40 | Новый сервис/детектор/очередь не добавляются; число декодеров и worker concurrency остаются прежними. План сохраняет source guard concurrency=1 и bounded crop. Масштабирование не является новой возможностью; capacity/load SLA этим ревью не подтверждён. |
| Compatibility | 10% | 94 | 9,40 | ADR-001: explicit v1/v2, envelope1, прежние canonical bytes, no-upgrade-on-read, mixed music/CTA. TASK-03/04: v1-01/02/03/null, populated032→033, odd/rotated/SAR; Chromium + WebKit smoke. C0 отдельно проверяется на своей ревизии. |
| Performance | 5% | 82 | 4,10 | Полный canvas/FFmpeg frame повышает площадь промежуточной композиции; один decoder/timebase и отсутствие loop/freeze ограничивают изменение. TASK-04/07: native playback, all-frame sequence, browser smoke и фактическое измерение времени проверок. Нового p95 обещания нет; численный performance benchmark не придуман. |
| Installability | 6% | 91 | 5,46 | TASK-06/08: host/source/image/evidence binding, guard внутри ограниченного write entrypoint, pause/drain/backup, readers до writer, real migration journal и C1→C0 rollback на isolated clone. После v2 writes запрещены pre-v2 runtime/down migration/восстановление поверх новых данных. |
| Development | 4% | 94 | 3,76 | Minimal union consumers вместо параллельного framework; независимый immutable oracle, точные исходные anchors, meaningful mutations, стабильная ревизия для QE, проверки без silent skip. У каждого изменения есть target/test/owner; source guards не ослабляются ради GREEN. |
| **Итого** | **100%** | **90,76 weighted** | **90,76** | **10/10 категорий явно рассмотрены; округлённо 90,8/100.** |

## Существенные риски и фактическое покрытие плана

1. **Одинаковая ошибка preview и MP4.** MC-03, TASK-02/06 требуют expected из immutable original, отдельный RED по позиции/масштабу и мутации. Паритет двух реализаций прямо не считается доказательством оригинала.
2. **Незаметное изменение старого клипа после музыки/CTA.** ADR-001 хранит request.version, TASK-03 проверяет каждую v1/v2 композицию и mixed batch; нет backfill и default-to-latest.
3. **Обрезка нового 02 прежним pane 400..1200.** Архитектура задаёт полный frame для v2 при сохранении v1 ветки; TASK-04/06 требуют реальные bounds и мутацию pane. Существующее ограничение подтверждено чтением canvas/native кода.
4. **Перекрытие screen/camera текстом.** Реальный glyph/outline/shadow fit ещё неизвестен; TASK-01 задаёт численные полосы, шрифт 48→46→44 и STOP до кода/K2 при неуспехе. Это корректно ограниченный эксперимент, не пропуск и не уже найденный дефект.
5. **Dirty draft/poll/unknown response превращается в незапрошенный upgrade или повторный debit.** ADR и TASK-05 отделяют immutable submitted snapshot/key от draft; открытие и повтор не меняют версию. Browser + real PG checks прямо перечислены.
6. **Новый writer на несовместимом reader или ошибочный rollback.** TASK-08 устанавливает terminal drain, reader-first, миграцию без нормализации, C0 immutable image и отдельный rollback rehearsal; запрет destructive rollback сформулирован явно.
7. **Release evidence расходится с реально запускаемым образом.** TASK-06 требует guard внутри самого executor, неизменяемые bindings и fail-before-write negative cases; до POST-APPLY нет ложного заявления о готовом QA URL.
8. **Успех на одной записи выдаётся за универсальную поддержку.** MC-01/02 ограничивают точный эталон контрольной геометрией; остальные размеры проверяются contain/fallback. План отдельно ограничивает live proof одной записью и не закрывает им полный core CJM.

Указанные риски уже имеют требуемые действия в измеренном дизайне/прочитанном плане. Нового незакрытого BLOCKER/CRITICAL/HIGH, требующего amendment от этой роли, не найдено. Не добавляю формальный condition для уже заданной будущей проверки: исполнение её барьера проверяется на следующем соответствующем этапе.

## Самостоятельная сверка и ограничения доказательства

`rg`/чтение подтвердили существующий strict v1 parser в `packages/shared/src/screen-layout.ts:55`, `COALESCE` intent/published и canonical equality в `packages/db/src/render.ts:32`, изменение render_version music/CTA без layout intent, canvas clip в `apps/web/src/app/clips/ClipLayoutPreview.tsx:23`, native y400 pad в `apps/worker/src/render/screen-layout.ts:47`. Фактическая migration — `packages/db/migrations/032_clip_layout.sql`; её v1 intent CHECK и внешний envelope1 прочитаны. Первое чтение по неверно предположенному имени migration завершилось exit2; путь найден через `rg --files`, затем чтение правильного файла завершилось exit0. Это не дефект продукта и не тестовый результат.

`python3` с hashlib пересчитал четыре host-manifest digest и дополнительные входы: exit0, 4/4 MATCH; `git rev-parse HEAD`: exit0. Проверка hashes устанавливает binding, но не истинность приёмочных утверждений. Наличие существующих test files найдено через `rg --files`; ни текущие, ни будущие named tests не выполнялись и не названы PASS.

В этой роли не выполнялись numerical/raster comparison original, шрифтовая квалификация, браузер, FFmpeg/PG/Redis/S3, фактический runtime inventory, performance/load test или owner acceptance. Будущие проверки обязательны в соответствующих задачах; чтение их описания не доказывает результат. Receipt фиксирует только первоначальный ideation review без условий и без author rework/delta verification.

## Адресная проверка rework QT-01, 16.11.2026

После первоначальной оценки другая core-роль выявила пропуск release suite в явной команде общего прогона. В этом повторе прочитаны actual host lineage и author handoff, diff плана и затронутые TASK-06/07, MC-08, AM-7, а также `scripts/test.mjs`. Полный HTSM review и продуктовые тесты не повторялись.

Изменения ровно два: в обязательную команду `npm test -- …` добавлен `tests/zoom-layout-release.test.ts`; AM-7 связывает реальный отказ самого executor до write с `current_vps_apply_fails_before_any_write_on_invalid_or_changed_evidence` и требует count/exit/skip на том же candidate. Runner передаёт указанные пути в `vitest run` и добавляет обязательные reporters. TASK-06 уже содержал этот suite, отрицательные входы и наблюдение нулевых write side effects. Следовательно исправление устраняет пропуск выбора уже требуемой проверки и не расширяет scope приложения/выкладки.

Author classification **structural** подтверждена: меняется обязательное исполняемое покрытие release gate, а не только формулировка. Plan SHA256 после изменения: `83f3d971e21b0624b2003baeb169cc9a4ace592ebad5cae51fb8470bf5b4a9d4`. Host nonce/revision остались прежними, поскольку план не входит в четыре измеренных ideation input; четыре manifest digest снова проверены при записи receipt. Собственных условий у `qcsd-quality` нет; право закрыть `QT-01-release-test-invocation` остаётся у `qcsd-testability`.

Новых существенных рисков от изменения не найдено. Будущий `tests/zoom-layout-release.test.ts` пока отсутствует: это допустимо для текущей ideation, но его выполнение, ненулевой count и отсутствие mandatory skip должны быть подтверждены при implementation/QE. AM-7 и поправленная команда не считаются успешным тестом. `deltaVerification.implementationVerified=true` означает проверку исправленного **плана текущей ideation**, а не проверку будущего executor.

Прочитан новый `03_typography_qualification.md`: он сообщает bounded эксперимент 3/3 subtitle cases при font46 и 8/8 footer/title cases. Это обновляет сообщённый координатором статус относительно первоначального отчёта выше. Raw rasters/приватные scripts в данном адресном review не проверялись; независимый app-QE или универсальная гарантия fit отсюда не выводятся.
