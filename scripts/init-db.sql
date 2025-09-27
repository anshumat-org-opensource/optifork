-- PostgreSQL initialization script for OptiFork
-- This script sets up extensions and initial configuration

-- Enable commonly used extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Grant necessary privileges to optifork user
GRANT ALL PRIVILEGES ON DATABASE optifork TO optifork;
GRANT ALL PRIVILEGES ON SCHEMA public TO optifork;
GRANT CREATE ON SCHEMA public TO optifork;

-- Show current configuration
SELECT name, setting FROM pg_settings WHERE name IN (
    'shared_buffers',
    'effective_cache_size', 
    'max_connections',
    'shared_preload_libraries'
);