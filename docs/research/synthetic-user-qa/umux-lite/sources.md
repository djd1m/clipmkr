# Источники и проверяемые границы

Retrieval snapshot: 05.11.2026, около 17:35 UTC, публичный read-only доступ без authentication. Это bounded shortlist 6, не весь GitHub. Ничего не устанавливалось; пользовательский/платёжный пилот не запускался.

## aicoding.space: discovery → passage

Прочитаны актуальные [llms.txt](https://aicoding.space/llms.txt), [content-index](https://aicoding.space/agent/content-index.json), [units-index](https://aicoding.space/agent/units/index.json). В текущем content-index 34 GitHub-статьи 07.10–05.11.2026. Public [MCP](https://aicoding.space/mcp): реальные `search_site` по impeccable/shadcn/дизайн, затем `get_passage` по `blog:github-ai-llm-2026-10-30:repo-pbakaus-impeccable:p2`. Passage указывает точный [human URL 30.10](https://aicoding.space/blog/github-ai-llm-2026-10-30/#repo-pbakaus-impeccable) и source provenance; full unit data доступны в [документе выпуска](https://aicoding.space/agent/units/github-ai-llm-2026-10-30.json). Historical stars этой статьи не заменяются сегодняшними.

Для Radix/shadcn/axe/SurveyJS/Formbricks здесь не установлена membership в просмотренных GitHub-трендах; они помечены additional analogs. Search shadcn дал course passages, что не является trend evidence. Старый design research прочитан через `git show 24b4b4a:docs/design/2026-11-04-oss-design-research.md`; его рекомендации не объявляются фактической установкой OSS.

## Первичный метод

- Lewis/Utesch/Maher, 2013: [авторский полный текст на ResearchGate](https://www.researchgate.net/publication/262344995_UMUX-LITE_when_there%27s_no_time_for_the_SUS), оригинальная статья CHI/DOI 10.1145/2470654.2481287; provenance страницы — fulltext uploaded by James R. Lewis. Прочитаны items, 7-point anchors, intermediate/raw и regression equation, ограничения исходной проверки. [Список публикаций автора](https://www.jimlewisux.com/publications) независимо подтверждает эту работу.
- [DOI/издатель](https://doi.org/10.1145/2470654.2481287) вернул 403; угаданный IBM Research route недоступен, JUS2018 PDF URL дал 404; MeasuringU страницы из поиска дали 403. Их недоступный полный текст не используется как якобы прочитанный. Авторская доступная копия даёт достаточный первичный метод; авторизация/access не обходились.
- Русская адаптация: [University of Twente repository, Kukuruza 2022](https://essay.utwente.nl/essays/91402), [primary PDF](https://essay.utwente.nl/91402/1/Kukuruza_BA_BMS.pdf). Прочитаны abstract/method и границы: bachelor thesis, Russian chatbot study, перевод/обратный перевод RUMUX-LITE и reported reliability. Это не общая Clipmkr validation; claims о reliability не расширяются на наш перевод.
- Названия raw/SUS_regression_adjusted в плане заданы явно, поскольку исходная статья называет regression результат UMUX-LITE. Диапазон adjusted 22.9–87.9 следует арифметически из формулы; перевод RU, план sample/CI/counterbalance — предложения автора исследования, не психометрическая валидация.

## Репозитории: документы, licensefiles, source commits и releases

README, реальные licensefiles и JSON metadata прочитаны для всех шести. GitHub REST поля stars/archive/push — snapshot, а не история регулярности поддержки. Проверен также [SurveyJS rating source](https://github.com/surveyjs/survey-library/blob/master/packages/survey-core/src/question_rating.ts): controls rateMin/rateMax/rateStep; runtime не выполнялся. Licensefile важнее одного SPDX-поля API; performance/quality marketing не измерялись.

| Проект | Primary source/license | Metadata/code evidence | Release evidence |
|---|---|---|---|
| Impeccable | [README](https://github.com/pbakaus/impeccable#readme), [Apache2](https://github.com/pbakaus/impeccable/blob/main/LICENSE) | [API](https://api.github.com/repos/pbakaus/impeccable), [crates978e5531](https://github.com/pbakaus/impeccable/commit/978e5531ab15e4b7c549f11c9456a4997cf85ef4) | [cli-v4.8.0](https://github.com/pbakaus/impeccable/releases/tag/cli-v4.8.0) |
| shadcn/ui | [README](https://github.com/shadcn-ui/ui#readme), [MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) | [API](https://api.github.com/repos/shadcn-ui/ui), [CLI15f59b41](https://github.com/shadcn-ui/ui/commit/15f59b41750542ef5d41ee34601a85a4e7c1be17) | [4.23.0](https://github.com/shadcn-ui/ui/releases/tag/shadcn%404.23.0) |
| Radix | [README](https://github.com/radix-ui/primitives#readme), [MIT](https://github.com/radix-ui/primitives/blob/main/LICENSE) | [API](https://api.github.com/repos/radix-ui/primitives), [formatting06d51305](https://github.com/radix-ui/primitives/commit/06d51305466a87e0917599c4e1be9ec30f96d049), [functional fixd715acbf](https://github.com/radix-ui/primitives/commit/d715acbf2283c7867ad01165586d97fd6c163f09) | `/releases/latest` 404; не утверждается отсутствие иных каналов релиза |
| axe | [README](https://github.com/dequelabs/axe-core#readme), [MPL2](https://github.com/dequelabs/axe-core/blob/develop/LICENSE) | [API](https://api.github.com/repos/dequelabs/axe-core), [libcf9d7a19](https://github.com/dequelabs/axe-core/commit/cf9d7a19c592734bc56f50452780655529996353) | [4.14.0](https://github.com/dequelabs/axe-core/releases/tag/v4.14.0) |
| SurveyJS | [README](https://github.com/surveyjs/survey-library#readme), [MIT](https://github.com/surveyjs/survey-library/blob/master/LICENSE) | [API](https://api.github.com/repos/surveyjs/survey-library), [core4678c2ae](https://github.com/surveyjs/survey-library/commit/4678c2aea2c78a4cb67d14da999a16873185604c) | [3.2.4](https://github.com/surveyjs/survey-library/releases/tag/v3.2.4) |
| Formbricks | [README](https://github.com/formbricks/formbricks#readme), [rootmixedLICENSE](https://github.com/formbricks/formbricks/blob/main/LICENSE), [EE](https://github.com/formbricks/formbricks/blob/main/apps/web/modules/ee/LICENSE) | [API](https://api.github.com/repos/formbricks/formbricks), [webfa0546bd](https://github.com/formbricks/formbricks/commit/fa0546bda2f53c3e39440dd6cc240c191e1dda10) | [6.1.4](https://github.com/formbricks/formbricks/releases/tag/6.1.4) |

Commit paths проверены отдельно от pushed_at: Impeccable crates, shadcn packages/shadcn/src, Radix packages/react, axe lib, SurveyJS packages/survey-core/src, Formbricks apps/web. Исторические sourcepaths Impeccable/source и shadcn старого registry дали moved/deleted history и не использованы как свежий code activity. Даже актуальный sourcepath commit не доказывает исправление нашего UX.

## Наблюдение против вывода

Наблюдались источники, лицензии, metadata, API ответы и исходные package manifests Clipmkr: native adapter axe/Playwright объявлен, shadcn/Radix/SurveyJS/Formbricks в проверенном web package не объявлены. Установка/исполнение/скорость/качество сторонних инструментов не проверены. Вывод о порядке reuse, пользе headless primitives и достаточности простой формы — инженерное предложение. Нет human UMUX score Clipmkr, эффекта на конверсию, доказательства RU equivalence или основания обещать 95/100.

## Контроль retrieval

SHA256 полученных public snapshots: llms.txt `2b7324e95591b99831c5f2d5c823497fb79ff18190bfda34f4635f4e402503a2`; content-index `b329f9dd89308f931edaef9797d425655ba48cd4ea8a6730e7ca217a5fc241be`; units-index `883e3083c06455089bb131faf4fb1afb2f8a827496b3231676f0299a9dd8d3cb`. Это hashes конкретно прочитанных bytes, не обещание immutable URLs. Public response snapshots/README/license/API остались вне Git в `/tmp/umux-*`; чужие корпуса/полные статьи в репозиторий не копируются.
