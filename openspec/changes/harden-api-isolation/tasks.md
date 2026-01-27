# Tasks: Security Hardening - Isolate Extension APIs from Page Scripts

## Phase 1: Cross-World Communication (4-6 hours)

- [ ] Implement nonce generation in src/content/init.js (1 hour)
- [ ] Add nonce validation for categoryManagerReady event (1.5 hours)
- [ ] Update injected.js to read and include nonce (1 hour)
- [ ] Implement event listener cleanup (1 hour)
- [ ] Phase 1 integration testing (1.5 hours)

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
| Phase 1 | 4-6 | Not Started |
| Phase 2 | 3-4 | Not Started |
| Phase 3 | 1-2 | Not Started |
| Phase 4 | 2-3 | Not Started |
| Testing | 2-3 | Not Started |
| **Total** | **12-18** | **Not Started** |

## Parallelizable Work

- Phase 4 tasks can start anytime
- Phase 2 and 3 can start after Phase 1
- Testing starts after individual phases
