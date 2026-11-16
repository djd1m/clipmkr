# Узкий авторский rework QCSD R2

Статус: дизайн исправлен автором для origin verification; это не закрытие условий/этапа, не K1/K2 и не разрешение на код.
Исходный snapshot: nonce `302cd2cc-e122-4169-a974-553215b27b2e`, revision `11a6f6693755d66c3c5b1e986aba3e3bb89660824887660b15ac84e2c154c0f3`; root evaluate R1 exit1, unresolved10. Полные первоначальные формулировки остаются в неизменённом `.fa-state/review-convergence-ideation-host.json`, original evidence — `reviews/qcsd-*-r1.md`. Архив33 прежних документов: `history/qcsd-r1-design/snapshot.json`.

## Все исходные условия и владение

| ID | Origin owner | Авторская правка | Нормативные пути / acceptance |
|---|---|---|---|
| RISK-01 | qcsd-risk | Проверяемая гарантия области/времени; предел sampling/identity отражён в требованиях | 01 ZF-06/AC03, ADR-001,05,OpenSpec; AM-4 |
| TST-01 | qcsd-testability | A→B и sub-sample fixtures с live ROI oracle; предел не скрыт и не выдан за identity | 01 авторизация R2, ADR-001 Confirmation, OpenSpec; AM-4 |
| ACC-01 | qcsd-accessibility | Dynamic names/units, DOM/readout/ROI/min/max после target/clamp равны | 01 ZF-04/AC09, ADR-003 controls; AM-5 |
| ACC-02 | qcsd-accessibility | Native keyboard, named modal/focus/Escape/return; state announcements без polling дублей | 01 AC09, ADR-003 dialog/status; AM-6 |
| ACC-03 | qcsd-accessibility | Каждый play всех трёх плееров pause остальных; same selected clip включён | ADR-003 media,05,AC10; AM-7 |
| SEC-01 | qcsd-security | Native max_redirects=0 в ffprobe+ffmpeg; exact origin/scheme/TLS, sanitized unavailable | ADR-004 source policy,05; AM-8 |
| SEC-02 | qcsd-security | Closed runtime union; authoritative owner/active/retention/revision/epoch до source/publish | ADR-004 dispatch/claim,04/05; AM-9 |
| UX-01 | qcsd-ux | Scoped sessionStorage/read-back/restore, предупреждение до потери и отдельный server intent | 01 ZF-10/AC10, ADR-003,04/05,OpenSpec; AM-10 |
| UX-02 | qcsd-ux | Первый03 focus=null/whole-screen явно объяснён; camera seed не action proposal | 01 ZF-03/AC08, ADR-001/004,05,OpenSpec; AM-11 |
| UX-03 | qcsd-ux | Симметричный media lifecycle и сохранение nodes/draft | ADR-003,05,AC10; AM-7 |

Общие AM-4 и AM-7 дедуплицируют только исправление, не ID/ownership. Ничья независимая verification здесь не создаётся. Даже clean R1 qcsd-quality повторно оценивает фактическую structural delta в подготовленном root snapshot.

## Исполнимый контракт камеры и начальный focus

Root задал принятую границу намерения: moving pixels только подтверждённой camera ROI и запрет захватывать face со слайда/браузера снаружи; не universal identity/active speaker/action understanding. Прежняя формулировка ZF-06 была сильнее механизма.01/ADR/OpenSpec теперь явно ограничивают её; UI approval selector не используется как доказательство identity или согласие на неизвестный алгоритм.

Falsifiers: внешний marker/face вне canonical crop никогда не появляется в camera output; moving time counter совпадает; observed negative sample убирает camera весь clip, screen остаётся. При A→B в той же ROI и blank0,20–0,30s между samples0/0,5s output следует текущим ROI pixels: запрещены frozen A и иной crop. Тест не ожидает невозможного identity veto. В variant02 с безопасным slot и controlled positive FaceReport он требует cameraVisible=true/непустую camera и B/blank pixels на конкретных кадрах; always-hidden camera не может дать ложный PASS. Actual YuNet accuracy/observations проверяются отдельно в worker-image corpus, не заявляются доказанными controlled report. Отдельный browser oracle проверяет видимое/доступное пояснение limitation до apply. Wholeclip owner acceptance не выдаётся за доказательство детектора.

Initial03 имеет весь ориентированный source как screen и focus=null; сообщение о whole-screen стоит в preview/confirmation. Камера предлагается автоматически при достаточных наблюдениях, focus из face report не выводится. Прежде подтверждённый focus той же sourceRevision используется без ручного повторения; optional controls не обязательны для whole-screen результата.

## Доступность и lifecycle draft/media

ADR-003 связывает control label/current target/единицы с canonical normalized ROI; после width clamp изменившийся x сразу попадает и в DOM value, и readout/accessible tree. Dialog явно назван, Escape/cancel не apply, focus возвращается к доступному invoker/summary. Status объявления привязаны к semantic state/reason/operation transition, не к каждому новому polling object; у причины есть дальнейшее действие. Нужен ручной screen-reader QA реализации.

SessionStorage содержит только closed geometry/version/identity envelope; reuse read-back pattern upload-resume без его upload data. Restore после authorized metadata различает dirty local и accepted DB intent. Новая source revision не получает старые ROI; renderVersion conflict сохраняет draft с объяснением. Неизвестный apply сохраняет прежний request key. При blocked storage предупреждение показывается сразу, до ухода; native beforeunload и controlled leave cancel сохраняют draft. SPA Back при blocked storage/очистке нельзя надёжно отменить и восстановление не обещается; после возвращения показано, что draft не найден. Это явный предел fallback, не скрытая подмена опубликованными настройками.

Каждый play preview/published/Original вызывает parent pause остальных refs, включая повтор play selected clip. Шесть направлений, close/change clip и polling identity проверяются отдельно. Нет нового глобального media manager.

## Source access, dispatch и проверенные зависимости

FFmpeg tag n8.1.3 разрешён до commit `1041abdc962f4cc4f394aa8de9dc5236c0c3b9e7`. Первичные source bytes (http.c, tls_openssl.c, protocols.texi) получены по pinned URL; SHA, timestamps и installed capability reads в `r2-source-evidence.json`. Native max_redirects минимум0 и проверка до Location дают отказ без follow-up request; cached redirect тоже проверяется. `protocols.texi` содержит устаревшее общее замечание hostname/OpenSSL; проверенный код данной версии использует hostname/IP validation. Runtime FFmpeg/ffprobe8.1.3 на image34abe462… показывают max_redirects в help. Все команды version/help/inspect exit0, сетевой media fixture не выполнялся.

Переиспользуются S3 factory/signer/namespace и existing lifecycle helpers. Worker подписывает только DB source на configured internal endpoint, с bounded expiry. Exact origin/scheme, HTTPS verify, no proxy-env/FFREPORT и closed formats заданы до child. redirect/unsupported policy→unavailable, без Range proxy и повторной попытки со снятой policy. Raw faces.ts error.message в новом remote path запрещён: canary не должен попасть в stderr/queue/логи; это запланированный discriminating fixture, не проверенный runtime.

Closed parser разрешает ровно seed и legacy render shapes; unknown/mixed/extra не fallback. Legacy пять identity полей сверяются с DB attempt. Seed lookup обязан найти ранее авторизованную cache generation; actual owner/active/deletion/retention и source/seed revision проверяются до CAS, перед source access и при publish epoch. Redis по-прежнему закрытый транспорт; новая межсервисная аутентификация не нужна.

## Scope, зависимости и ограничения доказательства

Изменены01, reuse, ADR001/003/004,04/05/06, OpenSpec, requirements revision, handoff/dossier/source pins и эти amendments/evidence. ADR002, research/shift-left, UI/approval и прочие19 read-only dependency paths влияют на интеграцию, но не редактируются. Source revision helper по-прежнему создаёт Original; его готовность проверит root после последовательной интеграции. Editable40/read-only19 сохранены; по root instrument check все59 теперь измеряются trailing EXPECTED block, без расширения write authority/XL score.

Новых серьёзных условий автор при scoped delta review не выявил. Остаточные ограничения названы: fixed ROI/sampling, false negatives/seed accuracy, large Range traffic/30s nonpreemptive delay, browser codec/seek, sessionStorage blocked/back/crash recovery, actual target TLS/redirect behavior и screen reader. Это плановые implementation/acceptance доказательства, не изобретённые новые QCSD findings и не утверждение их устранения кодом.

Согласованный HTML/PNG/ui-approval не менялись; новые объясняющие состояния перечислены в `architecture-handoff.md` и не объявлены отдельно просмотренными владельцем. Контрольный source revision helper/Original metadata не дублируется. Код/DB/S3/media тесты/commit/push/gate mutations автор R2 не выполнял.

## Реальные документные проверки

Терминальные исходы OpenSpec strict, docdiff, source/UI/hash equality,59-path block и полноты author IDs записываются в `r2-document-checks.json` и передаются root с `author-rework-r2.json`. Досье фиксирует финальные байты дизайна. Это document integrity, не K1/K2, review-convergence closure или runtime PASS.
