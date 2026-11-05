# Проверка передачи неизменного макета

05.11.2026. Только новая авторская проверка resume/handoff. **Не продуктовый Step8,
не независимое ревью и не замена существующего R2.** HTML и PNG не менялись.

Применён `studio-extended-qe` из Product Studio в reference-режиме: прочитаны
`architecture/testing.md`, `docs/process/extended-qe.md`, pinned upstream
`risk-based-testing` и `regression-testing` revision
`c0ddcf3fc07fcea0d1b37f41ad65372b3de7ce69`. Выбраны impact-анализ и короткий
smoke по риску передачи устаревшего макета. AQE runtime/fleet не запускались.

| Требование | Риск | Сценарий / команда | Наблюдение | Ограничение |
|---|---|---|---|---|
| FR-7: показать проверенную ревизию | Подмена frozen пакета, 2×4=8 | `sha256sum -c features/ux-simplification/design-review-inputs.sha256` | 19/19 OK, exit 0 до/после smoke | Привязка к старым native inputs, не удостоверение нового main |
| FR-6: три роли, темы, Кабинет | Ошибка стартовой сцены, 1×3=3 | Node22.23.4 запускает `/tmp/clipmkr-ux-resume-smoke-20261105.cjs` | 12 сочетаний roles×widths×themes, всё PASS | Проверка локального HTML |
| FR-5/7: состояния доступны для показа | Сломан демонстрационный переход, 1×3=3 | Тот же script: 9 toolbar states, Монтажная→Кабинет | Итого 22/22 сцен PASS; overflow/errors/HTTP(S) 0 | Не проверка реального восстановления, auth или медиа |
| FR-7: PNG соответствуют пакету | Показ старых screenshots, 1×3=3 | Python hashlib по `changedScope.regeneratedScreenshots` в author-handoff | 19/19 совпали | Синтетические изображения |
| Авторизация только дизайна | Дрейф в продукт/требования, 1×5=5 | `git diff --exit-code HEAD -- apps packages tests openspec docs/design` + frozen feature inputs | Пустой diff, exit 0 | Новые handoff/QE документы untracked до freeze координатора |

Основной smoke command: `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node
/tmp/clipmkr-ux-resume-smoke-20261105.cjs`. Результат
`/tmp/clipmkr-ux-resume-smoke-20261105.json`, SHA-256
`f7827a982519774febafa7eedd5d46be998ca84789c1d45072db7fd34b926621`;
script SHA-256 `1b3e6fb3d49fadb4721bcf91adca9471d07358ca169cc376c7179a3950c89d36`.
Временные файлы не входят в публичный комплект. Фактический результат прочитан.

Итог code/spec anti-drift: приложение, OpenSpec, frozen дизайн и прежние evidence
не изменены. Новый main уже содержит auto-link/TEST checkout; их реализация не
дублируется. Показать неизменный пакет можно; согласование всей новой компоновки
ещё требуется. Новые формальные stage receipts, lesson teach и approvals не создавались:
новый подтверждённый дефект или новый переносимый урок в этой проверке не найден.

NOT RUN: новые независимые QE, app E2E, серверные проверки, полный keyboard/a11y,
реальные медиа/платежи/clipboard/durability, Windows и телефон — вне read-only
передачи неизменного preview. Исторический R2 74/74 остаётся отдельным отчётом.
