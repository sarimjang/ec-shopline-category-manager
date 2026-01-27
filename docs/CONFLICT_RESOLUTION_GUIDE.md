# Conflict Resolution Guide

## What Are Conflicts?

Conflicts occur when imported data overlaps with existing data:

- **Duplicate Moves**: Same move operation already exists
- **Duplicate Searches**: Same search query in history
- **Duplicate Errors**: Same error already logged
- **Version Mismatch**: Different schema versions
- **Data Loss Risk**: Importing empty arrays would lose data

## Conflict Types

### 1. Duplicate Moves
Same move with identical categoryId, timestamp, and timeSaved.
**Resolution**: Skip duplicate, keep existing

### 2. Duplicate Searches
Same search query already in history.
**Resolution**: Skip, keep one copy

### 3. Duplicate Errors
Same error type, message, and timestamp.
**Resolution**: Skip duplicate

### 4. Version Mismatch
Imported data uses different schema version.
**Resolution**: Warn user but attempt import

### 5. Data Loss Risk
Importing would delete significant existing data.
**Resolution**: Merge instead of replace

## Merge Strategies

- **MERGE**: Combine from both sources, remove duplicates
- **DEDUPLICATE**: Remove duplicate entries
- **SKIP**: Ignore the duplicate record
- **RECALCULATE**: Recalculate statistics from merged data

## Import Workflow

1. Select file
2. Validate JSON and structure
3. Detect conflicts
4. Show user summary and conflicts
5. Get confirmation
6. Perform merge (if conflicts)
7. Import data
8. Refresh display

## Best Practices

1. Always review conflicts before confirming
2. Keep multiple dated backups
3. Export before importing (create restore point)
4. Verify results after import
5. Monitor statistics for unexpected changes

## FAQ

**Q: Will importing delete my data?**
A: No. MERGE strategy adds to existing data.

**Q: What if I import the same backup twice?**
A: Duplicates are skipped. Data stays the same.

**Q: Can I undo an import?**
A: Export before importing to create restore point.

For more details, see IMPORT_VALIDATION_SPEC.md
