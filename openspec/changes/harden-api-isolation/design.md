# Design: Security Hardening - Isolate Extension APIs from Page Scripts

## Architecture Decision

The Chrome Extension security model requires strict isolation between the isolated world (content script) and the main world (untrusted page scripts).

### Current Vulnerabilities
- `window.debugCategoryManager` - Page scripts can call privileged methods
- `window._scm_storage` - Page scripts can read/write extension storage
- `categoryManagerReady` event - No nonce validation, easy to spoof
- `window.categoryManager` - Leaks internal state

### Solution: Multi-Layer Security

**Phase 1: Nonce-Based Handshake**
- Content script generates random 128-bit nonce
- Injected script reads nonce, includes in initialization event
- Content script validates nonce before accepting initialization
- Prevents page script spoofing

**Phase 2: Storage Message Passing**
- Remove `window._scm_storage` global
- Route all storage through secured message handlers
- Implement allowlist of safe operations
- Replace localStorage with chrome.storage.local

**Phase 3: API Gating**
- Build-time gating: debug APIs only in development
- No internal object exposure
- Message passing validation

**Phase 4: Cleanup & Optimization**
- Event listener cleanup prevents memory leaks
- O(n²) conflict detection → O(n log n) with Map/Set

## Security Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                  ISOLATED WORLD (Content Script)            │
│                                                             │
│  ✓ chrome.storage.local access                             │
│  ✓ Extension APIs                                          │
│  ✓ Message handler allowlist                               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ INJECTED SCRIPT (Main World Bridge)                  │  │
│  │ ✓ Reads nonce from script tag                        │  │
│  │ ✓ Includes nonce in events                           │  │
│  │ ✗ NO direct storage access                           │  │
│  │ ✗ NO debug APIs                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ▲
         │ ONE-WAY: Nonce-validated message passing
         │
┌────────┴──────────────────────────────────────┐
│         PAGE WORLD (Untrusted)               │
│                                               │
│  ✗ CANNOT read extension storage             │
│  ✗ CANNOT call privileged APIs               │
│  ✗ CANNOT spoof initialization (nonce)       │
│                                               │
└───────────────────────────────────────────────┘
```

## Testing Strategy

- **Unit Tests**: Nonce validation, storage isolation, API gating
- **Integration Tests**: Category operations, import/export
- **Security Review**: No API leaks, event validation, CSP compliance
- **Manual QA**: Real Shopline instance testing
