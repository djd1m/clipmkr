# QCSD testability — originating recheck R3

**Результат своей роли: CLEAN на стадии design.** Собственное исходное условие UXT-001 проверено по текущим требованиям, ADR, архитектуре и proposed plan. Его смысл сохранён; требуемый проверяемый контракт и различающий отрицательный контроль теперь заданы. Это не означает исполнения теста, работающего guard или закрытия общего convergence.

## Идентичность и проверенные входы

- Роль `qcsd-testability`, `owner-exception`, прежний владелец UXT-001. Запрошены `gpt-6.1-terra xhigh`; автор по заданию — Astra. Аттестации фактического model ID/effort от провайдера нет.
- `features/ux-simplification/implementation-design-inputs-r3.sha256`: собственный SHA-256 `191a937786aeed05315e90f8f2430fa3967a98eb7a89996c15e3cac522fc9692`; `sha256sum -c`: **98/98 OK**. Approved HTML `docs/design/2026-11-05-ux-simplification.html`: самостоятельно измеренный SHA-256 `a85b3f073a335871e421ea2079269fa19c71f42a263d7b0bd17ae30469c50e68`.
- Текущий host snapshot: nonce `8eff00a1-1ae5-4320-97e9-1615f6d0ba20`; revision `8089a54c3cb9281c79972e951c318814e62a3eff7829abcecdf1fd40ab680659`. Все 7 path/digest перечитаны; собственный SHA-256 компактного JSON измеренного manifest совпал с revision. Host не изменялся, prepare/evaluate не вызывались.
- Прочитаны актуальные `01_requirements.md`, ADR-001/002/003, `04_domain_model.md`, `05_architecture.md`, proposed `06_implementation_plan.md`, `author-response-qcsd-r3.md` и genuine author object текущего receipt. R2/R3 текстовые отличия четырёх перечисленных автором design-файлов сопоставлены самостоятельно; дополнительно прочитаны релевантные исходники и существующий upload fixture. Чужие verdicts не использовались.

## UXT-001 — HIGH, structural: исправление design проверено

Исходное условие не переименовано и не ослаблено: нужен действительный trigger navigation guard на новом Account Link во время активной передачи, dismiss сохраняет URL и передачу, accept безопасно завершает переход, idle не вызывает предупреждения, отключение guard обнаруживается тестом.

- `01_requirements.md:22,49` связывает отдельный Account Link и активный upload с guard; `03_adr/001-place-context-in-existing-pages.md:84–90` требует настоящий Header/Next Link/router вместе с `VideoUploader`, задержанный client PUT и наблюдение именно confirm, а не лишь наличия listener.
- В `ADR-001:86` dismiss оставляет URL/attempt, передача продолжается; accept инвалидирует попытку и прерывает незавершённые запросы до одного перехода, поздний ответ не запускает новый complete/navigation. Idle/accepted не показывают confirm. `ADR-001:88` не обещает отмену уже отправленного complete на сервере, описывает unknownComplete/recovery и ограничение same-document Back без history trap.
- `05_architecture.md:197` увязывает реальные Header/PartnerPanel anchors, uploader и сценарии active/idle; `04_domain_model.md:89` фиксирует lifecycle владельца. Proposed `06_implementation_plan.md:91,99,106` связывает UXT-001 с задачами TASK-1/5, будущим target `tests/browser/ux-simplification.test.ts`, выбранным browser config и фактическим отрицательным прогоном после реализации.
- **Confirmation:** `account_link_active_upload_guard` должен на удержанном PUT фактически увидеть confirm для mouse/keyboard Account, проверить dismiss/accept/idle и URL/attempt/network; отключение capture guard должно сломать dismiss case. Старый `tests/browser/upload-lifecycle.test.ts:25–42,187–195` использует fixture `#away` и mocked router: он по-прежнему не заменяет новую integrated проверку. Нынешний `Uploader.tsx:34–38,55–68` даёт наблюдаемые attempt/capture/invalidate границы; это source inspection, не runtime доказательство.

Дизайн закрывает именно пробел тестопригодности; будущий сценарий, browser support и RED после мутации ещё не проверены. Неподдержанный dialog помечается ограничением, не PASS (`ADR-001:88`, `06_implementation_plan.md:106`).

## Genuine author handoff, delta и новые риски

Авторский объект связан с текущими nonce/revision, содержит UXT-001 в `addressed`, `classification=structural`, а `changedScope` включает все шесть путей host `changedPaths`. `author-response-qcsd-r3.md:3–11` отделяет R3 UXR-02 от девяти унаследованных R2 исправлений и прямо оставляет проверки открытыми; я самостоятельно проверил своё условие на текущих байтах, а не принял этот авторский перечень за closure.

Сопоставление четырёх R2 snapshots с текущими файлами показало фактическую R3 дельту в ADR-002, domain, architecture и proposed plan: `ADR-002:51–60` фиксирует pre-mutation baseline, fresh post-ack read, отдельные unknown/concurrent/failure ветви и контролируемые отрицательные случаи; `04_domain_model.md:87,91`, `05_architecture.md:198,208`, `06_implementation_plan.md:96,110` согласуют владельца, порядок и тот же существующий test target. `apps/web/src/server/clip-music.ts:40–50` подтверждает основание ограничения: ack содержит clip_id/rerendering, но не version/operation ID. Изменения этого алгоритма и проверка его исходного условия принадлежат соответствующему originating reviewer; мой вывод ограничен влиянием на testability и UXT-001.

Новых материальных рисков в затронутой мной части не выявлено: изменение music read reconciliation не меняет Account Link/guard contract, и план сохраняет отдельные тесты обеих границ. Авторский риск отсутствия operation ID явно отражён в `ADR-002:58–60`; это граница дизайна, а не доказательство успеха конкретной операции. Полное отсутствие иных рисков по проекту не утверждается.

## Пределы и anti-drift

Design verification означает независимое прочтение исправления на текущем snapshot, не проверку будущей реализации. Приложение, кодовые тесты, browser/UI/E2E, provider и инфраструктура **NOT RUN**. Действующие компоненты, новые SSR pages и плановый test не проверены в работе; установленное условие остаётся в receipt с отдельной design-verification. После кода нужны фактический guard TRIGGER и RED/восстановление, code/spec anti-drift, независимый QE, реальные convergence/K1/K2 и последующая ручная приёмка. Решение своей роли не разрешает Step7.
