#!/bin/bash
# Run Toast Historical Sync in Background

RESTAURANT_ID="68e0bd8a603ef36c8257e021"
LOG_FILE="./toast-sync-${RESTAURANT_ID}.log"

echo "🚀 Starting Toast Historical Sync in background..."
echo "📝 Logging to: $LOG_FILE"
echo "⏱️  Estimated time: 4-7 hours for full history"
echo ""

nohup env \
  DATABASE_URL='mongodb+srv://demetri7_db_user:L9THnfRUfAWnmggK@noion-cluster.wsnmmhg.mongodb.net/noion' \
  ENCRYPTION_KEY='m3n4o5p6q7r8_production_encryption_key' \
  npx tsx scripts/run-smart-toast-sync.ts $RESTAURANT_ID \
  > "$LOG_FILE" 2>&1 &

SYNC_PID=$!
echo "✅ Sync started with PID: $SYNC_PID"
echo ""
echo "To check progress:"
echo "  tail -f $LOG_FILE"
echo ""
echo "To check if still running:"
echo "  ps -p $SYNC_PID"
echo ""
echo "To stop:"
echo "  kill $SYNC_PID"
