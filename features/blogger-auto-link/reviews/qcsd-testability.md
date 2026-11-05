# QCSD testability — blogger-auto-link

Роль: qcsd-testability, ideation, family owner-exception; независимая свежая сессия без контекста авторской реализации. Запрошены `gpt-6.1-terra xhigh`; фактический ID модели и effort средой мне не раскрыты, подтвердить их не могу. Вердикт: needs-rework.

Входы: AGENTS.md, docs/acceptance/core-cjm.md, docs/review-policy.md, 01, ADR-001, 05, 06, OpenSpec; выборочно существующие тесты и partner-code. Метод: pinned feature-adr 03.5 и studio-extended-qe reference, без AQE runtime. Авторские success/QE reports не использовались. Host nonce `813d60cc-250b-471a-9b7f-93a8eca5dc3b`, revision `9affd49c615347695e46282dbb48f7db400216624718af8c999a4f1592b97d20`: самостоятельно пересчитаны и совпали 4/4 SHA-256 манифеста (00, 01, ADR, 05). OpenSpec SHA тоже совпал с 01. План 06 не входит в host-manifest и этим сопоставлением не защищён.

## Условие T-BAL-01 — WARNING, structural

[01_requirements.md:35](../01_requirements.md) требует личной принадлежности и изоляции статистики. [06_implementation_plan.md:20](../06_implementation_plan.md) предусматривает конкуренцию для одного аккаунта, [строки 33–36](../06_implementation_plan.md) — HTTP с сервисным stub, [строки 53–58](../06_implementation_plan.md) — полный browser путь только для одного блогера. Имеющийся реальный PG-тест [tests/partner.integration.test.ts:160](../../../tests/partner.integration.test.ts) проверяет отказ чужой статистики старого dashboard, но не новую выдачу через HTTP → service → PG для двух владельцев. Поэтому реализация нового service, игнорирующая account и возвращающая один общий личный код, может пройти перечисленные однопользовательские сценарии и старый тест доступа к статистике; stub проверяет только dispatch.

Воспроизведение для теста: два активных блогера A/B без кодов в изолированной PG, отдельные сессии реального HTTP adapter и service; последовательно и конкурентно вызвать пустой POST. Сверить отличающиеся id/code и владельца каждой строки в БД, повтор/reload каждого, dashboard каждого и 403 при чужом code_id; отсутствие записи/выдачи чужого кода — отрицательный контроль. Тест должен падать при намеренной подмене account либо общем результате.

## Покрытие и ограничения

План отдельно называет PG lock barriers, оба порядка смены роли, 20 callers, ранний blocked, rollback, потерю ответа, browser fallback и состояние upload; это замысел, не доказательство исполнения. Ранний blocked и неутверждённый UX 9365 учтены в документах. Новые тесты, browser, реальная PG и опубликованный E2E в этом документном ревью не запускались; полный CJM, авторизация релиза и корректность готовой реализации не установлены. `verifications` пуст: исправлений и повторного review не было.

Исторические ссылки на план 06 и исходные код/тесты выше — наблюдения initial review; scope условий привязан к измеренным путям исходного host-manifest. Новая авторская ревизия этой коррекцией не проверена.

## Focused originating verification — snapshot a965cc78

Host nonce `a413068f-cab5-4c5b-835a-f6a9ace5aecf`, revision `a965cc78957a5bbc5b972d615ba4c0cc410aafcf4e4413da165c0632a039a14c`: все 4/4 SHA-256 host-manifest самостоятельно совпали. 00 `0af4df96c083be2043b5a3e71013a7b6b46d234edbde7a17fcf1f5c468bd3e02`; 01 `038e24ce2f326e19f23ef5f2d8f25573e9a4693e46038e5b64ad49e56e8c934f`; ADR `94109daf90941ad98bee43ebc224d05ef50073d4acf9d751dd7e47ae83faed32`; 05 `dc457144dee2ceb47a0b432b416b82dfdaab9a1f6021752e5165439589de27ba`. План 06 (не входит в ideation manifest) `38fb96fc67b5bef047a41539e1e6c9d48b432e35b60dc9af8c091d7f7aa44735`; OpenSpec spec `320ac1ea73b4ef2bfba6240c374522bc55f9eeebe1cd930f6b87971a09ad4eb0` совпал с 01:97 и requirements-revision.json:6; mapping FR-5/FR-7 в 01:88–95 соответствует spec:59–69.

**T-BAL-01 — design исправление подтверждено:** 01:37–41, ADR:92–97, 05:55–61 и 06:65–72,114–117 задают две действительные auth-сессии через HTTP/service/PG, последовательные и конкурентные вызовы, повтор, разные id/code, точную DB ownership, собственные dashboard и чужой 403, а также falsifier подмены account на A. Test `two blogger HTTP sessions keep personal link ownership isolated` запланирован, не исполнен.

Авторская structural delta и оценка рисков сверены с 01:31–41, ADR:87–97, 05:40–60 и 06:46–49,61–72,114–117. Изменение blocked copy охватывает и раскрытый список с сохранением действий другой кампании; в этой роли чужие условия не закрываю. Все host.changedPaths входят в author.changedScope. Указанного `.fa-state/author-handoff-ideation.json` нет: фактический `features/blogger-auto-link/author-handoff-ideation.json`, SHA256 `c2a00d1ee65d2a2e06be48d8c70bad4d68444ae8e72eafbd8c209ac92e56fc43`, прочитан и совпадает с receipt.author.

`implementationVerified:true` означает только проверку исправленного design и phase artifacts; тесты, falsifier, PG, HTTP, browser и runtime не запускались, convergence gate не оценивался. Предыдущий отчёт и исходное условие сохранены.
