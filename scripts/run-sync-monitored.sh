#!/bin/bash

# Run Toast sync with proper logging and monitoring
RESTAURANT_ID="68e0bd8a603ef36c8257e021"
LOG_FILE="/tmp/toast-sync-$(date +%Y%m%d-%H%M%S).log"

echo "🚀 Starting monitored Toast historical sync"
echo "📝 Log file: $LOG_FILE"
echo "⏰ Started at: $(date)"

# Run sync with output to both console and log file
DATABASE_URL='mongodb+srv://demetri7_db_user:L9THnfRUfAWnmggK@noion-cluster.wsnmmhg.mongodb.net/noion' \
ENCRYPTION_KEY='m3n4o5p6q7r8_production_encryption_key' \
npx tsx scripts/run-smart-toast-sync.ts "$RESTAURANT_ID" 2>&1 | tee "$LOG_FILE"

EXIT_CODE=$?

echo "⏰ Finished at: $(date)"
echo "📊 Exit code: $EXIT_CODE"

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Sync completed successfully!"
else
  echo "❌ Sync failed with exit code $EXIT_CODE"
  echo "📝 Check log file: $LOG_FILE"
fi
