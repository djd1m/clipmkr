# Авторская проверка прототипа личной ссылки

05.11.2026. Автор `gpt-6.1-sol high`, отдельная сессия `blogger_auto_link_mockup`.
Это проверка статического исследовательского артефакта, **не Step 8 продуктового QE**,
не независимое ревью, не согласование макета и не реализация запроса.

## Привязка ревизий

- База исходного приложения: `e381a2a8034d1424800e85f61625990b4e1bb0e8`.
- HTML `docs/design/2026-11-05-blogger-auto-link.html`, SHA-256:
  `f3fad2f8a8772678b5a66538d7ad5aee4e821965f971af4a25a025d2bbaba2c6`.
- OpenSpec `openspec/changes/blogger-auto-link/specs/blogger-referral/spec.md`, SHA-256:
  `2a574c4e9e453fe5bea708dfe494d0cca75ea71ea9cc667e02a72210640e1c23`.
- Переиспользованы CSS и markup выбранного кабинета/монтажной из
  `docs/design/2026-11-04-style-directions.html`; новая ссылка показана в контексте
  «Новая запись», выбранного демо-файла, «Создать клипы» и последних записей.

## Метод и реальные результаты

Применены frontend-design и reference-подход studio-extended-qe: accessibility-testing
и regression-testing из Product Studio vendor snapshot
`c0ddcf3fc07fcea0d1b37f41ad65372b3de7ce69`. AQE runtime/fleet не устанавливались и не запускались.

`node features/blogger-auto-link/verify-mockup.mjs` → exit 0, `passed: true`.
Playwright/axe взяты из уже установленных зависимостей, новых зависимостей нет.
Первый прогон обнаружил переполнение 320 px/текст 200%; исправлены minmax и переносы.
После изменения композиции на точный контекст загрузки весь основной прогон повторён.
Результаты — `mockup-check-report.json`; дополнительные проверки —
`mockup-additional-check-report.json`.

| Требование / риск | Сценарий | Наблюдение | Граница доказательства |
|---|---|---|---|
| FR-1 обнаружимость | 390/1440, ссылка открыта у загрузки | На 390 px «Создать клипы» и «Копировать ссылку» видны на первом экране 844 px | Вымышленный аккаунт/файл |
| FR-2 копирование | Browser clipboard success/denied stub | Полный URL и честный fallback | Системный clipboard не проверен |
| FR-5/6 состояния | ready/loading/error/retry/blocked | Готовый URL скрыт до загрузки, повтор проходит через loading, blocked выключает copy | Это UI-моделирование без backend |
| Совместимость | 2 темы × 2 вида × 320/390/1440 × текст 100/200% | 24 сочетания без горизонтального переполнения Chromium | Text resize/reflow, не browser zoom |
| WebKit | 390/1440 × 2 темы, ready/blocked | 4 сочетания, видимость/переполнение/disabled PASS | Не полная матрица WebKit |
| Настройки | Тема, вид, reload, выбранный демо-файл | 2 отдельных demo-ключа; выбор файла не теряется при смене вида | Активный настоящий upload не проверен |
| Клавиатура | Enter/Tab settings; Enter demo file/create | Действия исполняются, focus виден | Скринридер не проверен |
| Accessibility | axe WCAG2 A/AA + 2.1AA, 2 темы × 4 состояния studio | 8 проходов, 0 нарушений; основной smoke dark studio также 0 | Это не заявление о полном соответствии WCAG |
| Изоляция | Локальный file HTML, CSP connect/form запрет | 0 сетевых запросов, 0 JS errors основного прохода | Не проверка runtime security |

Screenshots созданы реальным Chromium и просмотрены автором:
`blogger-auto-link-light-1440.png`, `blogger-auto-link-dark-390.png`.
Дополнительно сохранены светлая mobile, loading/error/blocked mobile, studio dark desktop.
Все данные вымышлены, приватного медиа/учётных данных нет.

OpenSpec strict validation выполнена закреплённой CLI из **этого worktree** под Node22:
`npm run openspec -- validate blogger-auto-link --type change --strict` → valid, exit 0.
Предыдущая ошибочная попытка из sibling worktree не нашла дельту; она не считается проверкой
этого change. Успех структуры OpenSpec не означает согласование или работоспособность.

## Code/spec anti-drift и ограничения

Runtime `apps/`, `packages/`, конфигурация, миграции и настоящие роли/БД не изменены.
FR-1/2/5/6 показаны только в статическом HTML. FR-3/4/7 и серверная часть FR-5 требуют
будущих PostgreSQL/API/межаккаунтных проверок. Статический HTML не доказывает стабильную
выдачу, race safety, антифрод, авторизацию и полный referral/payment CJM.
Вымышленный публичный URL не выдаётся за созданную настоящую ссылку.

Согласование владельца, подтверждение tier/checkpoints, ADR/план, K1/K2,
продуктовый код, развёртывание на VPS, E2E приложения и Cloud.ru — **не выполнены**.
Независимое cross-model QE для продуктового изменения остаётся обязательным после кода.

## Обучение

До проектирования выполнены recall: первая попытка JSON fallback под Node24,
затем успешный SQLite recall под Node22 (5 результатов, 3 релевантных учтены).
Реальный `dz teach --project /home/clipmkr --no-mirror` сохранил
`teach:99608aa1a1a6ccf5`; отдельный повторный recall извлёк именно этот ID.
Урок: переиспользовать существующий генератор через active-blogger guards;
не создавать код обычному пользователю на mount и не путать назначение роли с ownership.
Новых успешных stage/checkpoint receipts не создавали. `.dz`/`.fa-state` не публикуются.
