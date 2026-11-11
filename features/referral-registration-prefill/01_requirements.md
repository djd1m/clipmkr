# 1. Требования: регистрация по приглашению

11.11.2026. Нормативный вход для архитектуры/QCSD; приложение не менялось.
База: `74ea7a6bae354a1cf1fdaec1af01a957cd421137`.

R2 после originating QCSD: QCR-QUALITY-1/QCR-RISK-1 устраняют пропущенную вторую строку утверждённого макета с реальным публичным кодом; QCR-TEST-1 замыкает тот же путь на статистику блогера и владельца. Root разрешил это уточнение в пределах уже согласованного макета и core CJM. Новый UI, source policy и платежи этим не согласовываются; исполнение и закрытие условий ещё предстоят.

## Источник и согласование

Владелец ответил **«Да, реализовать этот макет»** на опубликованные research README и mobile PNG. Точный согласованный HTML: `docs/research/referral-registration-ux/mockup.html`, SHA256 `040a988b2881e0e287e42d0f33deff8a9775cd7480d96eca977de576773b8315`. Источник авторизации — текущий диалог, сообщение передано root исполнителю 11.11.2026. Это согласование конкретного UI; оно не является результатом K1/K2, implementation/QE или новым разрешением Cloud.ru/DNS. Повторное согласование того же макета не требуется.

Выпускается минимальный полный путь: ссылка → открытое заполненное поле → новая регистрация → кабинет с честным подтверждением. Исследовательские toggles и демонстрационный hero/path не становятся продуктовой панелью. Invalid `/r` 404, friendlier error page, смена first-touch на last-touch не входят.

## Stakeholders

Приглашённый пользователь заполняет только почту и пароль; партнёр получает верный источник и статистику; владелец принимает опубликованный путь. Автор реализации — `gpt-6.1-sol high`; архитектор/планировщик — отдельный `gpt-6-astra xhigh`; independent SOURCE/QE — свежая другая модель без истории кодинга по `docs/model-matrix.md`. Root владеет commit/merge/push/deployment.

## Functional requirements

### FR-1 — Проверенное приглашение видно без копирования

MUST. SSR получает эффективный код из подписанной неистёкшей HttpOnly-cookie; проверяет актуальные active код и владельца; передаёт только публичный display-код через Landing в единственную AuthForm. Форма регистрации содержит раскрытое редактируемое поле. Текст: «Код из приглашения заполнен. Вводить его не нужно»; пояснение «Код заполнен из приглашения. Проверим привязку после создания нового аккаунта».

Acceptance: чистый изолированный HTTPS браузер проходит настоящий `/r/:code` → `/`; input содержит правильный эффективный код, details open, email/password достаточно для submit; readonly отсутствует. Без проверенного кода input пуст, details closed, положительного уведомления нет. Malformed/tampered/expired/duplicate cookie, blocked code и inactive owner не отображаются как подтверждённые.

### FR-2 — Видимое значение не меняет source

MUST. Неизменённый autofill отправляет `code.apply({})`; сознательное ручное редактирование непустого поля отправляет `{code}`. Прежнее положительное display-уведомление исчезает после редактирования. Сервер назначает source; client `source` не добавляется. Пустое ручное поле сохраняет существующий fallback `{}`; очистка не является discard. Явный существующий `discard_referral` не меняет смысла.

Acceptance: expiry/removal cookie между SSR и submit не превращает stale autofill в explicit; ordinary A→B показывает A, guest priority сохранён; manual B применяет действующую explicit policy; ручной invalid не падает обратно на cookie. Существующие rejected/partner_deleted/self ограничения не обходятся. Неизменённость определяется по сознательному редактированию, а не просто по равенству строки; детали безвредного edit/return к прежней строке остаются за архитектором в рамках серверной политики.

### FR-3 — Честное подтверждение после создания аккаунта

MUST. Только пригодный серверный результат apply с `pending`/`activated`, действительной принадлежностью и подтверждённым публичным кодом позволяет существующему AuthFlow notice показать «Аккаунт создан. Приглашение применено.» и вторую строку «Регистрация по коду CODE учтена.». CODE берётся из additive `applied_code` результата существующего `code.apply`, соответствующего реально записанному `partner_code_id`; исходный input, URL и stale SSR-код не являются доказательством. HTTP200/null/пустой или непригодный объект/rejected/self/ошибка/discard и отсутствие доказанного `applied_code` не равны пригодному подтверждению. Сохраняется базовое «Аккаунт создан. Вы вошли» либо действующая retry/error ветка. Не создавать второй auth flow, persisted toast или новый endpoint.

Acceptance: настоящий новый аккаунт после `/r` получает нужную attribution в PG, открывает кабинет и видит обе строки approved confirmation с кодом, равным коду сохранённого `partner_code_id`. При SSR A и актуальном серверном выборе B (ручное изменение или заменившаяся cookie) подтверждается B; expiry/removal без ручного ввода не подтверждает A. Null/rejected/missing-code responses не дают «приглашение применено»; при несовпадении записанного partner_code_id с выбранной DB-строкой сам сервер не выдаёт applied_code, клиент не пытается восстанавливать соответствие по SSR. Сбой apply оставляет подписанного пользователя в текущей retry/discard ветке; повтор не повторяет auth/signup/trial. Аддитивное поле ответа не меняет прежние поля/null/error/envelope, `Attribution` как тип записи БД, request schema, source/replacement, транзакционные locks и финансовые эффекты.

Acceptance QCR-TEST-1: на том же изолированном настоящем HTTPS `/r/A → SSR → новая регистрация без ручного ввода → apply` сравнить до/после канонические проекции `PartnerService.dashboard(bloggerId, codeId)` и `bloggerReport(pool, ownerId, month)` для одного blogger/code. В обеих прирост registrations ровно1; чужой blogger/code не меняется; повторное чтение не увеличивает счётчик. У owner report учитывать действующую Moscow-month границу, у dashboard — all-time, не менять семантику агрегатов. Синтетические данные, без оплаты/видео/production; повторное чтение проекций не повторяет apply.

### FR-4 — Повторная регистрация и ordinary login сохраняются

MUST. `registration=existing` пропускает apply/signup и сохраняет атрибуцию/баланс, показывает existing notice. Неверный пароль existing — прежний 409, login/recovery с сохранённой почтой. Отдельный ordinary login продолжает прежний apply и действующие source rules. safe next, recovery, busy/double-click, password constraints, `outcomes-v1`, cookies/auth/rate/Origin guards сохраняются.

Acceptance: старые native existing/legacy/normal-login positive/negative tests проходят без ослабления assertions; snapshot атрибуции и trial неизменён, existing apply=0, normal login apply=1. Один и тот же DOM AuthForm и ручной draft переживают mode changes согласно прежним тестам.

### FR-5 — Display-проверка не мутирует и не раскрывает секреты

MUST. Переиспользовать `readReferral` и актуальный active lookup без `recordView`. SSR/read/refresh не создают growth events и не меняют cookie/атрибуцию. HttpOnly/Secure/SameSite/TTL и first-touch остаются прежними. Через props/RSC/HTML клиенту не передаются raw cookie, подпись, session secret, UUID владельца или персональные данные.

Acceptance: PG snapshot link_view до/после SSR refresh одинаков, кроме единственного настоящего `/r` события по текущей dedup policy; второму чистому браузеру не виден чужой код; signed cookie отсутствует в `document.cookie`, raw serialized cookie/secret нет в response/client props. No-cookie/malformed cookie не требуют DB lookup для display.

## Non-functional requirements

### NFR-1 — Cache и доступность страницы

MUST. Страница с display-кодом рендерится по текущему запросу; нельзя shared-cache HTML/RSC между браузерами. Новая advisory DB проверка не делает общую страницу недоступной: known not-found и сбой lookup не дают неподтверждённого кода/green, обычная форма сохраняется. Лог отказа — фиксированная категория без raw exception/cookie/секретов. Значение cookie/secret не становится cache key или публичной диагностикой.

Acceptance: sequential A/clean/B GET у реального Next не переносят code; resource-down negative test оставляет страницу без неподтверждённого display; no-cookie путь не запрашивает БД. Отказ будущего apply отображается существующим error path, не маскируется display-успехом.

### NFR-2 — UI и минимальная интеграция

MUST. Сохранить текущую тёмную/светлую палитру, типографику, единый компонент, safe next/credit mode, keyboard и существующие a11y guards. 390 и 1440 px, Chromium/WebKit: нет горизонтального overflow/JS errors; новый control не менее44px, текст input не менее16px. Результат — inline существующий AuthFlow notice, без floating overlay и без перехода в отдельный funnel.

Acceptance: native UI screenshots и keyboard checks actual rendered source; themes/widths, notice after navigation/dismiss/refresh не нарушают прежние geometry oracles. Макет fullPage допускает прокрутку на390px; ноль ручных действий с кодом является основным UX oracle.

## Constraints и scope

Переиспользуются readReferral, PartnerLandingService.find, AuthForm/Landing/Page, RPC code.apply и AuthFlow; canonical dashboard/bloggerReport читают тот же synthetic fixture. Допустимо узкое аддитивное `applied_code` только в результате существующего apply; новая domain API/общий DB тип/endpoint не нужны. Без DDL/миграций/новых библиотек/конфигураций, изменений partner replacement policy и финансов. Нельзя менять frozen Specification SHA, inline LEGACY_SOURCE/SHA, прежние source guards/mutation anchors ради green. Документационная дельта — OpenSpec и addendum/test-scenarios; execution plan — feature-adr. Тесты только в изолированном PG/Redis/HTTPS fixture; никаких новых реальных пользователей, платежей, production apply/login/register.

## OpenSpec pin

`openspec/changes/referral-registration-prefill/specs/referral-registration/spec.md`, SHA256 `75bdcc8a049109df016ed5b3540880700ccf48a11cd0d6fd599316816e654516`.
Proposal SHA256 `0431191dbc410b2301bfcf017dc9757a9a003b1a57ffcd2825bc35efe632437b`; tasks SHA256 `3f150301c52b0e9dbc3f0fa2ca564b6c2137863859aadd164795ecdc1498dfd8`. Revision: working tree на базе `74ea7a6`, документы ещё не коммитились. При requirement rework обновить pin и originating review; прошлый hash не объявлять актуальным.

## Recall и применённые уроки

Фактически выполнено pinned `npm run dz -- recall "реферальная регистрация autofill HttpOnly SSR source first-touch teach:f8d5479058e03557" --project /home/clipmkr --json`, exit0,10 записей. Прочитаны teach:f8d5479058e03557 и teach:b3ca3249435bdee7: пустой UI ≠ потерянная attribution; безопасный SSR, untouched→{}, expiry race, настоящая сквозная проверка. Также учтены teach:7439034e1478e6d5 (не снижать16px/source guards), teach:383cfc5a0365bba7 (нейтральный независимый handoff). AQE runtime не установлен, его вызовы не заявляются.

## Open questions и этапность

Пользовательских неразрешённых scope/UI вопросов нет. R2 architecture уточняет server-read helper, additive applied_code и обе canonical проекции; source/result semantics закреплены выше. K1 реально прошёл; K2 структурно проверяет план, но не заменяет originating QCSD. Три R1 review выполнены и conditional; этот repair ещё требует собственной focused verification reviewers, native ideation closure, финального Step6 и root GO. До их настоящего завершения продуктовый код не писать.
