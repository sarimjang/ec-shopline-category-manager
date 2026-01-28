# Validator Behavior Documentation

**Version**: 1.0
**Last Updated**: 2026-01-28
**Purpose**: Comprehensive documentation of all validation rules, constraints, and edge cases

## Table of Contents

1. [Overview](#overview)
2. [Input Validator (ShoplineInputValidator)](#input-validator-shoplineinputvalidator)
3. [Import Validator (ShoplineImportValidator)](#import-validator-shoplineimportvalidator)
4. [Validation Rules & Constraints](#validation-rules--constraints)
5. [Edge Cases & Boundary Conditions](#edge-cases--boundary-conditions)
6. [Code Examples](#code-examples)
7. [Error Response Format](#error-response-format)
8. [Security Protections](#security-protections)

---

## Overview

The validator system consists of two complementary modules:

| Validator | Purpose | Focus |
|-----------|---------|-------|
| **Input Validator** | User input and request validation | Type checking, injection prevention, whitelist enforcement |
| **Import Validator** | JSON import data validation | Schema validation, data structure, timestamp formats |

Both validators operate in the browser environment and are exposed globally:
- `window.ShoplineInputValidator`
- `window.ShoplineImportValidator`

### Core Philosophy

1. **防禦深度 (Defense in Depth)**: Multiple validation layers
2. **快速失敗 (Fail Fast)**: Reject invalid input immediately
3. **詳細錯誤 (Detailed Errors)**: Provide actionable error messages
4. **安全優先 (Security First)**: Prevent injection attacks before processing

---

## Input Validator (ShoplineInputValidator)

### Purpose

Comprehensive validation of user input and internal API requests to prevent:
- XSS (Cross-Site Scripting) attacks
- SQL/Script injection
- Data type mismatches
- Buffer overflows (via length limits)
- Unauthorized actions

### Public API

```javascript
// Validation Functions
ShoplineInputValidator.validateRequestStructure(request)
ShoplineInputValidator.validateAction(action)
ShoplineInputValidator.validateQuery(query)
ShoplineInputValidator.validateCategoryId(categoryId)
ShoplineInputValidator.validateTimeSaved(timeSaved)
ShoplineInputValidator.validateErrorType(errorType)
ShoplineInputValidator.validateErrorMessage(message)
ShoplineInputValidator.validateJsonString(jsonString)
ShoplineInputValidator.validateDataObject(data)
ShoplineInputValidator.validateCategories(categories)

// Utility Functions
ShoplineInputValidator.escapeXSS(str)
ShoplineInputValidator.detectInjectionAttacks(input)
ShoplineInputValidator.validateStringLength(str, maxLength)

// Constants
ShoplineInputValidator.ALLOWED_ACTIONS          // Action whitelist
ShoplineInputValidator.ALLOWED_STORAGE_KEYS     // Storage key whitelist
ShoplineInputValidator.ERROR_TYPES              // Error type whitelist
ShoplineInputValidator.LIMITS                   // Size/length limits
```

### Validation Functions

#### 1. `validateRequestStructure(request)`

**Purpose**: Verify the basic structure of a message/request object

**Input**:
- `request` (any): The object to validate

**Returns**:
```javascript
{
  valid: boolean,
  errors: Array<{
    field: string,
    error: string,
    type: string
  }>
}
```

**Rules**:
- Must be a non-null object
- Must contain `action` field

**Examples**:
```javascript
// Valid
validateRequestStructure({ action: 'getStats' })
// → { valid: true, errors: [] }

// Invalid: null
validateRequestStructure(null)
// → { valid: false, errors: [{ field: 'request', ... }] }

// Invalid: missing action
validateRequestStructure({ data: 'test' })
// → { valid: false, errors: [{ field: 'action', ... }] }
```

---

#### 2. `validateAction(action)`

**Purpose**: Validate action name against whitelist and security rules

**Input**:
- `action` (string): The action name to validate

**Returns**: Validation result object

**Rules**:
1. Must be a string
2. Must not exceed 100 characters
3. Must be in ALLOWED_ACTIONS whitelist
4. Must not contain injection attack patterns

**Whitelisted Actions**:
```javascript
ALLOWED_ACTIONS = {
  'getCategories': true,
  'updateCategories': true,
  'exportData': true,
  'validateImportData': true,
  'executeImportData': true,
  'recordCategoryMove': true,
  'getStats': true,
  'resetStats': true,
  'getSearchHistory': true,
  'recordSearchQuery': true,
  'classifyError': true,
  'getErrorLog': true,
  'validateCategoryPath': true,
  'getMoveHistory': true
}
```

**Examples**:
```javascript
// Valid action
validateAction('getStats')
// → { valid: true, errors: [] }

// Invalid: not in whitelist
validateAction('maliciousAction')
// → { valid: false, errors: [...] type: 'WHITELIST_ERROR' }

// Invalid: contains script
validateAction('getStats<script>')
// → { valid: false, errors: [...] type: 'INJECTION_DETECTED' }
```

---

#### 3. `validateQuery(query)`

**Purpose**: Validate search/filter query strings

**Input**:
- `query` (string): Search query to validate

**Returns**: Validation result object

**Rules**:
1. Must be a string
2. Must not exceed 500 characters
3. Must not be empty or whitespace-only
4. Must not contain injection attack patterns

**Examples**:
```javascript
// Valid query
validateQuery('category name')
// → { valid: true, errors: [] }

// Invalid: empty
validateQuery('')
// → { valid: false, errors: [...] type: 'EMPTY_VALUE' }

// Invalid: SQL injection
validateQuery('SELECT * FROM users')
// → { valid: false, errors: [...] type: 'INJECTION_DETECTED' }

// Invalid: exceeds limit
validateQuery('a'.repeat(501))
// → { valid: false, errors: [...] type: 'LENGTH_ERROR' }
```

---

#### 4. `validateCategoryId(categoryId)`

**Purpose**: Validate category identifiers

**Input**:
- `categoryId` (string | number): The category ID

**Returns**: Validation result object

**Rules**:
1. Must be a string or number
2. Max length: 200 characters
3. Must match format: alphanumeric, underscore, hyphen only (`/^[a-zA-Z0-9_-]+$/`)

**Examples**:
```javascript
// Valid: string
validateCategoryId('cat-123')
// → { valid: true, errors: [] }

// Valid: number
validateCategoryId(456)
// → { valid: true, errors: [] }

// Invalid: special characters
validateCategoryId('cat@123')
// → { valid: false, errors: [...] type: 'FORMAT_ERROR' }

// Invalid: type
validateCategoryId({})
// → { valid: false, errors: [...] type: 'TYPE_ERROR' }
```

---

#### 5. `validateTimeSaved(timeSaved)`

**Purpose**: Validate time saved values (in seconds)

**Input**:
- `timeSaved` (number): Time saved in seconds

**Returns**: Validation result object

**Rules**:
1. Must be a number
2. Must be a non-negative integer
3. Must not exceed 999,999
4. Fractional values are rejected

**Examples**:
```javascript
// Valid
validateTimeSaved(100)
// → { valid: true, errors: [] }

// Invalid: negative
validateTimeSaved(-10)
// → { valid: false, errors: [...] type: 'VALIDATION_ERROR' }

// Invalid: decimal
validateTimeSaved(10.5)
// → { valid: false, errors: [...] type: 'TYPE_ERROR' }

// Invalid: type
validateTimeSaved('100')
// → { valid: false, errors: [...] type: 'TYPE_ERROR' }
```

---

#### 6. `validateErrorType(errorType)`

**Purpose**: Validate error classification types

**Input**:
- `errorType` (string): Error type classification

**Returns**: Validation result object

**Rules**:
1. Must be a string
2. Must be in ERROR_TYPES whitelist

**Whitelisted Error Types**:
- `network` - Network-related errors
- `api` - API response errors
- `validation` - Data validation errors
- `scope` - Permission/scope errors

**Examples**:
```javascript
// Valid
validateErrorType('network')
// → { valid: true, errors: [] }

// Invalid: not in whitelist
validateErrorType('unknown')
// → { valid: false, errors: [...] type: 'WHITELIST_ERROR' }
```

---

#### 7. `validateErrorMessage(message)`

**Purpose**: Validate error message strings

**Input**:
- `message` (string): Error message

**Returns**: Validation result object

**Rules**:
1. Must be a string
2. Max length: 2,000 characters
3. Must not contain injection attack patterns

**Examples**:
```javascript
// Valid
validateErrorMessage('An error occurred')
// → { valid: true, errors: [] }

// Invalid: injection attempt
validateErrorMessage('<script>alert("xss")</script>')
// → { valid: false, errors: [...] type: 'INJECTION_DETECTED' }
```

---

#### 8. `validateJsonString(jsonString)`

**Purpose**: Validate JSON strings (for import data)

**Input**:
- `jsonString` (string): JSON string to validate

**Returns**: Validation result object

**Rules**:
1. Must be a string
2. Max size: 10 MB (10,485,760 bytes)
3. Must not be empty
4. Must not contain excessive nesting (>100 levels) to prevent DoS

**Examples**:
```javascript
// Valid
validateJsonString('{"key":"value"}')
// → { valid: true, errors: [] }

// Invalid: empty
validateJsonString('')
// → { valid: false, errors: [...] type: 'EMPTY_VALUE' }

// Invalid: deeply nested JSON
validateJsonString('{"a":' + '{"b":'.repeat(101) + '1}')
// → { valid: false, errors: [...] type: 'INJECTION_DETECTED' }
```

---

#### 9. `validateDataObject(data)`

**Purpose**: Validate storage data objects with whitelist enforcement

**Input**:
- `data` (any): Data object to validate

**Returns**: Validation result object

**Rules**:
1. Must be a non-null object
2. Must not be an array
3. All keys must be in ALLOWED_STORAGE_KEYS whitelist

**Whitelisted Storage Keys**:
```javascript
ALLOWED_STORAGE_KEYS = {
  'categories': true,
  'categoryMoveStats': true,
  'moveHistory': true,
  'searchHistory': true,
  'errorLog': true,
  'importTimestamp': true,
  'exports': true,
  'imports': true
}
```

**Examples**:
```javascript
// Valid
validateDataObject({
  categories: [...],
  categoryMoveStats: { totalMoves: 0 }
})
// → { valid: true, errors: [] }

// Invalid: array
validateDataObject([1, 2, 3])
// → { valid: false, errors: [...] type: 'TYPE_ERROR' }

// Invalid: unknown key
validateDataObject({ unknownKey: 'value' })
// → { valid: false, errors: [...] type: 'WHITELIST_ERROR' }
```

---

#### 10. `validateCategories(categories)`

**Purpose**: Validate category data arrays

**Input**:
- `categories` (any): Categories array to validate

**Returns**: Validation result object

**Rules**:
1. Must be an array
2. Max items: 10,000
3. Each item must be a non-null object
4. Each item must have `id` field

**Examples**:
```javascript
// Valid
validateCategories([
  { id: '1', name: 'Category 1' },
  { id: '2', name: 'Category 2' }
])
// → { valid: true, errors: [] }

// Invalid: not an array
validateCategories('not an array')
// → { valid: false, errors: [...] type: 'TYPE_ERROR' }

// Invalid: missing id
validateCategories([{ name: 'Test' }])
// → { valid: false, errors: [...] type: 'MISSING_FIELD' }

// Invalid: too many items
validateCategories(Array(10001).fill({ id: 'x' }))
// → { valid: false, errors: [...] type: 'SIZE_ERROR' }
```

---

### Utility Functions

#### `escapeXSS(str)`

Escapes dangerous HTML characters to prevent XSS attacks.

**Input**: `str` (string or any) - String to escape

**Returns**: `string` - Escaped string, or empty string if input is not a string

**Character Mapping**:
```javascript
'<' → '&lt;'
'>' → '&gt;'
'"' → '&quot;'
"'" → '&#39;'
'`' → '&#x60;'
'&' → '&amp;'
```

**Examples**:
```javascript
escapeXSS('<script>alert("xss")</script>')
// → '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'

escapeXSS('normal text')
// → 'normal text'

escapeXSS(null)
// → ''
```

---

#### `detectInjectionAttacks(input)`

Detects potential injection attack patterns in strings.

**Input**: `input` (string or any) - String to analyze

**Returns**: `Array<Object>` - List of detected attacks with structure:
```javascript
{
  type: string,              // Attack type (SQL_INJECTION, etc.)
  pattern: string,           // Description of what was detected
  severity: string           // CRITICAL, HIGH, MEDIUM
}
```

**Detection Patterns**:

| Type | Pattern | Severity | Example |
|------|---------|----------|---------|
| `SQL_INJECTION` | SQL keywords (SELECT, INSERT, UPDATE, etc.) | HIGH | `SELECT * FROM users` |
| `SCRIPT_INJECTION` | Script tags or event handlers | CRITICAL | `<script>`, `javascript:`, `onclick=` |
| `NULL_BYTE_INJECTION` | Null byte character `\0` | HIGH | `test\0null` |
| `DEEP_NESTING` | >100 nested braces/brackets | MEDIUM | Deeply nested JSON |

**Examples**:
```javascript
detectInjectionAttacks('SELECT * FROM users')
// → [{ type: 'SQL_INJECTION', pattern: 'SQL keywords detected', severity: 'HIGH' }]

detectInjectionAttacks('<script>alert("xss")</script>')
// → [{ type: 'SCRIPT_INJECTION', pattern: 'Script tags or event handlers detected', severity: 'CRITICAL' }]

detectInjectionAttacks('normal input')
// → []

detectInjectionAttacks(null)
// → []
```

---

#### `validateStringLength(str, maxLength)`

Validates string length constraints.

**Input**:
- `str` (any) - String to validate
- `maxLength` (number) - Maximum allowed length

**Returns**:
```javascript
// Valid
{ valid: true, length: number, maxLength: number }

// Invalid
{ valid: false, error: string, length: number, maxLength: number }
```

**Examples**:
```javascript
validateStringLength('test', 100)
// → { valid: true, length: 4, maxLength: 100 }

validateStringLength('a'.repeat(101), 100)
// → { valid: false, error: 'String exceeds maximum...', length: 101, maxLength: 100 }

validateStringLength(123, 100)
// → { valid: false, error: 'Input is not a string', length: null }
```

---

### Constants

#### LIMITS

Size and length constraints for all validators:

```javascript
LIMITS = {
  action: 100,               // Max action name length
  query: 500,                // Max query string length
  categoryId: 200,           // Max category ID length
  targetCategoryId: 200,     // Max target category ID length
  categoryName: 255,         // Max category name length
  message: 5000,             // Max message length
  errorMessage: 2000,        // Max error message length
  timeSaved: 999999,         // Max time saved value (seconds)
  jsonString: 10 * 1024 * 1024 // Max JSON string size (10MB)
}
```

---

## Import Validator (ShoplineImportValidator)

### Purpose

Validates JSON import data structure, format, and schema compatibility.

### Public API

```javascript
// Main validation
ShoplineImportValidator.validateImportData(jsonString)

// Component validators
ShoplineImportValidator.validateJsonFormat(jsonString)
ShoplineImportValidator.validateRequiredFields(data)
ShoplineImportValidator.validateDataTypes(data)
ShoplineImportValidator.validateTimestampFormats(data)
ShoplineImportValidator.validateSchemaVersion(data)
ShoplineImportValidator.validateDataBoundaries(data)
ShoplineImportValidator.generateDataSummary(data)

// Constants
ShoplineImportValidator.SEVERITY
```

### Validation Functions

#### 1. `validateImportData(jsonString)`

**Purpose**: Complete validation of import JSON data

**Input**:
- `jsonString` (any): JSON string to validate

**Returns**:
```javascript
{
  isValid: boolean,
  data: object | null,
  errors: Array<ValidationError>,
  warnings: Array<ValidationWarning>,
  summary: object | null,
  schemaVersion: object
}
```

**Validation Steps** (in order):
1. JSON format validation
2. Schema version compatibility
3. Required fields presence
4. Data type checking
5. Timestamp format validation
6. Boundary constraints
7. Data truncation (if valid)

**Examples**:
```javascript
// Valid complete import
validateImportData('{"categoryMoveStats":{...},"moveHistory":[...],...}')
// → { isValid: true, data: {...}, errors: [], warnings: [], summary: {...} }

// Invalid JSON format
validateImportData('{invalid}')
// → { isValid: false, data: null, errors: [{ type: 'JSON_FORMAT_ERROR' }] }

// Missing required fields
validateImportData('{}')
// → { isValid: false, errors: [{ type: 'MISSING_FIELDS', message: 'Missing: categoryMoveStats, moveHistory, ...' }] }
```

---

#### 2. `validateJsonFormat(jsonString)`

**Purpose**: Validate JSON syntax

**Input**: `jsonString` (any) - String to parse

**Returns**:
```javascript
{
  isValid: boolean,
  data: object | null,
  error: string | null
}
```

**Rules**:
1. Must be a string
2. Must not be empty after trimming
3. Must be valid JSON
4. Root must be an object (not array or primitive)

**Examples**:
```javascript
validateJsonFormat('{"key":"value"}')
// → { isValid: true, data: {...}, error: null }

validateJsonFormat('[1,2,3]')
// → { isValid: false, data: null, error: 'JSON root must be an object' }

validateJsonFormat('{invalid}')
// → { isValid: false, data: null, error: 'JSON parse error: ...' }
```

---

#### 3. `validateRequiredFields(data)`

**Purpose**: Check for presence of required fields

**Input**: `data` (object) - Data to validate

**Returns**: `Array<string>` - List of missing field names

**Required Fields**:
- `categoryMoveStats` - Statistics object
- `moveHistory` - Move history array
- `searchHistory` - Search history array
- `errorLog` - Error log array

**Examples**:
```javascript
validateRequiredFields({
  categoryMoveStats: {},
  moveHistory: [],
  searchHistory: [],
  errorLog: []
})
// → []

validateRequiredFields({ categoryMoveStats: {} })
// → ['moveHistory', 'searchHistory', 'errorLog']
```

---

#### 4. `validateDataTypes(data)`

**Purpose**: Validate types of data fields

**Input**: `data` (object) - Data to validate

**Returns**: `Array<string>` - List of type error messages

**Type Requirements**:

| Field | Expected Type | Notes |
|-------|---------------|-------|
| `categoryMoveStats` | object (not array) | Contains numeric stats |
| `categoryMoveStats.totalMoves` | number | |
| `categoryMoveStats.totalTimeSaved` | number | |
| `moveHistory` | array | |
| `searchHistory` | array | |
| `errorLog` | array | |

**Examples**:
```javascript
validateDataTypes({
  categoryMoveStats: { totalMoves: 10, totalTimeSaved: 100 },
  moveHistory: [],
  searchHistory: [],
  errorLog: []
})
// → []

validateDataTypes({
  categoryMoveStats: 'not an object',
  moveHistory: [],
  searchHistory: [],
  errorLog: []
})
// → ['categoryMoveStats must be an object']
```

---

#### 5. `validateTimestampFormats(data)`

**Purpose**: Validate ISO 8601 timestamp formats

**Input**: `data` (object) - Data containing timestamps

**Returns**: `Array<string>` - List of timestamp error messages

**Timestamp Format**:
```
ISO 8601: YYYY-MM-DDTHH:mm:ss[.sss]Z
Examples: 2026-01-28T12:30:45Z, 2026-01-28T12:30:45.123Z
Regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/
```

**Fields Checked**:
- `categoryMoveStats.lastReset` (if present)

**Examples**:
```javascript
validateTimestampFormats({
  categoryMoveStats: { lastReset: '2026-01-28T12:30:45Z' }
})
// → []

validateTimestampFormats({
  categoryMoveStats: { lastReset: '2026-01-28 12:30:45' }
})
// → ['Invalid ISO 8601 format: 2026-01-28 12:30:45']
```

---

#### 6. `validateSchemaVersion(data)`

**Purpose**: Verify schema version compatibility

**Input**: `data` (object) - Data with optional version field

**Returns**:
```javascript
{
  compatible: boolean,
  version: number,
  message: string
}
```

**Supported Versions**: `[1]`

**Default Version**: `1` (if not specified in data)

**Examples**:
```javascript
validateSchemaVersion({ version: 1 })
// → { compatible: true, version: 1, message: 'Compatible' }

validateSchemaVersion({})
// → { compatible: true, version: 1, message: 'Compatible' }

validateSchemaVersion({ version: 99 })
// → { compatible: false, version: 99, message: 'Schema version 99 not supported' }
```

---

#### 7. `validateDataBoundaries(data)`

**Purpose**: Check data size boundaries and warn if exceeded

**Input**: `data` (object) - Data to check

**Returns**: `Array<string>` - List of boundary warning messages

**Boundary Limits**:

| Field | Max Items | Notes |
|-------|-----------|-------|
| `moveHistory` | 500 | Warning only, data is truncated if valid |
| `searchHistory` | 50 | Warning only, data is truncated if valid |
| `errorLog` | 100 | Warning only, data is truncated if valid |

**Examples**:
```javascript
validateDataBoundaries({
  moveHistory: Array(600).fill({}),
  searchHistory: [],
  errorLog: []
})
// → ['moveHistory exceeds max 500 records']
```

---

#### 8. `generateDataSummary(data)`

**Purpose**: Generate summary statistics about imported data

**Input**: `data` (object) - Data to summarize

**Returns**:
```javascript
{
  totalMoves: number,
  totalTimeSaved: number,
  moveRecords: number,
  searchQueries: number,
  errorRecords: number,
  exportDate: string | null,
  importDate: string (ISO 8601)
}
```

**Examples**:
```javascript
generateDataSummary({
  categoryMoveStats: { totalMoves: 100, totalTimeSaved: 5000 },
  moveHistory: [1, 2, 3],
  searchHistory: [1, 2],
  errorLog: [1],
  exportDate: '2026-01-27T00:00:00Z'
})
// → {
//     totalMoves: 100,
//     totalTimeSaved: 5000,
//     moveRecords: 3,
//     searchQueries: 2,
//     errorRecords: 1,
//     exportDate: '2026-01-27T00:00:00Z',
//     importDate: '2026-01-28T12:30:45.123Z'
//   }
```

---

## Validation Rules & Constraints

### Type Checking Hierarchy

```
Request Structure
  ├─ Must be object (not null, not array)
  └─ Must have 'action' field

Action
  ├─ Must be string
  ├─ Length: 0-100 characters
  ├─ Must be in whitelist
  └─ Must not contain injection patterns

Query/Message
  ├─ Must be string
  ├─ Length: varies by field
  ├─ Must not be empty
  └─ Must not contain injection patterns

Numbers (timeSaved, stats)
  ├─ Must be number (not string)
  ├─ Must be non-negative
  ├─ Must be integer (if timeSaved)
  └─ Must not exceed limit

Arrays (categories, history)
  ├─ Must be array (not object)
  ├─ Max items: varies by type
  └─ Each item must be valid
```

### Security Layers

```
Layer 1: Type Validation
  ├─ Prevents type coercion exploits
  └─ Fail fast on wrong type

Layer 2: Length Limits
  ├─ Prevents buffer overflow
  ├─ Prevents DoS attacks
  └─ Prevents storage exhaustion

Layer 3: Whitelist Enforcement
  ├─ Actions must be whitelisted
  ├─ Keys must be whitelisted
  └─ Error types must be whitelisted

Layer 4: Injection Detection
  ├─ SQL keywords detection
  ├─ Script/HTML tag detection
  ├─ Null byte detection
  └─ Deep nesting detection

Layer 5: Data Integrity
  ├─ Required fields check
  ├─ Data structure validation
  └─ Timestamp format verification
```

---

## Edge Cases & Boundary Conditions

### String Length Boundaries

```javascript
// At boundary
validateQuery('a'.repeat(500))     // VALID (exactly at limit)
validateQuery('a'.repeat(501))     // INVALID (over limit)

// Empty strings
validateQuery('')                   // INVALID (empty)
validateQuery('   ')                // INVALID (whitespace-only)
validateQuery(' x ')                // VALID (trimmed content exists)
```

### Number Boundaries

```javascript
// Time saved boundaries
validateTimeSaved(0)               // VALID
validateTimeSaved(999999)          // VALID (at limit)
validateTimeSaved(1000000)         // INVALID (over limit)
validateTimeSaved(-1)              // INVALID (negative)
validateTimeSaved(10.5)            // INVALID (not integer)
validateTimeSaved(Infinity)        // INVALID
validateTimeSaved(NaN)             // INVALID
```

### Array Boundaries

```javascript
// Categories array
validateCategories([])             // VALID (empty array)
validateCategories(Array(10000).fill({id:'x'}))  // VALID (at limit)
validateCategories(Array(10001).fill({id:'x'}))  // INVALID (over limit)

// Items must have id field
validateCategories([{id:'1'}, {name:'x'}])  // INVALID (missing id)
```

### Import Data Boundaries

```javascript
// moveHistory truncation (if valid)
validateImportData(json with 600 moves)
// → data.moveHistory truncated to last 500 items
// → warning added to warnings array

// searchHistory truncation
validateImportData(json with 100 searches)
// → data.searchHistory truncated to last 50 items

// Boundaries only enforced when isValid=true
validateImportData(json with invalid types AND 600 moves)
// → data not truncated (invalid returns before truncation)
```

### Type Coercion Prevention

```javascript
// Category ID accepts string or number but not others
validateCategoryId('123')          // VALID
validateCategoryId(123)            // VALID
validateCategoryId(true)           // INVALID (boolean)
validateCategoryId(null)           // INVALID (null)
validateCategoryId(undefined)      // INVALID (undefined)

// Action must be string, no coercion
validateAction(123)                // INVALID (not coerced to string)
validateAction(null)               // INVALID (not coerced)
```

### Injection Attack Edge Cases

```javascript
// Case insensitive detection
detectInjectionAttacks('select * from users')  // DETECTED (lowercase)
detectInjectionAttacks('SELECT * FROM users')  // DETECTED (uppercase)
detectInjectionAttacks('SeLeCt * FROM users')  // DETECTED (mixed case)

// Whitespace handling
detectInjectionAttacks(' SELECT ')             // DETECTED (with spaces)
detectInjectionAttacks('/*SELECT*/comment')    // NOT DETECTED (word boundary)

// Event handlers
detectInjectionAttacks('onclick=')             // DETECTED
detectInjectionAttacks('on click=')            // NOT DETECTED (space breaks pattern)
```

### JSON Nesting Depth

```javascript
// The validator counts opening braces/brackets
let shallow = '{"a":{"b":{"c":1}}}' // 3 levels, VALID
let deep = '{"a":' + '{"b":'.repeat(101) + '1}' // 102 levels, INVALID

// Counting logic
'{[{[{ ... }]}]}' // Each { and [ increments counter
```

---

## Code Examples

### Example 1: Validating User Input (Safe)

```javascript
// User clicks a search button
const userQuery = document.getElementById('searchInput').value;

const validation = ShoplineInputValidator.validateQuery(userQuery);
if (!validation.valid) {
  // Show error to user
  displayError(validation.errors[0].error);
  return;
}

// Safe to use userQuery now
performSearch(userQuery);
```

### Example 2: Validating Import Data

```javascript
const importJson = fileContent;

const validation = ShoplineImportValidator.validateImportData(importJson);

if (!validation.isValid) {
  console.error('Import validation failed:');
  validation.errors.forEach(err => {
    console.error(`  - ${err.type}: ${err.message}`);
  });
  return;
}

console.log('Import Summary:', validation.summary);
console.log('Warnings:', validation.warnings);

// Safe to process validation.data
applyImportedData(validation.data);
```

### Example 3: Request Message Validation

```javascript
const request = {
  action: 'recordCategoryMove',
  categoryId: 'cat-123',
  targetCategoryId: 'cat-456',
  timeSaved: 45
};

// Validate structure
const structResult = ShoplineInputValidator.validateRequestStructure(request);
if (!structResult.valid) throw new Error('Invalid request structure');

// Validate each field
const actionResult = ShoplineInputValidator.validateAction(request.action);
const catIdResult = ShoplineInputValidator.validateCategoryId(request.categoryId);
const targetIdResult = ShoplineInputValidator.validateCategoryId(request.targetCategoryId);
const timeResult = ShoplineInputValidator.validateTimeSaved(request.timeSaved);

const allValid = [actionResult, catIdResult, targetIdResult, timeResult]
  .every(r => r.valid);

if (!allValid) {
  throw new Error('Request validation failed');
}

// Safe to process request
sendMessage(request);
```

### Example 4: XSS Protection

```javascript
// User input might contain HTML
const userInput = '<img src=x onerror="alert(1)">';

// Option 1: Validate and reject
const validation = ShoplineInputValidator.validateQuery(userInput);
if (!validation.valid) {
  console.log('Rejected due to injection detection');
  return;
}

// Option 2: Escape for safe display
const escaped = ShoplineInputValidator.escapeXSS(userInput);
// Result: '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
document.getElementById('display').textContent = escaped; // Safe to display
```

### Example 5: Complete Import Workflow

```javascript
async function importCategoryData() {
  const fileInput = document.getElementById('file-input');
  const file = fileInput.files[0];
  const content = await file.text();

  // Step 1: Validate JSON format
  const validation = ShoplineImportValidator.validateImportData(content);

  if (!validation.isValid) {
    // Display critical errors
    validation.errors.forEach(err => {
      console.error(`Error: ${err.message}`);
    });
    return false;
  }

  // Step 2: Check warnings
  if (validation.warnings.length > 0) {
    console.warn('Import warnings:');
    validation.warnings.forEach(w => console.warn(`  - ${w.message}`));
  }

  // Step 3: Show summary to user
  console.log('Import Summary:');
  console.log(`  Total Moves: ${validation.summary.totalMoves}`);
  console.log(`  Records: ${validation.summary.moveRecords}`);

  // Step 4: Apply data
  await chrome.storage.local.set({
    categoryMoveStats: validation.data.categoryMoveStats,
    moveHistory: validation.data.moveHistory,
    searchHistory: validation.data.searchHistory,
    errorLog: validation.data.errorLog
  });

  return true;
}
```

---

## Error Response Format

### Input Validator Error Object

```javascript
{
  field: string,              // Which field has error
  error: string,              // Human-readable error message
  type: string,               // Error category (see below)
  attacks?: Array<Object>,    // For INJECTION_DETECTED
  length?: number,            // For LENGTH_ERROR
  maxLength?: number,         // For LENGTH_ERROR
  invalidKeys?: Array<string> // For WHITELIST_ERROR
}
```

### Error Types (Input Validator)

| Type | Meaning | Common Causes |
|------|---------|---------------|
| `TYPE_ERROR` | Wrong type | String instead of number, etc. |
| `LENGTH_ERROR` | String too long | Exceeds max length limit |
| `WHITELIST_ERROR` | Not in allowed list | Unknown action, invalid key |
| `FORMAT_ERROR` | Invalid format | Category ID with special chars |
| `VALIDATION_ERROR` | Logic validation failed | Negative number, empty string |
| `MISSING_FIELD` | Required field absent | Request without action |
| `INJECTION_DETECTED` | Security threat | SQL keywords, script tags |
| `EMPTY_VALUE` | Empty/whitespace-only | Blank query string |
| `SIZE_ERROR` | Data too large | Array > 10000 items |
| `INVALID_STRUCTURE` | Object structure wrong | Null instead of object |

### Import Validator Error Object

```javascript
{
  severity: string,           // INFO, WARNING, ERROR
  type: string,               // Error category
  message: string             // Human-readable message
}
```

### Error Types (Import Validator)

| Type | Severity | Meaning |
|------|----------|---------|
| `JSON_FORMAT_ERROR` | ERROR | Invalid JSON syntax |
| `SCHEMA_VERSION_ERROR` | ERROR | Unsupported schema version |
| `MISSING_FIELDS` | ERROR | Required fields missing |
| `TYPE_ERROR` | ERROR | Wrong data type |
| `TIMESTAMP_FORMAT_WARNING` | WARNING | Invalid timestamp format |
| `DATA_BOUNDARY_WARNING` | WARNING | Data exceeds recommended size |

---

## Security Protections

### XSS Prevention

1. **Input Escaping**: `escapeXSS()` converts dangerous characters to HTML entities
2. **Injection Detection**: Pattern matching for common XSS vectors
3. **Content Security Policy**: Use with CSP headers for defense in depth

**Protected Characters**:
```
< > " ' ` &
```

### Injection Attack Prevention

1. **SQL Injection**: Detects SQL keywords (SELECT, DROP, INSERT, etc.)
2. **Script Injection**: Detects `<script>`, `javascript:`, event handlers
3. **Null Byte Injection**: Detects `\0` characters
4. **Deep Nesting DoS**: Prevents excessive JSON nesting (>100 levels)

### Rate Limiting & Size Limits

1. **String Length Limits**: Prevents buffer overflow attacks
2. **Array Size Limits**: Categories max 10,000 items
3. **JSON Size Limits**: Max 10 MB
4. **Nesting Depth Limits**: Max 100 levels

### Data Integrity

1. **Whitelist Enforcement**: Only allowed actions, keys, types
2. **Type Validation**: Prevents type coercion exploits
3. **Required Fields**: All mandatory fields must be present
4. **Schema Versioning**: Ensures compatibility

### Logging & Monitoring

1. **Rejection Logging**: Failed validations are logged
2. **Severity Classification**: Injection attacks marked as CRITICAL
3. **Development Debugging**: Detailed logs in dev mode

---

## Testing the Validators

### Running Unit Tests

```bash
# Input Validator tests
npm test -- input-validator.test.js

# Import Validator tests
npm test -- import-validator.test.js
```

### Manual Testing Checklist

- [ ] Valid inputs pass validation
- [ ] Invalid types are rejected
- [ ] Boundary values work correctly
- [ ] Injection patterns are detected
- [ ] XSS escaping works
- [ ] Whitelist enforcement works
- [ ] Length limits are enforced
- [ ] Import data truncation works
- [ ] Error messages are helpful
- [ ] All constants are accessible

---

## Related Files

| File | Purpose |
|------|---------|
| `src/shared/input-validator.js` | Input validation implementation |
| `src/shared/import-validator.js` | Import validation implementation |
| `tests/input-validator.test.js` | Input validator unit tests |
| `tests/import-validator.test.js` | Import validator test cases |
| `docs/MESSAGE_PASSING_SPEC.md` | Request/response message format |

---

**Document Version**: 1.0
**Last Updated**: 2026-01-28
**Status**: Complete
