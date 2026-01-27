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

## Related Specs
- storage-isolation
- extension-api-protection
