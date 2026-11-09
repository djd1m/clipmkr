# Проектирование
См. features/relocate-clipmkr-to-workspace-vps/03_adr/001-single-writer-relocation.md и 05_architecture.md. Это дельта требований, не отдельный обход feature-adr.

## QA-only исключение для originating qe-primary-01

ADR-002 разрешает отдельный QA web build из source commit11a90+4 reviewed child files `guard-relocation-test-webhook`; runtime delta только adapter/route. QA Caddy сохраняет TEST URI без canonical rewrite и по умолчанию503. Compose/test pin actual resulting image ID; worker/support/production source images unchanged. Authoritative execution: parent06 TASK-3A, cumulative7targets. Parent2/3 native history и original conditions сохраняются; child closure не заменяет parent third settled repair. Production/source/merchant/DNS scope не расширяется.
