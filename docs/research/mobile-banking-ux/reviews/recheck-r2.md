# Независимая повторная проверка MBUX-R01–R03, revision r2

Дата: 05.11.2026 UTC. **Результат: MBUX-R01, MBUX-R02 и MBUX-R03 закрыты на проверенной r2; ограниченное исследование пригодно к использованию в заявленном scope.** Новых существенных рисков в фактическом diff не обнаружено. CONDITIONAL исходного отчёта снят только в отношении этих трёх документальных замечаний. Это исследовательский source/logic review, не code/QCSD/feature-adr gate, не приёмка UI и не production approval.

Проверяющий: `gpt-6-astra xhigh`, агент `/root/mobile_banking_ux_review`, продолжение независимой reviewer-сессии. Автор исходных материалов: `gpt-6.1-sol high`; текущие исправления внесены root. Модель указана по конфигурации запуска; отдельная provider attestation не получалась. Предыдущие выводы reviewer использованы только как перечень замечаний для повторной проверки; отметка root pending/pass не принималась как доказательство устранения.

## Ревизия и фактический diff

Actual SHA256 исходного frozen manifest: `96c5a5f5c224d6d556ff9633b98dd64f6b0cd4f9a5a2785b44ec7aa01fa3611e`, сохранён без изменений. Actual SHA256 `recheck-manifest-r2.json`: `4940eab3aa46711dca1d78ecc5b0c6bc15206f9271b8fbc7487b0fc19234fff6`, совпал с заданием. Все10 текущих файлов совпали с bytes/SHA нового manifest;6 совпали также с исходным.

Проверка diff выполнена независимо через обратное применение пяти literal replacements из `integration-corrections.private.json` в памяти и удаление единственной добавленной ссылки/пояснения README. Восстановленные bytes каждого из четырёх изменённых файлов дали исходный frozen SHA. Это подтверждает точный состав изменений, а не только совпадение с утверждением интегратора. SHA списка replacements: `2177196150de777fabb2427df288fc6d3c0b2bf8712f7217b8b8ae03cee9b64c`.

| Файл r2 | SHA256 actual |
|---|---|
| `docs/research/mobile-banking-ux/README.md` | `bef406e226e856c539944844ff67230911ddae9346a27a6c68673acfd6b5aa40` |
| `docs/research/mobile-banking-ux/alfa-bank.md` | `b0c6748a74141391576d51a480b86a9b71ee4fd64378b381bfc10df907a9fa1d` |
| `docs/research/mobile-banking-ux/clipmkr-mapping.md` | `7e895a47e84580f3a8d3a2bfb0557bd91ce4ed47c35c48921d32cef2b3a0a507` |
| `docs/research/mobile-banking-ux/patterns.md` | `4f9d4d741d991c24f9bdafe211fdf9646fb785a2e3a8d9e85fa111e5023bdf3f` |
| `docs/research/mobile-banking-ux/sources.md` | `0b43b80e87c523d863fda423c6535977ad275a716a0cca1fd58935cc7065446b` |
| `docs/research/mobile-banking-ux/t-bank.md` | `351517b9496ecfa37a3fe94f1b2a959b018ac0eb009a83221d5e2bd0267eea45` |
| `docs/research/mobile-banking-ux/validation.md` | `5be9abc07b221277a2c948a9231c4ce54ff3ef7c61a499e10a3fcc39ebeed119` |
| `features/mobile-banking-ux-research/00_complexity_assessment.md` | `ced89b2825f977e48cbc46e682ad114d849c9e8046964759492f015bc96bf591` |
| `features/mobile-banking-ux-research/01_requirements.md` | `0b2d3a9302d9a9035651c49f7f402daa55446a07e26d09c68f674153bc300027` |
| `features/mobile-banking-ux-research/02_research.md` | `5bf2d3c860d6de38e0a50cc2c0419d226f426260169ed0826e8bfebfe0e74c2b` |

Дополнительно actual bytes `reviews/independent-review.md` равны исходному private отчёту, SHA256 `8a0e09be0046e832588e25df17621bcfb9e0a9bc6beb994fd2fa8a0f7a290db0`. Новый `review-status.md` прочитан: он честно указывает pending recheck, а исходный CONDITIONAL связывает с прежней ревизией; его SHA на момент чтения `2c00618ab035125beaf08c2d93cabd33bb9e350bb0fa1149855d3eecd74cb0c9`. README меняет только ссылку на этот статус и маркирует остальной текст как описание авторской передачи. Нового разрешения на реализацию/выпуск эти добавления не содержат.

## Проверка устранения

| Finding / исходная серьёзность | Фактическая проверка r2 | Результат |
|---|---|---|
| MBUX-R01 / Low P3 | `sources.md:26`, `alfa-bank.md:19`, `patterns.md:15` теперь явно относят изменяемый основной счёт к Альфа-Онлайн/web. Повторно прочитан нужный участок сохранённого A03: заголовок Альфа-Онлайн предшествует выбору счёта. SHA raw повторно MATCH `968504a0e2b56fd1b97794e158a194b4e4cbf47c3921661ce4fb074f66a78ac6`. [Источник](https://digital.alfabank.ru/digest/retail/2024-40) | **CLOSED**: текстовый пример больше не смешивается с Android-подобным видео; история/build ограничения сохранены |
| MBUX-R02 / Low P3 | `sources.md:15` указывает дату статьи18.07.2025 и отдельно неизвестный build. Повторно прочитан видимый текст даты в T05 raw; SHA MATCH `77daf6ce38f97b8ee6e7db4d8d310c4222267006321a82aba2a8e51d05609245`. Дата также была независимо подтверждена web search в первом проходе. [Источник](https://www.tbank.ru/finance/blog/inclusive/) | **CLOSED**: дата публикации не выдана за дату банковского build |
| MBUX-R03 / Low P3 | `sources.md:3` теперь ограничивает выборку формированием гипотез и прямо говорит, что насыщение не измерялось. Старое утверждение полностью удалено, пробелы по ошибкам/доступности сохранены. Методический контекст прежний: [планирование GOV.UK](https://www.gov.uk/service-manual/user-research/plan-user-research-for-your-service) | **CLOSED**: недоказанный methodological claim снят без расширения scope |

Проверки выполнялись стандартным Python: hashlib для actual bytes, строковые обратные замены с проверкой уникальности, HTMLParser для двух участков raw. Все assertion завершились успешно. Сначала путь private corrections был предположен в reviewer-каталоге и не найден; через ограниченный поиск обнаружен фактический файл в `/tmp/clipmkr-mobile-banking-ux-research-20261105/`. Это не отсутствие evidence: последующая проверка использовала найденный файл и доказала reverse hashes.

## Сохраняющиеся ограничения

Повторный широкий поиск, банковские обращения и визуальный разбор не запускались: текущие правки не меняют изображения, URL или исходные наблюдения. Повторно использовано доказательство первого независимого прохода, проверены hashes двух нужных raw. Ранее banking web.open был недоступен, стандартный TLS запрос давал CERTIFICATE_VERIFY_FAILED; этот проход не подтвердил official origin raw заново. SHA доказывает неизменность, не доверенный transport. Search-index по-прежнему не называется полным HTML; демонстрационные кадры не являются натурным flow.

Все ограничения исходного отчёта остаются в силе: нет authenticated banking/task tests, замеров UMUX/SUS, WCAG pass, живой проверки конкретных builds или Clipmkr E2E. Согласованный UI/продуктовые требования не пересогласованы. Закрыты только документальные замечания для перечисленных SHA. Обновление root файла review-status после этого заключения должно ссылаться на данный отчёт, не выдавая его за более широкий gate.

Worktree оставлен без изменений reviewer. Новый файл записан только в private каталог mode0700, файл0600. Исходный private отчёт не перезаписывался. Текущий focused проход завершён.
