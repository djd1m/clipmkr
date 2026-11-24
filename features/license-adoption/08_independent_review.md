# Независимое ревью оформления лицензии Clipmkr

Дата: 24.11.2026. Результат: **замечаний к проверенному лицензионному diff не обнаружено**. Это заключение по содержанию и статическим проверкам, а не квитанция закрытия всей feature-adr поставки.

## Снимок и независимость

- Worktree: `/var/tmp/clipmkr-license-adoption-20261124`.
- Baseline HEAD: `2a2b0789e25cbcbde3e3fde34f2433ef36e255bc`.
- Проверенное staged tree: `72d4ee112e410f72ba154593ae8635e1183cd0ad`; `git diff --cached --exit-code <tree>` завершился 0; `git diff --exit-code` — 0.
- Отдельная сессия `/root/license_adoption_qe`, без истории реализации. Сначала прочитаны AGENTS.md и требования, план, owner-authority; staged diff найден самостоятельно. Авторский итог не был входом.
- Запрошенная модель проверки: `gpt-6-astra`, effort `xhigh`; автор по поручению — `gpt-6.2-sol high`. Независимой аттестации фактического backend model ID инструменты не предоставляют.
- Прочитаны CLAUDE.md, core-cjm, review-policy/model-matrix, OpenSpec delta; правила feature-adr/Step 8 и pinned brutal-honesty reference взяты из `/home/clipmkr/.agents/skills/feature-adr/`, поскольку generated skills в worktree отсутствуют. AQE runtime не запускался. Дополнительно прочитан studio-extended-qe как методический контекст; его Product Studio gates не выдаются за исполненные gates Clipmkr.

## Требования, риск и собственные результаты

| Контракт и риск | Проверка | Наблюдаемый результат |
| --- | --- | --- |
| FR-1: изменение оригинального текста ELv2 | Python urllib: загрузка официального `elastic/elasticsearch/main/licenses/ELASTIC-LICENSE-2.0.txt`; сравнение bytes с `git show :LICENSE` | Полное совпадение, SHA-256 `48255018b41fc0e965b1115af7e6779bc218bb8a6747d561da800d5022622aa2` |
| FR-1: чрезмерное обещание запрета конкуренции | Чтение README, оригинала ELv2 и официального FAQ | README ограничивает hosted/managed сервис с существенным набором функций независимо от цены. Продажа копий отделена от размещения сервиса; source-available обозначен без заявления OSI-open-source. Условия полной лицензии доступны по ссылке. |
| FR-2: присвоение сторонних прав | Чтение README, owner-authority и source-provenance | ELv2 относится к собственному коду Дмитрия Жечкова; внешние компоненты и ассеты сохраняют свои условия. Права на бренд, медиа и оплата разделены. Право выдачи лицензии основано на заявлении владельца, Git — доказательство происхождения. |
| FR-2: неполные условия передачи контейнеров | Чтение README и source-provenance | Указана необходимость передать применимые тексты, включая ELv2, и исполнить требования компонентов/исходников. Полное соответствие конкретного образа не объявлено проверенным. |
| FR-3: неточный MIT notice | Python urllib: pinned upstream LICENSE YuNet, побайтовое сравнение с staged notice | Полное совпадение, включая copyright Shiqi Yu 2020 и отсутствие конечного newline; SHA-256 `c83b8120c50ccbd4c4f96edf53141bdd566ebb8f8e9227e415326aa1b1aba958` |
| FR-3: изменение модели | SHA-256 локальной ONNX, сравнение с HEAD и pinned upstream LFS pointer | Веса неизменны; все три источника дают `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4`, upstream size 232589 |
| FR-3: notice не попадёт в worker | Полное чтение Dockerfile и .dockerignore, чтение build scripts | `COPY . .` принимает `.txt` и `.onnx`; `COPY --from=build /app/apps/worker/assets ./apps/worker/assets` сохраняет соседство. Исключения `.md` не затрагивают notice; build scripts не удаляют assets. Статическая гарантия маршрута будущей штатной сборки достаточна в данном scope. |
| C-1: скрытое изменение runtime | `git diff --cached --name-only`, `--numstat`, полный целевой diff | Изменены только лицензия, README, notice, карта и процессные документы; Dockerfile, зависимости и модель неизменны. |
| Anti-drift | Сопоставление OpenSpec, требований, плана, staged реализации | SHA-256 delta `6902a98716c34778ace102eeec11532fd6fe1ffab0220eb896868a11de032220` совпадает с требованиями. Изменение соответствует FR-1/2/3 и C-1. |

## Собственные команды и исходы

Все локальные чтения выполнены из указанного worktree. Команды `git rev-parse HEAD`, `git diff --cached --stat`, `git diff --cached -- LICENSE README.md apps/worker/assets/models/LICENSE-yunet.txt docs/research/licensing/source-provenance.md`, `git diff --cached --name-only`, `git diff --cached --numstat`, `git diff --cached --check`, `git diff --cached --exit-code 72d4ee112e410f72ba154593ae8635e1183cd0ad`, `git diff --exit-code` выполнены успешно. Был выполнен `git write-tree` для идентификации снимка; source files не правились, staging additions/removals не выполнялись.

Побайтовые проверки выполнены собственным Python3 скриптом с `urllib.request.urlopen`, `subprocess.check_output(['git','show',':'+path])`, `hashlib.sha256` и сравнением bytes; для модели отдельно сравнивались bytes `git show HEAD:<model>`. Все сравнения дали True. `.dockerignore` и Dockerfile прочитаны полностью; `rg -n 'LICENSE|COPY|build|assets' Dockerfile .dockerignore apps/worker/package.json package.json` подтвердил места копирования и build commands.

Первый поиск `.agents/skills/feature-adr/SKILL.md` в worktree завершился ENOENT; каноническая установленная копия обнаружена через `rg --files` и прочитана. Этот исход не трактуется как прохождение gate.

## Ограничения и статус доказательств

- Исторический component audit явно помечен ревизией `5053cb8` и ранее собранными staging-контейнерами; его старое отсутствие LICENSE/notice не выдается за текущее состояние. Новая карта отдельно датирована и привязана к текущей базе. Противоречия статусов не обнаружено.
- Договоры отчуждения и полномочия первоначальных авторов независимо не исследовались. Для перечисленных JAN/N3/N4/N6 применено прямо переданное заявление правообладателя, включая другие вклады. Новое подтверждение владельца не требуется.
- Детальная Git-генеалогия каждого донорского файла и всех приведённых source snapshot SHA в этом ограниченном ревью заново не воспроизводилась; проверены формулировки, границы вывода и ссылки. Она не заменяет declaration о правах.
- Checkpoints о strict OpenSpec/K2 прочитаны как внешние свидетельства. Самостоятельный запуск K2/OpenSpec здесь не проводился; их результат не присваивается проверяющему. Координатор отдельно закрывает применимые процессные receipts.
- Сборка образов, deployment, E2E приложения и полный аудит образов не запускались и не требуются для согласованного documentation+notice scope. Наличие notice в уже поставленных образах не заявляется.
- Новых подтверждённых дефектов, блокирующих этот diff, не найдено. Искусственные findings ради численного минимума не добавлены: оригиналы совпали побайтно, границы прав и сборки описаны без завышения доказательств.

## Первичные источники

- [Оригинальный ELv2 в официальном репозитории Elastic](https://raw.githubusercontent.com/elastic/elasticsearch/main/licenses/ELASTIC-LICENSE-2.0.txt).
- [Официальный FAQ Elastic](https://www.elastic.co/licensing/elastic-license/faq).
- [YuNet MIT на закреплённой ревизии OpenCV](https://raw.githubusercontent.com/opencv/opencv_zoo/f12e12798e8314f7c074a6656816c048dcc95b7a/models/face_detection_yunet/LICENSE).
- [YuNet 2023mar LFS pointer на той же ревизии](https://raw.githubusercontent.com/opencv/opencv_zoo/f12e12798e8314f7c074a6656816c048dcc95b7a/models/face_detection_yunet/face_detection_yunet_2023mar.onnx).
