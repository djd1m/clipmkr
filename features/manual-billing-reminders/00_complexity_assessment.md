# Сложность ручных напоминаний

Task kind: feature

r2,11.11.2026: **M,12баллов**:11–20source/test files→3; billing/mail в1–2contexts→2; new providers0→1; breaking0→1; одна journal-модель→2; auth/PII/idempotency→3. Предварительную оценку уточнить по final targets. Active0→1→3→3.5→5light→6→7→8; DDD/fleet не требуются.
Автоплатежи отменены; остаются письма3/1 и manual checkout. Оферта уже поставлена one-time-offer9312564; правовой implementation/gate отсюда удалён. Payment-environments030 идёт первым; наша additive031, existing mail/watchdog без нового runtime. Ограничение dispatch≤4/tick/≤2concurrent,20s admission предотвращает batch100×8s.
Нужны genuine fresh QCSD/K1/K2 и independent source QE, real PG barriers/HTTP/native Next auth→mail→upgradeGET. Requirements/ADR и fresh QCSD нормативного контракта выполняются параллельно завершению payment-environments. 06 — после QCSD; код/031 — только после final accepted030 source merge, фактического recheck/pins и K1/K2. Поставка2 предшествует поставке3. Documents proposed, originalbase/state не сбрасываются.
Модели из owner matrix: архитекторAstra xhigh; реализацияSol high; QCSD дизайна freshTerra xhigh; source QE freshAstra xhigh. Эти роли не означают, что проверки уже запущены.
