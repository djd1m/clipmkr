# Независимый QE исследования facecam стримера

**Вердикт: clean. Grade A — только для документного scope исследования.** Существенных ошибок, требующих исправления перед публикацией этих документов, не найдено. Conditions: `[]`. Это не оценка качества продукта, не приёмка renderer и не разрешение реализации или пилота. Native evaluate/closure выполняет host отдельно.

Дата проверки: 05.11.2026 UTC. Роль: `qe-primary`, family `owner-exception`, independent `true`.

## Кто проверял и что является доказательством

Запрошенный автор: `gpt-6.1-sol high`; запрошенный независимый исследователь/reviewer: `gpt-6-astra xhigh`, роль `/root/cloudru_working_release_review`. Это метаданные делегирования и [действующей cross-model политики](../../../docs/review-policy.md), не независимая аттестация фактически обслужившего модельного backend. Reviewer не писал семь проверяемых документов или продуктовый код. Самостоятельная первичная разведка Clipmkr/OSS/продуктов выполнена до открытия авторского draft; после freeze сначала прочитаны требования/план/complexity, затем документы. Авторский `08_qe_report.md` не читался и доказательством не использовался.

Граница независимости: эта native agent role/session переиспользована после других read-only operator/research reviews и сохраняет историю; технически новой или нулевой сессией она не называется. Истории написания именно этих семи MD reviewer не получал, самостоятельные первоисточники собраны до draft. Отдельного свежего CLI session ID для этой проверки нет. Runtime attestation модели — unknown; запись о запрошенных моделях не заменяет её.

Прочитан installed contract `/tmp/clipmkr-public-entry-20261105/.agents/skills/feature-adr/modules/08-qe.md`. Проверка ограничена исследованием: нет product changes, установки зависимостей/обновления CLI, исполнения inference/FFmpeg, доступа к live/media/accounts/S3/providers/Cloud. Авторская декларация успеха не заменяла собственное чтение первоисточников. Прочитанные K2/checkpoint logs использованы только для проверки процессных утверждений документов, а не как доказательство качества решения.

## Измеренные входы

Host revision: `5ad8ca8331e91f239121d8708a3eb5316b9f2dc323da8c3c94a462a52dff1d1f`.

Host nonce: `05c9d517-918d-4562-9c7f-e38f803c7680`.

Собственная сверка SHA256: **10/10 до чтения frozen набора и 10/10 после проверки**. Все семь пользовательских MD прочитаны целиком. Три остальных native inputs — `00_complexity_assessment.md`, `01_requirements.md`, `06_implementation_plan.md`.

`02_reuse_inventory.md` отдельно прочитан как semantic dependency: SHA256 `3e4e3cebd63e592b79eed2f1a3f09a0d4c63465b7a1eafd58a903fff78010d4c`, неизменен при повторной сверке. **Он не входит в native manifest10 и не объявляется native-bound.** Дополнительно прочитаны relevant core-CJM, ADR-009, исходники renderer/selection/compaction, ранее опубликованный incident и ссылка на UMUX measurement plan. Это контекст проверки, не скрытое расширение measured manifest.

## Результаты по требованиям

| Требования | Независимая проверка и результат |
|---|---|
| FR-1, FR-4 | Пиксельная граница, лицо/камера/маска/identity разнесены. Gameplay/reaction/coding/tutorial/IRL/VTuber и гости разобраны. Строгий facecam — будущий вариант: content-only fallback не засчитывается; при непригодном интервале другой момент/отказ. Нет обещания восстановить пропавшее лицо, закрытый HUD или детализацию маленькой камеры |
| FR-2 | Шесть официальных аналогов имеют первичные URL. Самостоятельно подтверждены editable camera/content layouts, saved preferences и ограничения; датированные vendor adoption/funding claims не выдаются за аудированные коммерческие результаты или точность facecam. UI trials/оплата не заявлены |
| FR-3 | Native paths совпали с указанным source commit. FFmpeg/OpenCV и geometry reuse обоснованы; largest-face не объявлен camera identity. AGPL Ultralytics/clips-studio, MIT ByteTrack/YuNet, Apache MediaPipe/OpenCV, GPL OBS/RVM и отдельная SAM License не смешаны. Старый ByteTrack/RVM не назван активно обновляемым; release/HEAD/file change различаются |
| FR-4, FR-5 | Manual preset предложен первым ограниченным вариантом; auto+confirm/tracking/segmentation/separate OBS input — отдельные альтернативы. Подтверждены native transcript-oriented selection и Twitch metadata/download contract. File upload остаётся baseline; 90/120/custom и2,000,000,000bytes не повышаются исследованием |
| FR-6 | Два знаменателя coverage, явные gaps/identity failures, sync/D′, readability, ручное время и ресурсы. Редкая выборка не объявлена доказательством «весь ролик». Локальная оценка геометрии отделена от полного CJM с delivery/support. Реальные люди/три роли/порядок/незавершённые сессии и ограничения русского UMUX предусмотрены; результатов/гарантии максимального балла нет |
| FR-7 | Public dz mirror/package surface и методы сверены; local problem-solver SHA совпадает. Пакет skills-meta0.9.75 дополнительно получен из npm в память, integrity совпал, два SKILL.md совпали с mirror. Опубликованный evidence_fetch.py прочитан, не запускался. Ни подписи, ни специальные evidence-классы, ни выполненный GOAP runtime не приписаны обычному HTTP чтению |

## Существенные проверки источников и кода

- В `framing-plan.ts` ведущим выбирается крупнейшее прошедшее порог лицо; `.03/.4×median` объясняет риск маленькой facecam рядом с крупным чужим лицом. `faces.ts`/`detect_faces.py` подтверждают0.5s/60s/640px. Пять основных файлов побайтно совпали между самостоятельно изученным f55 и цитируемым main9375. Из этого не делался вывод о текущем deployment.
- `format.ts:64–75` и ADR-009 подтверждают старую семантику dual с двумя людьми. README/architecture/evidence-map явно требуют будущую дельту требований, ADR и согласованный макет для camera+game/IDE. Переиспользование filter geometry не выдаётся за уже разрешённую смену режима.
- `compaction.ts`/`ffmpeg.ts` подтверждают planDuration/mapTime и общий audio/video timeline. Две ветви одного split с одним encode — допустимая композиция существующих [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html), не собственный benchmark. Дублирование камеры и отсутствие скрытого под ней контента прямо разобраны.
- [Twitch help](https://help.twitch.tv/articles/en_US/Knowledge/how-to-use-clips) подтверждает auto suggestion/accept-adjust-dismiss, Stacked/Full и centered fallback без facial identity recognition. Обычный help URL сначала отдал CSS/loading shell; printable official view и индексированные passages содержали фактическую инструкцию. Это чтение документации, не вход в редактор.
- Независимо прочитаны [StreamLadder layouts](https://www.streamladder.com/clip-editor/custom-layouts), [facecam claims](https://www.streamladder.com/clipgpt/facecam-detection), [Eklipse templates](https://eklipse.gg/help/how-to-use-and-customize-templates/), [adoption page](https://eklipse.gg/help/what-do-streamers-use-to-edit-videos-for-youtube-and-tiktok/), [CrossClip layouts](https://streamlabs.com/content-hub/post/how-to-save-layouts-with-cross-clip), [known issue](https://support.streamlabs.com/hc/en-us/articles/48665093228955-Twitch-Clips-No-Longer-Compile-in-Crossclip), [Opus funding](https://www.opus.pro/blog/opusclip-raises-a-new-round-of-funding-from-softbank-and-launches-opussearch), [Vizard guide](https://agent.vizard.ai/how-to/cut-gaming-highlights-that-keep-your-facecam-in-shot.html). Даты/самоотчёты согласуются с текстом. CrossClip100MB/1GB подтверждены индексированным содержимым official plans page; свежий open показывал только оболочку. Покупка/checkout не проверялись.
- На закреплённых SHA напрямую получены и прочитаны README/LICENSE clips-studio/ByteTrack/Ultralytics/SAM3/OBS Background Removal/RVM, relevant clips-studio layout/detect/requirements и AutoFlip README. Clips-studio действительно задаёт src/dest для camera/game/UI и TalkNet-based выбор; его documentation исключает VTuber. Это сведения об исходниках, не доказанная точность алгоритма.
- GitHub metadata/commit/release страницы подтверждают приведённые даты; смещения часовых поясов сверены в UTC. После пяти успешных metadata API calls дальнейшие API requests получили rate-limit403; нужные pinned commit/release факты сверены по официальным GitHub HTML. Изменение stars MediaPipe/Ultralytics на1 между срезами не является ошибкой датированной таблицы. Неподтверждённого собственного performance claim нет.
- Собственный ранний hash bundled YuNet совпал с upstream LFS oid модели2023mar. В тексте автор честно оставил полную проверку vendored provenance/notices отдельной задачей; это консервативное ограничение не препятствует публикации research и не означает разрешение менять/переупаковывать модель.
- Счётчики author retrieval ledger перепроверены арифметически: именно collection web-retrieval содержит26requests=15HTTP200+10HTTP403+1DNSerror; весь ledger содержит другие collections. Они не смешаны в заявленную полноту исследования. Сам HTTP200 не трактуется как доказательство содержательного чтения.

## Проверки документации и пределы вывода

23 относительные Markdown-ссылки разрешились; `git diff --check` завершился0. Изменения ограничены исследовательскими/process артефактами, product sources/tool pins не менялись. Здесь не запускались продуктовые tests, inference, UI, customer pilot или UMUX; их статус **NOT RUN**, а не PASS. Read-only code interpretation не доказывает facecam quality, latency, cost, market demand, willingness to pay или доступность каждого competitor workflow.

Технические неопределённости — малая/закрытая камера, сцены, несколько лиц, аватары, читаемость IDE/HUD, веса и notices при будущем внедрении, второй OBS-file sync — уже видимы в документах и вынесены в будущую проверку. Это не пропущенные результаты разрешённого исследования. Дополнительных условий или искусственных findings не создаю.

## SHA256 native manifest

| Путь | SHA256 |
|---|---|
| `docs/research/streamer-facecam/README.md` | `ad5c6f98d28df064f6668ada21ace56f23d7fa9f3271ab78245396e6d913e637` |
| `docs/research/streamer-facecam/analogs.md` | `4a85854f3bc5cfaa3917d0d5537b77301e75aed6482c236bc0fc2acca4163630` |
| `docs/research/streamer-facecam/architecture-options.md` | `061edb43951124c3071b0244427f0ae107216c1a6234d41614738185a9c8293f` |
| `docs/research/streamer-facecam/evidence-map.md` | `34db6a7b06758c02d54643a8a2fc840537e94b74e78e6e9c6dfa0c811cc70609` |
| `docs/research/streamer-facecam/oss-candidates.md` | `be5c2e3db59ac4beaed9ed9fb8acc6516afe431bbe8ed6d5db434a60d81511b0` |
| `docs/research/streamer-facecam/sources.md` | `e8b4127c198425514b3b5ae0a3e4abd34a6f89e5cc3796d0e60532b4cd90d9ac` |
| `docs/research/streamer-facecam/streamer-cjm-and-pilot.md` | `189f37264862a4430175f9e5241c05ee1085333e607dc1b1d82ab1093f3e258e` |
| `features/streamer-facecam-research/00_complexity_assessment.md` | `40f808a7d5725cb26111472a933cf2eeb10f770b6edd201ec3197c03ec03560d` |
| `features/streamer-facecam-research/01_requirements.md` | `9b8d4cdafe37bd6d39e59c7af9e6265ab3c7a6f293f4ea09e98c86c2d568f8f7` |
| `features/streamer-facecam-research/06_implementation_plan.md` | `e5842975aea9ed84fd41f2bd7425de9793e39cd5ad3a7325340880dddbeae378` |

Окончание независимой сверки: 2026-11-05T18:52:16.196319+00:00. Initial author handoff отсутствует: `author:null`; `authorAssessmentChecked:false`, `deltaVerification:null`.

## Originating focused verification: уточнение timeout

Дата: 2026-11-05T19:03:50.792442+00:00. Новая host revision `01cfea7b18d0827e976a22461cc6011a01f8904ea179440d703117e667a2f47f`, nonce `3131b0c3-562b-4d7c-be82-3ae7e78b8377`. **Вердикт clean; Grade A для документного scope сохраняется.** Это продолжение той же переиспользованной native-role/session; исходная граница независимости/runtime attestation выше не меняется.

Фактически сверены все10 native manifest hashes; от первоначального проверенного снимка отличается только `docs/research/streamer-facecam/oss-candidates.md:11`. Остальные6пользовательских MD и3process inputs неизменны. Отдельная dependency02 сохраняет SHA `3e4e3cebd63e592b79eed2f1a3f09a0d4c63465b7a1eafd58a903fff78010d4c` и по-прежнему не native-bound.

Точный delta установлен независимо: обратная замена единственного «timeout процесса детекции 60 с» на прежнее «лимит 60 с» воспроизводит полный исторический SHA256 `be5c2e3db59ac4beaed9ed9fb8acc6516afe431bbe8ed6d5db434a60d81511b0`. Текущий полный SHA256 — `c5e5907269436ade8cff4ea0adb7a682373268b2ca4f33b86f9282771fd26352`. Иных изменений в файле нет. Сохранённый `draft-freeze.json`, его ссылка/хэш и текущий7-file aggregate в `final-freeze.json` также сверены.

Самостоятельно перечитан affected native `faces.ts:34,39–40`: `FACE_TIMEOUT_MS=60_000` передаётся `execFile` параметром `timeout`; начало/конец анализируемого фрагмента передаются отдельными аргументами. Файл побайтно совпадает с цитируемым source9375. Поэтому classification **wording** корректна: уточняется объект ограничения; длина клипа, программа и исследовательское предложение не меняются. Предыдущая формулировка допускала нежелательное чтение как ограничение длины; уточнение его снимает.

Реальный author handoff прочитан и проверен: changedScope содержит единственный изменённый measured path, classification/delta/evidence соответствуют проверке; addressed[] корректен, поскольку supplemental P3 BSR-01 не был условием originating native review. Author newRisks assessment подтверждён собственной сверкой: новых существенных рисков от этой правки не обнаружено. Supplemental blind review не объявляется второй native-role; roster остаётся только qe-primary/owner-exception.

Conditions остаются `[]`, authorAssessmentChecked=`true`, deltaVerification=`{classification:wording, implementationVerified:true}` означает проверку фактической документной правки и её основания в существующем source. Это не исполнение feature/inference/pilot/humanUMUX; их статус остаётся **NOT RUN**. Первоначальный отчёт сохранён без переписывания истории. Host authority, author object и чужие entries reviewer не изменял.
