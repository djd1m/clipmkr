# Происхождение кода и материалов Clipmkr

24.11.2026. Проверена база Clipmkr `2a2b0789e25cbcbde3e3fde34f2433ef36e255bc`.
Владелец назвал правообладателем Дмитрия Жечкова и подтвердил его права лицензировать
перечисленный собственный код, включая импорт JAN, N3, N4 и N6 и возможные вклады других авторов.
Покрытие ELv2 основано на [заявлении владельца](../../../features/license-adoption/owner-authority.md).
Записи Git связывают файлы с источниками и учётными записями. Независимой проверки договоров,
полномочий автора и предыдущих индивидуальных разрешений здесь не было.

## Снимки и условия источников

| Источник | Ревизия и атрибуция в Git | Условия, наблюдаемые в дереве |
| --- | --- | --- |
| JAN, `djd1m/2026-jan-pu-opus-clone` | `cc6ac599baa472937324c835a4fdb89fd09c92ce`, от 21.09.2026, единственный коммит публичной ветки `main`, автор `Dmitry Z`. Все 10 SHA-256 из исторического `tests/artifacts/queue-and-probe/donor.json` совпали с blob-байтами в этом коммите. | В дереве нет файла LICENSE/COPYING/NOTICE. В проверенных манифестах и README условия для кода не найдены. [Дерево исходника](https://github.com/djd1m/2026-jan-pu-opus-clone/tree/cc6ac599baa472937324c835a4fdb89fd09c92ce) |
| N5, `2026-AUG-PU-Projects/projects/05-podcast-clips-opus` | В самостоятельном Clipmkr код появляется в `1551c8e5cc2ad2fb686e14dd7b86bbee41ce44cb` (`djd1m`). Первый импорт совпал побайтно с N5 на `6779f14112e0b4e140e7c8c9d24fd8d1f5ea1c89` и `b54ae24a7ca5227813886d98e20ea46735a3b6c9` по пяти сверенным файлам S3, рендера и оплаты. История N5 зафиксировала соответствующие фичи коммитами `10991a38` и `838087c0` автора `root`. | Общий LICENSE в деревьях N5 и корне монорепозитория не найден. Наблюдаемые лицензии ассетов N5, в том числе шрифтов и звука, сохраняются. |
| N3, N4, N6 того же монорепозитория | Сопоставлены пути и срезы ниже на базе `b54ae24a7ca5227813886d98e20ea46735a3b6c9` и в исторических коммитах переноса. Их Git-автор — `root`. | Общий LICENSE в корне монорепозитория и в деревьях `projects/03-affiliate-rewardful`, `projects/04-calorie-vision-cal-ai`, `projects/06-rag-sales-chatbase` не найден. |

## Переносы JAN → N5 → Clipmkr

Пути цели ниже относятся к подтверждённому импорту `1551c8e` либо к сохранившимся путям
в проверенной базе. В таблице указана адаптация по отчётам фич и исходникам. Полная
побайтовая идентичность адаптированных модулей не предполагается.

| Область | Пути JAN | Пути Clipmkr |
| --- | --- | --- |
| Хранилище S3 | `packages/s3/src/{client,presign,multipart,operations}.ts` | Одноимённые файлы. Прокси `apps/web/app/api/upload/route.ts` остался в JAN. |
| Очередь и проба | `packages/queue/src/{index,queues,constants}.ts`, `apps/worker/workers/index.ts`, `apps/worker/lib/{retry,s3-download,ffmpeg}.ts` | `packages/queue/src/{index,queues,constants}.ts`, `apps/worker/src/{runtime,retry}.ts`, `apps/worker/src/media/{download,probe}.ts`. |
| Транскрипция | `apps/worker/lib/{stt-client,audio-chunker,ffmpeg}.ts`, `apps/worker/workers/stt.ts` | `apps/worker/src/stt/{client,chunker,extract,merge}.ts`, `apps/worker/src/workers/stt.ts`. Из `ffmpeg.ts` адаптирован `extractAudio`. |
| Подбор фрагментов | `apps/worker/workers/{llm-analyze,llm-analyze-utils}.ts`, `apps/worker/lib/llm-router.ts` и `apps/worker/lib/prompts/` | `apps/worker/src/workers/select.ts`, `apps/worker/src/llm/provider.ts`, `apps/worker/src/llm/prompts/selection.ts`. Адаптированы конвейер анализа и проверок, маршрутизация и формулировки инструкций. |
| Рендер | `apps/worker/lib/ffmpeg.ts` и `apps/worker/workers/video-render.ts` | `apps/worker/src/render/{ffmpeg,subtitles,watermark,exec,escape,format}.ts`, `apps/worker/src/workers/render.ts`. Исходные функции и изменения перечислены в [отчёте render-and-watermark](../../features/render-and-watermark/07_code_report.md). |
| Прогресс и скачивание | `apps/web/components/video/{video-detail,video-header}.tsx`, `apps/web/components/dashboard/{video-list,video-row,video-thumbnail}.tsx`, `apps/web/components/upload/video-uploader.tsx`, `apps/web/lib/hooks/use-clip-download.ts`, `apps/web/app/api/clips/[clipId]/file/route.ts` | `apps/web/src/app/videos/[videoId]/VideoDetail.tsx`, `apps/web/src/app/videos/VideoList.tsx`, `apps/web/src/app/upload/Uploader.tsx`, `apps/web/src/app/clips/useClipDownload.ts`, `apps/web/src/app/api/clips/[clipId]/file/route.ts`. |

Детали по каждому экспорту приводят [исходная карта](../../reuse-map.md) и
[отчёт об экране прогресса и клипов](../../features/progress-and-clips-screen/07_code_report.md).
В приведённых путях часть функций со временем переместилась. Сводка показывает подтверждённые
направления переноса, а не право на любой файл, похожий на названный.

## Платёжный тракт и кабинет блогера

В таблице пути доноров отсчитываются от корней соответствующих проектов монорепозитория.

| Цепочка | Источник и назначение |
| --- | --- |
| N3 → N4 → N6 → N5 → Clipmkr, клиент ЮKassa | `shared/payments/yookassa.mjs` добавлен в N3 (`6775b833c306f93e45c7fd6b03c32e8585a56349`), перенесён в TypeScript в N4 как `apps/api/src/payments/yookassa.ts` (`0c8c9e16608c55ff2ef7aa7af5e0521fe8c55d83`), далее в `apps/web/src/server/payments/yookassa.ts` в N6 (`c2dbabb43481a9e1c2f00dc18f373f0f05ace1a3`) и N5 (`838087c0`). |
| N4 → N6 → N5 → Clipmkr, провайдеры и сетевые проверки | Из `apps/api/src/payments/{provider,fake,origin,cidr-match,select-provider}.ts` в `apps/web/src/server/payments/{provider,fake,origin,cidr-match,config}.ts`. Для `provider` и `cidr-match` при сравнении N4/N6 совпал код после исключения строк, начинающихся с `//`. В первоначальном Clipmkr так же совпали с N6 `provider`, `cidr-match`, `fake`, `origin` и `yookassa`. Настройка режима в N5 адаптирована в `packages/shared/src/tariff.ts` и `payments/config.ts`. |
| N6 → N5 → Clipmkr, обвязка оплаты | `packages/db/src/{payments,tariffs,ops-set-plan}.ts` и `packages/db/migrations/006_tariffs_payments.sql` → `packages/db/src/{payments,ops-set-plan}.ts` и `packages/db/migrations/021_payments.sql`. Обработчики `apps/web/src/server/billing-{handler,deps,runtime}.ts`, `apps/web/src/app/api/checkout/`, `apps/web/src/app/api/webhooks/yookassa/`, `apps/web/src/app/upgrade/` и `apps/web/src/lib/payment-return.ts` адаптированы в N5. `scripts/stand-set-yookassa.sh`, `tests/fixtures/fake-yookassa-server.ts` и семейство `tests/billing.*` перечислены в [отчёте об оплате](../../features/payments/07_code_report.md). Отчёт N6 отмечает вебхук по форме N1, то есть ссылку на форму обработчика. Дословный перенос N1 этим описанием не установлен. |
| N3 → Clipmkr, агрегаты отчёта | `shared/referrals/metrics.mjs` на `1c929709040c04c5bcc667199b0beaf509548f95` → `packages/db/src/blogger-report.ts` (`002744d`, автор `djd1m`). Сохранены раздельные агрегаты и уникальные плательщики. |
| N4 → N6 → Clipmkr, денежная арифметика | `packages/shared/src/domain/commission.ts` (`039965cf94a6e254c6cbefe82030bb381d466492`) → `packages/rag/src/commission.ts` и `packages/db/src/commission.ts` (`e2e6d545c2c3dd2f549e2c9338ad5d7bdb20ec15`) → целочисленное округление в `packages/db/src/blogger-report.ts`. В Clipmkr сохранена собственная база расчёта без переноса календаря выплат и коммерческих правил N6. |

Экран и механики кабинета сверены с [картой проектов 1–8](../../reuse/blogger-cabinet-projects-1-8.md).
Оценка аналогов в этой карте сама по себе не подтверждает копирование их кода.

## Сторонние материалы и передача образов

- **YuNet 2023mar.** `apps/worker/assets/models/face_detection_yunet.onnx` совпадает по SHA-256
  `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4` с опубликованными
  весами. Соседний `LICENSE-yunet.txt` содержит точный текст MIT каталога модели на
  ревизии `f12e12798e8314f7c074a6656816c048dcc95b7a`, включая исходное уведомление Shiqi Yu.
  [Upstream LICENSE](https://github.com/opencv/opencv_zoo/blob/f12e12798e8314f7c074a6656816c048dcc95b7a/models/face_detection_yunet/LICENSE),
  [upstream LFS-указатель](https://raw.githubusercontent.com/opencv/opencv_zoo/f12e12798e8314f7c074a6656816c048dcc95b7a/models/face_detection_yunet/face_detection_yunet_2023mar.onnx).
- **Образ worker.** Стадия `build` принимает оба файла через `COPY . .`. Правила `.dockerignore`
  допускают `.onnx` и `.txt` в этой папке. Worker копирует весь каталог assets и получает
  уведомление по адресу `/app/apps/worker/assets/models/LICENSE-yunet.txt`. Граница проверки — правила
  контекста и статический маршрут копирования. Поставленные ранее образы проверяются отдельно.
- **Собственный код и зависимости в образах.** Runtime-цели `web` и `worker` выборочно копируют
  артефакты сборки. При передаче копии кода в таком образе условия ELv2 передаются получателю
  вместе с копией. Для зависимостей действуют их лицензии, включая условия передачи
  соответствующих исходников там, где это требуется. Полную комплектацию образа проверяют
  по фактическому digest и цепочке сборки. [Аудит компонентов и активов](dependency-audit.md).
