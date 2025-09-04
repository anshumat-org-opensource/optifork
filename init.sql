-- Optional PostgreSQL initialization script
-- This script runs when PostgreSQL container starts for the first time

-- Create database (already created by POSTGRES_DB env var)
-- CREATE DATABASE IF NOT EXISTS optifork;

-- Grant permissions to user (already handled by POSTGRES_USER env var)
-- GRANT ALL PRIVILEGES ON DATABASE optifork TO optifork;

-- You can add any initial data here if needed
-- INSERT INTO feature_flags (name, description, rollout) VALUES 
-- ('welcome_banner', 'Show welcome banner to new users', 0.1);