# Предкодовая квалификация текста02

Фактически выполнено16.11.2026 в temp-каталоге текущего worker, без изменения приложения/БД/заданий/медиа. FFmpeg: `ffmpeg version 8.1.3 Copyright (c) 2000-2026 the FFmpeg developers`; imageID `sha256:03e0e7e1da09cddb42bffe8eeb697d2df4c98bb81810c5cf4df328aa1f9d641a`; шрифт SHA256 `43f6f10c6a265edfb4f34e64b1a60743610ab58c748e25eb4ef9bb54e388c38f`. ASS fontsdir — поставляемый каталог fonts, Liberation Sans Narrow; raster1080×1920. Синтетические контрольные фразы, не приватная речь пользователя.

## Субтитры

Реальный libass raster, две строки; outline5/shadow1 окрашены белым для измерения полного ink extent на чёрном. Первый пробный MarginV450 дал ink bottom1475: неприемлемо. MarginV458 с font48 не прошёл верхнюю границу на контрольных выносных (top1361). **Выбран разрешённый планом font46, MarginV458**: все три непустых двухстрочных случая внутри y1364…1469, x54…1026. Измеренные bbox (right/bottom exclusive):

```json
[
  {
    "fontSize": 46,
    "case": 0,
    "bbox": [
      269,
      1374,
      811,
      1468
    ],
    "fits": true
  },
  {
    "fontSize": 46,
    "case": 1,
    "bbox": [
      302,
      1374,
      780,
      1468
    ],
    "fits": true
  },
  {
    "fontSize": 46,
    "case": 2,
    "bbox": [
      287,
      1365,
      793,
      1468
    ],
    "fits": true
  }
]
```

Фразы: «СПЕЦИАЛИЗИРОВАННЫЕ СЕТИ / ЩЁЛКНИТЕ: SD-WAN, gjpq!», «Программно-определяемые / сети: действие и результат», «ЙЦУКЕНГШЩЗХЪЁ gjpqy / ДфруЦЩщцдйё — 1234567890». Это bounded qualification, не доказательство fit любого Unicode/неограниченного слова. Будущий test использует реальные glyph bounds; прежний escaping/glossary/grouping сохраняются.

## Заголовок / CTA / метка

Повторно использованы реальные layoutTeaser/layoutCta/buildCtaFilter/buildWatermarkDrawtext из текущего image. Два заголовка, включая длинный с существующим whole-word ellipsis, все пять непустых free/paid CTA и watermark: **8/8 непустых raster cases fit**. Для title: layoutTeaser width632 (available524), drawtext x91,y237, border24, max3 lines, sizes60…84; measured plateBBox остаётся x65…637, y211…538. Первоначальное положение x89,y235 имело вынос на1px; выбранное положение исправляет это внутри согласованной зоны. CTA font48 plateHeight80, y1481…1561; gap до watermark top1573 равен12. Нет скрытия CTA/captions или изменения ссылок.01/03/v1 typography не меняется.

Эксперимент завершился exit0; приватные scripts/raw rasters/results сохранены в /root/.config/clipmkr/zoom-conformance-implementation-20261116/. Продуктовая интеграция/libass regression/QE ещё не выполнены. Точные параметры будут применены только новой02; это конкретизация уже согласованной полосы, а не новый макет.
