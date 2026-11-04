# Реализация согласованного макета: сложность

Статус: draft architecture input; никаких checkpoint/K1/K2/QCSD approvals не утверждается.
Task kind: feature

| Измерение | Балл | Основание |
|---|---:|---|
| Файлы | 3 | Ожидается 20–28 UI/test/runner файлов, точные targets в06 после QCSD. |
| Домены | 3 | Upload lifecycle, clip playback/actions, credit purchase presentation. |
| Интеграции | 1 | Новых интеграций нет. |
| Breaking changes | 1 | API/DB/contracts сохраняются. |
| Новые модели данных | 1 | Новых persisted models нет; выбранный clip — клиентское UI-состояние. |
| Cross-cutting | 3 | Preferences/cache/lifecycle continuity и access/a11y через три сценария. |

Итого12 → расчётный M. **Override L**: redesign трёх связанных экранов, новая selected-player композиция и перенос presentation действующих форм при защищённой upload/payment/media lifecycle. Уровень M занижает риск повторения shell-only поставки. Активны0→1→2→3→3.5→4→5→6→K1/K2→7→8→9. ADR: MADR+Confirmation; QCSD: три независимые обязательные перспективы; fleet L обязателен. Временная оценка не подтверждена; новый дизайн-проект не запускается, исполняется ранее утверждённая композиция.

Автор architecture/plan — сессия /root/clipmkr_qe_primary, requested gpt-6-astra xhigh; будущий coder — gpt-6.1-sol high. Автор не выступает независимым reviewer своего плана. Runtime attestation unavailable. Root владеет настоящими stage/native records.

Исходный base7e75649b7c7b548245e6e5a5b005fe2d9ed254cc, worktree /tmp/clipmkr-mockup-realization-20261104. Learning: root сообщил actual recall→teach→recall lesson teach:820581d93a5cf7df; самостоятельный Node22 stage recall выполнен: query mockup, exit0, один hit teach:820581d93a5cf7df. Duplicate teach для того же события не создаётся.
