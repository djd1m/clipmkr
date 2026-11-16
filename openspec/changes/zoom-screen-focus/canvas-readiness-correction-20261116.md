# Дополнение требований: готовность canvas-предпросмотра

Решение владельца16.11.2026 «делай» относится к точному патчу из features/zoom-screen-focus/10_canvas_readiness_request.md, SHA256 f8bc4ef2b355acddaa3e6370f8d8fbc95dc7de3ca611f83f6a76fa5a9c27fd27. Это дополнение прежнего изменения, не новый native slug и не новый цикл.

Уже согласованный preview/apply contract уточняется наблюдаемым критерием: готовность наступает только после успешно нарисованного декодированного кадра. При недоступном canvas context или исключении drawImage интерфейс сохраняет unsupported и блокирует применение; здоровый кадр сохраняет ready и доступное явное применение. Автоматических render/job/charge нет.

Изменение касается только ClipLayoutPreview.tsx и tests/browser/clip-layout.test.ts; прежние требования/ADR/макет и Source159 сохраняются с разрешённой заменой двух digest. Исторические закрытые native3/3 не сбрасываются. Владелец разрешил один дополнительный явно учтённый внешний cross-model QE; новый ordinary native4 не объявляется.

Критерии и исполнение: features/zoom-screen-focus/canvas-correction/01_requirements.md и 06_implementation_plan.md. Новая публикация/DB/S3/Cloud.ru/DNS этим дополнением не разрешаются.
