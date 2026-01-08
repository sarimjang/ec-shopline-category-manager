# Fix Angular Scope Alignment Issue - Documentation Index

## 📋 Overview

This change tracks the debugging and fix for the critical bug where clicking "Move to" on child categories incorrectly moves the entire parent category and all its children.

**Root Cause**: Angular scope-DOM binding misalignment in angular-ui-tree
**Solution**: Hybrid approach using DOM attributes with scope fallback
**Status**: Ready to implement

---

## 📚 Documentation Files

### 1. **proposal.md** - Change Proposal
**Purpose**: High-level overview of the problem and solution
**Contains**:
- Why: Problem statement and root cause
- What Changes: Proposed implementation approach
- Impact: Risk assessment and scope
- Verification Strategy: Test plan and success criteria

**Read this first** to understand the overall strategy

---

### 2. **tasks.md** - Implementation Tasks Checklist
**Purpose**: Track implementation progress step-by-step
**Contains**:
- Phase 1 tasks (4 tasks × 6 subtasks each)
- Phase 2 tasks (monitoring & fallback preparation)
- Debugging record (investigation timeline)
- Key insights (lessons learned)
- Summary table with time estimates

**Use this** to track what's done and what's next

---

### 3. **DEBUG_LOG.md** - Detailed Debugging Analysis
**Purpose**: Document all investigation, findings, and reasoning
**Contains**:
- Problem statement with user report
- Investigation timeline (Phase 1 & 2)
- Root cause analysis with evidence from logs
- Why bypass is safe (3 key reasons)
- Solution approach explanation
- Risk assessment table
- Test plan with 5 test cases

**Reference this** when you need to understand WHY we're doing this

---

### 4. **IMPLEMENTATION_GUIDE.md** - Code Changes Details
**Purpose**: Exact code changes needed for implementation
**Contains**:
- 4 specific code changes with before/after
- Line numbers and function names
- Detailed explanations for each change
- Implementation sequence (5 steps)
- Rollback plan
- Success criteria
- Clarifying questions

**Use this** when actually writing the code changes

---

### 5. **README.md** - This File
**Purpose**: Navigation guide for all documentation
**Contains**:
- File index with descriptions
- How to use each document
- Quick reference guide
- Status and next steps

---

## 🚀 Quick Start

### For Understanding the Problem
1. Read: `proposal.md` (Why & What Changes sections)
2. Read: `DEBUG_LOG.md` (Root Cause Analysis section)

### For Implementation
1. Read: `IMPLEMENTATION_GUIDE.md` (Overview + Change 1-4)
2. Use: `tasks.md` (track progress)
3. Reference: `DEBUG_LOG.md` (when questions arise)

### For Testing
1. Read: `DEBUG_LOG.md` (Test Plan section)
2. Use: `tasks.md` (Task 1.4)
3. Reference: `IMPLEMENTATION_GUIDE.md` (Success Criteria)

---

## 📊 Status Dashboard

| Phase | Task | Status | Est. Time | Owner |
|-------|------|--------|-----------|-------|
| Planning | Create openspec change | ✅ DONE | 30 min | Claude |
| 1 | Store in DOM attributes | ⏳ PENDING | 20 min | - |
| 1 | Modify click handler | ⏳ PENDING | 30 min | - |
| 1 | Add scope detection | ⏳ PENDING | 20 min | - |
| 1 | Comprehensive testing | ⏳ PENDING | 60 min | - |
| 2 | Prepare Option A | ⏳ PENDING | 30 min | - |
| 2 | Add diagnostics | ⏳ PENDING | 30 min | - |

**Total Remaining**: 2.5-3 hours

---

## 🎯 Next Action

**Start with Task 1.1**: Store category info in DOM attributes
- Time: 20 minutes
- Difficulty: Easy
- Risk: LOW
- Impact: Foundation for all other changes

---

## 🔑 Key Concepts

### Scope-DOM Misalignment
Angular-ui-tree reuses DOM nodes for performance, causing scope binding to get out of sync:
- DOM shows: "測試分類A-1"
- Scope returns: "測試分類B" (WRONG!)

### Hybrid Approach (Option B)
Uses three layers of reliability:
1. 🥇 Primary: DOM attributes (stable, not affected by scope)
2. 🥈 Fallback: Scope query (still has misalignment risk)
3. 🥉 Backup: WeakMap (old method, least trustworthy)

### Why Bypass Works
- Object mutation (`object.children.push()`) is independent of scope
- `$apply()` triggers change detection based on objects, not scope accuracy
- Tree rerendering rebuilds scope bindings automatically

---

## ⚠️ Important Notes

### Scope Misalignment is NOT Our Bug
- Problem is in Angular-ui-tree framework
- Their DOM node reuse causes scope binding corruption
- We can't fix framework, so we work around it

### Validation is Critical
- Don't just bypass scope silently
- Add detection layer to catch future scope issues
- Logs should clearly show which method was used

### Testing Must Be Comprehensive
- Test all 5 test cases (single, nested, rapid, refresh, edge cases)
- Watch console for warnings and errors
- Verify tree structure integrity after each move

---

## 🔍 Evidence Files

Supporting materials from analysis:

- `/tmp/risk-visualization.txt` - ASCII decision tree
- `/tmp/codex-comprehensive-analysis.json` - Technical deep dive
- `src/0108-02.log` - Proof of scope-DOM mismatch (lines 1960-1972)
- `lesson-learn.md` - Project knowledge base entry

---

## 📞 Questions?

### When to Reference Each Document

| Question | Reference |
|----------|-----------|
| "Why are we doing this?" | `proposal.md` |
| "What's the root cause?" | `DEBUG_LOG.md` |
| "How do I implement this?" | `IMPLEMENTATION_GUIDE.md` |
| "What should I test?" | `DEBUG_LOG.md` (Test Plan) |
| "Is this safe?" | `DEBUG_LOG.md` (Why Bypass Is Safe) |
| "What's the risk?" | `DEBUG_LOG.md` (Risk Assessment) |
| "How do I track progress?" | `tasks.md` |

---

## 📝 File Manifest

```
openspec/changes/fix-scope-alignment/
├── README.md                 (this file)
├── proposal.md               (change proposal)
├── tasks.md                  (implementation checklist)
├── DEBUG_LOG.md              (detailed analysis)
└── IMPLEMENTATION_GUIDE.md   (code changes details)
```

---

## ✅ Completion Checklist

When all tasks are done:

- [ ] All 4 code changes implemented
- [ ] All 5 test cases passed
- [ ] No console errors or warnings
- [ ] Scope misalignment properly detected and logged
- [ ] git commit created with detailed message
- [ ] Change marked as completed in openspec
- [ ] Documentation updated with final results

---

## 🎓 Learning Outcomes

After completing this fix, the project will have:

1. **Better Error Diagnostics**: Scope misalignment detection layer
2. **More Robust Feature**: Hybrid approach with multiple fallbacks
3. **Clear Documentation**: Full debugging trail for future reference
4. **Production Experience**: Real-world Angular framework workaround

---

**Created**: 2026-01-08
**Last Updated**: 2026-01-08
**Status**: Ready for implementation phase
