# disambiguate-proxy-upstream — маршрутизация сложности

Task kind: bugfix
Tier: S по фактическому router score7; scope ограничен владельцем/координатором, но tier не назначен разрешением.
База worktree: main `20aa33efecc3d01f7d128f962b0e774184580067`; создание под общим Git-lock, чужая callback-ветка не слита.

| Измерение | Балл | Основание |
|---|---|---|
| Файлы исполнения и тестов | 2 | 6 файлов: site Caddyfile, source-only Compose override, REPRODUCE, private runner, caller pin, private fixture; диапазон4–10=2; base Compose/config прежние |
| Домен | 1 | существующий proxy → main web binding |
| Новые интеграции | 1 | нет |
| Breaking changes | 1 | нет: переносимая база сохраняется |
| Модели данных | 1 | нет |
| Сквозные изменения | 1 | нет: XFF/auth/financial policy прежние |

Сумма7 → S. Документы и OpenSpec — требования/ledger, не дополнительные runtime подсистемы. При добавлении нового executor, network/env/base-Compose change либо иного delivery mechanism или расширении WRITE scope — STOP и повторная маршрутизация. Активны0/1/6/7/8; ADR/DDD/architecture stages не требуются для этого S-fix. Это новый факт неоднозначного DNS после actual callback apply, а не QE5/повторное открытие09305c.

Автор/planning draft: requested gpt-6.1-sol high по поручению root; независимый план и code review gpt-6-astra xhigh организует root. Агентов автор не запускает. Прочитаны feature-adr modules00/01/06, complexity matrix, code-goal-planner reference и pinned code-impl; code-critic применяется независимым reviewer после кода. Доступные здесь architecture/vision.md/degradations.md отсутствуют; новая архитектура не создаётся.

| Acid | Обязательный сценарий |
|---|---|
| A1 | old web:3000 при нескольких web aliases отказывает; exact unique site имя проходит |
| A2 | duplicate selected name/missing main/неполный inventory/wrong artifact/hosts override отказывают |
| A3 | disk/adapted/loaded mismatch, дополнительный upstream или conditional/dynamic proxy отказывают |
| A4 | single-file bind write/validate/reload/health failure не дают ложного успеха; rollback сохраняет inode |
| A5 | portable base/custom Compose прежние, source-site XFF и release11a90 проверены отдельно |

Статус: документы плана. Кода, runtime, независимого approval и successful QE здесь нет.
