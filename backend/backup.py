# backup.py - Backup and restore utilities for OptiFork
import os
import json
import gzip
import asyncio
import logging
import subprocess
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import shutil

from db import get_db, get_database_info, SYNC_DATABASE_URL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backup", tags=["backup"])

class BackupManager:
    """Comprehensive backup and restore manager"""
    
    def __init__(self):
        self.backup_dir = Path(os.getenv("BACKUP_DIR", "./backups"))
        self.backup_dir.mkdir(exist_ok=True)
        self.max_backups = int(os.getenv("MAX_BACKUPS", "30"))  # Keep 30 days of backups
    
    def get_backup_filename(self, backup_type: str = "full") -> str:
        """Generate backup filename with timestamp"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"optifork_{backup_type}_{timestamp}.json.gz"
    
    async def create_full_backup(self, db: AsyncSession) -> Dict[str, Any]:
        """Create full backup of all data"""
        try:
            backup_data = {
                "metadata": {
                    "version": "1.0",
                    "timestamp": datetime.utcnow().isoformat(),
                    "type": "full_backup",
                    "database_type": get_database_info()["type"]
                },
                "data": {}
            }
            
            # Backup feature flags
            flags_result = await db.execute(text("SELECT * FROM feature_flags"))
            flags = []
            for row in flags_result.fetchall():
                flags.append({
                    "id": row.id,
                    "name": row.name,
                    "description": row.description,
                    "rollout": row.rollout,
                    "rules": row.rules,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "updated_at": row.updated_at.isoformat() if row.updated_at else None
                })
            backup_data["data"]["feature_flags"] = flags
            
            # Backup experiments
            experiments_result = await db.execute(text("SELECT * FROM experiments"))
            experiments = []
            for row in experiments_result.fetchall():
                experiments.append({
                    "id": row.id,
                    "name": row.name,
                    "description": row.description,
                    "variants": row.variants,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "updated_at": row.updated_at.isoformat() if row.updated_at else None
                })
            backup_data["data"]["experiments"] = experiments
            
            # Backup users (without passwords)
            users_result = await db.execute(text("SELECT id, username, email, role, permissions, created_at FROM users"))
            users = []
            for row in users_result.fetchall():
                users.append({
                    "id": row.id,
                    "username": row.username,
                    "email": row.email,
                    "role": row.role,
                    "permissions": row.permissions,
                    "created_at": row.created_at.isoformat() if row.created_at else None
                })
            backup_data["data"]["users"] = users
            
            # Backup flag exposures (last 30 days only)
            exposures_result = await db.execute(text("""
                SELECT * FROM flag_exposures 
                WHERE timestamp > datetime('now', '-30 days')
                ORDER BY timestamp DESC
            """))
            exposures = []
            for row in exposures_result.fetchall():
                exposures.append({
                    "id": row.id,
                    "flag_name": row.flag_name,
                    "user_id": row.user_id,
                    "enabled": row.enabled,
                    "timestamp": row.timestamp.isoformat() if row.timestamp else None,
                    "user_attributes": row.user_attributes
                })
            backup_data["data"]["flag_exposures"] = exposures
            
            # Save backup file
            filename = self.get_backup_filename("full")
            filepath = self.backup_dir / filename
            
            # Compress and save
            json_data = json.dumps(backup_data, indent=2)
            with gzip.open(filepath, 'wt', encoding='utf-8') as f:
                f.write(json_data)
            
            # Clean up old backups
            await self._cleanup_old_backups()
            
            file_size = filepath.stat().st_size
            
            logger.info(f"✅ Full backup created: {filename} ({file_size} bytes)")
            
            return {
                "success": True,
                "filename": filename,
                "filepath": str(filepath),
                "size_bytes": file_size,
                "records": {
                    "feature_flags": len(flags),
                    "experiments": len(experiments),
                    "users": len(users),
                    "flag_exposures": len(exposures)
                },
                "timestamp": backup_data["metadata"]["timestamp"]
            }
            
        except Exception as e:
            logger.error(f"❌ Backup creation failed: {e}")
            raise Exception(f"Backup failed: {str(e)}")
    
    async def create_postgresql_dump(self) -> Dict[str, Any]:
        """Create PostgreSQL dump using pg_dump (if using PostgreSQL)"""
        db_info = get_database_info()
        if db_info["type"] != "PostgreSQL":
            raise Exception("PostgreSQL dump only available for PostgreSQL databases")
        
        try:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"optifork_pgdump_{timestamp}.sql.gz"
            filepath = self.backup_dir / filename
            
            # Parse database URL
            db_url = SYNC_DATABASE_URL
            if "@" in db_url:
                # Extract connection details from URL
                # Format: postgresql://user:pass@host:port/dbname
                parts = db_url.split("://")[1]
                auth_host = parts.split("@")
                auth = auth_host[0].split(":")
                host_db = auth_host[1].split("/")
                host_port = host_db[0].split(":")
                
                user = auth[0]
                password = auth[1] if len(auth) > 1 else ""
                host = host_port[0]
                port = host_port[1] if len(host_port) > 1 else "5432"
                dbname = host_db[1]
                
                # Set environment variables for pg_dump
                env = os.environ.copy()
                env["PGPASSWORD"] = password
                
                # Run pg_dump
                cmd = [
                    "pg_dump",
                    "-h", host,
                    "-p", port,
                    "-U", user,
                    "-d", dbname,
                    "--no-password",
                    "--clean",
                    "--if-exists"
                ]
                
                # Execute pg_dump and compress
                with gzip.open(filepath, 'wt') as f:
                    result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, 
                                          env=env, text=True, timeout=300)
                
                if result.returncode != 0:
                    raise Exception(f"pg_dump failed: {result.stderr}")
                
                file_size = filepath.stat().st_size
                
                logger.info(f"✅ PostgreSQL dump created: {filename} ({file_size} bytes)")
                
                return {
                    "success": True,
                    "filename": filename,
                    "filepath": str(filepath),
                    "size_bytes": file_size,
                    "type": "postgresql_dump",
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ PostgreSQL dump failed: {e}")
            raise Exception(f"PostgreSQL dump failed: {str(e)}")
    
    async def restore_from_backup(self, backup_file: str, db: AsyncSession) -> Dict[str, Any]:
        """Restore data from backup file"""
        try:
            filepath = self.backup_dir / backup_file
            if not filepath.exists():
                raise Exception(f"Backup file not found: {backup_file}")
            
            # Load backup data
            with gzip.open(filepath, 'rt', encoding='utf-8') as f:
                backup_data = json.load(f)
            
            if backup_data.get("metadata", {}).get("type") != "full_backup":
                raise Exception("Invalid backup file format")
            
            restored_counts = {}
            
            # Restore feature flags
            if "feature_flags" in backup_data["data"]:
                await db.execute(text("DELETE FROM feature_flags"))
                
                for flag in backup_data["data"]["feature_flags"]:
                    await db.execute(text("""
                        INSERT INTO feature_flags (name, description, rollout, rules, created_at, updated_at)
                        VALUES (:name, :description, :rollout, :rules, :created_at, :updated_at)
                    """), {
                        "name": flag["name"],
                        "description": flag["description"],
                        "rollout": flag["rollout"],
                        "rules": flag["rules"],
                        "created_at": flag["created_at"],
                        "updated_at": flag["updated_at"]
                    })
                
                restored_counts["feature_flags"] = len(backup_data["data"]["feature_flags"])
            
            # Restore experiments
            if "experiments" in backup_data["data"]:
                await db.execute(text("DELETE FROM experiments"))
                
                for exp in backup_data["data"]["experiments"]:
                    await db.execute(text("""
                        INSERT INTO experiments (name, description, variants, created_at, updated_at)
                        VALUES (:name, :description, :variants, :created_at, :updated_at)
                    """), {
                        "name": exp["name"],
                        "description": exp["description"],
                        "variants": exp["variants"],
                        "created_at": exp["created_at"],
                        "updated_at": exp["updated_at"]
                    })
                
                restored_counts["experiments"] = len(backup_data["data"]["experiments"])
            
            # Restore users (excluding passwords - users will need to reset)
            if "users" in backup_data["data"]:
                await db.execute(text("DELETE FROM users WHERE username != 'admin'"))  # Keep admin user
                
                for user in backup_data["data"]["users"]:
                    if user["username"] != "admin":  # Don't restore admin user
                        await db.execute(text("""
                            INSERT INTO users (username, email, role, permissions, created_at, password_hash)
                            VALUES (:username, :email, :role, :permissions, :created_at, 'RESET_REQUIRED')
                        """), {
                            "username": user["username"],
                            "email": user["email"],
                            "role": user["role"],
                            "permissions": user["permissions"],
                            "created_at": user["created_at"]
                        })
                
                restored_counts["users"] = len([u for u in backup_data["data"]["users"] if u["username"] != "admin"])
            
            await db.commit()
            
            logger.info(f"✅ Backup restored successfully: {backup_file}")
            
            return {
                "success": True,
                "backup_file": backup_file,
                "backup_timestamp": backup_data["metadata"]["timestamp"],
                "restored_counts": restored_counts,
                "restore_timestamp": datetime.utcnow().isoformat(),
                "notes": "User passwords need to be reset after restore"
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Backup restore failed: {e}")
            raise Exception(f"Restore failed: {str(e)}")
    
    async def list_backups(self) -> List[Dict[str, Any]]:
        """List available backup files"""
        try:
            backups = []
            
            for filepath in self.backup_dir.glob("optifork_*.json.gz"):
                stat = filepath.stat()
                backups.append({
                    "filename": filepath.name,
                    "size_bytes": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "type": "json_backup"
                })
            
            # Also list PostgreSQL dumps
            for filepath in self.backup_dir.glob("optifork_*.sql.gz"):
                stat = filepath.stat()
                backups.append({
                    "filename": filepath.name,
                    "size_bytes": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "type": "postgresql_dump"
                })
            
            # Sort by creation time (newest first)
            backups.sort(key=lambda x: x["created_at"], reverse=True)
            
            return backups
            
        except Exception as e:
            logger.error(f"Error listing backups: {e}")
            return []
    
    async def _cleanup_old_backups(self):
        """Remove old backup files beyond retention limit"""
        try:
            backups = await self.list_backups()
            
            if len(backups) > self.max_backups:
                # Remove oldest backups
                for backup in backups[self.max_backups:]:
                    filepath = self.backup_dir / backup["filename"]
                    filepath.unlink(missing_ok=True)
                    logger.info(f"🗑️ Removed old backup: {backup['filename']}")
                    
        except Exception as e:
            logger.error(f"Error cleaning up old backups: {e}")

# Global backup manager
backup_manager = BackupManager()

@router.post("/create")
async def create_backup(
    background_tasks: BackgroundTasks,
    backup_type: str = "full",
    db: AsyncSession = Depends(get_db)
):
    """Create a new backup"""
    try:
        if backup_type == "full":
            result = await backup_manager.create_full_backup(db)
        elif backup_type == "postgresql" and get_database_info()["type"] == "PostgreSQL":
            result = await backup_manager.create_postgresql_dump()
        else:
            raise HTTPException(status_code=400, detail=f"Invalid backup type: {backup_type}")
        
        return result
        
    except Exception as e:
        logger.error(f"Backup creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_backups():
    """List all available backups"""
    try:
        backups = await backup_manager.list_backups()
        return {
            "backups": backups,
            "total_count": len(backups),
            "backup_directory": str(backup_manager.backup_dir)
        }
        
    except Exception as e:
        logger.error(f"Error listing backups: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/restore/{backup_filename}")
async def restore_backup(
    backup_filename: str,
    db: AsyncSession = Depends(get_db)
):
    """Restore from a backup file"""
    try:
        if not backup_filename.endswith('.json.gz'):
            raise HTTPException(status_code=400, detail="Only JSON backup files can be restored")
        
        result = await backup_manager.restore_from_backup(backup_filename, db)
        return result
        
    except Exception as e:
        logger.error(f"Backup restore failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{backup_filename}")
async def delete_backup(backup_filename: str):
    """Delete a backup file"""
    try:
        filepath = backup_manager.backup_dir / backup_filename
        if not filepath.exists():
            raise HTTPException(status_code=404, detail="Backup file not found")
        
        filepath.unlink()
        logger.info(f"🗑️ Deleted backup: {backup_filename}")
        
        return {
            "success": True,
            "message": f"Backup {backup_filename} deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_backup_config():
    """Get backup configuration"""
    return {
        "backup_directory": str(backup_manager.backup_dir),
        "max_backups": backup_manager.max_backups,
        "database_type": get_database_info()["type"],
        "supported_backup_types": ["full", "postgresql"] if get_database_info()["type"] == "PostgreSQL" else ["full"]
    }

# Export backup components
__all__ = ["router", "backup_manager"]