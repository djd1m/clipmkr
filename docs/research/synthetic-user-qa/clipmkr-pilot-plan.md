# Ограниченный пилот для Clipmkr

**План, не выполненная проверка.** Исследование не разрешает installs, live accounts, платежи, письма или обработку видео. Следующий пилот запускается отдельным feature-adr допуском с зафиксированными средой, пользователями, fixture и бюджетом. Cloud.ru исключён текущим решением владельца; production payments остаются выключенными.

## Состав и роли инструментов

Первый этап использует уже существующие Playwright, native HTTP/PG harness, реальные Chromium/WebKit и SQL/API oracles. Затем один внешний TS QA harness со Stagehand сравнивается с этим baseline: одинаковые задачи, данные и artifact revision. Это предложение, а не доказанная совместимость Stagehand v4 с текущим Playwright. Если интеграция требует нового продуктового стека — остановить опыт. Browser Use — альтернативный внешний исполнитель, а не обязательная вторая установка.

Три synthetic роли описывают опыт и цель, а не выдуманную демографическую репрезентативность:

- **Обычный пользователь:** впервые нарезает запись; ищет простой путь и понятный результат.
- **Блогер:** повторяет загрузку, пользуется личной ссылкой и проверяет собственную статистику.
- **Владелец:** назначает blogger policy/индивидуальный лимит и сверяет attribution/выручку.

У каждой роли отдельный browser context/storage и разрешённый synthetic account. Owner-действия — только существующий согласованный QA-owner или delegated native server service; новых владельцев и ручных SQL role patches нет. Три демонстрационных аккаунта с готовыми клипами, ранее выданные владельцу, не использовать для mutations. Personas не меняют серверные права.

## Матрица сценариев и независимых проверок

Источник обязательных результатов — [core-cjm](../../acceptance/core-cjm.md). Агент получает пользовательскую цель; ожидаемые assertions хранит независимый проверяющий и deterministic harness.

| Сценарий | Действия пользователя | Проверяемый результат и граница |
|---|---|---|
| Ordinary duration | Выбрать запись 90 мин и запись сверх 90 | Сервер принимает границу/отказывает превышению; role/input injection не повышают лимит. API boundary probe отдельно от настоящей 90 мин UI загрузки |
| Blogger duration | 120 мин по умолчанию; custom limit; повтор/отзыв назначения | Индивидуальный целый лимит 2–1440 мин имеет приоритет, пустой возвращает 120; серверный enforcement. Trial funding и длительность — разные oracles |
| Upload lifecycle | Upload→interrupt→resume, reload/error recovery | Один video ID, понятные progress/error states; завершённая передача, без дублирования списания. Смена preferences не remount uploader и не теряет выбранный файл/progress |
| Processing/result | Получить transcript→clips→воспроизвести→скачать | Реальные pipeline states и готовые bytes, native video playback/seeking и saved file. Постерная /c/:code не считается видеоплеером; HTTP200 не доказывает воспроизведение |
| Payment TEST | Успех/отмена, duplicate callback, relogin | Только настоящий отдельно согласованный TEST shop; provider-confirmed state, права/кредиты ровно один раз и сохраняются после входа. Return page/fixture сами не proof; production store не включается |
| Referral ownership | Blogger A/B ссылки→разные client contexts→signup→use→TEST payment | Чужие данные не выдаются, отказ соответствует действующему API-контракту; счётчики и payment-source snapshot принадлежат нужному блогеру; reload/повтор webhook не удваивают. Owner видит разрез источников |
| Reward estimate | Owner выбирает месяц/ставку 20% или 30% | Только подтверждённая выручка пакетов; refund/disputed/unconfirmed исключены, без ставки расчёта нет. Это оценка, не долг/автовыплата |
| Defaults/advanced | Новичок ищет upload; затем раскрывает настройки | Основное действие видно без advanced; настройки доступны, выбранные значения сохраняются. Непонятная кнопка — hypothesis до воспроизведения с человеком |
| Theme/layout | Обе темы/компоновки, mobile 390/desktop 1440, keyboard, 200% text | Нет overflow/скрытых actions; focus/error/loading различимы; preferences переживают reload; browser geometry и скриншоты отдельно от model opinion |

Для длинных fixtures заранее подтвердить согласованный QA-баланс/права и реальный spend cap: лимит длительности не создаёт кредиты. Подготовка funding — только native разрешённый контур, без ручных SQL ledger patches.

Boundary/negative checks выполняются и на native API/PG, чтобы агент не мог «объяснить» зелёный результат. Полная 90/120 мин обработка и настоящий TEST callback требуют отдельного real-resource budget; короткий 155 сек smoke этого не закрывает. Если TEST shop не подготовлен, строка платежей остаётся NOT RUN — настройки основного сайта не меняются ради пилота.

## Ограничение опыта и доказательства

Предложенный первый объём: по одной фиксированной задаче на роль в двух режимах — deterministic baseline и agent navigation; concurrency 1, не больше 20 agent actions на сессию и 10 минут interactive exploration. Эти лимиты — проект предложения, а не измеренная потребность. До запуска проверить, что timeout/action/cost ceilings реально enforced; при отсутствии контроля платные calls не выполнять. Долгая обработка видео имеет отдельный timeout/budget и не входит в 10 мин UX лимит. Без автоматических повторных платных jobs; один короткий smoke только после отдельного допуска.

Записывать commit/image, tool/model/version, task/persona prompt hash, role, timestamps, actions, скриншоты/trace, HTTP/server result, video/clip IDs, browser engine и причины остановки. Секреты/cookies/private media/signed URLs — private 0700/0600; в публичный отчёт только обезличенные ссылки на evidence. QA accounts/data/objects имеют точный whitelist; никаких массовых удалений. Внешняя модель получает только разрешённые страницы/редактированные данные, не owner's real session. Cookies auto-sync и hosted browser по умолчанию не используются.

Разделять исходы: **product defect подтверждён воспроизведением**, **agent ошибся**, **UX hypothesis**, **environment failure**, **NOT RUN**. Проверяющий сверяет фактический oracle, не self-report агента. Сохранить input/output/cache tokens, browser/worker time и фактическую цену по тарифу выбранного провайдера; hardware/hosted sessions/STT/LLM/S3 считать отдельно. Цены и преимущество скорости здесь не измерены.

Пилот полезен, если находит воспроизводимый новый дефект/UX затруднение сверх baseline либо уменьшает ручную подготовку при сопоставимой цене и числе ложных находок. До начала закрепить критерий сравнения; не объявлять synthetic task-success человеческой конверсией. Каждый важный guard получает локальный negative control, например чужая attribution, duplicate callback или потеря uploader state: проверка обязана стать красной. Не вводить такие дефекты на опубликованном сайте.

## Где нужны люди

После технического прогона провести отдельные наблюдаемые задания с согласившимися представителями ordinary/blogger и владельцем: понятность входа/кнопок, ожидание обработки, читаемость субтитров, восприятие результата. TinyTroupe можно использовать до этого только для генерации гипотез; UXAgent — для rehearsal дизайна исследования после проверки лицензии/работоспособности. Сходство synthetic feedback с human evidence ещё предстоит измерить. Ручная приёмка владельца и [обязательная продуктовая приёмка](../../acceptance/core-cjm.md) остаются действующими.
