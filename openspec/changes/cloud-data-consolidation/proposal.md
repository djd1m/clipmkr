# Консолидация данных source и существующего c

Владелец подтвердил перенос принятого приложения, аккаунтов, видео и клипов clipmkr.ru на c.clipmkr.ru после UI/recovery/E2E и ручной приёмки source, с сохранением ВСЕХ существующих данных c. Это две непустые истории; release parity сама по себе не выполняет их объединение.

Статус: **proposed, docs-only**. Конкретные коллизии и окно ещё не согласованы. Runtime/DDL/deploy/DNS/копирование объектов не выполнены. Новая платформа миграций, контейнеры и MinIO не вводятся. Старый scope `cloudru-release-parity` и его findings не переписываются.

Дельта ниже хранит требования; авторитетные решения, план, риски и evidence: `features/cloud-data-consolidation/`. SHA этого change закреплён в feature `requirements-binding.json`. Независимый QCSD, финальные K1/K2 и plan checkpoint ещё не пройдены.
