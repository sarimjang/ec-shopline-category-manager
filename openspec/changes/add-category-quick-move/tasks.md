# Tasks: Add Category Quick Move Feature

## 1. Project Setup
- [ ] 1.1 Fill out `openspec/project.md` with project context
- [ ] 1.2 Create userscript file with metadata block

## 2. Core Implementation
- [x] 2.1 Implement page detection (match Shopline category URL)
- [x] 2.2 Parse AngularJS scope to access `categories` data
- [x] 2.3 Build hierarchical category tree from scope data
- [x] 2.4 Create "Move to" button UI (inject into each category row) - Partial (UI injection done)
- [x] 2.5 Create dropdown/modal for parent category selection - Partial (validation done)
- [x] 2.6 Implement move logic (manipulate `categories` array) - COMPLETED (Step 5)
- [x] 2.7 Trigger AngularJS `$apply()` and save mechanism - COMPLETED (Step 5)

## 3. Fallback Implementation
- [ ] 3.1 If scope method fails, implement drag event simulation
- [ ] 3.2 Test both approaches on live Shopline page

## 4. Testing & Polish
- [ ] 4.1 Test moving category to root level
- [ ] 4.2 Test moving category under another parent
- [ ] 4.3 Test moving nested category
- [ ] 4.4 Verify changes persist after page refresh
- [ ] 4.5 Add error handling and user feedback
