# Zephyr migration history

- `0000_eminent_slayback.sql` is the reconstructed pre-sales baseline for a fresh isolated database.
- `0001_secure_sales.sql` is additive and was applied to the provisioned database by `scripts/safe-migration.ts` after a consistent private backup, copy rehearsal, integrity/foreign-key checks and record-count comparison.
- The Drizzle snapshots represent the baseline and resulting schema; fresh-db tests run both SQL files in order.

**Do not run ordinary `db:migrate` against the existing provisioned database yet.** Its schema originally came from `db:push`, and its Drizzle migration journal has not been baselined. Running the baseline there would attempt to recreate existing tables. Establish the deployed migration journal deliberately before the next migration. Never use a destructive `db:push` prompt to resolve history.

The private pre-migration snapshot is outside this app at `/home/user/.zephyr-backups/` and is not part of any delivered artifact. Restoring it onto the provisioned database has not been attempted; doing so requires a maintenance window and explicit approval. Only local restore/integrity checks were exercised.