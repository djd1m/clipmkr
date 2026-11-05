# Изменения автора

Ветка `feat/blogger-auto-link-20261105`, база `24b4b4a`. Коммиты/публикация не выполнялись.

- `apps/web/src/server/partner.ts`: транзакционная ensurePersonalLink, active blogger account lock до partner/code, сохранение earliest и blocked.
- `apps/web/src/server/trpc.ts`: strict POST mutation с session account через существующий partnerResult.
- `apps/web/src/lib/rpc.ts`: разрешён существующему клиенту новый ключ RPC.
- `apps/web/src/app/dashboard/page.tsx`: getBloggerPolicy для композиции, один uploader и одна панель; личный блок до записей в DOM.
- `apps/web/src/app/dashboard/PartnerPanel.tsx`: явный personal mode, deadline/abort/cleanup/retry, готовый URL, clipboard/manual fallback, отдельно фиксированная личная ссылка и фильтр статистики; blocked copy закрыт в раскрытых кампаниях.
- `apps/web/src/app/globals.css`: ограниченные стили карточки/композиции, обе темы и вида без перемонтирования.
- `tests/partner.integration.test.ts`: настоящая PG concurrency20, отрицательные guards, lock barriers обоих порядков, blocked race, сравнение исторических строк с непустыми payment snapshots.
- `tests/partner-route.test.ts`: настоящий adapter strict input/session/method/origin/rate/error envelope.
- `tests/browser/blogger-auto-link.test.ts`: новый browser harness React/native HTTP adapter/auth/service/PG, AM1/AM2, clipboard/timeout/reload, uploader identity/progress при preferences.

Действующие partner-code, guest-pack, blogger-policy и HTTP route переиспользованы без постоянных изменений. Нет новых production modules, generators, dependencies, таблиц, env keys или потребителей в других репозиториях.
SSR уже выполнял DB I/O (list/summary), новый policy lookup не меняет чистый startup/health path. Ошибка DB остаётся явной; скрытая fail-open роль не вводится.
Ограничения проверки и реальные команды будут перечислены в авторском handoff; этот manifest не является независимым QE.

## Rework по QE-BAL-01/02/03

К исходному QE snapshot изменены только PartnerPanel.tsx (native target-specific clipboard fallback),
globals.css (personal studio single-column inner uploader/hidden original preview, textarea minimum16px)
и blogger-auto-link.test.ts (actual SSR Dashboard+WorkspaceHeader, denial matrix, font/reflow, настоящий
File/slice identity и завершение продолжающейся передачи). Сервер/DB/requirements/ADR/plan не менялись.
Текущие результаты и ограничения находятся в начале author-handoff.md и в author-handoff.json.
