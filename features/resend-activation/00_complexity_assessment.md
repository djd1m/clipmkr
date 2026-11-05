# Подключение существующего Resend на тестовом Clipmkr

05.11.2026. Владелец: «давай подключим resend?»; затем попросил инструкции настройки провайдера параллельно работе. Требуется операционное включение существующего адаптера, не разработка нового mail stack.

Task kind: feature
Tier: S
Score: 7

Files1, domains1, new integrations0, breaking0, models0, cross-cutting auth/config1:1+1+1+1+1+2=7. Новый runtime код, UI дизайн, API/schema и зависимости не планируются. При обнаружении необходимости менять auth/transport scope возвращается в routing до кода.

Контур: dev77.83.87.178; test clipmkr.ru194.85.249.105/compose n5-clipmaker; Cloud.ru не обновлять. Native web source8859f762c4ce19f6ba51310ac09148b4a7d5ef2f сохраняется. Исполнение в /tmp/clipmkr-resend-20261105; закреплённый dz0.8.58 и навыки1.5.25 переиспользуются из соседнего worktree того же проекта/lockfile, без нового npm install.

S: light requirements/reuse, inline plan, real checkpoints и smoke/QE; ADR/DDD/QCSD/fleet не требуются. K1: новых runtime modules/exports/commands нет. K2 выполняется по плану; внешний secret profile не публикуется.
