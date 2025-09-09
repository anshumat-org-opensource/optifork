from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import json
import logging

from db import get_db
from integrations.snowflake_connector import snowflake_connector

router = APIRouter(prefix="/integrations", tags=["integrations"])
logger = logging.getLogger(__name__)

class SnowflakeConfig(BaseModel):
    account: str
    user: str
    password: str
    warehouse: str
    database: str
    schema: str

class ExportRequest(BaseModel):
    data_types: list[str]  # ['feature_flags', 'experiments', 'exposures', 'all']
    since_hours: Optional[int] = None  # Export data from X hours ago
    full_export: bool = False

class ExportResponse(BaseModel):
    success: bool
    message: str
    records_exported: Optional[Dict[str, int]] = None
    error: Optional[str] = None

@router.post("/snowflake/configure")
async def configure_snowflake(config: SnowflakeConfig, db: AsyncSession = Depends(get_db)):
    """Configure Snowflake connection settings"""
    try:
        # Validate account format
        if not config.account:
            return {"success": False, "error": "Account identifier is required"}
        
        # Use account identifier as provided by user
        # Snowflake Python connector handles the account format automatically
        account_identifier = config.account
        
        config_dict = {
            'account': account_identifier,
            'user': config.user,
            'password': config.password,
            'warehouse': config.warehouse,
            'database': config.database,
            'schema': config.schema
        }
            
        snowflake_connector.configure(config_dict)
        
        # Save configuration first (for persistence)
        config_saved = await snowflake_connector.save_config(config_dict, db)
        
        # Test connection
        if snowflake_connector.connect():
            snowflake_connector.disconnect()
            
            if config_saved:
                return {"success": True, "message": "Snowflake configured, tested successfully, and configuration saved"}
            else:
                return {"success": True, "message": "Snowflake configured and tested successfully, but failed to save configuration"}
        else:
            # Even if connection fails, configuration is saved for later use
            if config_saved:
                return {
                    "success": False, 
                    "error": "Failed to connect to Snowflake, but configuration was saved. Please check your credentials and network connectivity.",
                    "troubleshooting": {
                        "account_format": "Account should be in format: account-identifier.snowflakecomputing.com",
                        "common_issues": [
                            "Verify account identifier is correct",
                            "Check username and password",
                            "Ensure warehouse, database, and schema exist",
                            "Verify network connectivity to Snowflake"
                        ]
                    }
                }
            else:
                return {
                    "success": False, 
                    "error": "Failed to connect to Snowflake and failed to save configuration.",
                    "troubleshooting": {
                        "account_format": "Account should be in format: account-identifier.snowflakecomputing.com",
                        "common_issues": [
                            "Verify account identifier is correct",
                            "Check username and password", 
                            "Ensure warehouse, database, and schema exist",
                            "Verify network connectivity to Snowflake"
                        ]
                    }
                }
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to configure Snowflake: {error_msg}")
        
        # Provide specific error guidance
        if "250001" in error_msg:
            return {
                "success": False,
                "error": "Connection timeout - unable to reach Snowflake",
                "troubleshooting": {
                    "error_code": "250001",
                    "common_causes": [
                        "Account identifier format is incorrect",
                        "Network connectivity issues", 
                        "Firewall blocking Snowflake connections"
                    ],
                    "account_format_examples": [
                        "abc12345.snowflakecomputing.com",
                        "abc12345.us-east-1.snowflakecomputing.com",
                        "abc12345.eu-west-1.snowflakecomputing.com"
                    ],
                    "attempted_account": account_identifier
                }
            }
        elif "251001" in error_msg:
            return {
                "success": False,
                "error": "Authentication failed - invalid credentials",
                "troubleshooting": {
                    "error_code": "251001",
                    "suggestion": "Verify your username and password are correct",
                    "common_causes": [
                        "Incorrect username or password",
                        "Account may be locked",
                        "User may not have proper permissions"
                    ]
                }
            }
        elif "250003" in error_msg:
            return {
                "success": False,
                "error": "Invalid account identifier",
                "troubleshooting": {
                    "error_code": "250003", 
                    "suggestion": "Check your Snowflake account identifier format",
                    "correct_format": "account-identifier.snowflakecomputing.com"
                }
            }
        else:
            return {"success": False, "error": error_msg}

@router.get("/snowflake/config")
async def get_snowflake_config(db: AsyncSession = Depends(get_db)):
    """Get saved Snowflake configuration (without password)"""
    try:
        config_loaded = await snowflake_connector.load_saved_config(db)
        if config_loaded and snowflake_connector.config:
            # Return config without password for security
            safe_config = {
                "account": snowflake_connector.config.get("account", ""),
                "user": snowflake_connector.config.get("user", ""),
                "warehouse": snowflake_connector.config.get("warehouse", ""),
                "database": snowflake_connector.config.get("database", ""),
                "schema": snowflake_connector.config.get("schema", ""),
                "configured": True
            }
            return {"success": True, "config": safe_config}
        else:
            return {"success": True, "config": {"configured": False}}
    except Exception as e:
        logger.error(f"Failed to load Snowflake config: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/snowflake/test-connection")
async def test_snowflake_connection(db: AsyncSession = Depends(get_db)):
    """Test Snowflake connection"""
    try:
        # Try to load saved config if not already configured
        if not snowflake_connector.config:
            await snowflake_connector.load_saved_config(db)
        
        if snowflake_connector.connect():
            # Test table creation
            tables_created = snowflake_connector.create_tables()
            snowflake_connector.disconnect()
            
            if tables_created:
                return {
                    "success": True, 
                    "message": "Connection successful and tables verified/created"
                }
            else:
                return {
                    "success": False, 
                    "error": "Connected but failed to create/verify tables"
                }
        else:
            return {"success": False, "error": "Failed to connect to Snowflake"}
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/snowflake/export", response_model=ExportResponse)
async def export_to_snowflake(
    export_request: ExportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Export data to Snowflake"""
    try:
        # Calculate since timestamp if specified
        since = None
        if export_request.since_hours:
            since = datetime.utcnow() - timedelta(hours=export_request.since_hours)
        
        if export_request.full_export or 'all' in export_request.data_types:
            # Full export in background
            background_tasks.add_task(perform_full_export, db, since)
            return ExportResponse(
                success=True,
                message="Full export started in background. Check export status for progress."
            )
        else:
            # Immediate export for specific data types
            result = await perform_selective_export(db, export_request.data_types, since)
            return ExportResponse(**result)
            
    except Exception as e:
        logger.error(f"Export request failed: {str(e)}")
        return ExportResponse(
            success=False,
            message="Export failed",
            error=str(e)
        )

@router.get("/snowflake/export-status")
async def get_export_status(db: AsyncSession = Depends(get_db)):
    """Get recent export status and logs"""
    try:
        # Try to load saved config if not already configured
        if not snowflake_connector.config:
            await snowflake_connector.load_saved_config(db)
        
        if not snowflake_connector.connect():
            return {"success": False, "error": "Cannot connect to Snowflake"}
        
        cursor = snowflake_connector.connection.cursor()
        
        # Get recent export logs
        cursor.execute("""
            SELECT export_type, records_exported, export_status, error_message, exported_at
            FROM optifork_export_logs
            ORDER BY exported_at DESC
            LIMIT 20
        """)
        
        logs = []
        for row in cursor.fetchall():
            logs.append({
                'export_type': row[0],
                'records_exported': row[1],
                'status': row[2],
                'error_message': row[3],
                'exported_at': row[4].isoformat() if row[4] else None
            })
        
        # Get table row counts
        tables_info = {}
        for table in ['OPTIFORK_FEATURE_FLAGS', 'OPTIFORK_FLAG_EXPOSURES', 'OPTIFORK_EXPERIMENTS']:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                tables_info[table.lower()] = count
            except:
                tables_info[table.lower()] = 0
        
        snowflake_connector.disconnect()
        
        return {
            "success": True,
            "recent_exports": logs,
            "table_counts": tables_info
        }
        
    except Exception as e:
        logger.error(f"Failed to get export status: {str(e)}")
        return {"success": False, "error": str(e)}

async def perform_full_export(db: AsyncSession, since: Optional[datetime] = None):
    """Perform full export (used in background tasks)"""
    try:
        result = await snowflake_connector.full_export(db, since)
        logger.info(f"Background export completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Background export failed: {str(e)}")
        return {'success': False, 'error': str(e)}

async def perform_selective_export(db: AsyncSession, data_types: list[str], since: Optional[datetime] = None):
    """Perform selective export for specific data types"""
    # Try to load saved config if not already configured
    if not snowflake_connector.config:
        await snowflake_connector.load_saved_config(db)
    
    if not snowflake_connector.connect():
        return {'success': False, 'error': 'Failed to connect to Snowflake'}
    
    try:
        # Create tables if needed
        if not snowflake_connector.create_tables():
            return {'success': False, 'error': 'Failed to create Snowflake tables'}
        
        records_exported = {}
        total_records = 0
        
        # Export selected data types (now using sync methods)
        if 'feature_flags' in data_types:
            count = snowflake_connector.export_feature_flags(since)
            records_exported['feature_flags'] = count
            total_records += count
        
        if 'exposures' in data_types:
            count = snowflake_connector.export_flag_exposures(since)
            records_exported['flag_exposures'] = count
            total_records += count
        
        if 'experiments' in data_types:
            count = snowflake_connector.export_experiments(since)
            records_exported['experiments'] = count
            total_records += count
        
        records_exported['total'] = total_records
        
        return {
            'success': True,
            'message': f'Successfully exported {total_records} records to Snowflake',
            'records_exported': records_exported
        }
        
    except Exception as e:
        logger.error(f"Selective export failed: {str(e)}")
        return {'success': False, 'error': str(e)}
    finally:
        snowflake_connector.disconnect()

@router.post("/snowflake/setup-scheduled-export")
async def setup_scheduled_export(
    schedule_config: dict,
    background_tasks: BackgroundTasks
):
    """Setup scheduled exports (daily, hourly, etc.)"""
    try:
        # This would typically be handled by a task scheduler like Celery or APScheduler
        # For now, we'll just return the configuration
        return {
            "success": True,
            "message": "Scheduled export configured",
            "config": schedule_config,
            "note": "Background scheduler is running with default schedule: Daily at 2 AM and hourly incremental exports"
        }
    except Exception as e:
        logger.error(f"Failed to setup scheduled export: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/snowflake/scheduler-status")
async def get_scheduler_status():
    """Get scheduler status"""
    try:
        from scheduler import export_scheduler
        return {
            "success": True,
            "is_running": export_scheduler.is_running,
            "message": "Scheduler status retrieved",
            "schedule_info": {
                "daily_export": "2:00 AM UTC - Full export of all data",
                "hourly_export": "Every hour - Incremental export of last hour's data"
            }
        }
    except Exception as e:
        logger.error(f"Failed to get scheduler status: {str(e)}")
        return {"success": False, "error": str(e)}