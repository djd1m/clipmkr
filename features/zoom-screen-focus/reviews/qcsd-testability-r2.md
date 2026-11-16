# QCSD testability — независимая focused verification R2

## Результат и предел

**TST-01 исправлено на уровне дизайна; собственный verdict clean.** Snapshot `0795744bd1c936b14cd94ee5296261d49286baf728c8827b6ec33f54170e7a70`, nonce `0226529f-7134-4088-946e-bc6c7a30a6da`. Это не выполнение кода, тестов, K1/K2, общего convergence gate или приёмки. Остальные девять условий подтверждают исключительно их собственные независимые роли. Предыдущая формулировка TST-01 и evidence сохранены без изменения в receipt; верификация относится к текущим проектным артефактам.

## Собственное условие и невакуумный оракул

01 ZF-06/AC03, ADR-001 и OpenSpec теперь дают согласованный исполнимый контракт: camera — движущиеся пиксели подтверждённой ROI в тот же момент; лицо вне неё не выбирается. Отрицательный наблюдённый sample или ошибка анализа вызывает camera veto на всём retained clip с сохранением screen/focus. Замена человека в ROI и короткое отсутствие между замерами не гарантированно распознаются: preview и confirmation должны сообщать этот предел до apply. Это ограничение соответствует переданной root границе полномочий на текущую задачу; selector approval не объявляется доказательством identity detection или отдельным утверждением новых сообщений владельцем.

ADR-001 Confirmation задаёт два конкретных adversarial case: A→B внутри ROI и пустой интервал 0,20–0,30 s между положительными samples 0/0,5 s. В варианте 02 с безопасным слотом и controlled positive FaceReport будущий настоящий FFmpeg-тест обязан проверить `cameraVisible=true`, непустую camera и B/blank в конкретных кадрах; всегда скрытая camera не может пройти. Отдельный отрицательный sample должен реально включить wholeclip veto; внешний marker, заморозка A и потеря screen — отрицательные оракулы. Browser должен показать доступное объяснение ограничения. Controlled report проверяет политику/рендер, а не точность YuNet; worker-image corpus для actual detector и wholeclip owner acceptance остаются отдельными будущими доказательствами.

## Авторский delta и зависимые контракты

Сверены SHA всех девяти файлов host manifest, оба pinned OpenSpec SHA и SHA 01. Author object содержит шесть полей, 10 исходных ID и 131 уникальный changedScope; все шесть изменённых host paths и все 59 target/dependency paths в него входят. Digest dossier, requirements revision и document checks соответствуют author evidence; SHA каждого перечисленного input document и 15 local reuse sources перепроверены. Прочитаны 01, ADR-001/003/004, 04/05, OpenSpec, draft 06, авторский rework и source evidence.

Независимо разобран trailing target block: 59 уникальных путей точно равны `scope-inventory.json` (40 editable и 19 read-only); 26 editable и 18 read-only сейчас существуют. `packages/shared/src/server/original-source.ts` ещё отсутствует — это будущая зависимость Original/root, не готовый helper. Измерение read-only путей не расширяет write authority. До финальной интеграции нужен действительно принятый canonical helper и совместимый same-origin Original Range/metadata seam.

- ADR-004/05 задают exact origin, native `max_redirects=0` для обоих child tools, закрытые ошибки, TLS, controlled redirect/canary checks; author evidence — read-only проверка capability, не проверка runtime поведения. Controlled 3xx/TLS/secret tests на финальном image остаются обязательными.
- Closed runtime parser запрещает unknown/mixed/extra до side effects; authoritative DB reread/claim и поздний CAS привязаны к owner, active/retention, revision и epoch. Это проект будущих реальных PG/queue проверок, не уже проверенная защита.
- ADR-003 задаёт closed sessionStorage envelope с account/clip/source identity и неизменным request key при неизвестном исходе; недоступное storage заранее предупреждается, SPA Back не выдаётся за надёжно отменяемый. ARIA names/units/values следуют canonical clamped ROI; named dialog/focus/status имеют тестируемые переходы и ручную screen-reader проверку.
- Каждый play preview/published/Original останавливает остальные refs во всех шести направлениях, включая ранее выбранный clip; polling сохраняет identity, close/change останавливают preview. Первый03 честно показывает whole-screen fallback, seed камеры не объявлен action detection.

Авторская оценка отсутствия новых серьёзных условий проверена относительно указанной structural delta; в рассмотренной области новых самостоятельных серьёзных условий не установлено. Сохраняются ограничения: detector/identity/короткие события, фактическая скорость и byte traffic, codec/seek, восстановление при blocked/cleared storage, настоящие TLS/redirect/queue/PG и ручной screen-reader QA. R2 не доказывает, что будущие проверки уже существуют или проходят.
