# Требования к согласованной коррекции canvas readiness

## Основание и граница

Владелец ответил «делай» на конкретный запрос `../10_canvas_readiness_request.md`: точный patch двух путей и один дополнительный независимый cross-model QE. Новый макет не требуется: публичная компоновка/опции прежние. Не даёт разрешения на deploy, DB/S3, Cloud.ru/DNS, сброс native history или повтор всей Fleet/coverage.

## Проверяемые критерии

- FR-CANVAS-01: ready разрешён только после успешно нарисованного декодированного кадра существующего source video. TASK-1 и TASK-2.
- FR-CANVAS-02: null getContext либо исключение drawImage сохраняют unsupported, останавливают preview и блокируют «Применить оформление»; mutation apply RPC равен 0. TASK-1 и TASK-2.
- FR-CANVAS-03: здоровое декодированное видео достигает ready и позволяет apply без автоматического запроса на пересборку. TASK-2.
- FR-CANVAS-04: изменяются ровно два согласованных Source159 пути, остальные157 неизменны; история native3 сохраняется, ровно один дополнительный внешний QE отдельно учитывается. TASK-1 и TASK-3.

Контракты/потребители: локальный paint boolean → ready/unsupported callback → существующий ClipLayoutChoice previewState и disabled apply. HTTP/API, worker, quota, persistence, schema, shared geometry не меняются. Существующий ADR-003 и ZF-07/AC07 сохраняются.

Дельта OpenSpec будет отдельным дополнением внутри прежнего changes/zoom-screen-focus, без правки frozen spec; её exact SHA записывается в requirements-revision.json этой папки до кода. Старые coverage/real S3/operational ограничения не закрываются этой коррекцией.

## Acceptance criteria

AC-1 (FR-CANVAS-02/A1): null canvas context при readyState>=2/videoWidth>0 показывает недоступность, apply disabled, f.applies.length=0.
AC-2 (FR-CANVAS-02/A2): исключение drawImage при декодированном видео даёт тот же отказ, без ready overwrite.
AC-3 (FR-CANVAS-01/03/A3): настоящий успешно нарисованный декодированный кадр показывает ready, apply enabled, f.applies.length=0.
AC-4 (FR-CANVAS-04/A3): exact bundle SHA совпадает; только два разрешённых path digest меняются;157 Source и closed3 native history неизменны.
