# Однострочная совместимость канонического test typecheck

Исходный согласованный bundle был применён точно. Реальный canonical `npm run typecheck` завершился exit2: tests/browser/clip-layout.test.ts:444 TS2488, поскольку tests tsconfig не объявляет DOM.Iterable. Browser UI на этом снимке34PASS/1excluded; этот факт не означает прохождение typecheck.

Root разрешил минимальное исправление в том же новом тесте: `[...document.querySelectorAll('video')]` → `Array.from(document.querySelectorAll('video'))`. Предикат readyState>=2/videoWidth>0 и продуктовый код прежние. Дополнительные пути/dependencies/lib настройки не меняются. Это исправление обязательного gate в прежних двух путях, не новая feature и не новый независимый цикл.

Новый SHA256 test: 6e0081cafec416dd71c659d7c21cdbcca97992f913975cfe4b4c7d0ef85d3e09. Preview прежний d8e41f14f688a1275fe3e92e8e07f03924cd50420f2f3011bfff2041050d5cdd. Новый target159 bfa1b6737ddec301431b55106063c4a31a435064096e544ce6673534734b3075; остальные157 Source paths и old native3 история неизменны.

Перед изменением повторены actual admission/context и полностью прочитан literal block. После freeze повторяются только3 затронутые browser-регрессии и canonical typecheck, затем первый build. Полный UI34 не повторяется: прежние31 scenarios и product byte-identical. Единственный разрешённый дополнительный независимый QE оценивает уже этот актуальный snapshot.

Old failure, исходный approved bundle, exact applied snapshot, однострочный amendment diff, текущий manifest и реальные проверки сохраняются раздельно в private evidence. Ни старый RED/candidate, ни skipped native integration не подменяют факты новых команд.
