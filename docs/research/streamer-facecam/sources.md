# Источники, срез и ограничения

Дата чтения 05.11.2026 UTC. Первичные файлы и API GitHub и официальные страницы продуктов, справки и документации; публичное чтение без логина/обхода ограничений. Прочитанная страница подтверждает наличие заявления о возможности, не проверку UI, качество модели или коммерческий результат. Никакие статусы криптографического подтверждения не присваиваются.

## Граница доказательств

**Факт источника:** конкретный код, лицензия, дата release/commit или содержание официальной инструкции. **Заявление поставщика:** описанные возможности, пользовательские числа и результаты его примеров. **Вывод автора:** пригодность подхода для Clipmkr, предполагаемые затраты/риски. **Предложение:** будущий UI, пилот, порог качества или новая продуктовая граница. Эти категории не взаимозаменяемы.

Публичные страницы читались через Web; дополнительный прямой HTTP-сбор 26 URL получил 15 ответов 200. Остальные: 10 ответов 403 и 1 DNS-ошибка. Это два разных пути чтения: 403 прямого клиента не объявляется 200, а доступное через Web содержание отмечается как чтение Web без собственного хэша тела ответа. Защищённые разделы/аккаунты не открывались, обходов аутентификации не было. Ограниченный корпус не является исчерпывающим поиском рынка.

## Продукты и доступ к платформе

Все URL ниже прочитаны 05.11.2026. Дата публикации отличается от даты нашего чтения.

| ID | Первичный источник | Дата в источнике / что поддерживает / предел |
|---|---|---|
| P1 | [Twitch Clip Editor help](https://help.twitch.tv/s/article/how-to-use-clips) | Текущая инструкция; portrait, stacked/full, editable crop и saved preferences. Не измеряет успех конкретной модели камеры автора |
| P2 | [Twitch portrait launch](https://blog.twitch.tv/en/2024/08/28/creating-and-sharing-clips-for-mobile-just-got-easier/) | 28.08.2024; внедрение портретного формата, не выручка/число пользователей функции |
| P3 | [Eklipse templates](https://eklipse.gg/help/how-to-use-and-customize-templates/) | Facecam/gameplay и My Templates; содержание прочитано через Web, прямой HTTP 403 |
| P4 | [Eklipse highlight signals](https://eklipse.gg/help/how-does-eklipse-ai-choose-highlights/) | Visual/UI/audio/commands — описание поставщика, не собственное измерение качества; прямой HTTP 403 |
| P5 | [Eklipse adoption claim](https://eklipse.gg/help/what-do-streamers-use-to-edit-videos-for-youtube-and-tiktok/) | Обновлено 04.11.2025, более 1 млн стримеров — самоотчёт; прямой HTTP 403 |
| P6 | [StreamLadder layouts](https://www.streamladder.com/clip-editor/custom-layouts) | Независимые layers, saved layouts; Web прочитан, прямой HTTP 403 |
| P7 | [StreamLadder facecam](https://www.streamladder.com/clipgpt/facecam-detection) | Tracking/avatars и масштабы использования — claims без даты достижения; Web прочитан, прямой HTTP 403 |
| P8 | [StreamLadder mobile](https://www.streamladder.com/blog/twitch-clips-to-tiktok-mobile) | 21.07.2026; датированное описание пользовательского пути, не тест нами; прямой HTTP 403 |
| P9 | [CrossClip saved layouts](https://streamlabs.com/content-hub/post/how-to-save-layouts-with-cross-clip) | 15.02.2022, обновлено 05.09.2024; геометрия и пресеты; Web прочитан, прямой HTTP 403 |
| P10 | [CrossClip known import issue](https://support.streamlabs.com/hc/en-us/articles/48665093228955-Twitch-Clips-No-Longer-Compile-in-Crossclip) | 03.04.2026, сообщено 08.03.2026; Investigating / manual upload workaround. Не считать все рекламируемые URL рабочими; прямой HTTP 403 |
| P11 | [CrossClip plans](https://streamlabs.com/cross-clip/plans) | Срез 05.11.2026; ограничения загрузки и состав плана. Покупка/актуальный checkout не проверялись; прямой HTTP 403 |
| P12 | [Opus gameplay](https://www.opus.pro/tools/gaming-video-editor), [layout help](https://help.opus.pro/docs/article/apply-the-layouts) | Gameplay layout, manual correction; заявленные возможности, не измеренное качество |
| P13 | [Opus funding/adoption](https://www.opus.pro/blog/opusclip-raises-a-new-round-of-funding-from-softbank-and-launches-opussearch) | 11.03.2025; финансирование и самоотчёт 10 млн пользователей/брендов, не прибыльность |
| P14 | [Vizard gameplay guide](https://agent.vizard.ai/how-to/cut-gaming-highlights-that-keep-your-facecam-in-shot.html) | Обновлено 10.10.2026; собственный пример поставщика и ограничения маленькой камеры; не независимая репликация |
| P15 | [Vizard preferences](https://help.vizard.ai/en/articles/9188600-what-are-clip-preferences) | 07.09.2024; preferences и alternate layout. Прямой HTTP 403, Web прочитан |
| P16 | [Framedrop origin](https://www.framedrop.ai/) | Web fetch 502 и прямой DNS failure; содержимое не получено, актуальные возможности/прекращение бизнеса не устанавливаются |
| P17 | [Twitch API reference](https://dev.twitch.tv/docs/api/reference/) | Get Videos и Get Clips Download — разные контракты; OAuth/temporary URLs. API-запросы с токенами не выполнялись |
| P18 | [Twitch Terms](https://legal.twitch.com/en/legal/terms-of-service/) | Публичное чтение вернуло оболочку legal site; полный текст условий не разобран. Права на конкретные материалы не проверены; юридическая приёмка не заявляется |

Доступ к VOD и права не выводятся из маркетингового обещания продукта «вставьте любую ссылку». В отчёт не переносились неподтверждённые данные о выручке, участниках чужих исследований или гарантированном росте просмотров.

## OSS, алгоритмы и веса

Точные коммиты GitHub, звёзды, даты релизов и изменений выбранных файлов приведены в [OSS-таблице](oss-candidates.md). Первичные API: `api.github.com/repos/{owner}/{repo}`, `/commits/{branch}`, `/commits?path=…&per_page=1`, `/releases/latest`; прямые файлы прочитаны через `raw.githubusercontent.com` на закреплённом SHA.

| ID | Источник | Что прочитано и предел |
|---|---|---|
| O1 | [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html), [legal](https://ffmpeg.org/legal.html), [LICENSE at f8a03cd](https://github.com/FFmpeg/FFmpeg/blob/f8a03cd98daa81d16948308b5b1612aaaa831500/LICENSE.md) | Filters и состав лицензирования. Прямой HTTP 200; Web fetch первоначально timeout. GitHub release 404 не трактуется как отсутствие релизов. Latest tag не выбирался по порядку API-списка |
| O2 | [OpenCV at 0766638](https://github.com/opencv/opencv/tree/07666386e2eb5bafa88c88574433e4df32910fdc), [YuNet model license](https://github.com/opencv/opencv_zoo/blob/48b10fa505aeb51fbd127fc60a5c660040e823b7/models/face_detection_yunet/LICENSE) | Core Apache 2.0, upstream модель MIT. Совпадение vendored ONNX с конкретными weights и цепочка notices отдельно не установлены |
| O3 | [MediaPipe detector](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector), [segmenter](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter), [source/license](https://github.com/google-ai-edge/mediapipe/tree/a86135da4c85cbb3694714ccdefdc2c96c32cc95) | Boxes/keypoints и masks — разные outputs. Код Apache 2.0, выбранные model assets не скачивались/не лицензировались для внедрения |
| O4 | [Google AutoFlip article](https://research.google/blog/autoflip-an-open-source-framework-for-intelligent-video-reframing/), [graph source](https://github.com/google-ai-edge/mediapipe/tree/a86135da4c85cbb3694714ccdefdc2c96c32cc95/mediapipe/examples/desktop/autoflip) | 13.02.2020 article плюс современный source snapshot; reframing/smoothing/scene logic, не определение принадлежности автору |
| O5 | [ByteTrack source/license](https://github.com/FoundationVision/ByteTrack/tree/d1bf0191adff59bc8fcfeaa0b33d3d1642552a99) | MIT и association code; старый core не называется регулярно обновляемым из-за pushed_at |
| O6 | [Ultralytics source/license](https://github.com/ultralytics/ultralytics/tree/87ea3adb378621a2a260acd3296f4f84dd555197), [official licensing](https://www.ultralytics.com/license) | AGPL и Enterprise — позиция поставщика; влияние на конкретный SaaS требует отдельного решения, не юридическое заключение. Старый URL docs.ultralytics.com/license/ вернул 404, использован официальный license page |
| O7 | [clips-studio source](https://github.com/ColinGPT9/clips-studio/tree/2ea80d3124e850e0a550a997edd1e6ef630b50d8) | README/LICENSE, gaming/layout.py, layouts.json, detect.py, framing.py, docs/GAMING.md, video/tracker.py/cropper.py, UI editor и requirements. Один дополнительный guessed path gaming/render.py вернул 404, на него нет содержательных claims |
| O8 | [OBS Source Record listing](https://obsproject.com/forum/resources/source-record.1285/), [actual repo/license](https://github.com/exeldro/obs-source-record/tree/fe3f63f237c78f355ae1f549292149cc017876b1) | Сторонний плагин записи отдельного источника; не приписывается ядру OBS и не объявляется совместимым с конкретной установкой пользователя |

## dz-harness: что именно прочитано и применено

Официальный [public mirror](https://github.com/djd1m/dz-harness/tree/a9da87456e8f9bd0f204a00c143b016b1a7c9e61), exact commit `a9da87456e8f9bd0f204a00c143b016b1a7c9e61`, 05.11.2026 03:24:08 UTC. README описывает зеркало опубликованного содержимого пакетов npm, а не доступ к закрытому репозиторию разработки. Прочитаны README, MIRROR-MANIFEST, [каталог skills-meta](https://github.com/djd1m/dz-harness/blob/a9da87456e8f9bd0f204a00c143b016b1a7c9e61/packages/skills-meta/README.md) и package.json (`@dzhechkov/skills-meta` 0.9.75).

| Модуль из опубликованного содержимого пакетов | Фактическое использование |
|---|---|
| [problem-solver-enhanced](https://github.com/djd1m/dz-harness/blob/a9da87456e8f9bd0f204a00c143b016b1a7c9e61/packages/skills-meta/problem-solver-enhanced/SKILL.md) | Применены first principles, SCQA, ресурсная инвентаризация и разделение противоречия по пространству/условию. Локальный `/home/product-studio/.agents/skills/problem-solver-enhanced/SKILL.md` побайтно совпал с этой копией. Nash/payoffs/численный оптимум и проведённые исследования с людьми не заявлялись |
| [structured-reasoning](https://github.com/djd1m/dz-harness/blob/a9da87456e8f9bd0f204a00c143b016b1a7c9e61/packages/skills-meta/structured-reasoning/SKILL.md) | Прочитан как каталог вариантов анализа; его числовая процедура выставления баллов не исполнялась, произвольных баллов альтернативам не присваивали |
| [goap-research-ed25519](https://github.com/djd1m/dz-harness/blob/a9da87456e8f9bd0f204a00c143b016b1a7c9e61/packages/skills-meta/goap-research-ed25519/SKILL.md) и [evidence_fetch.py](https://github.com/djd1m/dz-harness/blob/a9da87456e8f9bd0f204a00c143b016b1a7c9e61/packages/skills-meta/goap-research-ed25519/scripts/evidence_fetch.py), [report checker](https://github.com/djd1m/dz-harness/blob/a9da87456e8f9bd0f204a00c143b016b1a7c9e61/packages/skills-meta/goap-research-ed25519/scripts/check_report_evidence.py) | Прочитаны границы происхождения evidence и невозможности подменить факт чтения декларацией. Эти скрипты и среда выполнения не запускались; issuer pins не даны, подписи и специальные классы подтверждения не создавались. Наш обычный HTTP receipt не выдаётся за результат их API |
| [market-sizing](https://github.com/djd1m/dz-harness/blob/a9da87456e8f9bd0f204a00c143b016b1a7c9e61/packages/skills-pm/market-sizing/SKILL.md) | Прочитан; TAM/SAM/SOM/прогноз продаж не рассчитывались без исходных данных. Пакет `skills-pm` версии 0.1.6, exact mirror commit |

Локальный процесс остался на проектных pins `@dzhechkov/harness-cli` 0.8.58 и `@dzhechkov/skills-feature-adr` 1.5.25. Mirror README публикует более новые 0.8.60/1.5.26; это наблюдение, не команда обновления. Ничего не устанавливалось. Реально исполнялись только существующие pinned recall/checkpoints и K2; исследовательские методы не выдаются за запуск автономного подписанного роя.

## Не выполнено

Не выполнялись вход в UI конкурентов, покупки, запуск моделей, загрузка медиа, кодирование, обращения к S3/провайдерам/Cloud, входы в клиентские аккаунты, интервью и оценка UMUX реальными людьми. Архитектурные/рыночные выводы остаются гипотезами до согласованного пилота. Отчёты независимого review находятся отдельно от измеряемых документов.

### Дополнительные первоисточники сегментации

Прочитаны 05.11.2026 около 18:40 UTC: README, LICENSE и GitHub repository/commit metadata для [SAM 3 at f1647e8](https://github.com/facebookresearch/sam3/tree/f1647e8d0c1d280991f4d1b7d974c2704537fe66), [obs-backgroundremoval at b2786e8](https://github.com/royshil/obs-backgroundremoval/tree/b2786e87dc1d08ed2f2ce335000a8fb1992dc944), [RobustVideoMatting at 53d74c6](https://github.com/PeterL1n/RobustVideoMatting/tree/53d74c6826735f01f4406b5ca9075eee27bec094). Тела шести файлов получены напрямую, их хэши включены в receipt. Это краткое сравнение условий и роли компонентов; модели/маски/скорость не проверялись, выбор нового стека не сделан.
