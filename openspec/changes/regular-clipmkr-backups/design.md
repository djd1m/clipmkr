# Ledger design

Авторитетные решения/риски/план: `features/regular-clipmkr-backups/03_adr/001-reuse-native-restic-without-global-retention.md`, `05_architecture.md`, `06_implementation_plan.md`.

Тонкий capture hook публикует только свежий проверенный набор. Wrapper под общим flock вызывает native local restic backup и existing immutable rclone copy в primary+secondary. `backup.sh --service --phase run` отвергнут: service filter не распространяется на globalforget. Общие corp scripts/retention/IAM/таймеры не патчатся.

Scoped ideation rework Q-STAGING-01/RISK-01/RISK-02: hook под lock очищает только own staging, максимум2 набора по≤1 GiB и1 после нормального завершения. До bulk capture conservative sizing≤1 GiB и free≥8 GiB на staging/repo FS, перед restic free≥7 GiB; 5 GiB app reserve, actual capture cap enforce. JSONL — source-bound completed prefix с device/inode/S/B/count/hash/times и явным excluded tail; invalid full record/observed rotation/truncation отказывают. Durable uploads/config/spend обязательны; rebuildable stt/llm/video scratch явно excluded. Stable restic tags не включают run ID. Точные алгоритмы и tests — feature-adr05/06; native review closure этим design не утверждается.

Каждый компонент имеет свои временные границы. Извлечение и restore — только в изолированные назначения; workers закрыты до reconciliation. Медиа остаётся в исходном внешнем S3 и переживает только аварию VPS при сохранности S3/доступа; списка ключей недостаточно для object-loss восстановления. Existing escrow attestation не равна реальному retrievaltest.
