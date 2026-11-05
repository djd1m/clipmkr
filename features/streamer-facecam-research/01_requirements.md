# Требования исследования

Исходный запрос владельца/root05.11.2026: оценить фокус Clipmkr на стримерах и извлечение facecam автора из композитного stream для постоянного присутствия в9:16. Результат — обоснованное предложение, не утверждённое изменение продукта/OpenSpec.

- FR-1: объяснить ограничения пикселей/идентичности/видимости и различия gameplay/reaction/tutorial/IRL/VTuber. Разделить crop, segmentation, tracking; не обещать отсутствующую/закрытую голову или её генерацию.
- FR-2: сопоставить5–7 официальных продуктовых аналогов, отдельно feature claims и датированные доказательства adoption/traction; непроверенный UI и маркетинговую цифру помечать.
- FR-3: инвентаризировать native Clipmkr renderer; primary OSS license/maintenance/source/release для FFmpeg/OpenCV/MediaPipe/AutoFlip/ByteTrack/YOLO и ColinGPT9/clips-studio; reuse-first без нового стека вслепую.
- FR-4: сравнить manual ROI/channel preset, auto+confirm, tracking, background removal, separate OBS input; предложить простой default + optional advanced, учитывать90/120/customlimit и реальные ресурсы без выдуманных benchmarks.
- FR-5: оценить speech/events/audio/chat selection и VOD access/rights; file upload — baseline, Twitch API не обязательная новая интеграция.
- FR-6: описать pilot fixture matrix и проверяемые метрики visible-input coverage, identity, stability, no-facecut, captions/game detail, manualtime, latency/cost и real-human UMUX. Пилот/люди/медиа не исполняются.
- FR-7: прочитать официальный public dz-harness README/catalog и доступные research модули exactcommit/version; различить applied/read-only; без update pinned harness0.8.58/feature-adr1.5.25. Записать sources/retrieval/date/limits, observation vs inference, honest method без signed-provenance имитации.

Приёмка research: каждый существенный вывод трассируется к primary URL или pinned codepath; publicdocs не содержат личных данных/медиа/секретов, числа pilot не выдаются за замеры. Формальные QE/review outputs вне measured docs. OpenSpec N/A: действующие пользовательские требования не меняются; reference docs/acceptance/core-cjm.md остаётся неизменным. Независимый review после freeze, commit/push только root.

## Уточнения в том же исследовательском scope

Уточнения root до freeze: coding/education рассматривается отдельно от gameplay; строгий facecam-режим — только предложение с покрытием всего экспорта, а не лишь видимого входа. Проверяются дублирование встроенной камеры, потерянный под ней контент и общий cut_plan/D′. Геометрическое переиспользование не переопределяет старый dual «два человека»: будущая реализация требует явной дельты требований/ADR и макета. Локальная техническая оценка коротких разрешённых фикстур отделена от полного рыночного CJM-пилота, для которого важна надёжная доставка/поддержка. Компактно сопоставляются SAM 3, OBS Background Removal и RVM без выбора нового стека. Реализация и пилот не разрешены этим исследованием.
