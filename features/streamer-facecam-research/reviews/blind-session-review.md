# Независимое слепое ревью streamer-facecam research

Дата: 05.11.2026 UTC. Объект: семь Markdown-файлов в `docs/research/streamer-facecam/`, freeze от `2026-11-05T18:46:21.722763+00:00`.

**Вердикт:** материал пригоден как исследовательское предложение и основание для следующего решения владельца. Подтверждённых P0/P1/P2 не найдено; есть одна P3-неоднозначность формулировки. Это не приёмка реализации, лицензий для внедрения или проведённого пилота. Durable gate и native QE этим отчётом не выполняются.

## Независимость и вход

- Фактический идентификатор проверяющей задачи: `/root/streamer_blind_review`. Другой session ID/UUID не предоставлен и не придумывался.
- Запрошенная модель: `gpt-6-astra`, reasoning `xhigh`. Backend attestation: **unknown**; отчёт не утверждает аппаратно подтверждённый ID модели.
- Автор по поручению координатора: `gpt-6.1-sol high`. История написания и прежние вердикты проверяющему не передавались.
- Первым чтением были только `AGENTS.md`, `docs/review-policy.md`, `features/streamer-facecam-research/01_requirements.md` и `06_implementation_plan.md`. После этого самостоятельно прочитаны все семь целевых MD, native renderer и выборочные первоисточники.
- `08_qe_report.md`, чужие reviews, root reports и `.fa-state` не открывались. Процессные заявления автора внутри обязательного `evidence-map.md` не использованы как доказательство успешных gates. Из `draft-freeze.json` использованы ожидаемые пути/хэши; манифест не доказывает содержательную корректность.
- Никакие установки, модели, media/runtime, аккаунты, платежи, провайдеры, Cloud или git-мутации не выполнялись. Единственный созданный файл — этот отчёт.

## Находка

| ID / severity | Путь | Доказательство и сценарий | Значение для приёмки / направление исправления |
|---|---|---|---|
| BSR-01 / P3, низкая | `docs/research/streamer-facecam/oss-candidates.md:11` | В строке детектора написано «Шаг выборки 0,5 с, лимит 60 с». В `apps/worker/src/render/faces.ts:32–40` 60 000 мс — `FACE_TIMEOUT_MS`, передаваемый как timeout дочернему процессу, а начало/конец анализа передаются отдельно. `apps/worker/src/render/ffmpeg.ts:48` допускает исходный клип до 75 с. Читатель инвентаризации может принять 60 с за предел длины входного фрагмента. | Уточнение точности FR-3; не опровергает reuse-first вывод и не блокирует исследование. Достаточно назвать это «timeout процесса детекции 60 с». Исследуемый файл не исправлялся. |

Других подтверждённых нарушений приёмки в проверенном объёме не обнаружено. Недоступный источник или неизмеренное качество не объявлялись дефектом продукта.

## Проверка основной цели и проектных границ

| Предмет | Независимое наблюдение |
|---|---|
| Стрим → клипы с головой автора весь ролик | `README.md:19–23`, `architecture-options.md:30–34` и `streamer-cjm-and-pilot.md:65` требуют для предложенного строгого режима сохранять автора на всём экспорте; content-only fallback не зачтён. Это прямо помечено будущим предложением, а не незаметно принятым требованием. |
| Missing pixels, сцены, identity, VTuber | Разделены отсутствие/перекрытие камеры, ложный выбор лица в игре/reaction, гость, scene change и аватар. Crop не назван восстановлением скрытых пикселей; tracker ID не назван identity. Для VTuber предложен manual ROI без гарантии человеческого детектора. |
| Crop, tracking и segmentation | Их роли различены. Прямоугольник камеры не выдан за контур головы; отдельный исходник OBS требует наличия записи, синхронизации, проверки drift/gaps. Дублирование камеры в content ROI и невосстановимый HUD/код под ней явно разобраны. |
| Native reuse | Полностью прочитаны `faces.ts`, `detect_faces.py`, `framing-plan.ts`, `format.ts`, `ffmpeg.ts`, `compaction.ts`; выборочно — worker render/selection, LLM provider, upload constants. Подтверждены 0,5 с sampling, 640 px для детекции, выбор крупнейшего прошедшего порог лица, 1,5 с dwell, split/crop/scale/vstack и один финальный encode. Это не доказывает качество на stream fixtures, и исследование его не обещает. |
| Старый dual и новая дельта | `format.ts:64–75`, `framing-plan.ts:7–19` и ADR-009 подтверждают семантику двух людей. Исследование сохраняет её и требует отдельные requirements/ADR/layout approval для camera/content. Геометрическое переиспользование не названо готовой функцией. |
| Общая временная шкала | `planDuration`, `mapTime`, `buildCompactionGraph` и их вызовы в `ffmpeg.ts` подтверждают D′, перенос времён, xfade/acrossfade. Документы требуют общего плана камеры/контента/аудио/captions и отдельно отмечают двухфайловый sync. |
| Лимиты и отбор | Сверены `docs/acceptance/core-cjm.md` и `packages/shared/src/upload.ts`: 90/120/custom и 2 000 000 000 байт. В selection/provider действительно передаются transcript/duration; это не визуальное распознавание игровых событий. File upload оставлен исходным путём. |
| Пилот и UX | Матрица покрывает сцены, gaps, identity, аватары, мелкую камеру, код/HUD, captions, compaction и доставку. Предложены два coverage, manual time, latency/resources и real-human UMUX; результатов или «лучшего» балла нет. Основной путь описан через подтверждение и preview; advanced отделён. README даёт короткий вывод и ссылки на подробности. UI usability и готовность платить остаются гипотезами. |

Точную разметку головы, правила переходных кадров и перевод source-time/output-time для coverage при compaction ещё потребуется закрепить перед экспериментом. Документ сам оставляет процедуру и критерии на согласование; это не отсутствующий результат уже объявленного эксперимента.

## Выборочная проверка первоисточников

Выполнены только публичные GET/Web-чтения. Ниже описано фактически повторённое, а не принятие авторских receipts на доверии.

- [Vizard guide](https://agent.vizard.ai/how-to/cut-gaming-highlights-that-keep-your-facecam-in-shot.html): дата 10.10.2026, frames/transcript/audio, stacked layout и ограничения маленькой камеры/тихого материала присутствуют. Собственный пример поставщика не выдан исследованием за репликацию.
- [StreamLadder facecam](https://www.streamladder.com/clipgpt/facecam-detection) содержит claims tracking/avatars и 1 млн streamers / 11 млн clips; [mobile blog](https://www.streamladder.com/blog/twitch-clips-to-tiktok-mobile) датирован 21.07.2026. Исследование корректно не превращает эти claims в доказанный эффект facecam.
- [OpusClip announcement](https://www.opus.pro/blog/opusclip-raises-a-new-round-of-funding-from-softbank-and-launches-opussearch): дата 11.03.2025, SoftBank Vision Fund 2 и самоотчёт более 10 млн creators/brands подтверждены. Заявления о прибыльности всех аналогов в семи MD нет.
- [CrossClip issue](https://support.streamlabs.com/hc/en-us/articles/48665093228955-Twitch-Clips-No-Longer-Compile-in-Crossclip): 03.04.2026, Investigating / Workaround Available и manual upload действительно указаны.
- Twitch help первоначально отдал CSS/loading shell. Доступная [официальная printable-версия](https://help.twitch.tv/articles/en_US/Knowledge/how-to-use-clips) и индексированное содержимое официальной help-страницы подтверждают saved preferences, editable crop и centered fallback. [Twitch blog](https://blog.twitch.tv/en/2024/08/28/creating-and-sharing-clips-for-mobile-just-got-easier/) подтверждает дату 28.08.2024. [Twitch API](https://dev.twitch.tv/docs/api/reference/#get-clips-download) прямо различает metadata и temporary clip download URLs с авторизацией.
- [Eklipse adoption article](https://eklipse.gg/help/what-do-streamers-use-to-edit-videos-for-youtube-and-tiktok/) через прямой Web open дал timeout; поисковое извлечение той же официальной страницы содержит более 1 млн и Updated 04.11.2025. Это более узкое подтверждение, чем успешное чтение полной страницы.
- На закреплённых SHA напрямую прочитаны LICENSE FFmpeg, OpenCV, YuNet, MediaPipe, ByteTrack, Clips Kitty, SAM 3, OBS Background Removal, Source Record и RVM. Заголовки лицензий совпадают с исследованием. [FFmpeg LICENSE](https://github.com/FFmpeg/FFmpeg/blob/f8a03cd98daa81d16948308b5b1612aaaa831500/LICENSE.md) явно относит libx264 к GPL-зависимостям. [Ultralytics licensing](https://www.ultralytics.com/license) подтверждает позицию поставщика про AGPL/Enterprise и модели; документ не выдаёт её за окончательное юридическое решение для Clipmkr.
- [SAM 3 README](https://github.com/facebookresearch/sam3/blob/f1647e8d0c1d280991f4d1b7d974c2704537fe66/README.md) подтверждает Python 3.12+, PyTorch 2.7+, CUDA 12.6+ и необходимость доступа к checkpoint. [SAM License](https://github.com/facebookresearch/sam3/blob/f1647e8d0c1d280991f4d1b7d974c2704537fe66/LICENSE) — специальная лицензия с ограничениями; определение материалов включает code и trained weights. Документы не называют её MIT/Apache и не разрешают внедрение. Наличие публичного source само по себе не подтверждает допустимость всех вариантов использования.
- [OBS Background Removal README](https://github.com/royshil/obs-backgroundremoval/blob/b2786e87dc1d08ed2f2ce335000a8fb1992dc944/README.md) подтверждает CPU, несколько источников моделей и GPL-3.0-or-later. [Выбранный commit](https://github.com/royshil/obs-backgroundremoval/commit/b2786e87dc1d08ed2f2ce335000a8fb1992dc944) меняет workflows/actions.lock, поэтому оговорка об активности CI обоснованна. [RVM README](https://github.com/PeterL1n/RobustVideoMatting/blob/53d74c6826735f01f4406b5ca9075eee27bec094/README.md) описывает temporal matting; его benchmark не перенесён на Clipmkr. Полная цепочка лицензирования конкретных весов не подтверждалась и не объявлена завершённой в исследовании.
- [Clips Kitty GAMING.md](https://github.com/ColinGPT9/clips-studio/blob/2ea80d3124e850e0a550a997edd1e6ef630b50d8/docs/GAMING.md), выборки `gaming/layout.py` и `gaming/detect.py` подтверждают отдельные области, presets, проблему scrolling chat и отсутствие VTuber support. Код не запускался; геометрия проекта не принята за permissive-лицензированный отдельный модуль.
- Публичные release-страницы подтверждают [OpenCV 5.0.0](https://github.com/opencv/opencv/releases/tag/5.0.0), [MediaPipe v1.2.2](https://github.com/google-ai-edge/mediapipe/releases/tag/v1.2.2) и [Clips Kitty v2.1.0](https://github.com/ColinGPT9/clips-studio/releases/tag/v2.1.0), с отображаемыми датами 06 Jun, 03 Nov и 21 Oct. Полные API timestamps и все заявленные stars/HEAD/source-change даты повторно не подтверждены: API отдал 403 rate limit.
- [dz-harness README](https://github.com/djd1m/dz-harness/blob/a9da87456e8f9bd0f204a00c143b016b1a7c9e61/README.md) подтверждает public package mirror и более новые mirror pins; `skills-meta/package.json` подтверждает 0.9.75. Локальный `package.json` сохраняет 0.8.58/1.5.25. Отсутствие запуска подписанного workflow и разделение applied/read-only в исследовании явные; фактическое исполнение автором всех исторических команд этим ревью не аттестуется.

## Freeze до и после чтения

До чтения содержимого и после проверок вычислены SHA256 всех семи файлов. Все совпали с авторским freeze; повторная агрегатная проверка выполнена `2026-11-05T18:58:58.453083+00:00`.

| Файл внутри `docs/research/streamer-facecam/` | SHA256, одинаковый до/после и в freeze |
|---|---|
| README.md | `ad5c6f98d28df064f6668ada21ace56f23d7fa9f3271ab78245396e6d913e637` |
| analogs.md | `4a85854f3bc5cfaa3917d0d5537b77301e75aed6482c236bc0fc2acca4163630` |
| architecture-options.md | `061edb43951124c3071b0244427f0ae107216c1a6234d41614738185a9c8293f` |
| evidence-map.md | `34db6a7b06758c02d54643a8a2fc840537e94b74e78e6e9c6dfa0c811cc70609` |
| oss-candidates.md | `be5c2e3db59ac4beaed9ed9fb8acc6516afe431bbe8ed6d5db434a60d81511b0` |
| sources.md | `e8b4127c198425514b3b5ae0a3e4abd34a6f89e5cc3796d0e60532b4cd90d9ac` |
| streamer-cjm-and-pilot.md | `189f37264862a4430175f9e5241c05ee1085333e607dc1b1d82ab1093f3e258e` |

Агрегат по объявленному методу: `5aa41728c8a882265649b58e82e4308b0212238707d0174818353e4a3d52709e`, совпадает. Это подтверждает неизменность проверенного draft, а не истинность его утверждений.

## Пределы вывода

Не повторены все URL, метаданные GitHub, chain-of-custody vendored ONNX и содержание всех перечисленных research modules. CrossClip plans через Web вернул только оболочку, Eklipse highlight page и FFmpeg legal — timeout; их конкретные claims не получили полной независимой репликации. Native source проверен статически; фактический deployed artifact, S3-инцидент и исторические измерения в комментариях кода заново не воспроизводились. Отсутствие новой реализации, реальных медиа и людей не позволяет проверить continuous facecam, качество masks, синхронизацию второго файла, производительность, UX или оплату. Эти ограничения согласуются с заявленным research scope и не заменены выдуманным успешным испытанием.

## Originating verification BSR-01 — 05.11.2026, 19:03 UTC

Проверка исправления выполнена автором находки в той же задаче `/root/streamer_blind_review`; это продолжение originating review, не новая слепая сессия. Запрошенная модель и unknown backend attestation остаются прежними. Первоначальные находка, вердикт, хэши и ограничения выше сохранены как историческая запись.

**Результат: BSR-01 устранена в проверенном final draft.** В `oss-candidates.md:11` теперь написано «timeout процесса детекции 60 с». Повторно прочитанные `apps/worker/src/render/faces.ts:32–40` подтверждают `FACE_TIMEOUT_MS = 60_000` и передачу значения в `execFile` как `timeout`, отдельно от `start`/`end`. Уточнение снимает неоднозначность длительности входного клипа; алгоритм, параметры и границы исследования не меняются. Новых серьёзных рисков от этой правки не найдено.

В `2026-11-05T19:03:03.384694+00:00` независимо вычислены текущие хэши и сопоставлены оба манифеста. SHA256 самого исходного `draft-freeze.json` равен `082bc12d7ed43c7033eaf85dc8c84e8b3dd93edb3b080aa318eb55eb50463882`, как указано в `final-freeze.json`. Между семью файлами изменился только `oss-candidates.md`. Для проверки точного diff в памяти текущего файла единственное вхождение «timeout процесса детекции 60 с» заменено обратно на «лимит 60 с»: SHA256 восстановленных байтов **точно совпал** с исходным `be5c2e3db59ac4beaed9ed9fb8acc6516afe431bbe8ed6d5db434a60d81511b0`. Unified diff показывает одну замену на строке 11; восстановленный вариант на диск не записывался. Остальные шесть файлов совпали одновременно с draft и final freeze.

| Файл внутри `docs/research/streamer-facecam/` | Текущий SHA256, сверенный с final-freeze |
|---|---|
| README.md | `ad5c6f98d28df064f6668ada21ace56f23d7fa9f3271ab78245396e6d913e637` |
| analogs.md | `4a85854f3bc5cfaa3917d0d5537b77301e75aed6482c236bc0fc2acca4163630` |
| architecture-options.md | `061edb43951124c3071b0244427f0ae107216c1a6234d41614738185a9c8293f` |
| evidence-map.md | `34db6a7b06758c02d54643a8a2fc840537e94b74e78e6e9c6dfa0c811cc70609` |
| oss-candidates.md | `c5e5907269436ade8cff4ea0adb7a682373268b2ca4f33b86f9282771fd26352` |
| sources.md | `e8b4127c198425514b3b5ae0a3e4abd34a6f89e5cc3796d0e60532b4cd90d9ac` |
| streamer-cjm-and-pilot.md | `189f37264862a4430175f9e5241c05ee1085333e607dc1b1d82ab1093f3e258e` |

Текущий агрегат по прежнему методу: `802cfbd94a746fcb9ee6af82f5bbad74811273dfc775ee7eb8754d35637cce94`, совпадает с `final-freeze.json`. Содержательная повторная проверка ограничена этой формулировкой и затронутым смыслом; прежние ограничения исследования и первоисточников действуют. Source, семь MD, манифесты, `.fa-state` и gates этой проверкой не изменялись; добавлена только эта секция отчёта.
