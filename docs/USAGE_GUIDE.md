# User Guide: Export & Import Data

**Shopline Category Manager Chrome Extension**
**Phase 2: Data Export & Import**
**Version**: 1.0
**Last Updated**: 2026-01-27

---

## Quick Start

### In 30 Seconds

1. **Export**: Click extension → "匯出資料" (Export Data) button → File downloads
2. **Import**: Click extension → "匯入資料" (Import Data) → Select JSON file → Confirm
3. **That's it!** Your data is now saved or restored.

---

## How to Export Your Data

### What Gets Exported?

When you export your data, you're saving:
- ✅ **Statistics**: Total moves, time saved, last reset date
- ✅ **Move History**: Every category move with timestamps
- ✅ **Search History**: All search queries used
- ✅ **Error Log**: Any errors encountered

### Step-by-Step: Export Your Data

1. **Open the Extension**: Click the Shopline Category Manager icon
2. **Click "匯出資料"**: Look for the Export button
3. **File Downloads**: Automatically saves to Downloads folder
4. **Filename**: `shopline-category-backup-YYYY-MM-DD.json`

### Export Summary Message

After export, you'll see a status message showing:
- Number of records exported
- File size
- Export confirmation

---

## How to Import Your Data

### What Happens During Import?

Import takes your saved `.json` file and restores it into the extension:
1. **Validation** - Checks if data is valid and complete
2. **Preview** - Shows what will be imported
3. **Conflicts** - Detects if data already exists
4. **Confirmation** - You approve the action
5. **Import** - Data restored to extension
6. **Success** - Statistics updated

### Step-by-Step: Import Your Data

1. **Open the Extension**: Click Shopline Category Manager icon
2. **Click "匯入資料"**: Look for the Import button
3. **Select File**: Choose your backup JSON file
4. **Review Preview**: Check what will be imported
5. **Confirm Import**: Click the Import button
6. **Wait for Completion**: Progress bar shows import status
7. **Success**: Statistics update automatically

---

## Understanding the Import Preview

### Preview Panel Shows

**Data Summary**: Quantity of data to import
- Category Moves: Number of moves
- Search Queries: Number of searches
- Error Records: Number of errors
- File Size: Data file size

**Conflicts** (if any): Issues detected
- Duplicates: Same data already exists
- Version issues: Different extension version
- Severity levels: ERROR, WARNING, INFO

**Merge Strategy**: How conflicts will be handled
- Skip duplicates
- Merge new data
- Recalculate statistics

**Impact Preview**: What will change
- Before/After statistics
- Net additions
- New totals

---

## Handling Conflicts

### What Are Conflicts?

Conflicts occur when importing data that partially already exists:
- **DUPLICATE_MOVE**: Same move already recorded (will be skipped)
- **DUPLICATE_SEARCH**: Same search term already exists (will be skipped)
- **VERSION_MISMATCH**: Different extension version (proceed with caution)

### How They're Handled

- **Duplicates are skipped**: Only new data is added
- **Existing data preserved**: Your current records kept
- **No data loss**: Everything remains safe
- **Smart merging**: Only non-duplicate data added

### Best Practice: Always Save a Backup First

Before importing, click **"Save Backup"** to:
1. Export your current data
2. Have recovery copy if needed
3. Know exactly what you had before

---

## Troubleshooting

### "Invalid JSON Format" Error

**What it means**: Your file is corrupted or not valid JSON

**How to fix**:
1. Use original exported file (don't edit)
2. Or export your data fresh
3. Try importing different file

### "Missing Required Field" Error

**What it means**: Your file is incomplete

**How to fix**:
1. Use complete exported file
2. Don't manually create JSON files
3. Use official export function

### Import Hangs/Takes Too Long

**What it means**: Large file taking time to process

**How to fix**:
1. Wait 10+ seconds for completion
2. Large files (100+ moves) take longer
3. If >30 seconds, reload extension

### "Storage Space Full" Error

**What it means**: Chrome storage quota exceeded

**How to fix**:
1. Export and backup your data
2. Clear old history to free space
3. Try importing again

---

## FAQ

**Q: How often should I backup my data?**
A: Monthly for routine backups, or before major browser changes

**Q: Can I backup to cloud storage?**
A: Yes! Save exported files to Google Drive, OneDrive, etc.

**Q: What if I mess up an import?**
A: Restore from your backup file you saved before importing

**Q: Do backups include passwords?**
A: No, only statistics and usage history

**Q: Can I edit the backup file?**
A: Not recommended unless you know JSON syntax

**Q: How long do backups last?**
A: Indefinitely - they're just data files you keep

---

## Best Practices

### Backup Strategy

- Export monthly
- Save before major changes
- Keep 3-6 months of backups
- Use cloud storage for safety

### File Organization

**Good naming**:
- `shopline-backup-2026-01-27.json` (has date)
- `shopline-backup-2026-01-27-work.json` (descriptive)

**Good storage**:
- Desktop folder "Backups"
- Google Drive
- OneDrive
- Email to yourself

### Data Management

**When to clean history**:
- Extension storage getting full
- Keeping data older than 1 year
- Want faster extension performance

**How to clean**:
1. Export current data first (backup)
2. Click settings
3. Click "Clear History"
4. Choose date range to clear

---

## Tips & Tricks

✅ **DO**:
- Export regularly
- Keep backups in cloud
- Review preview before importing
- Save backup before import

❌ **DON'T**:
- Edit JSON files manually
- Share backup files
- Delete all backups
- Import from untrusted sources

---

**Thank you for using Shopline Category Manager!**

For questions, refer to USAGE_GUIDE.md or contact support.

Last Updated: 2026-01-27
Version: 1.0
