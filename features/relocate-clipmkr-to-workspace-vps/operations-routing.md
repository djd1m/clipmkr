# Маршруты, DNS, TLS и preview переноса

Срез 09.11.2026, только чтение. Приложения, DNS, Caddy, платежи, почта и пользовательские сессии не менялись; webhook payload не отправлялся. Это инвентаризация и предложения, не разрешение runtime. Закрытые доказательства 0700/0600: `/root/.config/clipmkr/relocate-workspace-20261109/route-inventory/`, индекс `manifest.json`.

## Фактический источник

Источник SSH `clipmkr-site-test` из `/root/.config/clipmkr/release-parity-20261103/site-test.sshconfig`, IP `194.85.249.105`. Общий TLS edge `ai-hub-tls-proxy`, Caddy 2.10, bind `/home/dz-projects-2026/edge/Caddyfile` → `/etc/caddy/Caddyfile:ro`; публичные TCP80/443 и UDP443. Edge в `talk-ai-public` (`172.18.0.9`) и чужой proofwall-сети. Его загруженный admin JSON **точно равен** адаптации фактического mounted Caddyfile; другие проекты присутствуют и должны сохраниться.

| Вход | Фактическая цепочка |
|---|---|
| `clipmkr.ru`, обычные пути, включая `/api/webhooks/yookassa` | TLS edge → `n5-clipmaker-proxy-1:80` → `n5-clipmaker-web-1:3000` |
| **`clipmkr.ru/api/webhooks/yookassa-test`** | **rewrite `/api/webhooks/yookassa` → `n5-clipmaker-proxy-1:80` → основной `n5-clipmaker-web-1:3000`** |
| `www.clipmkr.ru` | 308 → `https://clipmkr.ru{uri}` |
| `n5.clipmkr.ru` | TLS edge → отдельный `n5-referral-paytest-20261028:3000` |
| `support.clipmkr.ru` | TLS edge → `n5-helpdesk-proxy-1:8080` → `app:9000` (`n5-helpdesk-app-1`) |
| `n5-help.194.85.249.105.sslip.io` | дополнительное имя той же поддержки |
| `clipmaker.aicoding.space`, `n5.194.85.249.105.sslip.io` | дополнительное имя основного project proxy |

**Коррекция предположения плана:** тестовый путь основного домена сейчас НЕ направлен в legacy TEST backend. Сохранение отдельной legacy БД необходимо для отдельного `n5.clipmkr.ru`; нельзя считать его владельцем callback `/yookassa-test` по старой документации. Инвентаризация доказывает конфигурацию маршрутизации, но не текущую настройку адреса уведомлений в кабинете провайдера и не факт обработки конкретного платежа. Реальные уведомления не отправлялись. Изменять эту схему в рамках переноса без отдельного решения нельзя.

Main project proxy: `n5-clipmaker-proxy-1` (`172.18.0.12` в `talk-ai-public`, `172.22.0.9` в `n5-clipmaker_default`), bind host `127.0.0.1:4181` → container80; mounted source `/home/dz-projects-2026/2026-AUG-PU-Projects/2026-AUG-PU-Projects/projects/05-podcast-clips-opus/proxy/Caddyfile`. Loaded JSON **точно равен** адаптации mounted file. Единственный upstream — `n5-clipmaker-web-1:3000` (`172.22.0.4`), с read timeout360s/write timeout60s. Для `/c/*`, `/g/*` — Cache-Control no-store; сохранены HSTS, nosniff и Referrer-Policy. Web не имеет публичного hostport.

Legacy backend — две сети `n5-clipmaker-test_default` и `talk-ai-public`; DNS alias `web` также существует, поэтому использовать точное имя контейнера. Его origin `https://n5.clipmkr.ru`, mail disabled, checkout false. Нельзя смешивать отдельную БД/Redis с основной копией.

Source proxy overlay `deploy/source-proxy.compose.yml` сохраняется для будущих source-deploy. Текущий warm bind всё ещё `proxy/Caddyfile`; наличие overlay в Git не доказывает его текущий mount. Для source применимы guards/hashes из `docs/REPRODUCE.md`; на новую цель этот override механически не переносить.

## XFF и origin

Main web: `N5_TRUSTED_PROXY_HOPS=1`, `N5_PUBLIC_ORIGIN=https://clipmkr.ru`. Внутренний proxy доверяет `10/8`, `172.16/12`, `192.168/16`, `127/8`. Обычный внешний маршрут не задаёт свой XFF; внутренний proxy дополняет цепочку. TEST-путь и host `n5.clipmkr.ru` во внешнем edge явно задают `X-Forwarded-For: {remote.host}, {local.host}`.

Код `clientIp` выбирает `chain[length-1-trustedProxyHops]`. Из конфигурации следует риск: для TEST-пути после добавления внутреннего proxy цепь может быть `client, outer-local, outer-remote`, и hop1 выберет proxy. **Это вывод по config/code, не наблюдение на проводе**; ни packet capture, ни webhook запрос для доказательства не выполнялся. До GO проверить действующие unit/contract tests и безопасный контролируемый заголовочный probe в согласованном QA. Не менять доверие по числу контейнеров: требуется точная цепочка конкретного ingress, включая old-edge relay.

Auth cookie: `__Host-n5_session`, Path=/, HttpOnly, Secure, SameSite=Lax, без Domain. Эти строки проверены также в compiled `.next/server` работающего исходного web. Auth отвергает отличный Origin; исходники дают TTL7дней. Сохранение имени `clipmkr.ru`, SESSION_SECRET и session DB нужно для непрерывности; валидный TLS сам по себе не доказывает сохранность входа. IP-origin — отдельная область cookies. Секреты в отчёт не включены.

## Полный маршрут поддержки

Outer edge задаёт `X-Real-IP={remote.host}`. Helpdesk proxy задаёт `X-Client-IP={X-Real-IP}`, затем передаёт `app:9000`. Host binding proxy `127.0.0.1:4191` →8080; сети `talk-ai-public` (`172.18.0.15`) и `n5-helpdesk-edge` (`192.168.160.3`). Caddyfile встроен в образ, bind отсутствует. Admin2019 выключен: loaded API недоступен. `/config/caddy/autosave.json` равен адаптации файла и процесс запускается с этим файлом; **это не полная проверка loaded API parity**.

Libredesk v2.9.0: конфигурация `/libredesk/config.toml` из отдельного source private bind `.env.n5-helpdesk-private/config.toml`; uploads volume `n5-helpdesk-uploads` → `/libredesk/uploads`. Сервер9000, secure cookies включены, local login включён, filesystem uploads, собственный Redis DB0 и собственная PostgreSQL БД. Main web: support mode libredesk, base `https://support.clipmkr.ru`, identified=false, JWT secret отсутствует. Поэтому нельзя обещать существующую identified identity mapping: нужны перенос фактических inbox/settings/identity данных и проверка текущего anonymous поведения. Приватный config содержит encryption key и пароли; вывод не выполнялся.

Полный перенос требует целевых Libredesk app/proxy, отдельной восстановленной БД, Redis и uploads/config с прежним encryption key, затем целевого маршрута `support.clipmkr.ru` и проверки обращений/ответов/вложений/административного входа. Оставшийся source-only helpdesk означает незавершённый перенос. Целевых support bindings сейчас нет; точные имена и порты необходимо назначить в reviewed compose overlay.

## Действующая цель и чужие маршруты

Общий Caddy `n8-interior-local-proxy-1`, bind `/home/2026-AUG-PU-Projects/projects/08-interior-ai-redesign/config/public/Caddyfile` → `/etc/caddy/Caddyfile:ro`; persistent volumes `n8-interior-local_tls-data`, `n8-interior-local_tls-config`. TCP80/443 опубликованы. Единственная proxy network `n8-interior-local_edge`, subnet172.29.8.0/24, gateway172.29.8.1, Caddy172.29.8.2; второй участник `n8-interior-local-web-1`, alias **web**. Loaded JSON **точно равен** адаптации файла.

| Сохранить вход | Действующий upstream |
|---|---|
| `openhands.77.83.87.178.sslip.io` | `172.29.8.1:5800` |
| `shino.77.83.87.178.sslip.io` | `172.29.8.1:5189` |
| `ohe.77.83.87.178.sslip.io` | `172.29.8.1:5810`, сохранён особый `/review/*` rewrite |
| `n8.77.83.87.178.sslip.io` | **`web:3000`**, сохранён X-N8-Client-IP |
| `77.83.87.178` | статический HTTP200, приложение сюда пока не подключено |

Текущий `clipmkr-stage-20261028-web-1` имеет только внутреннюю сеть project;3000 не опубликован. **Не добавлять Compose-service `web` в N8 edge с alias web**: это сделает существующий N8 upstream неоднозначным. Предпочтительный reuse — уже используемый общим Caddy host-gateway pattern: Caddy → `172.29.8.1:<выделенный порт>` → Clipmkr web/project ingress; host bind только на gateway/loopback, проверка firewall и `ss` до выбора порта. Второй вариант — отдельная Clipmkr ingress network только для общего Caddy и точного web имени, без alias collision. Оба требуют согласованного overlay и K1/K2, сейчас не применены. Не использовать непроверенный числовой IP контейнера как постоянный upstream.

## DNS: авторитетный срез

Ответы получены напрямую `dig @ns1.yandexcloud.net +norecurse`; NS домена ns1/ns2.yandexcloud.net.

| Имя | A | TTL | AAAA/CNAME |
|---|---|---:|---|
| clipmkr.ru |194.85.249.105|300|нет|
| www.clipmkr.ru |194.85.249.105|300|нет|
| support.clipmkr.ru |194.85.249.105|600|нет|
| n5.clipmkr.ru |194.85.249.105|600|нет|

Ограниченный поиск metadata в `/root/.config`, `/root/.local/share` обеих машин и верхнем уровне workspace не нашёл yc/DNS-профиля; `yc` отсутствует. Это не доказательство отсутствия доступа у владельца. Профиль управления DNS и права на нужную zone **не установлены**; ключи не искались по содержимому и DNS API не вызывался. Никакие записи и TTL не менялись. `c.clipmkr.ru` вне этого переноса.

## TLS и безопасная подготовка preview до DNS

Публичные сертификаты проверены через TLS handshake без HTTP запроса приложения; chain verification=0. `clipmkr.ru`: SAN clipmkr.ru, LE YE2, 26.09–25.12.2026. `support.clipmkr.ru`: SAN support.clipmkr.ru, LE YE1,28.10.2026–26.01.2027. IP77.83.87.178: SAN IP77.83.87.178, LE YE2 shortlived,07.11.2026 19:18:26–14.11.2026 11:18:25 UTC. Target config сохраняет default_sni77.83.87.178. Эти сроки описывают данный срез, не готовность будущего cutover/renewal.

Source scoped certificate/key находятся в `/var/lib/docker/volumes/edge_ai-hub-caddy-data/_data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/<hostname>/<hostname>.{crt,key}` для main/www/support/n5. Все600; соответствие каждой пары public key проверено в памяти. **Ключи не копировались и не выводились.** Не переносить весь Caddy data volume, ACME accounts, чужие сертификаты или locks.

Конкретный будущий способ: после reviewed GO скопировать только `.crt` и `.key` main/www/support (n5 только при переносе этого host) по pinned SSH в scoped каталог0700 вне Git, файлы0600. Доступный Caddy путь уже внутри persistent `/data`, например `/data/clipmkr-preview-tls/<host>.{crt,key}`. Для каждого соответствующего host в candidate указать `tls <crt> <key>`; это поддерживаемая ручная загрузка сертификатов. Существующий bind Caddyfile должен быть сохранён при применении, нужна file/loaded backup и сравнение всех чужих маршрутов. Пока файлы в persistent volume/конфиг не писались, adapt/validate/reload нового candidate не выполнялись. Ручные сертификаты автоматически не продлеваются: после DNS нужен явный переход к управляемому Caddy TLS и проверка renewal. [Документация tls](https://caddyserver.com/docs/caddyfile/directives/tls).

DNS-01 мог бы выпускать до A cutover, однако stock target Caddy не содержит `dns.providers.*`, DNS профиль неизвестен. Пересборка общего Caddy и установка провайдера для этой репетиции менее безопасны, чем scoped reuse действующего сертификата. HTTP/TLS-ALPN challenge до DNS по-прежнему приходит на старый IP; включение нового site в автоматический ACME не доказывает выпуска на цели.

Два проверочных origin:

1. **Ручной QA по IP:** существующий валидный IP TLS позволяет после gates подключить изолированный QA к IP route и задать QA `N5_PUBLIC_ORIGIN=https://77.83.87.178`; S3 CORS для этого origin ранее подготовлен, его требуется перепроверить. IP-заглушка сейчас не является приложением. Эта проверка не подтверждает перенос cookies основного домена и полного support host.
2. **Полный основной hostname до публичного DNS:** отдельный браузерный профиль/Playwright Chromium с `--host-resolver-rules=MAP clipmkr.ru 77.83.87.178,MAP www.clipmkr.ru 77.83.87.178,MAP support.clipmkr.ru 77.83.87.178` и scoped host certificates. В QA остаётся `N5_PUBLIC_ORIGIN=https://clipmkr.ru`. Это сохраняет настоящий URL/Origin/SNI/cookie namespace без изменения DNS. Записать remote address/сертификат и отсутствие certificate bypass. Проверки теперь NOT RUN.

Будущие read-only проверки после подготовки целевых routes/certificates:

```bash
curl --resolve clipmkr.ru:443:77.83.87.178 --fail --silent --show-error --output /dev/null --write-out '%{remote_ip} %{http_code} %{ssl_verify_result}\n' https://clipmkr.ru/health
curl --resolve support.clipmkr.ru:443:77.83.87.178 --silent --show-error --output /dev/null --write-out '%{remote_ip} %{http_code} %{ssl_verify_result}\n' https://support.clipmkr.ru/
```

Не использовать `-k`, browser ignoreHTTPSErrors и простое Host-header поверх IP URL как доказательство настоящего origin. Browser resolve действует только в браузере: ЮKassa, Resend и другие внешние callbacks всё ещё используют public DNS. Для настоящего QA TEST callback до DNS требуется отдельно согласованный изолированный provider webhook endpoint/shop либо scoped relay на источнике; такой endpoint/право/config ещё **не установлены**, этот отчёт не разрешает менять текущий shop callback. Собственный replay не считать доказательством источника провайдера.

## Почта: фактические флаги и reuse

Source web: mail mode=resend, key/from заданы; SMTP host/user/password/port/secure пусты, test capture пуст. Ключ и sender в памяти точно совпали с существующим private `/root/.config/clipmkr/mail/resend.env`600. Имеется также `/root/.config/clipmkr/cloudru-working-release-20261105/mail-authorized-source.private.json`600. Значения/адреса не публикуются. Target existing web: mail disabled, Resend key/from пусты. Никаких писем, API-проверок домена или тестов сброса не было. Доставка и DNS-верификация sender в Resend этим срезом не доказаны; переиспользовать source профиль, не выставлять SMTP по догадке.

## Следующие действия и открытые факты

До runtime: отразить фактическую коррекцию TEST route в требованиях/плане; выбрать ingress без aliasweb; оформить целевые main/support/legacy bindings, writer isolation и точный XFF контракт; подготовить scoped TLS вне Git; получить настоящие K1/K2. До public DNS — hostname preview и IP QA с записанными ограничениями, независимая проверка, затем ручная приёмка. До DNS также установить права zone и явный перечень имён переключения. После отдельной команды владельца — только согласованный cutover с единым writer и без fallback на старую БД. TLS/source key metadata, наличие backup и parity файла не заменяют эти gates.

Не установлены: актуальный provider webhook configuration; реальный XFF на каждом будущем relay; доступ DNS API; точные support app settings/inbox/email channel и целевой compose; будущие hostport/firewall; целевая успешная выдача/ручная загрузка/renewal TLS; браузерные cookies/CORS/callback и фактическая доставка почты. Никакой из этих пунктов не объявлен выполненным.
