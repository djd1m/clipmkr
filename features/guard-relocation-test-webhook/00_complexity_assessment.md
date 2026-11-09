# Guard TEST callback для QA переноса

Task kind: bugfix
Tier: S
Статус: планирование; код и runtime не изменены.

Origin: `features/relocate-clipmkr-to-workspace-vps`, исходное открытое `qe-primary-01`. Это самостоятельная маленькая кодовая зависимость; она не сбрасывает parent cycles и не закрывает его условие.

Четыре code targets (adapter, route, integration test, existing route guard); один billing domain, без новых integrations/models/production breaking changes. Score: files2 + domains1 + integrations1 + breaking1 + models1 + crosscutting2 =8 → S. Для error handling консервативно начислены2 балла; новых общих auth/logging механизмов нет. S получен по pinned scoring6–8, не выбран ради обхода QCSD. Это исправление существующего внешнего TEST callback контракта; добавленный Next route не создаёт новую продуктовую платёжную возможность. Ни одна dimension не XL, production breaking changes0; migration bias относится к parent, а не к этому локальному адаптеру. При росте scope пересчитать router, не удерживать S искусственно. Active:0→1→6→7→8. ADR/QCSD/DDD/architecture/Fleet S не требуются; parent L сохраняет собственные gates.

Автор реализации: requested `gpt-6.1-sol high`; независимое code QE: новая сессия requested `gpt-6-astra xhigh`. Serving identity нельзя приписывать без аттестации. Планировщик не пишет код.

Плановый бюджет: requirements/reuse10мин, plan/gates10мин, код/тесты30–45мин, независимый QE15–25мин; это оценка, не измерение или promise времени merchant окна. Native status будет записан после фактических проверок.
