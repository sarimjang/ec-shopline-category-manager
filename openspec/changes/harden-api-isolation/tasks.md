# Tasks: Security Hardening - Isolate Extension APIs from Page Scripts

## Phase 1: Cross-World Communication (4-6 hours)

- [x] Implement nonce generation in src/content/init.js (1 hour)
- [x] Add nonce validation for categoryManagerReady event (1.5 hours)
- [x] Update injected.js to read and include nonce (1 hour)
- [x] Implement event listener cleanup (1 hour)
- [x] Phase 1 integration testing (1.5 hours)

## Phase 1.7: Message Schema Definition (2-3 hours)

- [ ] Create docs/MESSAGE_SCHEMA.md with all message types (0.5 hours)
- [ ] Define schema for categoryManagerReady (0.5 hours)
- [ ] Define schema for categoryMoved (0.5 hours)
- [ ] Define schema for syncCategories (0.5 hours)
- [ ] Document validation rules and error codes (0.5 hours)

## Phase 1.8: Integration & Security Testing (3-4 hours)

- [ ] Verify complete cross-world handshake flow (1 hour)
- [ ] Test tampering detection scenarios (1 hour)
- [ ] Test attack scenarios (page script impersonation, nonce spoofing) (0.75 hours)
- [ ] Verify performance characteristics (< 100ms handshake) (0.5 hours)
- [ ] Memory leak testing (repeated init/cleanup cycles) (0.75 hours)

## Phase 1.9: Manual Verification & Deployment (2-3 hours)

- [ ] Verify functional operations on real Shopline.com (1 hour)
- [ ] Security verification (no API leaks, CSP compliance) (0.5 hours)
- [ ] Performance baseline measurement (0.5 hours)
- [ ] Stress testing (200+ categories, rapid page refreshes) (0.5 hours)
- [ ] Cross-browser and compatibility testing (0.5 hours)

## Phase 2: Storage Isolation (3-4 hours)

- [ ] Define storage message handlers in src/content/init.js (1.5 hours)
- [ ] Remove window._scm_storage global (1 hour)
- [ ] Replace localStorage with chrome.storage.local (1 hour)
- [ ] Add input validation to handlers (1 hour)
- [ ] Phase 2 integration testing (1 hour)

## Phase 3: Extension API Protection (1-2 hours)

- [ ] Add build-time gating for debug APIs (1 hour)
- [ ] Remove window.categoryManager exposure (0.5 hours)
- [ ] Verify CSP compliance (0.5 hours)

## Phase 4: Code Quality (2-3 hours)

- [ ] Optimize O(n²) conflict detection with Map/Set (1.5 hours)
- [ ] Document validator behavior (0.5 hours)
- [ ] Security review and code cleanup (1 hour)

## Testing & Validation (2-3 hours)

- [ ] Unit test suite (1.5 hours)
- [ ] Integration testing (1 hour)
- [ ] Manual QA on real Shopline instance (0.5 hours)

## Summary

| Phase | Hours | Status |
|-------|-------|--------|
| Phase 1 | 4-6 | ✅ Complete |
| Phase 1.7 | 2-3 | ⏳ Pending |
| Phase 1.8 | 3-4 | ⏳ Pending |
| Phase 1.9 | 2-3 | ⏳ Pending |
| Phase 2 | 3-4 | Not Started |
| Phase 3 | 1-2 | Not Started |
| Phase 4 | 2-3 | Not Started |
| **Total** | **20-27** | **Phase 1.7+ Pending** |

## Parallelizable Work

- Phase 4 tasks can start anytime
- Phase 2 and 3 can start after Phase 1
- Testing starts after individual phases
