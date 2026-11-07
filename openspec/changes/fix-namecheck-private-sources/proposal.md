# Исправление K1 source coverage — кандидат S

## Why
Installed name-check отвечает только про app/package/script namespace. Root наблюдал FREE для физически существующего test module; внешние private Python sources также не покрыты.

## What Changes
Расширить существующий collector: tests, один explicit absolute source-root, static Python AST, resource/coverage refusal и additive scan evidence. Только два repo targets: existing project patch и existing test file. Pure decideNameCheck и остальные gates сохраняются.

## Capabilities
### New Capabilities
- `name-check-source-coverage`: явная проверка локальных источников с доказуемой областью scan.
### Modified Capabilities
Нет.

## Impact
Authoritative plan: `features/fix-namecheck-private-sources/06_implementation_plan.md`. Package pins/installer/shared installation не меняются этой подготовкой. Изолированные tests предшествуют отдельной reviewed installation; затем реальный K1 может проверять нужный private namespace. STEP4/recovery runtime не допускается этим change.
