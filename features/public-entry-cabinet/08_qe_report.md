# QE публичной главной, регистрации и входа

05.11.2026. Статус: SOURCE CHECKS завершены; независимое source review и actual published acceptance выполняются. Полный продукт не объявляется готовым.

## Доказательства и границы

Использованы reference-протоколы расширенного QE: accessibility/regression, security input/redirect, contract negative cases и mutation testing. AQE runtime не устанавливался и не запускался. Реальные CLI checkpoints отражают действия; наличие этого отчёта не означает PASS.

| Требования | Риск и сценарий | Команда / фактическое наблюдение | Ограничение |
|---|---|---|---|
| FR-1, FR-6, FR-9; NFR-1 | Композиция, палитра, 320/390/1440, обе темы, text100/200 | Host Vitest public-entry + responsive:129/129 PASS; public повтор с lifecycle oracle31/31 PASS | Настоящие компоненты/CSS, Vite mount; не SSR Next |
| FR-2, FR-3; NFR-3 | CTA register/focus, mode/theme/input identity, details | public-entry browser suite; named старый CTA/default mode/mobile order RED до реализации | Router/transport управляемые |
| FR-4; NFR-2 | auth→apply→safeNext, explicit/empty/discard, signedIn retry, duplicate submits, errors | Browser public-entry; mutation wrong CTA, UTF8, safeNext, повтор auth, atomic guard, skip apply — индивидуальные RED/GREEN приватно | Не live provider; каждое доказательство проверяется отдельно |
| FR-5 | 7/8 chars,72/73ASCII,36/37кириллица,18/19emoji,100000ASCII | public-entry browser boundary oracle PASS | Backend policy не изменялась |
| FR-7 | Настоящие recovery/support/legal, mail disabled | Пути и ссылки проверены компонентно; published smoke ещё ожидается | Отправка писем не настроена, fake sent отсутствует |
| FR-8, FR-9 | Demo controls/playsInline/preloadnone/noautoplay и CTA | Existing mutation runner host:playsinline RED4→GREEN4;public-entry-cta RED16→GREEN16 | Docker transport не выполнялся, actualS3 play предстоит |
| NFR-2 | Existing auth/theme/payment/partner/workspace contracts | Автор unit/contracts133/133; координатор повторил тот же набор exit0 | Не полная Core CJM приёмка |

Координатор отдельно выполнил typecheck, lint и git diff --check: exit0. Полная npm run build завершилась exit0; independent review выполняется. Кабинет на финальном CSS:30/30 host browser PASS. Автор gpt-6.1-sol high, reviewer gpt-6-astra xhigh в отдельной requirements-first сессии; это cross-model по временному правилу владельца, независимая аттестация backend модели недоступна.

## Code/spec anti-drift

FR-1/6 → Landing и публичные scoped CSS; FR-2/3/4/5 → Landing/AuthForm/LandingCta; FR-7 → существующие href и recovery route; FR-8 → неизменный LandingDemo; FR-9 → прежние R9/rules и mutation runner; NFR-1/3 → browser матрица и keyboard/lifecycle; NFR-2/ADR-001 → отсутствие новых зависимостей/API/schema, reuse существующего transport/theme/redirect. AM-1/2/3 имеют отдельные исполняемые oracles, не только snapshot исходников. OpenSpec proposal/spec/tasks остаются на точных SHA в01; новых требований после согласования не добавлено.

## Поставка и незакрытые границы

Пока не завершены canonical image / web-only apply / actualNext auth / paired visual / demo и кабинет после apply. После этого владелец получает инструкцию ручной проверки на clipmkr.ru. Cloud.ru, DNS, mail, тарифы и backend этой дельтой не обновляются. Успех публичного входа не закрывает все предыдущие Core CJM, платежи,90/120границы и полную позитивную атрибуцию блогера.

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
