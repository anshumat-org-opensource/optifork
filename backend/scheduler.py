import schedule
import time
import asyncio
import logging
from datetime import datetime, timedelta
from integrations.snowflake_connector import snowflake_connector
from db import SessionLocal

logger = logging.getLogger(__name__)

class ExportScheduler:
    def __init__(self):
        self.is_running = False
        self.scheduled_jobs = []
    
    def setup_default_schedule(self):
        """Setup default export schedules"""
        # Daily full export at 2 AM
        schedule.every().day.at("02:00").do(self.run_daily_export)
        
        # Hourly incremental export (last hour of data)
        schedule.every().hour.do(self.run_hourly_export)
        
        logger.info("Default export schedules configured")
    
    async def run_daily_export(self):
        """Run daily full export"""
        logger.info("Starting daily full export")
        try:
            async with SessionLocal() as db:
                result = await snowflake_connector.full_export(db)
                if result['success']:
                    logger.info(f"Daily export completed successfully: {result['records_exported']}")
                else:
                    logger.error(f"Daily export failed: {result['error']}")
        except Exception as e:
            logger.error(f"Daily export error: {str(e)}")
    
    async def run_hourly_export(self):
        """Run hourly incremental export"""
        logger.info("Starting hourly incremental export")
        try:
            # Export data from last hour
            since = datetime.utcnow() - timedelta(hours=1)
            
            async with SessionLocal() as db:
                result = await snowflake_connector.full_export(db, since)
                if result['success']:
                    total = result['records_exported']['total']
                    logger.info(f"Hourly export completed: {total} records")
                else:
                    logger.error(f"Hourly export failed: {result['error']}")
        except Exception as e:
            logger.error(f"Hourly export error: {str(e)}")
    
    def run_scheduler(self):
        """Run the scheduler in a loop"""
        self.is_running = True
        logger.info("Export scheduler started")
        
        while self.is_running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    def stop_scheduler(self):
        """Stop the scheduler"""
        self.is_running = False
        schedule.clear()
        logger.info("Export scheduler stopped")

# Global scheduler instance
export_scheduler = ExportScheduler()

# Function to be called from main app
def start_background_scheduler():
    """Start the background scheduler"""
    import threading
    
    export_scheduler.setup_default_schedule()
    scheduler_thread = threading.Thread(target=export_scheduler.run_scheduler)
    scheduler_thread.daemon = True
    scheduler_thread.start()
    
    logger.info("Background scheduler thread started")

if __name__ == "__main__":
    # For testing the scheduler directly
    logging.basicConfig(level=logging.INFO)
    start_background_scheduler()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        export_scheduler.stop_scheduler()
        logger.info("Scheduler stopped")