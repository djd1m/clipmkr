# Автоматическая личная ссылка блогера

Утверждённый HTML: `docs/design/2026-11-05-blogger-auto-link.html`, исходный commit `18e4fa9`.
Реальное согласование: `owner-approval.md`. Реализация начинается с `24b4b4a`.

Подготовлены требования с точной OpenSpec hash-привязкой, reuse, M ADR, light architecture и
план 9 файлов. HTML не изменялся; старый `03_mockup_checks.md` — исторические проверки макета,
не текущая проверка новой OpenSpec-ревизии и не доказательство продуктового runtime.

K1 выполнен двумя pinned dz командами с Node22 (FREE, exit 0). Initial QCSD выполнен; после structural rework Q-BA-01/R-BAL-01/T-BAL-01
нужны новый host snapshot и focused verification исходными reviewer-ролями. Convergence
unresolved до этого подтверждения; K2, implementation и QE пока NOT RUN.

Авторские материалы не являются независимым review. Runtime, deploy, commit и push этим
планированием не выполнялись. Полный UX в коммите `9365e990` не входит в scope.
