# Независимое ревью рисков R2 — доступ к исходной записи

**Вердикт: clean по текущему дизайну; новых серьёзных незакрытых рисков не обнаружено.** Это самостоятельная focused-проверка всей структурной дельты и затронутых зависимостей, а не повторение чистого R1. Остаточные риски и запланированные проверки ниже не означают, что реализация или тесты существуют и проходят. Собственных условий R1 и новых условий нет.

Роль `qcsd-risk`, семейство `owner-exception`, новая отдельная сессия `/root/original_video_qcsd_risk_r2`, назначенная модель `gpt-6.1-terra`, effort `xhigh`. Предыдущий R1 выполнен другой, уже завершённой сессией; его история сохранена, её действия здесь не присваиваются. Архитектор — `gpt-6-astra`; разрешённое владельцем исключение cross-model описано в `docs/review-policy.md` и `docs/model-matrix.md`. Метод: SFDIPOT и закреплённый `qe-ref-risk-based-testing/REFERENCE.md`; AQE runtime не запускался.

Host nonce `813cb2be-355a-43a6-8d5c-7199290984c5`, ревизия manifest `d7b8009a27a9111aa6478d38483595af4e8f865212973671d46c169936a284e0`; Git HEAD при первичном чтении `440105c9d70b9732da2bc85fe451d819034af0e7`; затем координатор опубликовал docs-only снимок и HEAD стал `e4b12e76a0295f9a9d3fc2b52872a6ee32c93cbe`. Git HEAD — иная сущность; контроль четырёх измеряемых файлов при записи receipt совпал с host. Независимо пересчитан SHA-256 JSON manifest и каждый из четырёх файлов:

- `00_complexity_assessment.md`: `f2af963d82ed3668babe4f73236eb3d9d30caa404580b4c84bce6b1febaf5e18`;
- `01_requirements.md`: `959179ee8f7a515535c4fdfec0ee99b6e4a0b2f040a580e638e169f2d2609ad9`;
- `03_adr/001-serve-original-through-owned-route.md`: `23c59360d4c9d93e9f72fb347561261921aae652de9457ac354064ee2aab9fbd`;
- `05_architecture.md`: `179fe241dcda4f1b14d4ff8a24bc09d991fc4b5f03c81e204f54dc8c74443a78`.

## Что проверено

Сначала прочитаны требования, ADR, архитектура и OpenSpec, затем reuse inventory, план, актуальные исходники и pinned reference. Host указывает три изменённых измеряемых пути 01/ADR/05; все входят в фактический `author.changedScope`. Дополнительно проверены все 11 pin, 45 refreeze-artifact, 49 design-artifact и 21 read-only dependency hashes — совпадают. В область включены изменения OpenSpec, shift-left, 06, handoff, states HTML/32 снимка/probe и затронутые `VideoDetail`, `ClipCard`, `guest-file`, конфигурации Vitest, shared exports, `video`, schema, S3 operations/presign и clip auth. Проверка хешей изображений удостоверяет их принадлежность снимку, а не визуальную приёмку.

- Пустой список клипов действительно допускает `selectedClipId=null`; текущий poll при появлении клипов выбирает первый доступный или первый. Дизайн задаёт исходник в существующем slot, возврат к актуальному empty-state с focus и без фиктивного выбора; появление клипов, пауза/выгрузка и неизменность существующего DOM закреплены будущим браузерным оракулом.
- Metadata ready после обрыва media не удостоверяет playback: остаётся честная ошибка, одна проверка на попытку и новое явное действие. Таблица различает incomplete/missing/error/404/429/malformed; generation guard и отсутствие авто-reload уменьшают риск позднего ответа и retry-loop. Нативное событие и воспроизводимые байты требуются в будущем тесте, вместо одной metadata-заглушки.
- Исходный `guest-file.ts` использует `AbortSignal.timeout(120000)` на весь поток. Дизайн вводит отдельный deadline только до headers с сохранением disconnect signal; тест определён как реальный native loopback с marker после 125 секунд, параллельным legacy-контролем, отменой upstream за 2 секунды и отдельным timeout 150 секунд. Он пока не реализован и не запускался.
- `originalSourceRevision` закреплён как единственный backend-only shared leaf, не browser/barrel export, с фиксированными version и сериализацией и source alias теста. Это идентичность загрузки, не хеш содержимого; внешняя перезапись принятого key исключена из scope.
- Дизайн повторяет auth/ownership до S3 на каждом GET/HEAD/Range, без browser S3 bearer/redirect; whitelist Range и redirect:error, bounded sniff, честное различение 404/503, MIME по magic без утверждения codec, безопасное сгенерированное имя, server-only TTL≤900 и новый подписанный запрос при seek. Lifecycle исходника не подменяется сроком клипа.

Проверена фактическая оценка автора `changedScope` и `newRisks`: дополнительное согласование восьми UI-состояний остаётся обязательным и явно pending; обычные «Смотреть/Скачать» уже авторизованы согласно переданному координатором контексту. Никакого нового серьёзного риска, требующего собственной condition, при сверке дельты не выявлено. Это не закрывает условия других originating reviewers и не является их проверкой.

## Остаточные риски и необходимое доказательство

Оценки P и I по 1–5 — экспертные, а не статистика; SFDIPOT охватывает структуру, функции, данные, интерфейсы, платформу, операции и время.

| Риск | P×I | Доказательство после реализации |
|---|---:|---|
| S/I: IDOR, guest/owner читает чужие байты | 3×5=15 | Настоящая DB: одинаковый 404 и ноль storage/signing до ownership. |
| S/I: bearer или key уходит в браузер, cache либо log | 3×5=15 | Проверить все ответы, ошибки, telemetry и access logs; no-store/no-referrer, отсутствие redirect. |
| S/P: неограниченный sniff при игнорируемом Range | 4×4=16 | Настоящий HTTP/SDK поток, ограничение 4096 байт и cancel, старые вызовы сохранены. |
| T/P: обрыв длинной выдачи либо утечка при disconnect | 4×4=16 | Описанный 125-секундный real-clock тест и короткие проверки header timeout/body.cancel. |
| I/P: Range/206/416, canvas или provider отличается от mock | 3×4=12 | Ограниченный тест Cloud.ru и native browser seek/canvas; отсутствие credentials = NOT-RUN. |
| D/F: незавершённый/невалидный upload выдаётся | 3×4=12 | Проверить gate, too_large/not_media, актуальные bytes и гонку cleanup через реальные зависимости. |
| D/T: clip retention, временный отказ или expiry выдают ложное состояние | 3×3=9 | Missing и 503 различимы; отдельный source lifecycle и поздний Range с новой подписью. |
| I/P: неподходящий codec или небезопасное имя | 3×3=9 | Magic fixtures, реальные native codec fallback/download и проверка безопасного disposition. |
| F/P: ноль clips, поздние clips, focus или одновременно два media | 3×3=9 | Реальный browser test с poll, сохранением selection/DOM и проверкой pause/unload. |
| F/T: ready ошибочно скрывает обрыв или запускает retry-loop | 3×3=9 | Native playable media и управляемый обрыв, один refresh и только явная новая попытка. |
| S/I: revision web и Zoom расходится или Node crypto попадает в browser | 3×4=12 | Один leaf, fixed vector, оба backend consumers/typecheck и browser bundle. |
| O/P: bandwidth и поведение proxy под реальной нагрузкой неизвестны | 3×4=12 | Измерить на тестовой поставке; оценка по дизайну не доказывает capacity. |
| F/O: просмотр мутирует jobs, credits, growth, retention или ломает legacy | 2×4=8 | Проверка отсутствия writes и существующие signer/guest/upload/retention regressions. |

## Команды и границы

Выполнены read-only `cat`, `rg`, `sed`, `jq`, `git rev-parse HEAD`, `git status --short`, `sha256sum` и локальные Node-скрипты для SHA-256 файлов, сверки списков author/host и пересчёта manifest. Все четыре manifest файла, pin и заявленные dependency hashes совпали; `changedPaths` host полностью покрыты `author.changedScope`. Не запускались приложение, 125-секундный тест, браузерные тесты, PostgreSQL, Cloud.ru, E2E или deployment; UI владельцем пока не принят. Доказательства текущего дизайна не подтверждают code/spec anti-drift и фактическую поставку. Независимое QE и все реальные gates остаются у координатора.
