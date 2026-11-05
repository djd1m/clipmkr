# История предложений до QCSD

R1, 05.11.2026: один succeeded в write scope; два canceled — зависимость. Контрольные суммы
прежних документов сохранены в `r1-proposed-inputs.sha256`, digest этого инвентаря
`0f8dbf4ee81784f1949906996aab7f410701c4cf4023e99ff1201718a05d9e57`.
Это история предложенных байтов, не approval, checkpoint, reviewer receipt или live evidence.
Сами R1 документы пересмотрены на месте до QCSD; старый manifest не проверяет текущую R2.

R2, 05.11.2026: root поручил расширить M на все три known intent исходного плана владельца.
Каждый run меняет только один selected case. Succeeded использует guarded applyVerifiedPayment;
два canceled — guarded markIntentCanceled без финансовых events/grants. Авторизация —
существующий OS/SSH operator; поддельные сессии и password reset для QA-профилей не нужны.
Root дополнительно запросил предложение canary-контракта S/M для устранения цикла
«новый callback требует checkout, checkout ждёт первый callback». S-артефакты не менялись.
R2 не означает утверждение конкретного окончательного плана или разрешение live run.

Маршрутизация остаётся M9: те же code/test files, существующий provider, та же БД,
0 новых tables/migrations/OSS. Новая guarded cancellation ветка требует PostgreSQL
barrier/rollback/replay проверок и независимого QCSD, а не незащищённого вызова старой функции.

R3, 05.11.2026: originating QCSD R2 проведён, quality/risk conditional, testability no-go.
Все 13 исходных условий сохранены буквально, author предлагает structural fixes без closure.
R2 manifest сохранён в r2-proposed-inputs.sha256, SHA-256
`e48d6ce18213e05c764679f9b7b651f2b2d738d84c225ede03a9b055d280f087`.
Изменения: native-first original hash/external API proof; cancellation до S activation под
измеримым off/drained admission, точка no-financial readback; bounded API/PG deadline и
indeterminate COMMIT; canonical period + отказ expired/неожиданного расписания; dry-run без
persistent эффектов; полный canary oracle и exact S dependency hashes. Quota.ts добавлен
десятым кандидатом optional helper options; M9 сохраняется, без нового writer/framework.
R3 — docs rework; код, DB/runtime, reviewer/host receipts и S artifacts не изменялись.
