# Ограниченная коррекция canvas readiness

16.11.2026: отдельная коррекция прежней zoom-screen-focus; старые закрытые native3 сохраняются, один дополнительный внешний cross-model QE учитывается Root. Новый native4 или nested .fa-state не создаются.

Требования: [01](01_requirements.md), [OpenSpec pin](requirements-revision.json); routing/reuse: [00](00_complexity_assessment.md), [reuse/K1](02_reuse_inventory.md). План другой модели: [06](06_implementation_plan.md). Реальные изменения: [manifest](07_code_changes/change_manifest.md), [same-scope TS2488 amendment](typecheck-compatibility-amendment.md). Команды, результаты, сохранённый FAIL, code/spec anti-drift и ограничения: [08](08_qe_report.md).

Проверено автором: первоначальные34UI PASS/1excluded; после однострочного TS-исправления3затронутых browser PASS/32filtered, canonical typecheck и полный build exit0. Прежние31UI byte-identical, общий suite/Fleet/coverage и runtime deploy этим блоком не повторялись. Эта папка не является квитанцией native QE или COMPLETE всей фичи.

Независимый проход завершён: [заключение gpt-6-astra xhigh](08_independent_review.md), PASS для ограниченной коррекции. Проверяющий выполнил пять выбранных сценариев, затем повторил три затронутых после исправления совместимости теста. Это один внешний проход с сохранением прежних трёх native-циклов. На clipmkr.ru данная коррекция ещё не опубликована; проверки совместимости и поставки всей Zoom-функции остаются отдельным незавершённым блоком.
