# QE публичной главной, регистрации и входа

05.11.2026. Статус: реализация, независимый source review и actual published acceptance тестовой версии завершены; дополнительный независимый published smoke также завершён; ручная приёмка владельца ожидается. Полный продукт не объявляется готовым.

## Доказательства и границы

Использованы reference-протоколы расширенного QE: accessibility/regression, security input/redirect, contract negative cases и mutation testing. AQE runtime не устанавливался и не запускался. Реальные CLI checkpoints отражают действия; наличие этого отчёта не означает PASS.

| Требования | Риск и сценарий | Команда / фактическое наблюдение | Ограничение |
|---|---|---|---|
| FR-1, FR-6, FR-9; NFR-1 | Композиция, палитра, 320/390/1440, обе темы, text100/200 | Host Vitest public-entry + responsive:129/129 PASS; public повтор с lifecycle oracle31/31 PASS | Настоящие компоненты/CSS, Vite mount; не SSR Next |
| FR-2, FR-3; NFR-3 | CTA register/focus, mode/theme/input identity, details | public-entry browser suite; named старый CTA/default mode/mobile order RED до реализации | Router/transport управляемые |
| FR-4; NFR-2 | auth→apply→safeNext, explicit/empty/discard, signedIn retry, duplicate submits, errors | Browser public-entry; mutation wrong CTA, UTF8, safeNext, повтор auth, atomic guard, skip apply — индивидуальные RED/GREEN приватно | Не live provider; каждое доказательство проверяется отдельно |
| FR-5 | 7/8 chars,72/73ASCII,36/37кириллица,18/19emoji,100000ASCII | public-entry browser boundary oracle PASS | Backend policy не изменялась |
| FR-7 | Настоящие recovery/support/legal, mail disabled | Пути проверены компонентно и настоящей навигацией published smoke | Отправка писем не настроена, fake sent отсутствует |
| FR-8, FR-9 | Demo controls/playsInline/preloadnone/noautoplay и CTA | Existing mutation runner host:playsinline RED4→GREEN4;public-entry-cta RED16→GREEN16 | Docker transport не выполнялся; actualS3 play выполнен при поставке |
| NFR-2 | Existing auth/theme/payment/partner/workspace contracts | Автор unit/contracts133/133; координатор повторил тот же набор exit0 | Не полная Core CJM приёмка |

Координатор отдельно выполнил typecheck, lint и git diff --check: exit0. Полная npm run build завершилась exit0; independent review завершён; результаты и repair ниже. Кабинет на финальном CSS:30/30 host browser PASS. Автор gpt-6.1-sol high, reviewer gpt-6-astra xhigh в отдельной requirements-first сессии; это cross-model по временному правилу владельца, независимая аттестация backend модели недоступна.

## Code/spec anti-drift

FR-1/6 → Landing и публичные scoped CSS; FR-2/3/4/5 → Landing/AuthForm/LandingCta; FR-7 → существующие href и recovery route; FR-8 → неизменный LandingDemo; FR-9 → прежние R9/rules и mutation runner; NFR-1/3 → browser матрица и keyboard/lifecycle; NFR-2/ADR-001 → отсутствие новых зависимостей/API/schema, reuse существующего transport/theme/redirect. AM-1/2/3 имеют отдельные исполняемые oracles, не только snapshot исходников. OpenSpec proposal/spec/tasks остаются на точных SHA в01; новых требований после согласования не добавлено.

## Поставка и незакрытые границы

Canonical image / web-only apply / actualNext auth / paired visual / demo и кабинет после apply завершены; фактические результаты ниже. Инструкция ручной проверки дана в delivery-test-release.md. Cloud.ru, DNS, mail, тарифы и backend этой дельтой не обновляются. Успех публичного входа не закрывает все предыдущие Core CJM, платежи,90/120границы и полную позитивную атрибуцию блогера.

## Первичное независимое source review — требуется исправление

Свежая Astra-сессия самостоятельно прочитала manifest17/17 и исходники, выполнила unit133/133/lint и воспроизвела два MEDIUM замечания. Source rollout signoff не выдан:

1. Chromium320×568: header «Войти» фокусирует email за экраном (top865.75,bottom912.14 при scrollY0), поскольку focusRequest использует preventScroll. Исправление должно одновременно фокусировать и показывать поле.
2. Public showLabel темы называет следующее действие, но aria-pressed отражает light-state. В светлой теме DOM сообщает «Тёмная тема»+pressed=true. Требуется command-семантика без aria-pressed только для showLabel, сохраняя прежний default toggle. Screenreader output не проверялся.

Исходная source revision a0338382690fe0bce17e70af40edbfb500eb33baf499363ec2ada0d3c3638443 остаётся замороженной до сохранения/оценки actual originating receipt. Замечания не скрываются и не переименовываются в PASS; следующий цикл будет native repair с независимой проверкой автора условий.

## Фактический repair

Native origin evaluate вернул unresolved обоих условий, rounds1. После Sol исправления actual named RED3→GREEN3; полный public34/34,theme unit30/30,typecheck/lint/diff exit0. Native begin-repair — prepared,nonce bdecf7dc-066f-44bf-8cfa-678cdf35e455,revision0d01c7fd037fe74a75e7b97217609635e60621fda3dbe8832fa888afc4f05450. Собственные verifications ещё выполняет originating reviewer. Предшествующий независимый общий browser прогон завершился159/159 на origin source; это не повтор на repaired source.

## Независимый source verdict и native closure

Originating Astra reviewer самостоятельно подтвердил оба исправления на repaired source: Chromium320×568text100/200 focused input visible; WebKit390×844text100 email bottom807.05<844; public/default ThemeToggle DOM proof Chromium/WebKit. Его повтор public34/34 и theme30/30 PASS. Собственные immutable PE-QE-001/002 сохранены, structural implementationVerified=true. Actual native evaluate exit0, verdict closed, rounds2, unresolved[], revision0d01c7fd037fe74a75e7b97217609635e60621fda3dbe8832fa888afc4f05450. Это SOURCE GO для ограниченной тестовой web-выкладки, не full product/published acceptance.

Exploratory LinuxWebKit320×568 и390text200 оставляют низ поля частично обрезанным при native focus; обязательный WebKit390text100 smoke PASS. Эти дополнительные клетки не названы PASS, screenreader/Safari hardware не проверялись. Chromium text200 выполняет обязательную матрицу. Raw independent reports сохранены приватно; модель requestedgpt-6-astra xhigh, код authorrequestedgpt-6.1-sol high.

## Actual published acceptance

Тестовый web-only release8859f762c4ce19f6ba51310ac09148b4a7d5ef2f установлен, health ok с точной ревизией. Actual register/login/logout/retry/discard/safeNext и recovery/support/legal —6сценариевPASS.14actualNext visual cellsPASS, errors[]. Настоящий showcase play API и два native-control clip play/downloadPASS; H2641080×1920, SHA совпали. Read-only DB: accounts1,trial_grants1,remaining_seconds1800 для нового собственного synthetic profile. Backup cataloguePASS, до/после web apply640businessrows/26tableshashmatch; env/config/mounts/nonwebcontainerIDs сохранены.

Полные результаты, manual checklist и ограничения: `delivery-test-release.md`. Независимая дополнительная actualNext anonymous verification завершилась4/4PASS; source native closure не является автоматической ручной приёмкой. Исходные OpenSpec proposal/spec/tasks сохранены на зафиксированных в01 SHA как входной ledger; текущий статус исполнения хранит feature-adr. Cloud.ru/DNS/продажи не изменены.

## Приёмочные критерии и Confirmation

| Критерий | Статус | Фактический oracle и граница |
|---|---|---|
| FR-1 | PASS | approved/actual blank screenshot pairs;14live layout/palette cells; настоящие demo/footer — разрешённые различия |
| FR-2 | PASS | register default, header/CTA/mode/focus;34browser, own origin verification и actual auth |
| FR-3 | PASS | native input references/values, mode/theme/details, no credential storage; actual login next/theme |
| FR-4 | PASS | auth→apply→safeNext; fixture explicit/empty/discard и busy/retry/errors; actual invalid-code retry/discard без второго register |
| FR-5 | PASS | native email и UTF8 boundaries7/8,72/73ASCII,36/37кириллица,18/19emoji,100000ASCII; login policy unchanged |
| FR-6 | PASS | conditional billing labels; actual trial grant1/1800секунд и30UIcredits,90file limit отдельно |
| FR-7 | PASS | actual forgot disabled/support/legal200, без отправки писем/фиктивного sent |
| FR-8 | PASS | unchanged LandingDemo attributes, mutation playsInline, actualS3 native play API,2clips native controls/download |
| FR-9 | PASS | CTA/mobile order R9 и mutationRED16→GREEN16; остальной responsive baseline98PASS до локального focus repair |
| NFR-1 | PASS | Chromium320/390/1440 обе темыtext100/200; обязательный WebKit390 smoke, keyboard/reflow; не screenreader certification |
| NFR-2 | PASS | one atomic request, deferred busy/disabled/retry/order, unknown response errors; backend/config/deps не менялись |
| NFR-3 | PASS | cleanup1listener после remount, identity, no page/hydration errors в наблюдённых live клетках |

| ADR | Fitness | Confirmation test evidence | Gaps |
|---|---|---|---|
| ADR-001 | PASS | public-entry tests CTA/register,safeNext/atomic submits,explicit/empty apply,retry/input identity; unchanged demo/theme contracts; paired live screenshots; named guard mutations actualRED/GREEN | Нет незакрытых load-bearing gaps в M-границе; mail/fullCJM/manual отдельно |

AM-1: точный responsive test `public entry: CTA visible and mobile form precedes demo`, wrongCTA mutation даёт RED. AM-2: `public entry: preserves input identity and enforces UTF-8 registration boundary`, удаление byte guard даётRED. AM-3: `public entry: preserves safe next and rejects synchronous duplicate submits`, bypass safeNext/atomic removal даютRED. Все три amendments проверены по исполняемым тестам; не только по тексту.

## Findings ledger

| Finding | Severity | Status | Round | Author | Title |
|---------|----------|--------|-------|--------|-------|
| PE-QE-001 | MEDIUM | fixed | 1 | codex | Header login фокусировал email за экраном; independently verified вcycle2 |
| PE-QE-002 | MEDIUM | fixed | 1 | codex | Public theme action и pressed-state противоречили друг другу; independently verified вcycle2 |
| PE-QE-L1 | LOW | named-limit | 2 | codex | Exploratory LinuxWebKit320 и390text200 частично обрезают низ focused input; вне обязательной матрицы |

Значимых открытых source findings0; исторические условия не удалены. Fleet Step9 — N/A для tierM; opt-in четырёхплоскостной Step10 не запрашивался и не объявлен пройденным. Ручная приёмка и перенос Cloud остаются внешней границей поставки.

## Итоговая независимая оценка

QE-VERDICT: A-

Astra reviewer присвоил эту оценку именно ограниченной M-дельте публичного входа TEST после собственного published anonymous smoke4/4: Chromium1440/390 × light/dark, точная served revision8859f76, header/CTA/modes/keyboard/theme persistence, no page/console errors. Самостоятельно просмотрены реальные blank/reference screenshots, сравнение композиции/палитры положительное. Это не pixel equality и не ручная приёмка владельца. Reviewer не приписал себе root live-auth/download результаты. Required matrix завершена; named WebKit limits, screenreader/device gaps, disabled mail, full Core CJM и Cloud approval остаются явно ограничены.

Первичный и финальный независимый source pass выполнены одной originating Astra ролью, сохранившей свои условия; precision role для tierM не назначалась. Cross-model соблюдён по requested model IDs, cross-family=false по временному решению владельца. Самостоятельная аттестация backend-модели/биллинга/токенов недоступна; денежные оценки не выводились.

## Квитанция записи QE ledger

Первый и второй вызовы writer отказали без записи: payload требовал slug, затем stage внутри row помимо CLI selectors. Исправлены только аргументы; фактический третий ответ writer, проверенный по stdout:

```json
{"ok": true, "kind": "ledger", "stage": "qe", "verdict": "written", "exit": 0, "reason": "appended and verified by re-reading the tail", "blocking": false, "target": "/tmp/clipmkr-public-entry-20261105/.dz/feature-adr/run-cost-ledger.jsonl"}
```

Фактический dz teach сохранил подтверждённый урок focus/command-state в общем project store; повторный recall нашёл его (teach:92a77c1db623c39e). Денежные расходы и токены неизвестны, null не трактуется как0.
