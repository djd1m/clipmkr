# Проверяемый Cloud.ru-кандидат и единый тестовый выпуск

## Зачем

Cloud.ru работает на старой версии, а владелец требует сначала проверить там
все новые фичи и доказать доставку последующих правок из controller `/home/clipmkr`.
Production переключается только по отдельному решению владельца.

## Изменения

Один SHA/артефакт для двух SSH-целей cloud-c и существующего site-test; localdevstage
исключён. Сохраняются ВСЕ account/media/payment/referral данные, existing DB/Redis
раздельных app/infra projects; backup/restore и exact DATABASE_URL binding обязательны.
S3 owner exception: нынешний общий key сохраняет production-права, только SDK
namespace tests/cloud/ и tests/site/, без новых key/policy/IAM proof. При частичном
успехе сохраняются реальные результаты. Откат приложения ограничен схемой БД.
Core-CJM, нынешний TEST shop в согласованном окне и повторная правка проверяются
отдельно. Новая ревизия pending prepare/трёх focused QCSD/K1/K2, не approved.

## Область

Эксплуатационная возможность `release-candidate`. Переиспользуются Git, SSH,
Docker Compose и текущий migrator. Настоящие платежи и production cutover не входят.
Истина исполнения: `features/cloudru-release-parity/`.
