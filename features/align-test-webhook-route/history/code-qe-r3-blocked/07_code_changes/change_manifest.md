# Callback executor — author repair R3

**CODE_READY_FOR_REVIEW; originating closure и runtime GO отсутствуют.** R2 не объявляется принятым: QE-PRIMARY-01 и QESEC-R2-01 требуют независимой повторной проверки.

В private `revalidate` добавлены3 строки: отзыв prior process-local confirmation первым действием и final held-inode/candidate-bytes checks после H/control, до durable completion. Launcher, остальные executor boundaries и прежняя operational fixture неизменны. Measured test обновляет binding и добавляет actual fd/process regression fixtures; первые24 tests сохранены.

| Артефакт | SHA-256 |
|---|---|
| Executor / entire remote payload | `976223c60ee9b175d7592db4faed81e5cd58a4d23e973d1ab173b35c6c0e626e` |
| Launcher, unchanged | `b9b8ab7b8965d518f1dc4849d3dea0903696dc13200efbaa803e320cdff25892` |
| Measured test | `8463703701e53efbfe17a534cff4ef91d543a44291f38aa31cf05c70e21bb0a5` |
| Base fixture, unchanged | `e88d7e58308ff7eb6cd272c84279773eb34f0af4d6d3adf1bd45090b1b15bd7e` |
| Captured composite fixture program | `da884857c82d6627b279882a26ee8f4e349db8d466ae0baa7bdd8ab8cad8ede1` |

Actual RED на R2 → GREEN на R3 для stale admission после health/bytes/Uncontrolled/binding failures и final drift после SIGKILL. GREEN проверяет12 комбинаций H/control × bytes/inode × same/fresh/final-kill, direct fork/fresh-capture и success after prior failure. Это локальные synthetic callbacks; внешние Docker/Caddy/HTTP/control observations SIMULATED.

Финальные результаты:30 explicit operational tests PASS,58 portable/related tests PASS,0 skipped; lint/typecheck exit0;13 guard mutants RED и10 exact-source groups GREEN;7 invalid profile cases FAIL до fixture output. Portable run не обращается к private inputs и не заменяет mandatory explicit profile.

R2 source/test/fixture/manifests/raw до изменения архивированы побайтно в собственном `R/callback-code-author/repair-r3/history/r2/`; native history не менялась. Полные hashes, команды/exits/raw evidence и ограничения — `R/callback-code-author/repair-r3/repair-r3-result.private.md` и [author manifest](author-manifest.json). Первоначальные top-level07 копии, root-source-binding и нормативные06/01/05/ADR/03.5/OpenSpec/RO owners/fragment сохранены.

Native prepare/reset/evaluate/begin-repair/checkpoint и обход ceiling3 не выполнялись. Coordinator делает genuine evaluate/begin-repair в существующей истории после готовых артефактов. SSH/network/Docker/provider/session/payment/jobs/route apply/Caddy/DB/Cloud/DNS/Git отсутствуют; actual runtime/CJM NOT VERIFIED. Независимое закрытие остаётся reviewers. Расход этапа/served model не аттестованы, cumulative usage не использован.

Status: completed
