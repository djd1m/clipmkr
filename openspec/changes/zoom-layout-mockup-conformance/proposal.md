# Предложение: вернуть01/02 к исходным макетам

## Why

Проверка настоящих MP4 показала design drift: поздний ADR изменил положение и масштаб экрана/камеры, а тесты проверяли уже изменённый контракт. Нужно исправить01/02 и блокировать повтор такого расхождения независимым эталоном.

## What Changes

Закрепить оригинальный HTML/снимки/SHA, вернуть01 PiP справа поверх screen,02 camera сверху и увеличенную работу ниже. Проверять preview и MP4 против оригинала. Сохранить старые published MP4 и геометрию их music/CTA rerender; новое оформление применяется явно. Код начинается только после требований/ADR/плана/настоящих K1/K2 и предоставления владельцу ссылок на используемый макет.

## Capabilities

### New Capabilities

- `screen-face-layout`: уточнение ещё не архивированной capability из `openspec/changes/zoom-screen-focus/specs/screen-face-layout/spec.md`; main specs пусты, поэтому не выдумывается существующая main capability. Новый delta отдельно фиксирует01/02 и сохранность прежней композиции.

### Modified Capabilities

Нет архивированных main capabilities; `openspec list --specs --json` вернул пустой список.

## Impact

Shared layout/parser, canvas/FFmpeg, strict persisted layout/intent, последующие music/CTA rerender, visual/test release guards. Нет новых провайдеров. Детальный authoritative план — `features/zoom-layout-mockup-conformance/06_implementation_plan.md`; данный change не заменяет feature-adr gates. Сейчас только планирование.
