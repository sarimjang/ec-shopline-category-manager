# Project Context

## Purpose
Build a Greasemonkey/Tampermonkey userscript that enhances the Shopline e-commerce platform's category management interface. The script aims to improve user efficiency when managing large numbers of product categories (100+) by providing a quick "Move to" feature that eliminates the need for long drag-and-drop operations.

## Tech Stack
- **Target Environment**: Greasemonkey/Tampermonkey userscript
- **Framework**: AngularJS 1.x (Shopline's framework)
- **DOM Library**: Vanilla JavaScript (native DOM API)
- **UI Framework**: Bootstrap 3 (Shopline uses Bootstrap classes)
- **Target URLs**:
  - `https://admin.shoplineapp.com/admin/{storeId}/categories` (Primary - Taiwan)
  - `https://{domain}.shopline.tw/admin/{storeId}/categories` (Taiwan variant)
  - `https://{domain}.shopline.app/admin/{storeId}/categories` (International variant)
- **Example**: `https://admin.shoplineapp.com/admin/goldenqueenpalace799/categories`
- **Browser Compatibility**: Chrome, Firefox, Safari, Edge (userscript-capable browsers)

## Project Conventions

### Code Style
- Use vanilla JavaScript (ES6+ where supported)
- No external dependencies (keep script lightweight)
- Prefer explicit, readable code over clever optimizations
- Use camelCase for variables and functions
- Use UPPER_SNAKE_CASE for constants
- Add comments for non-obvious logic

### Architecture Patterns
- **Modular functions**: Each feature (UI, logic, validation) is a separate function
- **Single Responsibility**: One function = one job
- **Error-first approach**: Always check for scope/DOM availability before proceeding
- **Graceful degradation**: If primary method fails, use fallback (drag event simulation)

### Testing Strategy
- **Manual testing** on actual Shopline category page
- Test scenarios defined in `openspec/changes/add-category-quick-move/tasks.md`
- DevTools Console for error checking
- Network tab for verifying API calls and persistence

### Git Workflow
- Feature branch per change: `add-category-quick-move`
- Commit per logical chunk (step 1-2, step 3-4, etc.)
- Commit message format: `feat: [description] (task #)` or `fix: [description]`
- PR review before merging to main
- Archive change in OpenSpec after deployment

## Domain Context

### Shopline Category Structure
- **Hierarchy**: Shopline supports up to 3 levels of categories
  - Level 1: Direct children of root
  - Level 2: Children of Level 1 categories
  - Level 3: Children of Level 2 categories (maximum depth)
- **Special Categories**: Some categories have a `key` property (e.g., "精選商品"), marking them as system categories
- **Data Structure**: AngularJS `$scope.categories` array contains the full tree
  ```javascript
  {
    _id: "xxx",
    name: "分類名稱",
    key: null,
    children: [...]
  }
  ```

### User Pain Points
1. When many categories exist (100+), the page becomes very long
2. New categories appear at the bottom, requiring long scroll and drag to proper position
3. Dragging on touch pads/trackpads is imprecise and tiring
4. No way to quickly select a target parent category by name

### Expected User Workflow
1. User finds a category that needs moving
2. Clicks "📁 Move to ▼" button
3. Selects target parent from dropdown (with tree hierarchy shown)
4. Category moves to target and persists to backend

## Important Constraints
1. **No External Libraries**: Script must work with only vanilla JS and AngularJS that's already on the page
2. **AngularJS Integration**: Must respect Shopline's AngularJS data binding; direct DOM changes alone won't persist
3. **No Page Modification**: Cannot modify Shopline's core pages; only inject our features
4. **Cross-browser**: Must work in all userscript-capable browsers (Chrome, Firefox, Safari, Edge)
5. **3-Layer Limit**: Cannot create categories deeper than Level 3; validation is critical
6. **Backward Compatibility**: Original drag-drop functionality must remain unchanged

## External Dependencies
1. **AngularJS 1.x**: Pre-existing on Shopline pages
   - Used for data binding and scope manipulation
   - Version detection may be needed for compatibility
2. **Shopline Admin API**: Handles category persistence
   - Accessed indirectly through AngularJS scope operations
   - No direct API calls (rely on page's own save mechanism)
3. **angular-ui-tree Library**: Shopline's tree plugin
   - Used for drag-drop visualization
   - Our moves must trigger its internal updates

## Success Metrics
- Users can move any category to any valid parent in < 5 clicks
- Changes persist after page refresh (verified in Network tab)
- No JavaScript errors in browser console
- Works across Chrome, Firefox, Safari
- Handles edge cases gracefully (circular hierarchy, level limits)
