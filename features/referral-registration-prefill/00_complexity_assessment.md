# 0. Классификация регистрации по приглашению

Task kind: bugfix

11.11.2026. База `74ea7a6bae354a1cf1fdaec1af01a957cd421137`, branch `feat/referral-registration-20261111`, отдельный WT `/tmp/clipmkr-referral-registration-impl-20261111`. Product source не изменялся.

## Измерения

| Измерение | Балл | Основание |
|---|---:|---|
| Файлы | 2 | R2: ожидается10 изменяемых runtime/test targets:7 application +3 tests; process/spec документы и неизменяемые dependencies отдельно |
| Домены | 2 | Существующая регистрация/вход и реферальная attribution; нового bounded context нет |
| Интеграции | 1 | Новых поставщиков, пакетов, endpoints нет |
| Breaking changes | 1 | Existing apply response получает additive applied_code; прежние поля/null/errors и request/source policy сохранены, props/notice расширяются аддитивно |
| Модели данных | 1 | Новых таблиц/колонок/миграций нет |
| Сквозные аспекты | 3 | Auth boundary и персонализированный SSR/cache; advisory DB availability |

Сумма10: **M**. Подтверждено root после передачи оценки; tier не понижается ради числа файлов. Ни одного XL-измерения, breaking/schema override нет. Если architect обнаружит больший diff — пересчитать, а не скрывать targets.

## Активные этапы

0 → 1 → 3 (один Nygard/ITD-light ADR + shift-left) → 3.5 (три реальные core роли) → 5 (component/light) → 6 (отдельный planner, genuine K1/K2) → 7 → 8. Step2 external research, DDD и fleetL не требуются; reuse inventory дополнительно обязателен. HAS_UI=true, HAS_SECURITY=true, HAS_UX=true. Расширенные security/a11y/regression/mutation методы применяются к затронутому пути; AQE runtime не заявляется установленным.

Текущая задача автора — factual requirements/reuse/draft design, без product code. Root назначает отдельного Astra architect/planner и originating independent QCSD; автор не выдаёт свой черновик06 за завершённый planning stage. SOURCE/QE позже — свежий cross-model reviewer на стабильной ревизии.

Оценка: подготовка/планирование20–30мин; реализация30–45мин; проверки и независимый QE30–45мин; поставка отдельно20–30мин после GO/root и результатов. Это предварительные диапазоны без обещания времени; измеренный прогон ещё не начинался.

## Recall

Фактический pinned recall exit0,10 записей, выполнялся до source edits с `--project /home/clipmkr`. Прочитаны teach:f8d5479058e03557, teach:b3ca3249435bdee7, teach:7439034e1478e6d5, teach:383cfc5a0365bba7. Извлечённые инварианты перенесены в FR-1…FR-5/NFR-1…NFR-2. Новый teach не дублируется: принятый урок уже записал root.

## Acid inputs

| ID | Вход | Обязательный отказ/свойство |
|---|---|---|
| A1 | Cookie с изменённой подписью, истёкшая/duplicate; blocked/inactive lookup | Не показывать проверенный код/green; invalid подпись не вызывает DB |
| A2 | Cookie исчезла после SSR, поле не редактировали | Отправить `{}`, не stale `{code}` и не обещать applied |
| A3 | Обычная ссылкаB послеcookieA либо guest priority | Показывать effective source; не менять policy |
| A4 | Apply HTTP200/null/пустой объект/rejected/self | Нет ложного «Приглашение применено» |
| A5 | Register existing против ordinary login | Existing0apply/signup, baseline snapshot; normal login прежнийapply |
| A6 | SSR/refresh после `/r` | Нет дополнительных growth events/recordView |
| A7 | Запросы разных браузеров на одной Next instance | Нет shared-cache/RSC leakage cookie/secret/code |
| A8 | DB lookup недоступен при valid cookie | Страница работает без неподтверждённого display; fixed safe log |
| A9 | SSR A, фактически применена B либо reply без доказанного applied_code | Notice подтверждает только persisted B; missing/malformed/rejected не подтверждают A |
| A10 | Один настоящий /r→register→apply и повторное чтение проекций | Ровно+1 у выбранных blogger/code в dashboard и owner report; чужие не меняются, чтение не наращивает count |

## Checkpoint boundary

Tier M согласован root. Файлы требований и OpenSpec — нормативный input; настоящие checkpoint receipts принадлежат supported dz flow. K1 и предварительный R1 K2 фактически прошли. R2 устраняет три conditional originating замечания, но не объявляет их закрытыми: native ideation closure/финальный Step6/root GO/code/QE ещё не получены.
