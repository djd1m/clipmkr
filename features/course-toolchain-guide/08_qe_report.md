# QE памятки для курса — 05.11.2026

Только документация. Автор: назначенная модель gpt-6.1-sol high; независимая новая
сессия: gpt-6-astra xhigh. Среда не предоставляет независимую runtime-аттестацию model ID.

- Настоящий K2 PASS: 0 ошибок, 2 предупреждения о неприменимых S-артефактах ADR/architecture,
  3 S-skip. K1 N/A, targets admitted, literal coder context complete и передан автору.
- Автор и reviewer отдельно проверили 19 ссылок, pinned версии и help/list/show/status/validate.
  Reviewer самостоятельно сверил 6/6 host hashes; вердикт A/clean, нарушений FR-1..6 нет.
- FR-6 → раздел о пересечении требований: feature-adr хранит собственные требования;
  OpenSpec добавляет capability/delta историю, но требует сопровождения и согласованного mapping.
  Зафиксированы реальные path/hash и соответствие FR. Двух независимых копий не предлагается.
- Честно показано состояние ledger: основной specs отсутствует; guide validate PASS,
  show требует Why, status incomplete. Это не продуктовая приёмка.
- Примеры блогера, регистрации и Cloud иллюстрируют процесс и не обещают готовность функций.

HTML/браузер/Windows/app E2E здесь неприменимы: артефакт Markdown. Отдельный renderer
не запускался. Runtime, БД, Cloud, платежи и аккаунты не менялись. Примеры teach/sync/archive
не исполнялись. Anti-drift FR-1..6 дополнительно отражён в author-checks.md и независимом отчёте.

Документ SHA-256: `6f029f1dd40c760789d6964ff0bb6615083599b6e864a646c8207bc5ce3ae057`.
Spec SHA-256: `a9cdc21f30095eabe55a0a3f71dc3253481b7a84d71e4474f7170360ac8e8af5`.
Plain QE convergence действительно closed на revision
`4969b522d57283e3be840be7afd7e25fc39750cb80b2ab6ec7f57fe16bd4726b`.

Первый evaluate отказал из-за неполной транспортной схемы. Координатор добавил author:null
в envelope, originating reviewer сам добавил обязательные initial-review поля. Условия и
вердикт не переписаны; повторный evaluate вернул closed. Первый вывод не выдаётся за PASS.
