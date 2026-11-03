# Модель доставки

Продуктовые сущности account/video/clip/payment/partner не меняются. Доставка
не создаёт нового доменного сервиса. Revision pending: ADR-001/002/003.

- **Release:** полный Git SHA, артефакты web/worker, OCI labels, image IDs и checksum.
- **Target:** явная разрешённая тестовая цель, закрытый SSH/env-профиль, отдельные
  DB/Redis/session ресурсы и маршрут. Только `cloud-c` и `site-test`, обе через SSH;
  controller `/home/clipmkr` и исключённый localdevstage целями не являются.
  ApplicationProject и databaseProject/redisProject отдельные: pinned container/
  volume/network identities и binding.dbName связаны с application DATABASE_URL;
  его database/host, не POSTGRES_DB default, определяют адрес SQL.
- **Receipt:** по каждой цели фактически применённая версия, состояние проверок,
  ошибки, предыдущий совместимый выпуск. Общий результат выводится из всех целей.
- **StorageNamespace:** точная пара bucket+prefix; tests/cloud/ или tests/site/.
  Logical key в БД не меняется, physical key выводится только на SDK границе.
  Нынешний общий key сохраняет production-права по явному owner exception.
  Разделение tests/production и двух tests только code/SDK, без IAM isolation.
- **DataBaseline / CopyEvidence:** sourceIdentity и snapshot-bound restore плюс
  свежий live baseline той же site DB; DB-whitelist synthetic objects с size/SHA,
  proof сохранения original и разрешённых старых multipart. Не новая DB-таблица.
  Новый site sourceIdentity/account SHA/journal match test.dump 5/28 получен root;
  до apply дополняются остальные data fingerprints и проверяется drift.
- **TestShopWindow:** согласованные начало/конец, UI-оператор, исходный callback,
  отсутствие pending intents до/после, native receipts и восстановленный n5 receiver.

Переходы: подготовлен → проверен → передан → применён → проверен на цели;
частичная ошибка сохраняется отдельно и не заменяется состоянием «успех».
Откат приложения не является откатом пользовательской истории БД.

Переход namespace: inventory → drain test writers/multipart → verified copy →
config admission → start/verify. Отсутствующий или чужой object не становится
тестовым от добавления prefix. Site сохраняет все 5 accounts/4 videos/10 clips/
6 payments/referrals; Cloud сохраняет 3 accounts, добавляя 026/027. Site journal 28
не мигрируется повторно. Каждый следующий baseline учитывает новые данные.

Окно магазина: proposed → согласовано по времени → drained → UI callback Cloud →
native/replay/credits/referrals → Cloud intents завершены → UI callback n5 →
проверено закрытие. Без выполнения предусловий следующий переход запрещён.
