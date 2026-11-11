# ADR-001: Сохранить серверную власть над источником при автозаполнении приглашения

## Status
proposed — обратимо до реализации; пересмотреть при изменении cookie/source policy или формы серверного ответа. Дата: 11.11.2026. Автор: отдельная сессия `gpt-6-astra xhigh`; это архитектура, не независимое QE кода.

R2, 11.11.2026: originating QCR-QUALITY-1/QCR-RISK-1 отклонили сокращение утверждённого notice до общего текста. Решение ниже пересмотрено в состоянии proposed: обе строки макета и фактически применённый публичный код обязательны. QCR-TEST-1 добавляет проверку двух уже существующих потребителей. Root разрешил этот design repair; собственное закрытие условий остаётся за originating reviewers.

## Context
Существующий `/r/:code` сохраняет подписанную HttpOnly-cookie и перенаправляет на `/`, но AuthForm показывает пустое закрытое поле. `PartnerService.apply` уже устанавливает source, проверяет владельца и записывает attribution; отображение значения не должно превращать passive cookie в explicit при expiry между SSR и submit. Реализация должна сохранить existing-registration skip, ordinary login и единственный AuthFlow.

Нормативный вход: `01_requirements.md` SHA256 `c92408460509477f853f586e792412ef418a716b49a3927c5ff80f354f5bb9f7`; OpenSpec `openspec/changes/referral-registration-prefill/specs/referral-registration/spec.md` SHA256 `75bdcc8a049109df016ed5b3540880700ccf48a11cd0d6fd599316816e654516`. База `74ea7a6bae354a1cf1fdaec1af01a957cd421137`. Покрываются FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-2.

## Decision Drivers
1. D1, high: единственный серверный владелец source и отсутствие ложного подтверждения.
2. D2, high: код виден сразу в согласованной форме; нет утечки cookie или чужого кода через cache.
3. D3, high: advisory lookup не делает общую страницу недоступной.
4. D4, medium: минимальный diff, существующие блоки и проверяемость настоящим HTTPS/PG путём.

## Considered Options
| Вариант | Преимущества | Недостатки |
|---|---|---|
| Request-scoped SSR display + прежний apply | Код доступен при первом рендере, нет нового endpoint, используются текущие подпись и active lookup | Один дополнительный DB read при пригодной cookie; display может устареть до submit |
| Клиентский authenticated/advisory read endpoint | Не добавляет ожидание DB к HTML, можно обновлять display отдельно | Новый публичный контракт и обработчик, лишний запрос/мигание, сложнее гонки и защита cache |
| URL/query или JavaScript-readable cookie | Самое короткое клиентское заполнение, не требует display DB read | Значение нельзя считать проверенным; меняет privacy/trust boundary и рискует повысить stale autofill до explicit |

Для финального кода рассмотрены два серверных источника. Повторный SELECT в узком RPC wrapper по возвращённому partner_code_id сохраняет тело apply, но добавляет I/O **после COMMIT**: его отказ может представить уже выполненную запись как failed request и привести к 409 при retry. Выбран код из **уже существующего locked SELECT** в apply: добавить c.code и связать с partner_code_id `RETURNING` result. Цена — аддитивная return projection одного метода; общий тип записи Attribution и input policy не меняются. Новая domain API/endpoint/lookup service не оправданы.

## Decision
Использовать первый вариант, сохранив разделение advisory display и authoritative apply.

1. Добавить `apps/web/src/server/referral-prefill.ts`, export `readReferralPrefill(header, secret, links): Promise<string|null>`. Существующий `readReferral` читает **raw Cookie header**, поэтому duplicate cookie не теряется в предварительном разборе. При null helper не вызывает DB. При валидной cookie вызывает только `PartnerLandingService.find`, возвращает только `link.code`; `recordView` не вызывается.
2. Page передаёт в helper `getRuntime().config.sessionSecret` и `new PartnerLandingService(getRuntime().pool)`. Pool уже singleton; нового соединения/пула, `serverDb` или endpoint не создавать. `headers()` и существующий `requestTheme()` сохраняют динамический request-scoped render; никаких `force-static`, global/React cache или `unstable_cache` для этого результата.
3. `UploadError` 404 означает отсутствующий display без positive notice. Неожиданный отказ lookup: `null` и одна фиксированная категория `referral_prefill_lookup_unavailable` на уровне warn, без error object, header, code, secret или URL. Базовая форма остаётся доступна; это узкий advisory fallback, не catch вокруг auth/apply.
4. Prop `referralCode?: string|null` проходит Page → Landing → единственный AuthForm. При первичном непустом значении input заполнен и details раскрыт. Оба согласованных текста показаны в register mode до ручного редактирования. Без кода — пустое закрытое поле. Существующие DOM nodes и draft при переключении mode сохраняются.
5. Первое пользовательское `onInput` ставит sticky флаг ручного редактирования. Нет редактирования — `code.apply({})`, даже если строка видна; редактированное непустое поле — `{code: trimmedValue}`; очищенное — `{}`. Возврат строки к начальному значению остаётся ручным намерением. Сервер всё равно решает source: совпадение ручного кода с живой cookie сохраняет cookie/guest source согласно baseline.
6. Узко расширить `PartnerService.apply` return projection до `Promise<(Attribution & { applied_code?: string }) | null>` без правки общего `Attribution`. В уже имеющийся locked SELECT кодовой строки добавить `c.code`, сохранив его WHERE/joins/locks. После успешного COMMIT вернуть прежние поля плюс `applied_code: code.code` **только** если result.status равен pending/activated, result.reject_reason===null, не self и `result.partner_code_id === code.id`; иначе оставить прежний result без applied_code. Это связывает публичный код с реально возвращённой сохранённой attribution. Не менять input, source, replacements, INSERT/UPDATE/RETURNING SQL, events, locks или transaction boundaries. Нет дополнительного I/O после COMMIT; код подтверждает snapshot успешного применения, не вечную активность ссылки.
7. После успешного auth capture reply `rpc<unknown>('code.apply', ...)`. Combined notice разрешён только для не-array объекта с непустыми строками `id` и `partner_code_id`, `status` pending/activated, `source` cookie/guest_link/explicit, `reject_reason === null` и строкой `applied_code` действующего формата `[A-Za-z0-9_-]{6,12}`. Компактный локальный predicate, без новой схемы/экспорта/подсистемы валидации. Same-origin authenticated сервер владеет принадлежностью; клиентский shape check её не заменяет. SSR prop/input/URL никогда не участвуют в выборе final code.
8. `AuthFlow` расширяется вариантом `created_with_referral` и transient code из текущего пригодного reply: первая строка «Аккаунт создан. Приглашение применено.», вторая «Регистрация по коду CODE учтена.». Он выбирается только для `pendingRegistration === 'created'`. Null/пустой/malformed/missing-code/rejected/partner_deleted дают прежнее created notice, ошибка остаётся в retry/discard; discard всегда generic created. Existing не вызывает apply/signup и сохраняет existing notice; ordinary login вызывает apply как прежде, без нового registration notice. Код хранится только вместе с текущим in-memory notice и исчезает по прежним navigation/dismiss/refresh правилам.

## Rationale
- D1: untouched→{} оставляет окончательное решение серверу в момент apply; final code получен из locked DB-строки, сопоставленной с persisted result, а не transport success или SSR. Additive projection сохраняет прежние потребители; post-commit enrichment добавлял бы новый частичный failure state.
- D2: request-scoped SSR удовлетворяет согласованному первому экрану; raw header сохраняет проверку duplicate cookie. URL/client cookie проигрывают по trust boundary.
- D3: только advisory read деградирует в отсутствие display; серверные записи не маскируются. Клиентский endpoint уменьшил бы задержку HTML, но не оправдывает дополнительную поверхность.
- D4: используются readReferral, PartnerLandingService.find, singleton runtime и существующий notice lifecycle. Новый state machine/provider и DB migration не нужны.

## Consequences
### Положительные
Пользователь вводит только почту и пароль; source policy и защита повторной регистрации остаются у прежних владельцев.

### Отрицательные / принятые ограничения
Display может устареть после SSR; текст прямо обещает проверку после создания аккаунта, apply revalidates и сообщает фактически сохранённый code. При lookup outage поле временно пусто; warning позволяет выявить отказ. Дополнительный SSR read использует существующие pool/DB ограничения, без собственного retry или Promise.race, оставляющего незавершённый запрос. Изменение props при refresh не должно перетирать ручной draft: initial autofill устанавливается один раз на mounted form. Ответ apply расширяется аддитивно: старые клиенты игнорируют поле; текущий клиент при старом сервере без поля показывает только generic created. Совместимость и точное persisted соответствие проверяются на настоящем Next/PG, старые null/errors/legacy assertions сохраняются.

### Следующие ADR
Не требуются: схема, attribution policy и конфигурация не меняются.

### Проверка после выпуска
Владелец — root/сопровождающий Clipmkr; через месяц после приёмки или при первом сообщении о пустом приглашении/неверном notice сверить warning и актуальный native сценарий.

## Confirmation
- Метод: unit negative controls, реальные компоненты Chromium/WebKit, built Next за HTTPS с изолированными PG/Redis.
- Monitoring: фиксированный warning и существующие growth_event/attribution; новые business events не вводятся.
- Метрика успеха: все нижеперечисленные свойства проходят, без skip/no-match; ноль лишних link_view и ноль чужих display-кодов.
- Владелец: автор Sol выполняет проверки; независимый свежий Astra проверяет их и implementation по текущему SHA.
- Load-bearing property: проверенный display никогда не повышает untouched cookie до explicit; проверка `referral untouched expiry submits empty input` в `tests/browser/public-entry-cabinet.test.ts` и `referral HTTPS invitation registers without manual code` в `tests/browser/repeat-registration-next.test.ts`.
- Load-bearing property: degraded/invalid display не раскрывает код и не ломает страницу; проверки `referral prefill rejects invalid evidence before lookup` и `referral prefill degrades on unavailable lookup` в `tests/referral-prefill.test.ts`.
- Load-bearing property: positive notice и конкретный code только от пригодного reply; проверка `referral notice requires confirmed attribution` в `tests/browser/public-entry-cabinet.test.ts` включает missing/invalid applied_code и SSR A → reply B.
- Load-bearing property: applied_code соответствует записанному partner_code_id, а не SSR/input; проверка `referral HTTPS confirmation uses persisted code` в `tests/browser/repeat-registration-next.test.ts` сравнивает настоящий HTTP reply с JOIN attribution→partner_code в PG и UI, включая изменившуюся cookie/manual code/expiry.
- Load-bearing property: несогласованный transaction result не получает applied_code; negative `referral apply confirmation omits unbound code` в `tests/referral-prefill.test.ts` контролирует mismatch/rejected/self; этот локальный тест не выдаётся за SQL correctness.
- Load-bearing property: один реальный путь отражается ровно один раз у обоих потребителей; проверка `referral HTTPS registration increments both canonical projections once` в `tests/browser/repeat-registration-next.test.ts` читает PartnerService.dashboard и bloggerReport до/после, проверяет chosen+1/foreign0 и повторное чтение.
- Load-bearing property: request isolation и read-only SSR; проверка `referral HTTPS display is isolated and read only` в `tests/browser/repeat-registration-next.test.ts`.
- Load-bearing property: существующий auth/credit/attribution контракт сохранён; прежние existing/legacy/normal-login assertions в `tests/browser/repeat-registration-next.test.ts` остаются, кроме точного нового created+valid-referral текста.

## Shift-left: Level 4 до кода

Применены pinned `qe-ref-shift-left-testing/REFERENCE.md` и `code-impl`; AQE runtime не запускался. Это анализ дизайна, не успешные тесты.

| Вопрос | Ответ и проверка |
|---|---|
| Что при нагрузке/задержке DB? | Не более одного lookup на signed valid-cookie render, ноль для no/invalid-cookie. Действующие pool max10, connectionTimeoutMillis3000, statement_timeout5000 ограничивают ожидание; retry не вводится. Negative resource-down control проверяет null и отсутствие raw error в warn. |
| Что при изменении времени/источника? | Display advisory. После удаления/expiry cookie untouched остаётся `{}`; invalid manual не падает обратно на cookie; cookie A после ordinary B и guest priority читаются из effective cookie. |
| Что при недоступном внешнем ресурсе? | Новых внешних поставщиков нет. Отказ только lookup делает display пустым, оставляя базовую форму; auth/apply error не маскируется. |
| Можно ли тестировать отдельно? | Helper принимает `Pick<PartnerLandingService,'find'>`; компоненты тестируются действующим Vite fixture. Native HTTPS/Next/PG проверяет реальные cookie/SSR/ownership, которые mocks не доказывают. |

BDD-1: Given настоящий `/r/A` и чистый HTTPS browser, When пользователь вводит только email/password, Then раскрытый input показывает A, apply получает `{}`, PG хранит cookie-source A, reply.applied_code и вторая строка notice равны persisted A. На этом же fixture выбранный blogger/code получает ровно+1 registrations в dashboard и owner monthly report, чужой не меняется, повторное чтение не наращивает count.

BDD-2: Given SSR display A, When cookie удалена до submit и input не редактировали, Then payload `{}`, attribution отсутствует и combined notice отсутствует.

BDD-3: Given valid-cookie и lookup outage, When открывается `/`, Then форма доступна с пустым полем и без positive display; в warn только фиксированная категория.

BDD-4: Given два разных browser context и промежуточный clean request, When каждый получает HTML/RSC с одной Next instance, Then A не виден clean/B, а SSR refresh не добавляет link_view.

BDD-5: Given SSR A, When текущая cookie или ручной выбор приводит к B, Then сервер возвращает B только при сохранённом partner_code_id B и notice показывает B. При отсутствии подтверждённого соответствия поле applied_code отсутствует, positive notice не показывается; источник не подменяется ради подтверждения.

HIGH риски: source promotion, false positive notice/code, shared-cache leak, расхождение проекций. Каждый имеет named Confirmation выше и отрицательный вход. Это author rework по QCR-QUALITY-1/QCR-RISK-1/QCR-TEST-1, **не закрытие** условий: originating reviewers проверяют этот новый snapshot; implementation evidence появится только после Step 7/QE.
