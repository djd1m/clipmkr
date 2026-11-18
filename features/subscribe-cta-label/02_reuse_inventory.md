# Переиспользование

- `readStoredCta`, `parseCtaTarget`, `ctaDisplayHost` и `actions` уже проверяют и показывают ссылку. Вид, хранение и существующий маршрут остаются.
- `layoutCta`, `ctaZone` и шрифт метки ограничивают ширину и положение надписи. `prepareTeaser` показывает готовый путь передачи текста в FFmpeg через `textfile`, `expansion=none` и закрытую временную директорию рендера.
- `VideoCtaService.setCta` и существующая квота/блокировка защищают пересборку. Результат продолжает использовать текущий fence и неизменяемый объект; дельта идентичности включает хеш фактически выбранного адреса.
- Опорные проверки: `tests/clip-cta.test.ts`, `tests/clip-cta-render.test.ts`, `tests/clip-cta-rerender.integration.test.ts`, `tests/cta-media.test.ts`, текущий paid unit и mutation anchor `paid-cta-link-text`. Старый запрет чтения URL для любого рендера заменяется положительной проверкой подписки и отрицательным контролем для других видов.
