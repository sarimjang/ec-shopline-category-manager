# Change: Security Hardening - Isolate Extension APIs from Page Scripts

## Why

Codex code review identified **5 critical security vulnerabilities** where page scripts can access privileged extension APIs through exposed globals:

1. **Untrusted page can invoke privileged actions** via `window.debugCategoryManager` - any page script (including XSS) can trigger authenticated category operations
2. **Potential data exposure/tampering** via `window._scm_storage` - page scripts can read/write extension storage
3. **No authentication for cross-world events** - page scripts can spoof `categoryManagerReady` event and inject logic
4. **Main-world injection via `<script>` tags** - CSP-sensitive, can silently fail on strict pages
5. **Debug interfaces leak internal objects** - `window.categoryManager` exposes internal state

These vulnerabilities violate the Chrome Extension security model.

## What Changes

### Phase 1: Cross-World Communication Hardening
- **Add nonce/token handshake** between isolated world and main world
- **Remove unsecured event listeners** and prevent memory leaks

### Phase 2: Storage API Isolation
- **Remove global `_scm_storage` exposure**
- **Replace localStorage with secure message passing**

### Phase 3: Extension API Protection
- **Gate debug APIs behind build-time flags**
- **Remove internal object exposure**

### Phase 4: Improve Error Handling & Optimization
- **Add event listener cleanup**
- **Optimize O(n²) conflict detection**

## Impact

### Affected Capabilities
- `cross-world-communication` - NEW: Secure nonce-based handshake
- `storage-isolation` - MODIFIED: Restrict storage access to isolated world
- `extension-api-protection` - MODIFIED: Gate debug APIs and internal objects

### Affected Code
- `src/content/init.js` - Add nonce generation, validation, listener cleanup
- `src/content/injected.js` - Remove debug globals, add nonce validation
- `src/shared/storage.js` - Restrict exports
- `src/shared/conflict-detector.js` - Optimize with Map/Set
- `src/shared/import-validator.js` - Document behavior

### Breaking Changes
- ⚠️ **INTERNAL**: Debug mode no longer accessible via globals
- ✅ **USER-FACING**: No breaking changes

## Success Criteria

1. **Phase 1** ✅ - Nonce handshake, event cleanup
2. **Phase 2** ✅ - Storage isolated to content script
3. **Phase 3** ✅ - Debug APIs gated to development builds
4. **Phase 4** ✅ - Cleanup, optimization

## Timeline

- **Phase 1** - 4-6 hours
- **Phase 2** - 3-4 hours  
- **Phase 3** - 1-2 hours
- **Phase 4** - 2-3 hours
- **Testing** - 2-3 hours

**Total: 12-18 hours**
