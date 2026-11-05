# ADR-004: Связать визуальную приёмку с точными макетами и состояниями

## Status
Proposed; execution evidence contract для ранее согласованного дизайна. Unit/build success не закрывает это решение.

## Context
Shell-only implementation прошла функциональные тесты, но не перенесла согласованный интерфейс. Lesson teach:820581d93a5cf7df извлечён stage recall. Новый check обязан различать возвращённый legacy body и настоящий mockup UI.

## Decision Drivers
D1 high: pinned design traceability; D2 high: реальные действия/данные и readable errors; D3 high: независимый сравнительный review; D4 medium: устойчивые geometry tests вместо глобальной pixel-маски.

## Considered Options
A. Только aggregate pixel-diff threshold: автоматично, но тексты/антиалиасинг скрывают смысл.
B. Только unit/axe/colors: дёшево, но не различает старый layout.
C. Paired images + region geometry/semantics + independent visual review: выбран; требует более явных fixtures и evidence.

## Decision
1. Style reference SHA256=9ea8f63f7dc66bb46a63276177f8033c9463e644b53e4b9e15d065ed49659106, flow reference=6f45ee0a6175ce1cb6bc46162dd2521fd3ee3698556eae53664967fbc147e299. Перед capture hash проверить. Нельзя править эталон, чтобы сделать implementation PASS.
2. Capture same viewport/theme/layout/state: 2layouts×2themes×3screens×320/390/672/768/1024/1440×Chromium/WebKit=144 base cases; breakpoint boundaries607/608/609 and831/832/833, R9 viewports390×844/375×667/360×740 и flow states отдельно. Reference crop только .direction[data-direction][data-screen], исключая demo toolbar/disclaimer; app crop named workspace content. Полный browser screenshot рядом сохраняет auth/TEST/header context.
3. Синтетический контент задан private fixture mapping actual account/video/clip/versions/current offers. Статический reference может содержать demo text; ignore лишь заранее перечисленные dynamic text/media rectangles, не whole panels/geometries/controls. Любые адаптации доступны в manifest, original bytes остаются неизменными. Старые прототипные fake actions не принимаются за product behavior.
4. VC matrix в01 связывает source selector/line→component→assertion→paired evidence. Проверять относительные позиции/колонки/порядок/размерные диапазоны/action visibility, стабильные landmark relationships. Screenshot обеих сторон просматривает независимый reviewer; global pixel percentage не заменяет вердикт по каждой строке.
5. Negative control: возврат каждого legacy upload/result/packages body при неизменных theme/tokens обязан RED соответствующих geometry/visual contracts. Второй control — remount key by layout→RED lifecycle. Evidence сохраняет exact SHA/image digest/origin/browser/fixtures/command/exit и честные unavailable states.
6. Принятый published target: clipmkr.ru existing app-only, данные/сессии/volumes сохранены, после E2E ссылка владельцу и ручная приёмка; тот же artifact на Cloud только после неё. Локальный rendered component и browser-mocked transport маркируются отдельно от actual Next и provider jobs/payments. Уже авторизованные владельцем реальные provider E2E с existing media/profile и тестовыми оплатами выполняются без повторного разрешения. Новые поставщики и расходы вне этого действующего допуска в scope не входят.

7. Реальные вариации дополняют базовую матрицу: обе темы/компоновки,320/390/1440,0/1/4 clips/records,160символьные названия (80неразрывных), многострочные purchase conditions. Gallery >3 переносится на следующие строки; Cabinet сохраняет все selector rows; empty/unavailable честны, каждый CTA доступен, text bounds не обрезаны/overflowX<=1px. Hide-fourth-card и clip-long-text negative controls обязаны RED. Полная процедура QC-CONTENT в01.
8. Palette oracle использует exact light/dark role→hex table QC-PALETTE в01 из style129–175. Измерять computed effective colors видимых named surfaces/text/accent/hover/focus, допуск1/255 только округление, не unused tokens. Все144 base cases; hover/focus390/1440 обе темы/layouts. Video pixels/native controls и существующие semantic errors — только именованные исключения. Blue surface#123c66/CTA#2563eb mutants обязаны RED; independent paired review обязателен.
9. Target связан с owner20:15: https://clipmkr.ru,194.85.249.105, project n5-clipmaker/web n5-clipmaker-web-1;77.83.87.178 — dev, n5.clipmkr.ru — иной project. Перед app-only update повторно проверить target/origin/project/image и сохранность backup/config/volumes по docs/operations/local-ux-stage.md. Уже разрешённое тестовое развёртывание предшествует E2E и manual acceptance; тот же artifact Cloud только после неё. Production/DNS — только отдельная команда, новый approval для тестовой цели не нужен.

## Rationale
C связывает одобренную структуру с работающим продуктом и ловит ранее пропущенное сужение. Прототип задаёт композицию, действующие schemas — числа/права/операции.

## Consequences
Positive: проверка опровергаема конкретным legacy body. Negative: fixtures/screenshots и ручное сравнение занимают время; это необходимая часть приёмки, не новый дизайн-проект. Private cookies/media/URLs внеGit. Follow-up ADR:none.
After-action Review: root+владелец на manual acceptance и через месяц после неё.

## Confirmation
Method: scripts/check-mockup-ui-realization.mjs + tests/browser/mockup-ui-realization.test.ts and independent paired-image report.
Monitoring: VC rows missing evidence remain OPEN, not inferred from build/unit PASS; runtime screenshot/hash vs pinned source reconciliation.
Success metric: all mandatory VC rows behavior+geometry+paired review PASS, all injected legacy bodies RED, no unexplained design substitutions.
Owner: implementer captures, independent mockup/QE reviewers adjudicate, owner manually accepts published artifact.
Load-bearing property: actual approved layout cannot be replaced by a narrower implementation claim.
