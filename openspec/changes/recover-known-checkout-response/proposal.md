# Зачем
Реальный browser QA получил HTTP201 checkout, но не сохранил его body/intent перед навигацией. Read-only exact account+browser idempotency key и provider GET уже доказали одно новое TEST pending намерение. Закрытый оператор корректно остановился; существующий reconcile требует new_checkout, которого при lost response нет. Нужна ограниченная recovery-возможность без повторного оформления и без подделки успеха исходного helper.

Последующая read-only сверка06.11.2026,11:08:37Z показала у того же provider payment canceled/unpaid/expired_on_confirmation, при DB intent=created и отсутствующем confirmation URL. Нужен также прямой terminal-only metadata путь из failed origin без фиктивного pending binding. Эта сверка не доказывает текущую полноту payment/event/grant inventory.

# Изменение
Устойчивый захват checkout evidence до навигации, безопасный diagnostic code и отдельный reviewed recovery известного checkout по точной исходной попытке. Все исходные journals/conditions сохраняются. Связь operator request_key и отличающегося browser idempotency_key фиксируется явно.

Для exact expired origin — source-bound fresh preflight, permanent B1 fence и explicit metadata reconcile под прежними locks с полным canonical cutover/ledger proof; без callback/session/checkout, pending bound или active_case. Stale DB status сохраняется; automatic expiry не считается decline/manual-cancel PASS. Pending follow-up путь сохраняется для фактически pending target; неизвестные event/delivery history и partial closure остаются STOP.

# Граница
Только приватный QA/оператор TEST clipmkr.ru; production handlers/auth/payment policy, grants/ledger, Cloud/DNS не меняются. Основной план в features/recover-known-checkout-response/. Новая delta сама не является gate или runtime GO.
