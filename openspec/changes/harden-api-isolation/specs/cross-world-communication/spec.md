# Spec: Cross-World Communication Hardening

## ADDED Requirements

### Requirement: Nonce Generation and Validation
**ID**: CWC-001
**Severity**: CRITICAL

The content script SHALL generate a cryptographically secure random nonce and validate all initialization events against it.

#### Scenario: Valid Nonce Accepted
- The content script SHALL generate a 128-bit random nonce using crypto.getRandomValues
- The nonce SHALL be injected as `script.dataset.nonce` before script execution
- The injected script SHALL read the nonce from the script tag
- The injected script SHALL include the nonce in the `categoryManagerReady` event: `detail: { nonce }`
- The content script SHALL validate that the nonce in the event matches the injected nonce
- The initialization SHALL proceed only if the nonce is valid

#### Scenario: Invalid Nonce Rejected
- If a page script attempts to dispatch `categoryManagerReady` without a nonce
- OR if the nonce value is incorrect or missing
- THEN the event SHALL be rejected and initialization SHALL NOT proceed
- The rejection SHALL be logged without exposing the expected nonce value

### Requirement: Event Listener Cleanup
**ID**: CWC-002
**Severity**: HIGH

The content script SHALL prevent event listener memory leaks through proper cleanup.

#### Scenario: No Listener Leaks
- Event listeners for `categoryManagerReady` SHALL be stored in a named variable for later cleanup
- The same function reference SHALL be passed to `removeEventListener` to ensure removal
- An `isInitialized` flag SHALL prevent duplicate listener registration on reinit
- The DevTools Memory Profiler SHALL show no lingering event listeners after normal operation

### Requirement: Message Structure Validation
**ID**: CWC-003
**Severity**: HIGH

All cross-world communication messages SHALL conform to a standardized schema with required fields and validation rules.

#### Scenario: Valid Message Structure
- Messages SHALL contain the following required fields:
  - `type` (string): Message type identifier (categoryManagerReady, categoryMoved, syncCategories, etc.)
  - `payload` (object): Non-empty payload object containing message-specific data
  - `source` (string): Message source (must be scm-injected or scm-content-script)
  - `nonce` (string): 32-character hex nonce from Phase 1.1
  - `signature` (string): Cryptographic signature from Phase 1.4 (may be empty for basic security level)
- The MessageValidator class SHALL enforce these requirements
- Invalid messages SHALL be rejected with clear error messages

#### Scenario: Message Type Catalog
- `categoryManagerReady`: Indicates injected script successfully initialized (payload: { ready: true })
- `categoryMoved`: Indicates user moved a category (payload: { fromId, toId, timestamp })
- `syncCategories`: Requests category list sync (payload: { categories: [...] })
- Extension MAY define additional message types as needed

### Requirement: Cross-World Message Schema Documentation
**ID**: CWC-004
**Severity**: MEDIUM

Message schemas SHALL be documented for developer reference and consistency.

#### Scenario: Schema Documentation
- Create docs/MESSAGE_SCHEMA.md documenting:
  - All message types with examples
  - Required vs optional fields
  - Validation rules for each field
  - Error codes and meanings
  - Usage patterns and best practices
- Documentation SHALL be reviewed for accuracy before Phase 1.9

### Requirement: Message Serialization & Deserialization
**ID**: CWC-005
**Severity**: HIGH

Messages SHALL be consistently serialized and deserialized across the isolated/main world boundary.

#### Scenario: Consistent Serialization
- Messages SHALL use JSON.stringify() for serialization
- CustomEvent.detail SHALL contain the complete message object
- Signature field SHALL be excluded from cryptographic operations (handled by MessageSigner)
- Round-trip serialization/deserialization SHALL preserve all required fields

## Integration & Security Testing Requirements

### Requirement: Complete Cross-World Handshake Test Suite
**ID**: CWC-TEST-001
**Severity**: HIGH

The integration test suite SHALL verify the complete nonce-based handshake flow under all conditions.

#### Scenario: Valid Initialization Sequence
- Given init.js generates and injects a nonce
- When injected.js receives the nonce from script.dataset
- And injected.js includes the nonce in categoryManagerReady event
- And init.js validates the nonce matches
- THEN initialization SHALL succeed and category manager SHALL be functional
- AND the test SHALL verify MessageValidator and CrossWorldValidator accept the message

#### Scenario: Tampering Detection
- Given an attacker attempts to spoof categoryManagerReady event
- When payload is modified after being signed
- OR nonce is replaced with different value
- OR signature is removed or invalid
- THEN init.js SHALL reject the event and refuse to initialize
- AND security event SHALL be logged

#### Scenario: Nonce Lifecycle Management
- Given a valid nonce is generated
- When nonce is used once and marked as consumed
- Then the same nonce SHALL NOT be accepted on subsequent attempts
- AND attempting to reuse nonce SHALL be rejected with "nonce already used" error
- AND multiple unique nonces SHALL work independently

### Requirement: Attack Scenario Testing
**ID**: CWC-TEST-002
**Severity**: HIGH

The test suite SHALL simulate realistic attack scenarios to verify defense mechanisms.

#### Scenario: Page Script Impersonation
- Test: Page script attempts to trigger categoryManagerReady without nonce
  - Expected: Event rejected, init fails
- Test: Page script attempts to create fake nonce
  - Expected: Nonce format validation fails OR value doesn't match injected nonce
- Test: Page script attempts to modify event payload
  - Expected: Signature validation fails (if enabled)

#### Scenario: Security Level Behavior
- Test: BASIC security level (structure validation only)
  - Expected: Message accepted if structure valid, nonce valid, signature field present (even if empty)
- Test: MODERATE security level (structure + nonce validation)
  - Expected: Nonce validation required, signature optional
- Test: STRICT security level (all validations)
  - Expected: All validations required, no exceptions

### Requirement: Performance & Resource Testing
**ID**: CWC-TEST-003
**Severity**: MEDIUM

Integration tests SHALL verify performance characteristics and resource usage.

#### Scenario: Initialization Performance
- Nonce generation SHALL complete in < 5ms
- Nonce validation (constant-time comparison) SHALL complete in < 1ms
- Signature verification (if enabled) SHALL complete in < 50ms
- Full initialization handshake SHALL complete in < 100ms

#### Scenario: Memory Management
- Event listeners registered during initialization SHALL be properly cleaned up
- DevTools Memory Profiler test: No lingering event listeners after 10 page reloads
- Nonce manager cleanup cycle: Expired nonces SHALL be removed from memory
- No detectable memory leaks from repeated init/cleanup cycles

## Manual Verification & Deployment Requirements

### Requirement: Functional Verification Checklist
**ID**: CWC-DEPLOY-001
**Severity**: HIGH

Before deployment, manual verification SHALL confirm all functionality works in production environment.

#### Scenario: Real Environment Testing
Manual tester SHALL verify on real Shopline.com instance:
- [ ] Extension loads without errors
- [ ] Category manager initializes successfully on page load
- [ ] Category move operations work normally (same as pre-security version)
- [ ] Quick category move (< 5 items) completes within 2 seconds
- [ ] Batch category move (100+ items) completes with reasonable progress
- [ ] Page refresh: Extension reinitializes correctly with new nonce
- [ ] Multi-tab usage: Each tab maintains independent nonce
- [ ] Multiple store accounts: Switching between accounts works correctly
- [ ] DevTools Console: No ERROR, WARN, or security-related log messages
- [ ] DevTools Network: No suspicious or unexpected requests

#### Scenario: Security Verification
Manual tester SHALL verify security mechanisms work:
- [ ] DevTools Console: Attempt to manually trigger categoryManagerReady event
  - Expected: Event rejected, error logged
- [ ] Verify no window.debugCategoryManager or window.categoryManager exists
- [ ] Verify no window._scm_storage global is exposed
- [ ] Check CSP policy compliance (no inline scripts, only extension-signed)
- [ ] Verify ServiceWorker has isolated storage access

### Requirement: Performance & Stability Verification
**ID**: CWC-DEPLOY-002
**Severity**: MEDIUM

Manual testing SHALL verify performance meets acceptable thresholds.

#### Scenario: Performance Baseline
Manual tester SHALL measure:
- Extension loading time: < 2 seconds
- Nonce generation + injection: < 10ms
- First category move: < 5 seconds
- Subsequent moves: < 2 seconds each
- No dropped frames in UI (60 FPS maintained)
- CPU usage spike < 2 seconds during operations

#### Scenario: Stress Testing
- Move 200+ categories continuously without errors
- Refresh page 10 times rapidly, verify stable operation
- Leave extension running for 1+ hour, monitor memory usage
- Simulate network latency (throttle to 3G), verify graceful handling

#### Scenario: Compatibility Verification
- Test on Shopline pages with different DOM structures
- Test with browser extensions that modify page (adblocker, password manager)
- Test with different Shopline store configurations
- Verify works on Chrome, Edge, and other Chromium browsers

#### Scenario: Rollback Plan
- Document how to quickly revert to previous version if issues found
- Prepare release notes with security improvements highlighted
- Plan phased rollout: 10% → 50% → 100% if possible

## Related Specs
- storage-isolation
- extension-api-protection
