# Требования: публичный вход в стиле «Кабинет»

## Статус и источники
05.11.2026. Владелец ответил на конкретный показанный макет: «отлично! делай по этому макету».
Это согласование публичной главной, регистрации и входа; отдельно не закрывает checkpoints реализации,
реальный Core CJM, настройку почты, ручную приёмку тестового сайта или выпуск Cloud.ru.
База исследования: `bb178c42cb570103e40cf10f8bad37d73128a0d9`.

| Источник | Фиксированная ревизия / значение |
|---|---|
| `docs/design/2026-11-05-public-entry-mockup.html` | SHA256 `23857448fa59c1c1d8ea34cd4b6a72a3099f07108498b354b2b7a74617f43a80` |
| `docs/design/2026-11-05-public-entry-mockup-notes.md` | SHA256 `b866fa78842972bc8f5f0031e0a9f682e6985aef210483a616cf6c102db4966f` |
| `docs/design/2026-11-05-public-entry-presentation.md`, `docs/design/2026-11-05-public-entry-audit.md` | Состояние на базовом commit; аудит — наблюдение, не новая приёмка |
| `AGENTS.md`, `CLAUDE.md`, `docs/acceptance/core-cjm.md`, `docs/model-matrix.md` | Действующие ограничения и роли на базовом commit |

Заинтересованные стороны: новый пользователь регистрируется, существующий входит, привлечённый
пользователь сохраняет атрибуцию, владелец принимает точное оформление на тестовом сайте.
Автор кода — `gpt-6.1-sol high`; архитектор — `gpt-6-astra xhigh`;
независимое QE кода — новая сессия `gpt-6-astra xhigh` без контекста автора.

## Границы изменения
Включены только `/`, существующие `Landing`, `LandingCta`, `AuthForm`, опциональное текстовое
представление `ThemeToggle`, изолированные публичные CSS, актуализация затронутых UI-проверок.
Внешний вид и порядок блоков берутся из утверждённого HTML: desktop — intro и компактный пример
слева, форма справа; mobile — intro/CTA → форма → пример → пояснения кредитов/лимита.
Shared footer и `SupportLauncher` из `layout.tsx` используются без дублирования.

Не включены изменения auth API, SQL, worker, моделей/ролей, квот, billing, почтовой конфигурации,
Cloud.ru, DNS, новая UI-библиотека или новая подсистема авторизации. Зависимости — действующие
auth endpoints, `code.apply`, навигация Next, витрина и настоящий тестовый web.
Доставка этой дельты: `clipmkr.ru`, `194.85.249.105`, compose `n5-clipmaker`, только web;
`77.83.87.178:/home/clipmkr` — контур инструментов. `176.109.111.98` не обновлять до ручной приёмки.
Операционный backup/config/data/preserve-controllers gate принадлежит координатору.

## Функциональные требования
Все FR — MUST. Новых доменных понятий нет.

| ID | Требование и проверяемый результат |
|---|---|
| FR-1 | Сохранить заголовок «Одна запись. Несколько поводов вас услышать.», тексты, нейтральный бренд `clipmkr`, зелёный акцент, плотность и композицию согласованного HTML; light/dark используют существующие `--workspace-*` токены и server `data-theme`. |
| FR-2 | Начальный режим — «Создать аккаунт»; явно доступны обе кнопки режима и «Войти» в шапке. «Начать бесплатно →» всегда выбирает регистрацию и переводит фокус в email, в том числе после выбора входа. Смена режима возвращает фокус в email и обновляет заголовок, submit, autocomplete и пояснение. |
| FR-3 | Email/password/partner code сохраняются при переключениях режима/темы, включая закрытие disclosure; значения не пишутся в localStorage/sessionStorage/cookie/URL/аналитику/логи. Код раскрывается нативным необязательным `details/summary`. |
| FR-4 | Форма использует реальные `/api/auth/register` и `/api/auth/login`, затем `code.apply`, затем `safeNextPath(next) ?? '/dashboard'` с `router.refresh()`. При signedIn после ошибки кода повтор не создаёт аккаунт и не выполняет auth повторно; discard_referral остаётся явным действием. Busy, ошибки, retry, `pendingRegistration`/`observeSignup`, очистка support identity и lifecycle listeners сохраняют текущую семантику. |
| FR-5 | До отправки видна подсказка «От 8 символов, не больше 72 байт. Кириллица и эмодзи занимают больше одного байта». Существующая политика backend не меняется. Native email validity и ошибка поля доступны клавиатуре/assistive technologies; превышение 72 UTF-8 bytes при регистрации не отправляет запрос. Вход не получает новый несовместимый лимит. |
| FR-6 | Раздельно объяснить 30 пробных кредитов = 30 минут исходной записи, 1 кредит = 60 секунд, и 90 минут на один файл обычного пользователя. Баланс не подменяет file limit; цены/доступность пакетов не выдумывать, флаг `creditMode` и действующая billing-конфигурация остаются авторитетными. |
| FR-7 | Настоящие ссылки `/forgot`, `/support`, `/legal/terms`, `/legal/privacy` остаются навигацией. Нельзя переносить offline banner, fake submit/dialog, фиктивное «письмо отправлено» или placeholder legal copy. Recovery при disabled mail показывает действительное ограничение через существующий маршрут; настройка почты не обещается. |
| FR-8 | В компактной области «Пример результата» сохранить настоящий `LandingDemo`: controls, playsInline, preload=none, отсутствие autoplay, существующие showcase poster/file и `/c/` link. Это перечисленная runtime-разница с CSS-иллюстрацией макета: реальные poster/video/caption/link вместо фразы «условная иллюстрация». Геометрия области и порядок страницы сохраняются. |
| FR-9 | Заменяется только старое правило R9 для `/`, требовавшее demo above-fold на телефоне, и старое скрытие CTA на desktop. CTA остаётся видимым на всех ширинах; demo расположен после формы на mobile и достижим прокруткой. Остальные R1/R2/R5/R8/R9 и проверки `/c/`/кабинета сохраняются. |

| ID | Нефункциональный критерий |
|---|---|
| NFR-1 | Chromium 320/390/1440 × light/dark × text 100/200%; отдельный WebKit390 smoke. Горизонтальный overflow отсутствует; весь контент, controls, focus ring и сообщения достижимы. |
| NFR-2 | Новые внешние controls режима в шапке/CTA блокируются, пока auth/code.apply pending или signedIn retry активен: повторных auth-запросов и смены операции нет. Theme переключается без remount/потери полей. |
| NFR-3 | Ноль новых необработанных JS errors при hydration, theme/mode, ошибках и retries; поля/credentials не сохраняются в storage/URL/логи/артефакты. |

Удвоение font-size описывается как text resize, а не browser zoom. На 320/200 допустимы переносы
слов известного P3 при сохранности смысла/контента; небольшое уменьшение внутреннего padding допустимо.
После hydration, переключений и retries не должно быть новых необработанных JS errors.
Никакие форма/пароли не сохраняются в артефактах; настоящие credentials и storageState — вне Git.

## Сценарии приёмки
Это задания QE, а не результаты уже выполненных прогонов. Browser fixture проверяет настоящие
компоненты; сетевые stubs отмечаются явно. Настоящая регистрация/вход/выход проверяются отдельно
на опубликованном тестовом web синтетическим аккаунтом без изменения старых данных.

| BDD ID / FR | Given → When → Then | Риск и oracle / отрицательный контроль |
|---|---|---|
| PE-01 / 01,09 | Открыт `/` → view 1440 и 390 → согласованные layout/текст/порядок; CTA виден в обеих ширинах | Screenshot+DOM geometry с approved HTML; mutation desktop CTA hidden должна упасть |
| PE-02 / 02 | Выбран login и введены поля → нажать CTA → register, email focus, submit в `/api/auth/register` | Не проверять только scroll; намеренная замена на login ломает oracle endpoint + aria-pressed |
| PE-03 / 02,03 | Заполнены все три поля → режим/тема/disclosure меняются → значения сохранены, фокус видим | Снимок значений и storage diff без печати credentials; очищение поля/запись в storage ломает тест |
| PE-04 / 04 | Валидные credentials и явный код → submit → auth затем `code.apply` с кодом, затем safe redirect | Точный порядок/call count/payload и URL; удаление `code.apply` обязано дать красный тест |
| PE-05 / 04 | Код не введён, есть referral cookie → submit → `code.apply({})`, штатная атрибуция не пропущена | Stub contract + отдельный реальный referral smoke при доступном fixture; отсутствие RPC — fail |
| PE-06 / 04 | Auth успешен, code.apply отказал → retry / discard → auth не повторяется, discard явен | Счётчики auth=1, apply=2, signup=1 после успеха; без redirect до успеха apply/discard |
| PE-07 / 04 | Login/registration вернули 4xx, 5xx, reject или malformed JSON → submit/retry → alert, busy очищен | Нет ложного успеха/навигации/необработанного JS error; повтор возможен |
| PE-08 / 04 | Разрешённый upgrade и upgrade/return next / внешний next / javascript: next → auth → только allowlist или dashboard | URL и существующий `safeNextPath`; bypass guard ломает негативный тест |
| PE-09 / 05 | Email invalid, пароль 7/8 символов, ASCII 72/73 bytes, кириллица 72/74 bytes → register → валидные границы допускаются, невалидные получают помощь до fetch | Field semantics, request count=0 при >72 bytes, focus/aria-describedby; большой пароль порядка 100000 символов не зависает/не отправляется |
| PE-10 / 07 | Открыта форма → forgot/support/legal → настоящий route с действительным состоянием | href/navigation; disabled mail не выдаёт sent/working recovery; offline dialog вместо route — fail |
| PE-11 / 01,03,09 | Chromium 320/390/1440, обе темы, 100/200% text → Tab/ShiftTab/Enter/Space, reload → actions достижимы, тема сохраняется | Overflow, activeElement/focus ring, JS errors; text resize не объявлять zoom; WebKit390 smoke |
| PE-12 / 08,09 | Mobile после формы → прокрутить к demo и воспроизвести / открыть clip → реальный player и link | controls/playsinline/preload=none/no autoplay + реальная загрузка стенда; удаление player/R5 — fail |
| PE-13 / 06 | credits_v1 → главная → 30 credit/30 min и 90 min объяснены раздельно; другой billing flag → нет ложного credit grant | Текст и активный config, без изменения backend; 30 минут не объявлены новым file limit |
| PE-14 / 01,03,04; NFR-2, NFR-3 | Auth/apply pending или signedIn retry → нажать header Войти/CTA/режим и переключить тему → auth mode не меняется, повторного auth нет; тема и поля сохранены | Проверить все внешние controls и request count; удаление busy propagation должно дать RED |
| PE-15 / 01,03,04; NFR-1, NFR-3 | Theme store недоступен / component remount / двойной submit → взаимодействия → fallback notice, нет дублей listeners/auth | Сохранность формы, число network calls, cleanup; после route туда-обратно один mode action |

## Риски и ограничения
Auth/retry/redirect HIGH покрываются PE-04…09 и PE-14; visual/a11y MEDIUM — PE-01…03/11/12;
product honesty MEDIUM — PE-10/13. Реальная доставка recovery mail не готова: аудит зафиксировал
`N5_MAIL_MODE=disabled`, отсутствуют SMTP/Resend/from. Конфигурацию в этом scope не настраиваем.
Скринридер, полное WCAG соответствие, реальные платежи, обработка длинного медиа и полная
блогерская атрибуция не выводятся из успеха UI fixture; их Core CJM acceptance остаётся отдельно.
Recall/independent QCSD/K1/K2 и runtime тесты оформляются по фактическим результатам координатором.

## Трассировка OpenSpec и согласования
Дельта ledger: `openspec/changes/public-entry-cabinet/`; исполнение, ADR, план и QE принадлежат feature-adr.

| Точный путь | SHA256 |
|---|---|
| `openspec/changes/public-entry-cabinet/proposal.md` | `0b46f2bcd5e803ee19f8fbfb4329512d0bb8b14a1f1fc6b17a8f679cd0d5716d` |
| `openspec/changes/public-entry-cabinet/specs/public-entry-cabinet/spec.md` | `fefa3faea3a438a53a281086d1a4f6b23ce8acef052da1d4f4aebf4f67a365a5` |
| `openspec/changes/public-entry-cabinet/tasks.md` | `f8b55d300051fe30c1ff0982fe1835d122d1d8cd46611674469d4e67d5ed764f` |

Формальная validation ledger не доказывает runtime. Текст согласования макета хранится координатором
отдельно с actual provenance; нельзя приписывать владельцу предварительное чтение этих новых документов.
