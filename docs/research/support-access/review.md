# Независимая проверка инструкции доступа к поддержке

**Вердикт: clean.** Существенных фактических ошибок или пропусков в проверенном документальном scope не обнаружено. **Scoped grade: A** относится только к двум документам исследования; пользовательский вход, чтение обращений и доставка ответов не тестировались.

Проверяющий: `gpt-6-astra xhigh`, сессия `/root/cloudru_working_release_review`, независимая от автора `gpt-6.1-sol high`. Дата: 05.11.2026. Первичная карта поддержки составлена по требованиям и исходникам до получения авторского draft. После freeze прочитаны оба документа; собственные исходные выводы сверены с ними.

| Проверенный файл | SHA-256 |
|---|---|
| `README.md` | `8e9b5df615e05ec2f32175ec1ca7abc4b93a6fe6702675e37644af1dfce6540b` |
| `evidence.md` | `ada7bb3b2b3883959128991e843f3aeba0df31d592748d5eda87865d6c37f859` |

Оба хеша совпали с переданным freeze. Проверка исходников использует Clipmkr `24b4b4a4be4364659142b1428511fb634378ddbc`. Независимо подтверждено, что HEAD actual auto-link worktree равен `f55ae4004b88f59558496217e522f26e3288b009`, а указанные в evidence support-пути имеют пустой diff относительно базы и не содержат незакоммиченных изменений. Это устанавливает эквивалентность просмотренного кода, а не identity live binary.

Подтверждены основные выводы:

- `support-client.ts:77–79` загружает внешний виджет; локальные `support/session` и `support/context` обслуживают идентификацию и безопасный контекст. Клиентский hide в `support-client.ts:97–102` не завершает обращение.
- `support-admin.ts:6–14` требует активного аккаунта, действующей сессии и неотозванного `support_operator`, без обхода для владельца/блогера. `support-admin.ts:41–62` возвращает диагностику аккаунта, а не переписку. Записи аудита при list/card подтверждены на строках 36 и 61.
- `mail.ts:5,40–43` обслуживает только verify/reset. Такая конфигурация не подтверждает уведомления сотрудников Libredesk.
- Публичные GET, независимо выполненные при первичной разведке, подтвердили `mode=libredesk`, `baseURL=https://support.clipmkr.ru`, `identifiedEnabled=false`, `synthetic=false` и HTTP 200 helpdesk root. Автор корректно ограничивает смысл этих наблюдений.

Новые детали инструкции проверены напрямую по upstream `5668a2a2c503b9304404d8f3620131b2990cbb99`, который возвращает [tree API для v2.9.0](https://api.github.com/repos/abhinavxd/libredesk/git/trees/v2.9.0?recursive=1). [Router](https://github.com/abhinavxd/libredesk/blob/5668a2a2c503b9304404d8f3620131b2990cbb99/frontend/apps/main/src/router/index.js#L115) подтверждает `/inboxes/all`, assigned/unassigned и вход на `/`. [Handlers](https://github.com/abhinavxd/libredesk/blob/5668a2a2c503b9304404d8f3620131b2990cbb99/cmd/handlers.go#L55), middleware и проверка конкретного диалога подтверждают различия read permissions и отсутствие доступа по одному URL.

[Conversation store](https://github.com/abhinavxd/libredesk/blob/5668a2a2c503b9304404d8f3620131b2990cbb99/frontend/apps/main/src/stores/conversation.js#L679) действительно фильтрует точное имя статуса, сохраняя выбор между посещениями. [Модель статусов](https://github.com/abhinavxd/libredesk/blob/5668a2a2c503b9304404d8f3620131b2990cbb99/internal/conversation/status/models/models.go#L5) отдельно определяет Open/Snoozed/Resolved/Closed и категории open/waiting/resolved. Начальное создание Open, запись conversation/message и зависимость уведомлений от получателей/включённых каналов также сверены с указанными upstream файлами. Документы не выдают эту семантику закреплённого исходника за проверку фактической версии работающего helpdesk.

Непроверенными остаются текущие сотрудники и их права, успешный вход владельца, действующие inbox/status settings, количество и содержимое обращений, сохранность данных и доставка уведомлений. Автор явно сохранил эти ограничения. Защищённые API, обращения, SQL, письма и изменения runtime не выполнялись; новые роли и сервисы не создавались. Два проверяемых MD не изменены.
