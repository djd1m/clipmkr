# Переиспользование и выбор минимального решения

| Существующий блок | Факт/роль | Решение |
|---|---|---|
| `proxy/Caddyfile` SHA10e57… | portable `web:3000`, existing headers/trusted_proxies/transport360s/60s | сохранить; site overlay — exact производная с одной заменой, тестом защищён от drift |
| `docker-compose.yml` | `${N5_COMPOSE_PROJECT:-n5-clipmaker}`, ro single-file Caddyfile bind | base без изменения; native source-only `deploy/source-proxy.compose.yml` явно меняет только будущий cold mount, current runtime без env/recreate; fixedname не навязывается custom project |
| `tests/proxy-rate.test.ts`, `apps/web/src/server/ip.ts` | XFF trusted hops/negative missing chain | существующие targeted regressions; owner app source не менять |
| Private `payment-cjm/run.private.py` | maintained validate_proxy_binding, полный shared-network inventory, exactdisk/rawloaded checks, baseline/correlation consumption | изменить только disk SHA/exactupstream/selected-name predicate и hosts matching; остальные guards/financial sections сохранить |
| Private `paid-media-only/paid-media-only.private.mjs` | hash-bound caller runner | только новый reviewed run hash; остальные media/session/cleanup guards прежние |
| Existing canonical fd read/fullwrite/fsync/backup recovery patterns | решения held-fd и single-file bind уже найдены/проверены в соседнем закрытом блоке | root использует точную стандартную последовательность операций и отдельную запись; не писать новый generic executor и не менять закрытый callback executor/bridge |
| Docker/Caddy existing inspect/adapt/validate/reload | actual mount/network/loaded/health | root будущие fresh read/reload, без новых сервисов/пакетов |

Старые helpers и full config не копируются в публичные feature artifacts. Известные current private hashes на планирование: runner `b0c142aaac4bc7f43a687f4de1b575b4d602c54fcbcc073c0c1688457e1e84b4`; caller `fc5083de57c3d213101ae34d09ef9025a981be0bf2baad571584dacefe833b34`. Новые hashes PENDING до кода/final review. Полный actual delta и fixtures будут приватными inputs независимого reviewer вместе с measured public overlay/docs; один repo snapshot не доказывает private source review.

Выбрано: source-site overlay с exact main container DNS name, уже зарегистрированным Docker на общей private сети; unique-name inventory остаётся обязательным даже после успешного direct health. Другие `web` aliases остаются в инвентаре, но не участвуют в выбранном upstream имени. `/etc/hosts` проверяется против выбранного имени и актуального main endpoint IP, не против исторического IP.

Отклонено: глобально заменить portablebase fixedname (ломает custom project), добавить container_name/новый network alias/env и recreate proxy (меняет identity и расширяет scope), разрешить массив upstreams/любой web/только health proof (ослабляет guard), менять financial FIFO helper (не относится к DNS binding). Никакого нового SDK/OSS/custom framework не требуется.

Поддержание overlay: reproducibility инструкция указывает exact base SHA и единственную разницу. При изменении базовых headers/XFF/timeouts overlay не переносится молча: hash/diff test требует явного review обеих конфигураций. Исторический rollback возвращает baseline routing, но не считается платёжной приёмкой.
