# Независимая проверка исследования UMUX-Lite

Дата: 05.11.2026, завершение около 17:53 UTC. Reviewer: **gpt-6-astra, xhigh**, роль `qe-primary`, family `owner-exception`; автор документов — Sol high. Сессия независимого reviewer `/root/cloudru_working_release_review`, ранее выполнявшая другие независимые проверки; это новый исследовательский scope, не авторская сессия. Выводы автора и его `08` не использованы как первичное доказательство.

**Вердикт: clean. Scoped Grade: A — только качество и проверяемость данного документного исследования.** Условия исправления отсутствуют. Это не оценка продукта, не разрешение устанавливать библиотеки и не результат человеческого UMUX-Lite. Runtime / UI execution / pilot: **NOT RUN**.

## Входы и привязка

Изучены AGENTS/CLAUDE, core CJM, model/review policy; требования `00`, `01`, reuse `02`, план `06`. Сначала независимо проверены первичный метод и официальный machine layer aicoding.space, затем прочитаны четыре frozen документа UMUX-Lite и родительский README. После чтения независимо проверены первичные материалы всех шести кандидатов. Авторские conclusions не использовались вместо источников.

- Host nonce: `991faea5-c3a9-456f-a3e5-064c5834d8fb`.
- Revision: `50de393b1f7f15608980209b3566519a4b076fc7613fc0325e7d255126c17f9d`.
- **8/8 SHA256 совпали** с actual host manifest; ниже перечислен весь measured scope. Отчёт расположен вне него.

| Measured path | SHA256 |
|---|---|
| `docs/research/synthetic-user-qa/README.md` | `a4c8efbdf93f7970cadf7ace0e340a89f2d2028b3a1446fa5a259d04ae202626` |
| `docs/research/synthetic-user-qa/umux-lite/README.md` | `2c4f5acd871b923bf327f813a1aaa26e88b03fb1ef8f2bb7bb4c210e704ae6df` |
| `docs/research/synthetic-user-qa/umux-lite/measurement-plan.md` | `5abee5d180f676346e212c0f2c3eae7544aa1cf5fe32c8b9a86b5714b9194302` |
| `docs/research/synthetic-user-qa/umux-lite/project-cards.md` | `4ec41c58e40d3611d36f693ead9fc3fa9b538c7c5fd17662b424ec93372b9042` |
| `docs/research/synthetic-user-qa/umux-lite/sources.md` | `d910480c4cb7fdf94856e4620b05688978b3e43da6d598f55e13bd96595cc127` |
| `features/umux-lite-qa-research/00_complexity_assessment.md` | `435ce9e0e31e235ed2617472e30e9fdee09c082d09e4b10c791db4df287e9f80` |
| `features/umux-lite-qa-research/01_requirements.md` | `ee26295d57c727bca3461ac92555dd524cd2aefe00af57360d836814a0761430` |
| `features/umux-lite-qa-research/06_implementation_plan.md` | `dcdbd7c48816497729e1365ffa3023c94139fec174e81cdc79ad1f1392dc1b75` |

## Результаты проверки

**FR-1, происхождение трендов.** Самостоятельно получены [llms.txt](https://aicoding.space/llms.txt), [content-index](https://aicoding.space/agent/content-index.json) и [unit выпуска 30.10](https://aicoding.space/agent/units/github-ai-llm-2026-10-30.json). Content-index содержит 34 GitHub-статьи за 07.10–05.11; число относится к статьям, не к количеству passages. Точный `blog:github-ai-llm-2026-10-30:repo-pbakaus-impeccable:p2` подтверждает [карточку Impeccable](https://aicoding.space/blog/github-ai-llm-2026-10-30/#repo-pbakaus-impeccable). Исторические 95 944 stars и push 29.10 не выданы за новый source commit. Пять остальных кандидатов честно названы дополнительными аналогами; полная история GitHub Trending не заявлена. Самостоятельный hash content-index совпадает с документом: `b329f9dd89308f931edaef9797d425655ba48cd4ea8a6730e7ca217a5fc241be`; hash unit 30.10: `3a755d030d4d2e85c133f1e140093e5f249e152a2386b2573f1ae169f302b63a`. Авторский MCP search здесь не объявляется собственным повторным исполнением: passage независимо прочитан через официальный unit endpoint.

**FR-2, лицензии и действительная активность.** Получены README и реальные licensefiles всех шести репозиториев. GitHub REST во время review отвечал rate limit 403; проверка продолжена через публичные GitHub HTML и raw files, без токенов/обхода authentication. HTML metadata подтверждает `isArchived:false` для всех шести. Самостоятельно сверены следующие code commits и даты релизов:

| Проект | Лицензия и source evidence | Release evidence |
|---|---|---|
| Impeccable | [Apache-2.0](https://github.com/pbakaus/impeccable/blob/main/LICENSE); [978e5531](https://github.com/pbakaus/impeccable/commit/978e5531ab15e4b7c549f11c9456a4997cf85ef4), hook source, 05.11 UTC | [cli-v4.8.0](https://github.com/pbakaus/impeccable/releases/tag/cli-v4.8.0), 26.10 |
| Radix | [MIT](https://github.com/radix-ui/primitives/blob/main/LICENSE); [d715acbf](https://github.com/radix-ui/primitives/commit/d715acbf2283c7867ad01165586d97fd6c163f09), dismissable-layer, 14.10 | Авторский REST 404 не повторён из-за общего rate limit; документ корректно не выводит из него отсутствие npm-релизов |
| shadcn/ui | [MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md); [15f59b41](https://github.com/shadcn-ui/ui/commit/15f59b41750542ef5d41ee34601a85a4e7c1be17), MCP SDK, 27.10 | [4.23.0](https://github.com/shadcn-ui/ui/releases/tag/shadcn%404.23.0), 27.10 |
| axe-core | [MPL-2.0](https://github.com/dequelabs/axe-core/blob/develop/LICENSE); [cf9d7a19](https://github.com/dequelabs/axe-core/commit/cf9d7a19c592734bc56f50452780655529996353), target-size implementation, 04.11 | [v4.14.0](https://github.com/dequelabs/axe-core/releases/tag/v4.14.0), 05.10 |
| SurveyJS Form Library | [MIT](https://github.com/surveyjs/survey-library/blob/master/LICENSE); [4678c2ae](https://github.com/surveyjs/survey-library/commit/4678c2aea2c78a4cb67d14da999a16873185604c), file question, 05.11 | [v3.2.4](https://github.com/surveyjs/survey-library/releases/tag/v3.2.4), 03.11 |
| Formbricks | [Root scope](https://github.com/formbricks/formbricks/blob/main/LICENSE): AGPLv3, перечисленные SDK/UI — MIT, [EE](https://github.com/formbricks/formbricks/blob/main/apps/web/modules/ee/LICENSE) отдельно; [fa0546bd](https://github.com/formbricks/formbricks/commit/fa0546bda2f53c3e39440dd6cc240c191e1dda10), apps/web, 05.11 | [6.1.4](https://github.com/formbricks/formbricks/releases/tag/6.1.4), 05.11 |

Звёзды являются датированным popularity snapshot. На повторном чтении Impeccable уже 103 682, shadcn 127 430; четыре других числа совпали с карточками. Это нормальная изменяемость счётчиков, не основание переписывать авторский срез 17:35. Fresh source commit/release не представлены как доказательство регулярной поддержки, SLA или улучшения Clipmkr.

Возможности компонентов/опросов соответствуют README. В [SurveyJS rating source](https://github.com/surveyjs/survey-library/blob/master/packages/survey-core/src/question_rating.ts) реально присутствуют `rateMin`, `rateMax`, `rateStep`; исполнение конфигурации и export не заявлено. MIT Form Library не распространена на другие коммерческие продукты. Formbricks не выдан целиком за MIT/единый OSS. Impeccable audit/critique — агентный разбор; axe — автоматизированная часть доступности; ни тот ни другой не измеряет человеческое восприятие.

Проверены `git show 24b4b4a:package.json` и `apps/web/package.json`: axe adapter `4.11.0` объявлен, Next/React/TypeScript — действительный стек; названные UI/survey библиотеки в проверенном web manifest не объявлены. Это проверка деклараций, не установки и не runtime version. Native reuse first и отказ от обязательного отдельного backend для двух вопросов соответствуют constraints.

**FR-3, метод.** Независимо прочитан [полный текст оригинальной CHI 2013 статьи Lewis/Utesch/Maher](https://iihm.imag.fr/coutrix/ens/M2-MoSIG-HiL/1stAssignment/UsabilityQuestionnaire/2470654.2481287.pdf), DOI `10.1145/2470654.2481287`. Два положительных items о соответствии возможностей требованиям и простоте, шкала 1–7 и обе формулы переданы корректно. Отдельно арифметически проверены пары (1,1), (4,4), (7,7): raw 0/50/100, adjusted 22.9/55.4/87.9. Документ сохраняет различие исходного названия UMUX(1,3) и регрессионного результата, выбирает явные имена полей, не обещает «100% удобство» и не подменяет заполненный SUS его proxy.

Независимо прочитан [primary PDF Kukuruza 2022](https://essay.utwente.nl/91402/1/Kukuruza_BA_BMS.pdf): исследование русской адаптации действительно существует, включает 43 участников и chatbot context. Работа не валидирует выбранный перевод для Clipmkr. Документ правильно ограничивает перенос и предлагает cognitive interviews/back-translation до baseline. Это предложение процедуры, не уже выполненная психометрическая валидация.

**FR-4, план с людьми.** Три роли, одинаковые задачи внутри роли, зафиксированные baseline/proposal, AB/BA либо независимые группы, отделение formative sample от доказательства superiority, исходные оба ответа, пропуски и отказы, failed/blocked exposure, распределения/CI и отдельный owner case отражены. Synthetic responses не входят в human score; selection bias и слишком малое n не скрыты. Конкретный размер и метод CI должны быть выбраны до будущего сбора — здесь честно дан план исследования, не готовый исполняемый протокол пилота.

CJM сохраняет ordinary 90min, blogger 120/custom, owner policy/attribution/statistics, TEST payments, upload/real playback/download, две темы/cabinet/studio/advanced. Субъективная оценка отделена от функциональной приёмки и полного ресурса. Запуск пилота, production payments и изменение owner demo accounts не разрешаются данным документом.

**Scope и ссылки.** Родительский README отличается только добавлением ссылки на новое исследование. Прочитаны все пять пользовательских MD и три измеряемых feature input; reuse inventory рассмотрен как дополнительный вход. Проверка относительных файловых ссылок в пяти MD не обнаружила отсутствующих targets. Отсутствует утверждение о выполненной установке, human measurement или гарантированном максимальном балле.

## Ограничения и новые риски

Существенных новых рисков для выпуска этого документного артефакта не выявлено; conditions `[]`. Это bounded review шести кандидатов, не исчерпывающий обзор библиотек или актуальной психометрической литературы. Историческая регрессия проверена как историческая формула; её новая калибровка на русскоязычном Clipmkr не доказана и документом не обещана. Не проверялись runtime, UI, скорость, интеграция, реальные люди, callbacks, storage или улучшение UMUX-Lite. Не выполнялись установки, контейнеры, пилот, изменения accounts/payments/Cloud, commit/push.

Собственные public retrieval snapshots находятся вне Git в `/tmp/clipmkr-umux-independent-20261105/`; это вспомогательная локальная копия, не обещание постоянного хранилища. Initial author handoff отсутствует и не создавался. Own receipt записан под lock с сохранением host/envelope/чужих entries; host evaluate/checkpoint reviewer не выполнял.
