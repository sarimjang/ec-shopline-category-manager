#!/bin/bash

# Gemini API 速率限制追蹤器
# 功能：記錄每次 Gemini 呼叫，防止觸發 429 錯誤
# Gemini 2.5 Pro 限制: RPM=60, RPD=100

LOG_FILE=".gemini-calls.log"
MIN_INTERVAL=2  # 最小間隔（秒）- 理論上 RPM=60 可以 1 秒 1 次，保守設 2 秒
RECOMMENDED_INTERVAL=10  # 推薦間隔（秒）- 更保守的策略
DAILY_LIMIT=100  # 每日請求限制

# 記錄 Gemini 呼叫
log_call() {
  local task_name="$1"
  echo "$(date +%s)|$(date '+%Y-%m-%d %H:%M:%S')|$task_name" >> "$LOG_FILE"
}

# 檢查速率限制
check_rate_limit() {
  if [ ! -f "$LOG_FILE" ]; then
    return 0
  fi

  local now=$(date +%s)
  local today_start=$(date -j -f "%Y-%m-%d" "$(date +%Y-%m-%d)" +%s 2>/dev/null || date -d "$(date +%Y-%m-%d)" +%s)

  # 檢查每日配額
  local today_calls=$(awk -v cutoff=$today_start '$1 > cutoff' "$LOG_FILE" | wc -l | tr -d ' ')
  if [ $today_calls -ge $DAILY_LIMIT ]; then
    echo "🚨 每日配額已達上限：$today_calls/$DAILY_LIMIT 次呼叫" >&2
    echo "⏳ 請明天再試" >&2
    return 1
  fi

  # 檢查最小間隔
  local last_call=$(tail -1 "$LOG_FILE" | cut -d'|' -f1)
  local interval=$((now - last_call))

  if [ $interval -lt $MIN_INTERVAL ]; then
    local wait_time=$((MIN_INTERVAL - interval))
    echo "⚠️  速率限制保護：距離上次呼叫僅 $interval 秒" >&2
    echo "⏳ 需要等待 $wait_time 秒以避免 429 錯誤" >&2
    return 1
  fi

  if [ $interval -lt $RECOMMENDED_INTERVAL ]; then
    echo "⚡ 提示：距離上次呼叫 $interval 秒（推薦 $RECOMMENDED_INTERVAL 秒）" >&2
    echo "📊 今日已使用：$today_calls/$DAILY_LIMIT 次" >&2
  fi

  return 0
}

# 安全呼叫 Gemini
safe_gemini() {
  local prompt="$1"
  local task_name="${2:-Unnamed Task}"

  echo "🔍 任務: $task_name" >&2

  if ! check_rate_limit; then
    echo "❌ 速率限制保護：請稍後重試或使用 force_gemini" >&2
    return 1
  fi

  echo "✅ 速率限制檢查通過，執行 Gemini..." >&2
  log_call "$task_name"

  gemini -p "$prompt"
}

# 強制呼叫（跳過檢查，僅在確認安全時使用）
force_gemini() {
  local prompt="$1"
  local task_name="${2:-Forced Call}"

  echo "⚠️  強制執行 Gemini（跳過速率限制檢查）" >&2
  log_call "$task_name"

  gemini -p "$prompt"
}

# 顯示使用統計
show_stats() {
  if [ ! -f "$LOG_FILE" ]; then
    echo "📊 無使用記錄"
    return
  fi

  local total_calls=$(wc -l < "$LOG_FILE" | tr -d ' ')
  local now=$(date +%s)
  local today_start=$(date -j -f "%Y-%m-%d" "$(date +%Y-%m-%d)" +%s 2>/dev/null || date -d "$(date +%Y-%m-%d)" +%s)
  local today_calls=$(awk -v cutoff=$today_start '$1 > cutoff' "$LOG_FILE" | wc -l | tr -d ' ')
  local last_hour_calls=$(awk -v cutoff=$((now - 3600)) '$1 > cutoff' "$LOG_FILE" | wc -l | tr -d ' ')
  local last_minute_calls=$(awk -v cutoff=$((now - 60)) '$1 > cutoff' "$LOG_FILE" | wc -l | tr -d ' ')

  echo "📊 Gemini API 使用統計 (Gemini 2.5 Pro)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "總呼叫次數: $total_calls"
  echo "今日呼叫:   $today_calls / $DAILY_LIMIT (配額 RPD)"
  echo "最近 1 小時: $last_hour_calls"
  echo "最近 1 分鐘: $last_minute_calls / 60 (配額 RPM)"
  echo ""

  # 每日配額警告
  local daily_percent=$((today_calls * 100 / DAILY_LIMIT))
  if [ $today_calls -ge $DAILY_LIMIT ]; then
    echo "🚨 每日配額已用完！($today_calls/$DAILY_LIMIT)"
  elif [ $daily_percent -ge 80 ]; then
    echo "⚠️  每日配額接近上限 ($today_calls/$DAILY_LIMIT, ${daily_percent}%)"
  elif [ $daily_percent -ge 50 ]; then
    echo "⚡ 今日已使用過半 ($today_calls/$DAILY_LIMIT, ${daily_percent}%)"
  fi

  # 每分鐘速率警告
  if [ $last_minute_calls -ge 50 ]; then
    echo "🚨 警告：最近 1 分鐘呼叫過於頻繁（$last_minute_calls/60 RPM）"
  elif [ $last_minute_calls -ge 30 ]; then
    echo "⚡ 提示：接近速率限制（$last_minute_calls/60 RPM）"
  elif [ $today_calls -lt $DAILY_LIMIT ]; then
    echo "✅ 使用量正常"
  fi

  # 最近一次呼叫
  if [ $total_calls -gt 0 ]; then
    local last_entry=$(tail -1 "$LOG_FILE")
    local last_timestamp=$(echo "$last_entry" | cut -d'|' -f2)
    local last_task=$(echo "$last_entry" | cut -d'|' -f3)
    local time_since=$((now - $(echo "$last_entry" | cut -d'|' -f1)))

    echo ""
    echo "最後呼叫: $last_timestamp"
    echo "任務: $last_task"
    echo "距今: $time_since 秒"

    if [ $time_since -lt $MIN_INTERVAL ]; then
      local wait_needed=$((MIN_INTERVAL - time_since))
      echo "⏳ 建議等待: $wait_needed 秒"
    else
      echo "✅ 可以安全呼叫"
    fi
  fi
}

# 清除舊記錄（保留最近 24 小時）
cleanup_logs() {
  if [ ! -f "$LOG_FILE" ]; then
    return
  fi

  local cutoff=$(date -v-24H +%s 2>/dev/null || date -d '24 hours ago' +%s)
  local temp_file="${LOG_FILE}.tmp"

  awk -v cutoff=$cutoff '$1 > cutoff' "$LOG_FILE" > "$temp_file"
  mv "$temp_file" "$LOG_FILE"

  echo "🧹 清理完成：保留最近 24 小時的記錄"
}

# 如果直接執行腳本，顯示統計
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  case "${1:-stats}" in
    stats)
      show_stats
      ;;
    cleanup)
      cleanup_logs
      ;;
    test)
      echo "🧪 測試 Gemini 連接..."
      safe_gemini "Hello, 這是測試連接" "Connection Test"
      ;;
    *)
      echo "用法:"
      echo "  source .gemini-tracker.sh          # 載入函數"
      echo "  .gemini-tracker.sh stats           # 顯示統計"
      echo "  .gemini-tracker.sh cleanup         # 清理舊記錄"
      echo "  .gemini-tracker.sh test            # 測試連接"
      ;;
  esac
fi
