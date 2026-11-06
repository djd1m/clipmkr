# Зачем
Реальный browser QA получил HTTP201 checkout, но не сохранил его body/intent перед навигацией. Read-only exact account+browser idempotency key и provider GET уже доказали одно новое TEST pending намерение. Закрытый оператор корректно остановился; существующий reconcile требует new_checkout, которого при lost response нет. Нужна ограниченная recovery-возможность без повторного оформления и без подделки успеха исходного helper.

# Изменение
Устойчивый захват checkout evidence до навигации, безопасный diagnostic code и отдельный reviewed recovery известного checkout по точной исходной попытке. Все исходные journals/conditions сохраняются. Связь operator request_key и отличающегося browser idempotency_key фиксируется явно.

# Граница
Только приватный QA/оператор TEST clipmkr.ru; production handlers/auth/payment policy, grants/ledger, Cloud/DNS не меняются. Основной план в features/recover-known-checkout-response/. Новая delta сама не является gate или runtime GO.
