-- Online maintenance completed separately on 2026-11-08:
-- REINDEX DATABASE CONCURRENTLY postgres;
-- The command must run outside a transaction, before refreshing the recorded version.
ALTER DATABASE postgres REFRESH COLLATION VERSION;
