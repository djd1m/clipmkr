# План

Inputs read: 00_complexity_assessment, 01_requirements, 02_reuse_inventory, OpenSpec, ClipMusicService, leaseAttemptTx, lockRender, тесты музыки.

- FR-1. Разрешить серверную смену музыки при `rendering` наряду с `done`.
  Опубликовать тот же контракт для существующего редактора.
- FR-2, FR-3. В `tests/clip-music-choice.integration.test.ts` подтвердить
  одну попытку в состоянии частичного результата, сохранение предыдущего
  файла и fence соседнего клипа, отказ дубликату.
- FR-1, FR-3. Проверить через обычный редактор на синтетической записи без
  повторной загрузки. Дождаться новой штатной версии и сверить прогресс.
  Независимый GPT‑6 Astra xhigh проверяет условия и границы сохраняемого
  поведения. Выпуск после полноэкранного просмотра.

EXPECTED_CODE_TARGETS:
- apps/web/src/server/clip-music.ts
- tests/clip-music-choice.integration.test.ts
