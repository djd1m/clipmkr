# Проверка пробного бюджета блогера

Дата: 05.11.2026. Реализация принята; тестовая поставка, адресное начисление и контролируемый browser/relogin проверены.

## Primary QE pass

Независимая новая сессия `/root/blogger_trial_independent_qe`, запрошенная модель
`gpt-6-astra xhigh`, автор `gpt-6.1-sol high`. Сначала требования и план, затем код.
Фактический отчёт — `reviews/qe-primary.md`, собственная запись проверяющего в локальном
convergence receipt. Это cross-model по решению владельца, а не cross-family или
криптографическое подтверждение runtime модели.

Проверяющий выполнил76/76 тестов на настоящей PostgreSQL,5/5 дополнительных probes,
3 отдельных мутационных falsifiers, собственные build/typecheck/lint/OpenSpec/diff checks.
Автор отдельно выполнил97/97 и2 falsifiers; результаты не складываются в один счётчик.
Независимая оценка A-, подтверждённых дефектов нет. Полная матрица FR/NFR и ограничения
находятся в отчёте проверяющего; авторское evidence — `08_author_validation.md`.

## Precision QE pass

Дополнительная precision роль для S8 не назначалась и не выдаётся за выполненную.
Проверка готовности основана на фактическом scoped primary QE и meaningful PG smoke,
а не на вымышленном full-suite/CI/S3/browser результате.

## Combined Step-8 grade

QE-VERDICT: A-

Root выполнил установленный convergence evaluate после чтения отчёта и собственного
recall: exit0, verdict closed, revision
`6a914a6e321a7a7306e99d771604085021b0c37ea6a7c110d1a425739b0e57e6`,
unresolved/reasons пусты. Использован plain режим с поддерживаемым convergence gate;
native qe-rounds history, Claude bridge и AQE runtime не запускались.

## Code/spec anti-drift

Три согласованных targets: credits.ts, blogger-policy.ts и новая PG suite. Повышается
только lifetime total/remaining существующего канонического trial на положительную
разницу. Расход, reserved, paid/recovery, charge/allocation и billing policy сохраняются.
Повтор/revoke/lower не пополняют расход; explicit higher limit добавляет новый максимум.
Отсутствующий/неканонический trial требует разбора. Защита expectedPolicy не расширяет
публичную HTTP schema. Согласованные OpenSpec R1/01/06 и8 hashes сверены проверяющим.

## Граница принятия

Full suite, S3, remote CI, live UI и адресный backfill не выполнялись этим QE.
Проект целиком не объявляется готовым. На этапе локального принятия root допустил последующую поставку только web
на тестовый clipmkr.ru/194.85.249.105, с резервной копией, сохранением всех6 compose
слоёв/Resend/env/volumes и остальных контейнеров. Cloud.ru и DNS не входят в поставку.
После проверки image/revision/health — отдельный guarded canonical backfill по прямому
поручению владельца; его фактический результат будет добавлен ниже.

## Запись инструментального ledger

Первый вызов отказал exit2: в row отсутствовал обязательный slug. Финансовых или
продуктовых действий этот отказ не выполнял. После добавления slug/stage в payload
повторная команда завершилась exit0; предыдущего qe checkpoint нет, дублирующего
успешного ledger append не выполнялось. Фактический ответ writer:

```json
{"ok":true,"kind":"ledger","stage":"qe","verdict":"written","exit":0,"reason":"appended and verified by re-reading the tail","blocking":false,"target":"/tmp/clipmkr-blogger-trial-20261105/.dz/feature-adr/run-cost-ledger.jsonl"}
```

При публикации текстовых логов удалены концевые пробелы и пустые строки в конце файла.
Исходные raw logs сохранены закрыто; команды, assertion/results и проверенные исходники
не изменялись. Структурное ревью кода этим форматированием не подменялось.

После первого qe checkpoint повторный evaluate отказал: flat result не содержал
ожидаемых установленным validator полей qe/qeReviewerUsed. Originating reviewer проверил
первый checkpoint и добавил собственное подтверждение; чтение validator показало также
отсутствующее family binding в flat result. Исторический checkpoint/receipt сохранены.
Поддерживаемой командой записано корректное представление того же выполненного scoped
QE: qe.grade=A-, qe.gaps=[], qeReviewerUsed=owner-exception. Это исправление формата
учёта, не повторный запуск или новая независимая оценка. Код и8 измеренных inputs прежние.

## Фактическая поставка и проверка кабинета

Root допущенная тестовая поставка выполнена05.11.2026 на clipmkr.ru/194.85.249.105.
Образ `clipmkr:blogger-trial-4d053b051fbe-web`, source revision
`4d053b051fbef8ae19345951ae12817f138bb2d1`, image ID
`sha256:dd66e163253bd566bbd24d25b21a1930e19ca16e0b35d1794f012f7009365af6`.
Сборка Next.js и health новой версии успешны. Только web заменён; остальные6
container IDs, все env/volumes и исходные6 compose слоёв, включая Resend, сохранены.
Добавлен только image overlay. Свежий pg_dump и каталог проверены перед выкладкой;
до/после замены web совпали хеши всех проверенных business rows (session исключена).

После проверки версии штатный built setBloggerPolicy вызван для целевого существующего
блогера с прежними полями policy и locked expectedPolicy. Это делегированная OS/SSH
операция по прямому поручению владельца, не browser impersonation/SQL patch.
Trial total1800→7200, remaining1620→7020, reserved0. Добавлено5400секунд; доступно117
кредитов. Policy, paid/recovery, прежние charge/allocation сохранены; actor/delta отражены
в operator_action. Данные целевого пользователя и закрытый audit не опубликованы.

Отдельный контролируемый QA-профиль проверен в реальном Chromium на новом публичном UI:
обычный вход→штатное назначение роли серверным владельческим service→refresh показывает
новый баланс и предел120мин→повтор назначения не пополняет→новый обычный вход
сохраняет баланс и предел. Owner API возвращает403 для QA-блогера. Ошибок JS нет.
Роль QA-профиля возвращена в обычную; сохранение уже предоставленного trial при отзыве
подтверждено. Это реальный browser/SSR balance/relogin proof плюс delegated service
assignment, не interactive owner-form E2E. В аккаунт реального блогера исполнитель
не входил; ему предложено обновить собственный кабинет.

FR-8 закрыт native reader + live контролируемым UI; адресный account readback подтверждён.
S3/video/full npm suite не прогонялись повторно для этой локальной ledger delta.
Новые clips/платежи этим тестом не создавались. Cloud.ru и DNS не изменялись; финансовая
приёмка всего продукта не закрывается этой фичей. После новой web revision прежние
платёжные admission fixtures с8859 требуют нового capture/prepare/review.

Закрытые доказательства: отдельный каталог blogger-trial-20261105 вне Git; опубликованы
только обезличенный протокол, source/image IDs и проверенные исходники.
