# Допуск public-entry-cabinet: протокол фактических действий

## Авторизация владельца

05.11.2026 после показа презентации и вопроса о согласовании конкретного макета
владелец ответил: **«отлично! делай по этому макету»**.

Согласован HTML `docs/design/2026-11-05-public-entry-mockup.html` SHA256
`23857448fa59c1c1d8ea34cd4b6a72a3099f07108498b354b2b7a74617f43a80`, показанный
в презентации commit`bb178c42cb570103e40cf10f8bad37d73128a0d9`.
Это разрешение реализовать данный макет с существующими действующими контрактами.
Владелец не объявляется читателем документов, написанных после его сообщения.
Технические решения в согласованной границе выполняются по ранее делегированному
автономному режиму; повторное согласование того же макета не запрашивается.

Тестовый web — `clipmkr.ru`,194.85.249.105, проектn5-clipmaker. Исходники и инструменты
на dev77.83.87.178, основной каталог`/home/clipmkr`, execution worktree
`/tmp/clipmkr-public-entry-20261105`. Cloud.ru и DNS не изменять до ручной приёмки.

## Восстановление закреплённого инструментария

Простая ссылка на node_modules соседнего worktree оказалась непригодна для
process:install: git apply отказал в применении проектного patch через symlink.
Это наблюдённый FAIL установки, не успешный gate. Удалена только ссылка, выполнены
собственный npm ci по lockfile, rebuild better-sqlite3 под Node22 и штатный
npm run process:install. Фактический результат: установлен135файлов/9skills,
регрессионные проверки K1/K2совместимости2/2PASS. Это ещё не K1/K2плана этой фичи.

Actual dz recall общего store`/home/clipmkr/.dz` перед проектированием вернул уроки
публичного CTA/recovery, соответствия реальному макету и начального фокуса диалога.
Доказательства и команды сохраняются вне Git в закрытом каталоге
`public-entry-cabinet-20261105`.

## Наблюдённый baseline

До кода выполнены auth, partner-landing, theme, responsive-check, landing-demo и
credit-packages-ui unit suites:6файлов/84тестаPASS, фактический exit0. Это исходный
baseline, не результат реализации нового макета. Настоящий маршрут входа и семантика
новой формы будут проверяться после кода отдельно.

Поддерживаемый dz feature-adr-checkpoint stage router записан после готового00:
tierM/score10, inputHash`c97738e318b6f16cf8a92a0c513c6c263c58cc500547112f126439fe53c91c6c`,
actualoktrue, witnessed00. Этот документ не создаёт и не подменяет native receipt.

## Границы независимости

Автор00–05 — `gpt-6-astra xhigh`. Три QCSD роли также Astra в отдельных сессиях:
они независимы по контексту и не называются cross-model к автору документов.
Перед кодом требуется отдельный фактический cross-model design/plan challenge
`gpt-6.1-terra xhigh`; один лишь clean QCSD не заменяет его. Автор кода —
`gpt-6.1-sol high`, последующее независимое QE — свежая `gpt-6-astra xhigh`.
Временное owner-exception обосновано правилом владельца в AGENTS/review-policy:
Claude недоступен, используется cross-model. Запрошенные модели фиксируются;
независимая аттестация фактической backend-модели недоступна.

## Фактический переход к реализации

Свежая Terra-сессия выполнила независимый содержательный review и собственные K1/K2:
GO для оформления design/plan checkpoints, блокирующих находок0. Отчёт03.6 SHA256
`bcdd2f05c4f87818400b70d4b81d8eedc1920bd98a2a5ebf982d864a261bc3f5`.
Это и есть дополнительная cross-model проверка документов автора Astra; три QCSD
роли ей не переименовывались.

Окончательный06 SHA256`d209d4f429a1646b8710076f1663235f9344e0fed5c888786c2bdf33dab4cacc`.
Координатор отдельно наблюдал exit0 K1:277sourcefiles, имяpublic-entry-cabinet.test FREE.
Tests не объявляются полной nativeK1coverage: дополнительный tracked filename inventory
не выявил совпадения нового basename. Re-export aliases остаются обязанностью build.
InstalledK2:exit0,11targets/10existing/0twins, все12requirementIDs покрыты,
0failures/0warnings; C4 явноSKIP, отдельный acid corpus не объявлен.

Свежий source admission:admitted, reasons=[], digest
`afa094b2fa19a856916b32201a4934e9fecd18fbad40320db59a261f576ebd30`.
Полный actual coder context:complete, digest
`0a478ab64f891628d86b18cdcb79f559013ce5552f8ac09a9b560bdd2f5c5ea4`,
literal promptBlock40106UTF-8bytes. Перед делегированием он измеряется заново и
буквально включается в настоящий prompt автора, а не подменяется списком ссылок.

После реальных проверок поддерживаемые dz-команды записали design и plan:
oktrue, exit0, witnesseddesign=01/ADR/03.5/05/03.6, witnessedplan=06/03.6.
Plan inputHash совпал с указанным coder context digest. Аргументы, stdout/stderr и
коды возврата сохранены приватно. Этот текст сам не создаёт успешной квитанции.

Для browser-проверок используется установленный совместимый hostPlaywright/Vitest
по тем же исходным файлам и vitest.browser.config; дополнительный app/test stack
для этой UI-дельты не создаётся. Исходный Docker transport старых scripts не
объявляется проверенным, если выполнен только прямой host-эквивалент.

Реализация и QE этим допуском ещё не подтверждены. Перед кодом baseline сохраняется
однократно; существующая ideation lineage не заменяется. Новая проверка после кода
будет отличать actualNext, mounted/mocked transport, provider/mail и ручную приёмку.
