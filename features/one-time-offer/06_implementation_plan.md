# План точечной правки оферты

Inputs read: AGENTS.md; CLAUDE.md; docs/acceptance/core-cjm.md; docs/model-matrix.md; docs/review-policy.md; 00_complexity_assessment.md;01_requirements.md;02_reuse_inventory.md; legal-documents.ts; tests/legal-pages.test.ts; approved-replacements.json. 03_adr и05_architecture: NA дляS, архитектура страницы и платежей не меняется.

Цель: опубликованный текст соответствует разовой покупке; обратный текстовый патч воспроизводим. Текущее состояние: три устаревших абзаца при действующем manual checkout. SPARC: спецификация — точный текст01; алгоритм — замена только39/52/53; архитектура — прежняя; уточнение — existing golden и независимая сверка; завершение — отдельный коммит/поставка/видимая страница. K1: новых команд, модулей и экспортов нет; проверка новых имён неприменима. K2 и текущий admission/context обязательны до кода.

- TASK-1 (FR-1, FR-2): Внести три дословные замены в termsDocument без изменения остальных элементов/стилей/даты. Зависимость: actual router/requirements/plan checkpoints, K2 и admission. Проверка: прямое сравнение со selected base показывает только индексы39/52/53, privacy и provenance прежние.
- TASK-2 (FR-2, FR-3): Добавить три old/new в существующий replacement map, сохранив прежние записи. Зависимость TASK-1. Проверка: npm test -- --run tests/legal-pages.test.ts; исходный fixture и DOCX hashes неизменны; уникальные document/index.
- TASK-3 (FR-1, FR-3, FR-4): Независимый source QE в чистой сессии, реальный native prepare/evaluate, существующий тест и сухое применение обратного патча. Зависимость TASK-2. Сохранить отдельный code commit только с двумя targets и инструкцию возврата; три Git имеют одинаковый SHA. Серьёзная находка — исправление и собственная перепроверка в том же QE lineage, не сброс.
- TASK-4 (FR-2, FR-4): Собрать точный Git-артефакт existing Dockerfile targetweb, свежий backup, изменить только webimage с прежними LIVE env/mounts, проверить health/source и87видимых абзацев в Chromium desktop/mobile. БД не мигрировать/восстанавливать, Cloud/DNS/worker не менять; регистраций/писем/платежей не создавать. Обновить existing backupbinding и вернуть прежний image при отказеweb без отката данных. Фактический результат и ограничения записать08/10.

Риски: расширение юридического текста ловит полный paragraph diff; ложная семантика — чтение трёх пунктов вместе с UI разовой покупки; неполный обратный патч — сухой revert обоих файлов; неуспешная поставка — прежний immutable image и unchanged config. Новый обязательный gate или рассылка из действующего §10.2 этим планом не выдумываются; юридический статус уведомления не считается проверенным.

EXPECTED_CODE_TARGETS:
- apps/web/src/lib/legal-documents.ts
- tests/artifacts/legal-pages/approved-replacements.json
