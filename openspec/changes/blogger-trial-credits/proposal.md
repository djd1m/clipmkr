# Пробный бюджет назначенного блогера

R1,05.11.2026. Владелец поручил исправить назначение120мин при signup trial30мин.
Блогеру требуется общий пробный бюджет не меньше назначенного лимита записи с учётом
уже предоставленных trial секунд и расхода. После180с расхода из1800с общий trial7200с
даёт7020с остатка, а не7200с или8820с. Paid grants не учитываются как free trial.

Переиспользуем canonical trial grant и setBloggerPolicy; разница добавляется атомарно
под existing account/credit locks и отражается в existing operator_action. Повтор,
понижение/revoke/re-enable не пополняют остаток; новый явно назначенный максимум добавляет
только прирост общей trial ёмкости. Legacy billing не переводится автоматически.

UI/HTTP schema, source enum и DB schema не меняются. Адресный backfill существующего
блогера — тот же canonical service с unchanged-policy guard и отдельным root admission
после проверенной поставки. Feature execution: features/blogger-trial-credits/.
