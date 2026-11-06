# Независимая повторная проверка R4

06.11.2026. Три исходные независимые сессии `gpt-6-astra xhigh`; автор `gpt-6.1-sol high`. Это originating verification прежних условий, а не замена новыми проверяющими. Requested модели зафиксированы запуском; serving identity независимо не аттестована.

| Роль | Собственные исходные условия | Итог | SHA-256 полного частного отчёта |
|---|---|---|---|
| qe-primary | QE-PRIMARY-01…05 | clean; own implementationVerified | `791b7b571c5b3012a51fdac6d7ea8108d168d84cd26a2f0ba92d74d12edcdde3` |
| qe-security | QESEC-01…03, QESEC-R2-01 | clean; own implementationVerified | `ddfc2d38511e908f9f91944a456bb8a596e4ff6433d5fb49c864c2aff60a8b6d` |
| qe-architecture | QEARCH-01…04 | clean; own implementationVerified | `01da5911f0be714fbd7d17f7c326e0a9afb98714c94dc4874378028886edf21e` |

Каждый выполнил собственные40 operational и2 portable tests на точных current bytes с собственными profiles/output. Primary:11 targeted groups и7 guard mutations; security:14 focused отказов и7 guard mutations; architecture:9 own-condition и20 boundary/pending/namespace scenarios,6 mutation types/7 executions. Отрицательные мутации — настоящие behavioral failures на отдельных faulty copies; прежний R3 source вновь воспроизводит дефект, current source даёт0 business callbacks. Авторские результаты не приняты за независимое доказательство.

Перепроверены11 manifest hashes и все13 исходных condition objects. Они сохранены; каждый owner подтвердил свои условия на current revision. Все три whole-delta verification — structural/true, newRisks.conditions=[]; чужие условия не дублировались. Root проверил terminal exits и неизменность условий перед actual evaluate.

Реальны только owned temp files/fd/fsync/flock/fork/SIGKILL и captured functions. Docker/Caddy/HTTP/control adapters SIMULATED. Отказы профиля не названы skip. Ошибки собственных тестовых harness сохранены и не засчитаны за успешные отрицательные мутации.

Никаких SSH, live Docker/Caddy, provider, DB, sessions, browser, оплаты или route apply этими reviewers не выполнялось. Runtime bridge и media runner не включены в эту квитанцию. Это clean code/offline QE, не полный CJM и не runtime GO. Полные raw остаются вне Git.
