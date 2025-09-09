import snowflake.connector
import json
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from models import FeatureFlag, FlagExposure, SnowflakeConfig
from experiments.models import Experiment, Variant, UserAssignment, ExposureLog
from db import get_sync_db

logger = logging.getLogger(__name__)

class SnowflakeConnector:
    def __init__(self):
        self.connection = None
        self.config = {}
        self.db_session = None
    
    def configure(self, config: Dict[str, str]):
        """Configure Snowflake connection parameters"""
        required_fields = ['account', 'user', 'password', 'warehouse', 'database', 'schema']
        for field in required_fields:
            if field not in config:
                raise ValueError(f"Missing required Snowflake config field: {field}")
        
        self.config = config
    
    async def load_saved_config(self, db: AsyncSession):
        """Load saved Snowflake configuration from database"""
        try:
            query = select(SnowflakeConfig).where(SnowflakeConfig.is_active == "true").order_by(SnowflakeConfig.updated_at.desc())
            result = await db.execute(query)
            saved_config = result.scalars().first()
            
            if saved_config:
                self.config = {
                    'account': saved_config.account,
                    'user': saved_config.user,
                    'password': saved_config.password,
                    'warehouse': saved_config.warehouse,
                    'database': saved_config.database,
                    'schema': saved_config.schema
                }
                logger.info("Loaded saved Snowflake configuration")
                return True
            else:
                logger.info("No saved Snowflake configuration found")
                return False
        except Exception as e:
            logger.error(f"Failed to load saved Snowflake config: {str(e)}")
            return False
    
    async def save_config(self, config: Dict[str, str], db: AsyncSession):
        """Save Snowflake configuration to database"""
        try:
            # Deactivate all existing configs
            await db.execute(
                text("UPDATE snowflake_configs SET is_active = 'false'")
            )
            
            # Create new config
            new_config = SnowflakeConfig(
                account=config['account'],
                user=config['user'], 
                password=config['password'],
                warehouse=config['warehouse'],
                database=config['database'],
                schema=config['schema'],
                is_active="true"
            )
            
            db.add(new_config)
            await db.commit()
            logger.info("Saved Snowflake configuration to database")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save Snowflake config: {str(e)}")
            await db.rollback()
            return False
    
    def connect(self):
        """Establish connection to Snowflake"""
        if not self.config:
            raise ValueError("Snowflake not configured. Call configure() first.")
        
        try:
            logger.info(f"Attempting to connect to Snowflake account: {self.config['account']}")
            logger.info(f"Connection parameters - User: {self.config['user']}, Warehouse: {self.config['warehouse']}, Database: {self.config['database']}, Schema: {self.config['schema']}")
            
            self.connection = snowflake.connector.connect(
                user=self.config['user'],
                password=self.config['password'],
                account=self.config['account'],
                warehouse=self.config['warehouse'],
                database=self.config['database'],
                schema=self.config['schema'],
                login_timeout=60,  # 60 seconds timeout
                network_timeout=60,
                client_session_keep_alive=True
            )
            logger.info("Successfully connected to Snowflake")
            return True
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to connect to Snowflake: {error_msg}")
            
            # Provide more detailed error information
            if "250001" in error_msg:
                logger.error("ERROR 250001: Connection timeout - This usually means:")
                logger.error("1. Account identifier format is incorrect (should be: account-name.region.snowflakecomputing.com)")
                logger.error("2. Network connectivity issues")
                logger.error("3. Firewall blocking Snowflake connections")
                logger.error(f"Attempted account: {self.config['account']}")
            elif "251001" in error_msg:
                logger.error("ERROR 251001: Authentication failed - Invalid username or password")
            elif "250003" in error_msg:
                logger.error("ERROR 250003: Invalid account identifier format")
                logger.error("Account should be in format: account-identifier.snowflakecomputing.com")
            elif "250004" in error_msg:
                logger.error("ERROR 250004: Invalid warehouse, database, or schema name")
            else:
                logger.error(f"Unexpected Snowflake error: {error_msg}")
            
            return False
    
    def disconnect(self):
        """Close Snowflake connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
    
    def create_tables(self):
        """Create required tables in Snowflake if they don't exist"""
        if not self.connection:
            raise ValueError("Not connected to Snowflake")
        
        cursor = self.connection.cursor()
        
        # Feature Flags table
        feature_flags_table = """
        CREATE TABLE IF NOT EXISTS optifork_feature_flags (
            id INTEGER,
            name VARCHAR(255),
            description TEXT,
            is_active BOOLEAN,
            rollout_percentage INTEGER,
            targeting_rules TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP,
            exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # Flag Exposures table
        exposures_table = """
        CREATE TABLE IF NOT EXISTS optifork_flag_exposures (
            id INTEGER,
            flag_id INTEGER,
            flag_name VARCHAR(255),
            user_id VARCHAR(255),
            enabled BOOLEAN,
            timestamp TIMESTAMP,
            exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # Experiments table
        experiments_table = """
        CREATE TABLE IF NOT EXISTS optifork_experiments (
            id INTEGER,
            name VARCHAR(255),
            description TEXT,
            status VARCHAR(50),
            flag_id INTEGER,
            created_at TIMESTAMP,
            updated_at TIMESTAMP,
            exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # Variants table
        variants_table = """
        CREATE TABLE IF NOT EXISTS optifork_variants (
            id INTEGER,
            experiment_id INTEGER,
            name VARCHAR(255),
            traffic_split FLOAT,
            created_at TIMESTAMP,
            exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # User assignments table
        user_assignments_table = """
        CREATE TABLE IF NOT EXISTS optifork_user_assignments (
            id INTEGER,
            experiment_id INTEGER,
            variant_id INTEGER,
            user_id VARCHAR(255),
            assigned_at TIMESTAMP,
            exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # Experiment exposures table
        experiment_exposures_table = """
        CREATE TABLE IF NOT EXISTS optifork_experiment_exposures (
            id INTEGER,
            experiment_id INTEGER,
            variant_id INTEGER,
            user_id VARCHAR(255),
            timestamp TIMESTAMP,
            exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # Export logs table
        export_logs_table = """
        CREATE TABLE IF NOT EXISTS optifork_export_logs (
            id INTEGER IDENTITY,
            export_type VARCHAR(50),
            records_exported INTEGER,
            export_status VARCHAR(50),
            error_message TEXT,
            exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        try:
            cursor.execute(feature_flags_table)
            cursor.execute(exposures_table)
            cursor.execute(experiments_table)
            cursor.execute(variants_table)
            cursor.execute(user_assignments_table)
            cursor.execute(experiment_exposures_table)
            cursor.execute(export_logs_table)
            logger.info("Successfully created/verified Snowflake tables")
            return True
        except Exception as e:
            logger.error(f"Failed to create tables in Snowflake: {str(e)}")
            return False
        finally:
            cursor.close()
    
    def export_feature_flags(self, since: Optional[datetime] = None):
        """Export feature flags data to Snowflake"""
        if not self.connection:
            raise ValueError("Not connected to Snowflake")
        
        try:
            # Use direct SQLite connection instead of problematic sync session
            import sqlite3
            import os
            
            # Use the exact same database path
            db_path = os.path.join(os.getcwd(), 'data', 'optifork.db')
            logger.info(f"Using direct SQLite connection to: {db_path}")
            
            # Connect directly to SQLite database
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            try:
                # First verify tables exist
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [row[0] for row in cursor.fetchall()]
                logger.info(f"Tables found: {tables}")
                
                if 'feature_flags' not in tables:
                    logger.error("feature_flags table not found!")
                    return 0
                
                # Query feature flags with their rules
                cursor.execute("""
                    SELECT 
                        ff.id,
                        ff.name,
                        ff.description,
                        ff.rollout,
                        GROUP_CONCAT(
                            json_object('field', r.field, 'op', r.op, 'value', r.value),
                            ','
                        ) as rules_json
                    FROM feature_flags ff
                    LEFT JOIN rules r ON ff.id = r.flag_id
                    GROUP BY ff.id, ff.name, ff.description, ff.rollout
                """)
                
                flag_rows = cursor.fetchall()
                logger.info(f"Found {len(flag_rows)} feature flags in database")
                
                if not flag_rows:
                    logger.info("No feature flags to export")
                    return 0
                
                # Prepare data for Snowflake
                data = []
                for row in flag_rows:
                    flag_id, name, description, rollout, rules_json = row
                    
                    # Parse rules
                    rules = []
                    if rules_json:
                        try:
                            # Parse the concatenated JSON objects
                            rules_str = '[' + rules_json + ']'
                            rules = json.loads(rules_str)
                        except:
                            rules = []
                    
                    data.append({
                        'id': flag_id,
                        'name': name,
                        'description': description or '',
                        'is_active': True,
                        'rollout_percentage': int((rollout or 0) * 100),
                        'targeting_rules': json.dumps(rules),
                        'created_at': None,
                        'updated_at': None
                    })
                
                # Export using Snowflake
                logger.info(f"Exporting {len(data)} feature flags to Snowflake")
                result = self._export_feature_flags_fallback(data)
                logger.info(f"Export result: {result} feature flags exported")
                return result
                
            finally:
                conn.close()
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to export feature flags: {error_msg}")
            self._log_export('feature_flags', 0, 'error', error_msg)
            return 0
    
    def _export_feature_flags_fallback(self, data):
        """Fallback method to export feature flags using raw SQL"""
        if not self.connection:
            return 0
        
        try:
            cursor = self.connection.cursor()
            
            # Insert data using raw SQL
            for record in data:
                cursor.execute("""
                    INSERT INTO optifork_feature_flags 
                    (id, name, description, is_active, rollout_percentage, targeting_rules, created_at, updated_at, exported_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP())
                """, (
                    record['id'],
                    record['name'], 
                    record['description'],
                    record['is_active'],
                    record['rollout_percentage'],
                    record['targeting_rules'],
                    record['created_at'],
                    record['updated_at']
                ))
            
            self._log_export('feature_flags', len(data), 'success')
            logger.info(f"Successfully exported {len(data)} feature flags to Snowflake using SQL fallback")
            return len(data)
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"SQL fallback export failed: {error_msg}")
            self._log_export('feature_flags', 0, 'error', error_msg)
            return 0
        finally:
            cursor.close()
    
    def export_flag_exposures(self, since: Optional[datetime] = None):
        """Export flag exposures data to Snowflake"""
        if not self.connection:
            raise ValueError("Not connected to Snowflake")
        
        try:
            # Use direct SQLite connection instead of problematic sync session
            import sqlite3
            import os
            
            # Use the exact same database path
            db_path = os.path.join(os.getcwd(), 'data', 'optifork.db')
            logger.info(f"Using direct SQLite connection to: {db_path}")
            
            # Connect directly to SQLite database
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            try:
                # First verify tables exist
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [row[0] for row in cursor.fetchall()]
                
                if 'flag_exposures' not in tables:
                    logger.error("flag_exposures table not found!")
                    return 0
                
                # Query flag exposures
                if since:
                    cursor.execute("""
                        SELECT id, flag_id, flag_name, user_id, enabled, timestamp
                        FROM flag_exposures
                        WHERE timestamp >= ?
                    """, (since,))
                else:
                    cursor.execute("""
                        SELECT id, flag_id, flag_name, user_id, enabled, timestamp
                        FROM flag_exposures
                    """)
                
                exposure_rows = cursor.fetchall()
                logger.info(f"Found {len(exposure_rows)} flag exposures in database")
                
                if not exposure_rows:
                    logger.info("No flag exposures to export")
                    return 0
                
                # Prepare data for Snowflake
                data = []
                for row in exposure_rows:
                    exposure_id, flag_id, flag_name, user_id, enabled, timestamp = row
                    
                    data.append({
                        'id': exposure_id,
                        'flag_id': flag_id,
                        'flag_name': flag_name,
                        'user_id': user_id,
                        'enabled': enabled == "true",
                        'timestamp': timestamp
                    })
                
                # Export using Snowflake
                logger.info(f"Exporting {len(data)} flag exposures to Snowflake")
                result = self._export_flag_exposures_fallback(data)
                logger.info(f"Export result: {result} flag exposures exported")
                return result
                
            finally:
                conn.close()
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to export flag exposures: {error_msg}")
            self._log_export('flag_exposures', 0, 'error', error_msg)
            return 0
    
    def _export_flag_exposures_fallback(self, data):
        """Fallback method to export flag exposures using raw SQL"""
        if not self.connection:
            return 0
        
        try:
            cursor = self.connection.cursor()
            
            # Insert data using raw SQL
            for record in data:
                cursor.execute("""
                    INSERT INTO optifork_flag_exposures 
                    (id, flag_id, flag_name, user_id, enabled, timestamp, exported_at)
                    VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP())
                """, (
                    record['id'],
                    record['flag_id'], 
                    record['flag_name'],
                    record['user_id'],
                    record['enabled'],
                    record['timestamp']
                ))
            
            self._log_export('flag_exposures', len(data), 'success')
            logger.info(f"Successfully exported {len(data)} flag exposures to Snowflake using SQL fallback")
            return len(data)
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"SQL fallback export failed: {error_msg}")
            self._log_export('flag_exposures', 0, 'error', error_msg)
            return 0
        finally:
            cursor.close()
    
    def export_experiments(self, since: Optional[datetime] = None):
        """Export experiments data to Snowflake"""
        if not self.connection:
            raise ValueError("Not connected to Snowflake")
        
        try:
            # Use direct SQLite connection
            import sqlite3
            import os
            
            db_path = os.path.join(os.getcwd(), 'data', 'optifork.db')
            logger.info(f"Using direct SQLite connection to: {db_path}")
            
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            try:
                # First verify tables exist
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [row[0] for row in cursor.fetchall()]
                
                if 'experiments' not in tables:
                    logger.error("experiments table not found!")
                    return 0
                
                # Query experiments with their related data
                cursor.execute("""
                    SELECT e.id, e.name, e.description, e.status, e.flag_id
                    FROM experiments e
                """)
                
                experiment_rows = cursor.fetchall()
                logger.info(f"Found {len(experiment_rows)} experiments in database")
                
                if not experiment_rows:
                    logger.info("No experiments to export")
                    return 0
                
                # Prepare data for Snowflake
                data = []
                for row in experiment_rows:
                    exp_id, name, description, status, flag_id = row
                    
                    data.append({
                        'id': exp_id,
                        'name': name,
                        'description': description or '',
                        'status': status,
                        'flag_id': flag_id,
                        'created_at': None,  # Not available in current schema
                        'updated_at': None   # Not available in current schema
                    })
                
                # Export using Snowflake
                logger.info(f"Exporting {len(data)} experiments to Snowflake")
                result = self._export_experiments_fallback(data)
                logger.info(f"Export result: {result} experiments exported")
                return result
                
            finally:
                conn.close()
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to export experiments: {error_msg}")
            self._log_export('experiments', 0, 'error', error_msg)
            return 0
    
    def _export_experiments_fallback(self, data):
        """Fallback method to export experiments using raw SQL"""
        if not self.connection:
            return 0
        
        try:
            cursor = self.connection.cursor()
            
            # Insert data using raw SQL
            for record in data:
                cursor.execute("""
                    INSERT INTO optifork_experiments 
                    (id, name, description, status, flag_id, created_at, updated_at, exported_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP())
                """, (
                    record['id'],
                    record['name'],
                    record['description'],
                    record['status'],
                    record['flag_id'],
                    record['created_at'],
                    record['updated_at']
                ))
            
            self._log_export('experiments', len(data), 'success')
            logger.info(f"Successfully exported {len(data)} experiments to Snowflake using SQL fallback")
            return len(data)
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Experiments SQL fallback export failed: {error_msg}")
            self._log_export('experiments', 0, 'error', error_msg)
            return 0
        finally:
            cursor.close()
    
    def _log_export(self, export_type: str, records_exported: int, status: str, error_message: str = None):
        """Log export operation to Snowflake"""
        if not self.connection:
            return
        
        cursor = self.connection.cursor()
        try:
            cursor.execute("""
                INSERT INTO optifork_export_logs (export_type, records_exported, export_status, error_message)
                VALUES (%s, %s, %s, %s)
            """, (export_type, records_exported, status, error_message))
        except Exception as e:
            logger.error(f"Failed to log export operation: {str(e)}")
        finally:
            cursor.close()
    
    async def full_export(self, db: AsyncSession, since: Optional[datetime] = None):
        """Export all data types to Snowflake"""
        total_records = 0
        
        # Try to load saved config if not already configured
        if not self.config:
            await self.load_saved_config(db)
        
        if not self.connect():
            return {'success': False, 'error': 'Failed to connect to Snowflake'}
        
        try:
            # Create tables if needed
            if not self.create_tables():
                return {'success': False, 'error': 'Failed to create Snowflake tables'}
            
            # Export all data types (now using sync methods)
            flags_count = self.export_feature_flags(since)
            exposures_count = self.export_flag_exposures(since)
            
            total_records = flags_count + exposures_count
            
            return {
                'success': True,
                'records_exported': {
                    'feature_flags': flags_count,
                    'flag_exposures': exposures_count,
                    'total': total_records
                }
            }
            
        except Exception as e:
            logger.error(f"Full export failed: {str(e)}")
            return {'success': False, 'error': str(e)}
        finally:
            self.disconnect()

# Global Snowflake connector instance
snowflake_connector = SnowflakeConnector()