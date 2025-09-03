#!/bin/bash
set -e

# Grant full privileges to postgres user on public schema
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
    ALTER SCHEMA public OWNER TO postgres;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
    GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;
EOSQL

# Configure PostgreSQL authentication for external connections
echo "# Custom configuration for external connections" >> /var/lib/postgresql/data/pg_hba.conf
echo "host all all 0.0.0.0/0 trust" >> /var/lib/postgresql/data/pg_hba.conf
echo "host all all ::/0 trust" >> /var/lib/postgresql/data/pg_hba.conf

# Configure PostgreSQL to listen on all addresses
echo "listen_addresses = '*'" >> /var/lib/postgresql/data/postgresql.conf