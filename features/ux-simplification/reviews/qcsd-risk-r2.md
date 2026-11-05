# Независимая focused-проверка QCSD risk — R2, ideation

**Вердикт qcsd-risk: CONDITIONAL.** UXR-01 проверен на уровне проекта; UXR-02 остаётся открытым: исправление не определяет момент захвата baseline версии для music apply. Это не воспроизведённый дефект кода и не вердикт других ролей.

## Входы и привязка

Роль qcsd-risk, originating reviewer R1; запрошены `gpt-6.1-terra xhigh`, автор Astra по предоставленному контексту. Аттестации модели провайдером у меня нет. Прочитаны актуальные 01, ADR-001/002/003, 04, 05, proposed 06, author-response и настоящий author handoff; затронутые source dependencies исследованы выборочно. Чужие verdicts не читались.

R2 manifest SHA-256 `94669d1c97c78c9581ad33b1b806d90c8ff43b3b3788953698d23028adf5b836`: `sha256sum -c` подтвердил все 92 входа. Approved HTML SHA-256 `a85b3f073a335871e421ea2079269fa19c71f42a263d7b0bd17ae30469c50e68`, как в approval. Все семь digest в native host snapshot независимо совпали с файлами. Host nonce `626cbb86-afe9-4c71-9d52-cde0bbf99233`, revision `ba52986ed3bc730d603523e4673c2da38807936bd4a2db54e9e5534688300398`; revision скопирована из host, а не выведена заново. Host до записи SHA-256 `8db2dfe74bdc1c5b13e5e76ddf22601fa96d8b85480b8b42fad157ca3192dc9f`.

## Проверка исходных условий

### UXR-01 — design verified

`01_requirements.md:49`, `03_adr/001-place-context-in-existing-pages.md:84–90`, `04_domain_model.md:89` и `05_architecture.md:197` задают обычные anchors Account/stats, capture guard, продолжение попытки при dismiss и invalidate/abort при accept. Для отправленного complete указан неизвестный исход; возврат использует account-scoped resume, тот же файл и hash без автоматического старта. Same-document Back не притворяется отменяемым, beforeunload зависит от браузера, предупреждение показано заранее. Это соответствует исходному требованию о навигации и учитывает `apps/web/src/app/upload/Uploader.tsx:34–68,107–150`.

**Confirmation:** proposed `06_implementation_plan.md:95,106` и ADR-001:90 называют `active_upload_new_routes_and_history`, реальный Next router с удержанной передачей, cancel/leave/Back/reload/unknownComplete, исходный reload test и обязательный RED при отключении guard. Эти проверки запланированы, NOT RUN; browser-specific BFCache/dialog и настоящая поставка требуют доказательства на этапе реализации. `implementationVerified=true` относится только к документному исправлению.

### UXR-02 — design verification не пройден

`03_adr/002-preserve-state-with-stable-owners.md:49–60` существенно улучшает решение: VideoDetail владеет per-clip pending и поколением чтения, после ack отбрасывает предыдущие результаты/error/finally, делает fresh read и различает queued/success/failure. `04_domain_model.md:87,91`, `05_architecture.md:198,208` и proposed plan `:96` согласованы с этим направлением. Но ADR-002:54 лишь говорит сохранить `baseline render_version` **после ack** и нигде не определяет, из какого снимка и когда он захвачен. `:56–57` разрешает признание результата только при `version > baseline`; не определена обработка случая, когда baseline уже равен новой версии.

Конкретный допустимый по текущему дизайну порядок: исходная версия 7; apply отправлен; сервер коммитит версию 8 (`apps/web/src/server/clip-music.ts:37–50`) до получения клиентом ack; обычный poll видит версию 8 (`apps/web/src/server/screen.ts:80–87,114–116`) и успевает обновить DTO до ack, пока saving блокирует только кнопку (`ADR-002:53`). Если baseline берётся из текущего DTO на ack, он равен 8. Fresh read для queued, fast success или terminal failure той же операции тоже показывает версию 8 и по правилу `<= baseline` оставляет ожидание и disabled apply; terminal failure может не быть показан. Существующие generation checks на момент ack не устраняют уже принятый до ack poll. Это логический контрпример к полноте проекта, не утверждение о будущей реализации или результат runtime.

**Необходимое исправление:** определить для конкретного clip/attempt неизменяемый pre-mutation baseline и момент его фиксации до отправки apply, защиту от poll, уже увидевшего commit до ack, а также поведение при неизвестной/изменённой baseline и конкурирующих изменениях без ложного подтверждения. Сохранить реальную terminal failure, доступный старый файл и запрет повторной mutation до известного состояния. **Confirmation:** расширить `music_apply_ignores_pre_apply_poll`: удержать ответ apply после server commit, доставить poll с новой версией до ack, затем ack и fresh DTO той же версии для queued, fast success и terminal failure; проверить отсутствие вечного pending, реальную ошибку, один request. Отдельно сохранить исходный случай старого poll после ack и RED при удалении защиты. Весь тест NOT RUN. Исходный UXR-02 сохранён без изменения; нового дублирующего ID не создаю.

## Author handoff и новые риски

Файл `.fa-state/ideation-author-handoff-r2.json` структурно совпадает с author object общего receipt; обе мои находки входят в `addressed`. Самостоятельно сверены реально изменённые условия, проектные seams и зависимости для своей роли; авторское `addressed` не принимается за closure. Author `newRisks` рассмотрены: дополнительное base/filter чтение и устаревший blocked snapshot ограничены ADR-001:59–65 серверной authority и fail-closed отображением; profile reader — ADR-001:69–75 явно различает unknown и error; ограничения browser history — ADR-001:86–90; отсутствие версии в music ack — ADR-002:51–60, но baseline остаётся недоопределённым по UXR-02. Это рассмотрение рисков, не независимое закрытие чужих условий. Нового отдельного material condition вне исходного UXR-02 не выявлено.

## Пределы

Код, UI, тесты, браузер, E2E, runtime, внешние системы, K1/K2, prepare и evaluate не запускались. Проверка хешей не доказывает правильность runtime; R2 не означает WCAG pass, реальную загрузку, payment E2E или owner acceptance. Host не изменялся. Общая convergence и допуск Step 7 остаются за координатором после исправления, исходной независимой перепроверки и настоящих gates.
