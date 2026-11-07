# Дизайн — кандидат

## Context
OpenSpec хранит requirement delta, feature-adr — исполнение. Scope S: два существующих repo files, один локальный gate.

## Goals / Non-Goals
Покрыть tests и existing private source root; ошибки/неполноту не превращать в FREE. Нет нового auth/network/financial поведения, scanner framework, registry, worker/IPC или публичного API.

## Decisions
ADR-001: existing synchronous collector + monotonic checks, bounded static Python AST child, unchanged pure decision. Один --source-root; дубли/пустое/неизвестные args отвергаются. JSON сохраняет outcome/exit/results/reason и добавляет coverage evidence.

## Risks / Trade-offs
Sync filesystem syscall не прерывается внутри; late return отвергается, внешнее ограничение всего вызова — supervisor. Python AST не доказывает dynamic imports/assignments. Default roots сохраняют JS/TS policy: остальные языки показаны как exclusions. Extra root поддерживает JS/TS/PY; unsupported code/unrecognized candidate блокирует aggregate result. Это declared-language coverage, не доказательство всех языков или всего диска. Candidate patch тестируется в отдельной копии CLI; shared install — после принятия.
