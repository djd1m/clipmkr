# ADR-001: Переиспользовать действующие компоненты для согласованного публичного входа

## Status
proposed — обратимо до публикации тестового web; пересмотреть при расширении auth/backend,
росте за утверждённые 11 runtime/test targets или невозможности сохранить геометрию макета с демо.

## Context
Утверждённый HTML задаёт новую композицию публичного входа, но демонстрирует fake submit,
локальную тему и CSS-иллюстрацию. Продукт уже имеет работающие auth/referral/retry,
theme persistence и настоящий showcase player. Их замена создала бы несовместимость
с оплатой/атрибуцией и потеряла бы действующую возможность просмотра.

## Decision Drivers
1. D1 (high): точное соответствие согласованному виду и порядку действий.
2. D2 (high): сохранение credential/privacy, safeNext, auth/retry и attribution.
3. D3 (high): честность реального submit, recovery и demo, сохранение действующих возможностей.
4. D4 (medium): минимальная дельта единого React/Next/CSS стека без новых зависимостей.

## Considered Options
| Вариант | Достоинства | Недостатки |
|---|---|---|
| A. Изменить действующие Landing/LandingCta/AuthForm; scope CSS, canonical ThemeToggle и LandingDemo | Сохраняет существующие контракты, тесты и runtime; ограниченная площадь | Требует согласовать shared state/focus и обновить старые R9 ожидания; нативный player отличается от иллюстрации |
| B. Перенести standalone HTML в новый независимый публичный экран | Геометрия прототипа переносится прямо, простая начальная изоляция CSS | Нужно заново соединить real auth, safeNext/referral, тему; дублирование формы, fake-dialog риск, потеря real demo |

## Decision
Выбираем A: существующие `apps/web/src/app/Landing.tsx`, `LandingCta.tsx`, `AuthForm.tsx`,
`ThemeToggle.tsx` и scoped CSS в `globals.css`. `LandingDemo`, theme store, server requestTheme,
auth handlers, `safeNextPath`, `rpc('code.apply', ...)` переиспользуются. Новая auth/UI библиотека,
доменная модель, route, cookie key или feature-wide event framework не вводятся.

`Landing` становится client presenter и владеет только UI mode (`'register'|'login'`), передавая
существующим `AuthForm`/`LandingCta` mode и callback через props. Inline union не требует нового
export/module/event bus. `AuthForm` единолично владеет auth request state/signedIn/pendingRegistration;
контракт доступности переключения сообщает presenter через props, не дублирует auth state machine.
Форма сохраняет единую инстанцию и свои неконтролируемые DOM значения. Busy и signedIn/retry блокируют смену auth операции;
все временные listeners (если нужны) имеют cleanup. Optional ThemeToggle label не меняет default
поведение WorkspaceSettings. `n5_theme` и document preferences остаются одним источником темы.

`LandingDemo` помещается в согласованную компактную область. Runtime-разница исчерпывается
настоящим постером, нативными controls, caption и ссылкой `/c/` вместо CSS-постера и disclaimer
«не видео»; никакого autoplay или новой загрузки до действия. На mobile область идёт после
формы. Старое требование demo above-fold и desktop CTA hidden superseded только для `/`;
охранные R5/showcase/достижимость и прочие R9 routes сохраняются.

## Rationale
D1: CSS ограничен публичным shell, исходный макет остаётся визуальным oracle.
D2: reuse не размножает auth pipeline, не вводит новый парольный policy или redirect parser.
D3: настоящий demo и routes дают существующие возможности; offline элементы удаляются из runtime.
D4: A требует меньше контрактов; геометрическое удобство B не компенсирует дублирование логики.

## Consequences
Положительные: один auth pipeline и theme store, сохранность demo/referral/checkout, минимальный deploy.
Принятые издержки: tight player controls в компактной области; проверять работоспособность и доступную
ссылку «Открыть клип». Браузерный player visual динамичен, поэтому runtime differences фиксируются,
а не объявляются pixel-identical illustration. CSS isolation проверяется на кабинете и общих страницах.
Follow-up ADR: сейчас не нужен. Почтовая конфигурация и full Core CJM остаются отдельными работами.
After-action review: координатор через месяц после owner acceptance или раньше при auth/UI regression.

## Confirmation
- Method: браузерные BDD из 01 + unit regression + сравнение approved HTML/runtime screenshots.
- Monitoring: повторяемый public-entry suite и smoke `/` → login/dashboard/logout на тестовом web.
- Success metric: каждый FR имеет фактический oracle; ноль новых JS errors/credential storage;
  native demo controls/preload/showcase checks проходят; wrong-mode и bypass negative controls красные.
- Owner: автор реализации и независимый QE reviewer; ручная визуальная приёмка — владелец.
- Load-bearing properties: CTA выбирает register; auth→code.apply→safeNext порядок; retry не повторяет
  auth; theme/mode не теряют поля; real demo сохраняется; CSS не меняет кабинет.
- Required automated checks: `tests/browser/public-entry-cabinet.test.ts` (новый файл после K1),
  `tests/landing-demo.test.ts`, `tests/browser/responsive-check.test.ts`, `tests/responsive-check.test.ts`;
  regression `tests/theme.test.ts`, `tests/auth.test.ts` и существующие payment/partner suites.

## Shift-left: риск → сценарий → oracle
Нагрузка/двойной submit: busy disables и один запрос; после завершения retry доступен.
Отказ auth/RPC/JSON: field/form alert, busy очищен, unauthorized redirect не происходит;
успешный auth + отказ кода повторяет только code.apply, discard_referral явен.
Недоступное demo/media: форма независима и интерактивна, player/link честно остаются настоящими.
Изоляция: реальные React-компоненты в browser fixture с сетевыми негативными случаями проверяют
UI поведение; отдельный живой auth проход доказывает серверную интеграцию, fixture его не заменяет.
Риск auth — HIGH, mitigation — перечисленные сценарии и независимое QE. Проверки здесь предложены,
не запущены; этот ADR не является вердиктом QCSD 3.5 или K1/K2.
