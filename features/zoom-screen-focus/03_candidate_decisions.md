# Вход архитектору: candidate ADR, не принятые решения

Шаг3 ещё не выполнен независимым архитектором. Эти кандидаты не размещаются как accepted ADR
и не заменяют Confirmation/shift-left. Основа — ZF01–10, OpenSpec hashes из requirements-revision.json.

## A. Выделить screen+camera composition из podcast framing

Контекст: legacy face follow может исключать экран; camera bbox не определяет semantic action.
Предложение: аддитивный versioned layout config со screen ROI, camera ROI и explicit01/02/03;
нормализованные координаты валидируются на границе и преобразуются в чётные crop по реальному
probe dimensions. Separate screen mode fallback сохраняет экран. Один stream split и общий cut_plan.

Альтернативы: (1) overload single/dual и face follow — меньше нового кода, но смешивает смысл dual;
(2) отдельный ML action detector — потенциальная автоматизация, новые зависимости/неизмеренная точность;
(3) versioned screen compositor + ручное подтверждение областей — предсказуемый старт, цена ручного шага.
Архитектор должен отдельно решить, как обнаруживать discontinuity и когда fallback запросит уточнение.
Не обещать tracking всех Zoom layouts. Лицо отсутствует — no fake/static face.
Confirmation candidate: реальные pixel/time assertions на synthetic mixed-layout/odd-resolution источниках;
legacy single/dual/center тот же результат; watermark last и защищённая action ROI.

## B. Хранить render intent отдельно от опубликованных settings

Контекст: простой UI selection не должен запускать оплаченный render; worker может упасть или опоздать.
Предложение: explicit apply с expected published version/idempotency identity, серверным владением/retention/
quota и атомарным lease по каноническому lock video→clip; принятые settings и published settings разделены.
Старый объект доступен до успешной fenced publish. Новый source credit charge не создаётся.

Альтернативы: (1) записывать choice сразу — простой UI, но неясная публикация/лишние mutations;
(2) хранить только client draft до render и передавать произвольный payload worker — без миграции,
но недолговечный/непроверяемый intent; (3) durable versioned intent — migration/consistency cost,
зато восстанавливается после timeout и отделяет current MP4 от request.
Confirmation candidate: real PostgreSQL concurrent apply, exact retry, conflict, no credit changes,
failed/stale publication и quota rollback. Инженерно решить reuse с music/CTA без общего god service.

## C. Разместить надписи вне области действия

Контекст: podcast ASS margin может закрыть screen; camera PiP тоже занимает полезную область.
Предложение: явные output zones для screen, camera, subtitle, teaser, CTA и watermark на01/02/03;
при конфликте не молча закрывать важный UI, а расширить контекст/объяснить ограничение до apply.
Альтернативы: inherited podcast zones — меньше работы, перекрывает экран; универсальный auto-placement —
потенциально удобнее, но нужны OCR/saliency/новые доказательства; фиксированные согласованные zones —
проверяемы, но ограничивают размер action ROI. Confirmation: pixels+browser390/1440+owner media acceptance.

## Архитектурная разработка11.11.2026

Исходные кандидаты раскрыты в `03_adr/001…004`, `03_shift_left.md`, `04_domain_model.md`, `05_architecture.md`. Это proposed dossier для независимого QCSD; accepted ADR/checkpoint этим дополнением не создаётся. Новая cached seed-analysis явно отражена в01/OpenSpec v2.
