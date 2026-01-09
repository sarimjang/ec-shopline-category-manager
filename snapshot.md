## 專案目錄結構

```text
├── .claude
│   ├── commands
│   │   └── openspec
│   │       ├── apply.md
│   │       ├── archive.md
│   │       └── proposal.md
│   └── settings.local.json
├── .cursor
│   └── commands
│       ├── openspec-apply.md
│       ├── openspec-archive.md
│       └── openspec-proposal.md
├── .serena
│   ├── cache
│   │   └── typescript
│   │       ├── document_symbols.pkl
│   │       └── raw_document_symbols.pkl
│   ├── memories
│   │   ├── code_style.md
│   │   ├── completion_steps.md
│   │   ├── fix_scope_alignment_v2.md
│   │   ├── project_overview.md
│   │   └── suggested_commands.md
│   ├── .gitignore
│   └── project.yml
├── 0_agent_tool_calling
│   ├── .DS_Store
│   ├── 0_CODEX_USAGE_GUIDELINE.md
│   ├── 0_gemini-tracker.md
│   ├── 0_GEMINI_API_RATE_LIMIT_ANALYSIS.md
│   ├── 0_GEMINI_TROUBLESHOOTING.md
│   ├── 0_linear_tool_calling.md
│   ├── 0_SERENA_SHARED_MEMORY_GUIDE.md
│   └── 0_tool_calling_guide.md
├── docs
│   ├── fixes
│   │   └── scope-alignment-2026-01-08
│   │       ├── COMPLETION_REPORT.md
│   │       ├── DEBUG_LOG.md
│   │       ├── EXECUTIVE_SUMMARY.md
│   │       ├── IMPLEMENTATION_GUIDE.md
│   │       ├── tasks.md
│   │       └── TEST_PLAN.md
│   ├── guides
│   │   ├── DELIVERY_CHECKLIST.md
│   │   ├── FILE_GUIDE.md
│   │   ├── QUICK_START.md
│   │   ├── SPEC_COMPLIANCE.md
│   │   ├── TEST_GUIDE.md
│   │   └── TEST_VERIFICATION.md
│   ├── implementation
│   │   ├── IMPLEMENTATION_NOTES.md
│   │   ├── IMPLEMENTATION_PLAN.md
│   │   ├── README_STEP_7.md
│   │   ├── STEP_1_2_COMPLETION_REPORT.md
│   │   ├── STEP_3_4_ARCHITECTURE.md
│   │   ├── STEP_3_4_SUMMARY.md
│   │   ├── STEP_3_4_UI_IMPLEMENTATION.md
│   │   ├── STEP_3_4_VERIFICATION_GUIDE.md
│   │   ├── STEP_5_6_COMPLETION_SUMMARY.md
│   │   └── STEP_7_COMPLETION_REPORT.md
│   ├── reference
│   │   ├── CORE_API_REFERENCE.md
│   │   ├── PROJECT_OVERVIEW.md
│   │   ├── PROJECT_SUMMARY.md
│   │   └── QUICK_REFERENCE.md
│   └── README.md
├── openspec
│   ├── changes
│   │   ├── add-category-quick-move
│   │   │   ├── specs
│   │   │   │   └── category-manager
│   │   │   │       └── spec.md
│   │   │   ├── proposal.md
│   │   │   └── tasks.md
│   │   ├── add-search-filter
│   │   │   ├── proposal.md
│   │   │   └── tasks.md
│   │   ├── archive
│   │   └── fix-scope-alignment
│   │       ├── COMPLETION_REPORT.md
│   │       ├── DEBUG_LOG.md
│   │       ├── IMPLEMENTATION_GUIDE.md
│   │       ├── IMPLEMENTATION_GUIDE_CORRECTED.md
│   │       ├── proposal.md
│   │       ├── README.md
│   │       └── tasks.md
│   ├── specs
│   ├── AGENTS.md
│   └── project.md
├── ref
│   ├── .DS_Store
│   ├── 0108-01.log
│   └── shopline-category.html
├── src
│   ├── .DS_Store
│   ├── 0108-02.log
│   ├── README.md
│   ├── shopline-category-manager.test.js
│   └── shopline-category-manager.user.js
├── AGENTS.md
├── CLAUDE.md
├── lesson-learn.md
├── requirement.PRD
├── snapshot.py
├── technical_framework.md
├── technical_framework_zh_TW.md
└── test-core-logic.js
```

## 函式清單 / 檔案摘要

### 語言分佈
- **JavaScript/TypeScript**: 3 檔案，170 函式
- **Python**: 1 檔案，105 函式

### JavaScript/TypeScript

#### src/shopline-category-manager.test.js
- purpose: Shopline Category Manager - 單元測試
測試核心函數的層級計算和子孫搜尋功能
使用方法：
1. 在瀏覽器控制台複製 shopline-category-manager.user.js 的測試函數
2. 或在 Node.js 環境中運行此測試
##### 函式
- **for(const category of categories)**
- **if(category === targetCategory)**
- **if(level !== -1)**
- **if(pass)**
- **if(failCount === 0)**
- **if(typeof module !== 'undefined' && module.exports)**
- **if(require.main === module)**
- **createTestCategories()**
- **getCategoryLevel(categories, targetCategory, currentLevel = 1)**
- **getCategoryDescendants(category)**
- **isDescendant(potentialAncestor, potentialDescendant)**
- **runTests()**
- **testLevel(name, targetCategory, expectedLevel)**
- **testDescendants(name, sourceCategory, expectedCount)**
- **testIsDescendant(name, ancestor, target, expected)**

#### src/shopline-category-manager.user.js
- purpose: ==UserScript== @name         Shopline 分類管理 - 快速移動 @namespace    http://tampermonkey.net/ @version      0.2.1 @description  在 Shopline 分類管理頁面添加「移動到」按鈕，支援快速分類重新整理 @author       Development Team @match  ...
##### 函式
- **if(!category || !category.children)**
- **for(let child of category.children)**
- **for(const category of categories)**
- **if(category === targetCategory)**
- **if(level !== -1)**
- **getCategoryDisplayName(category)**
- **if(category.name)**
- **if(category.name_translations)**
- **if(category.name_translations['zh-hant'])**
- **if(category.name_translations['en'])**
- **if(firstLang && category.name_translations[firstLang])**
- **if(category.seo_title_translations)**
- **if(category.seo_title_translations['zh-hant'])**
- **if(category.seo_title_translations['en'])**
- **findCategoryByName(categoryName)**
- **if(!categoryName)**
- **for(const item of arr)**
- **if(itemName === categoryName)**
- **if(this.posCategories && this.posCategories.length > 0)**
- **getLevel1Categories(excludeCategory = null, filterArrayName = null)**
- **for(const cat of this.categories)**
- **for(const cat of this.posCategories)**
- **filterCategoriesByKeyword(keyword, categories)**
- **debounce(func, wait)**
- **findCategoryById(categoryId)**
- **if(!categoryId)**
- **if(item._id === categoryId || item.id === categoryId)**
- **if(result)**
- **initialize()**
- **injectUI()**
- **if(!treeContainer)**
- **attachButtonsToCategories()**
- **if(!buttonArea)**
- **if(!categoryInfo && domCategoryName)**
- **if(categoryInfo && domCategoryName)**
- **if(scopeCategoryName !== domCategoryName)**
- **if(correctedInfo)**
- **if(!categoryInfo)**
- **if(categoryId)**
- **if(buttonNodeName !== actualName)**
- **if(categoryInfo.category?.key)**
- **if(categoryId && arrayName)**
- **if(treeNode)**
- **if(scope && scope.item)**
- **if(boundCategoryInfo)**
- **if(!categoryInfo || !categoryInfo.category)**
- **getCategoryFromElement(element)**
- **if(!nodeEl)**
- **if(domCategoryName && itemName !== domCategoryName)**
- **if(!this.scopeMisalignmentLog)**
- **if(this.scopeMisalignmentLog.length >= 5)**
- **if(scope)**
- **detectCategoryArray(category)**
- **if(this.posCategories.length > 0)**
- **if(inPosCategories)**
- **if(this.categories.length > 0)**
- **if(inCategories)**
- **findCategoryInArray(category, categoriesArray)**
- **for(const cat of categories)**
- **if(cat === category)**
- **showMoveDropdown(category, button, categoriesArray = null, arrayName = 'categories')**
- **if(!categoriesArray)**
- **removeExistingDropdown()**
- **if(existingDropdown)**
- **if(searchSection && searchSection._debouncedSearch && searchSection._debouncedSearch.cancel)**
- **createDropdownContainer()**
- **populateDropdownOptions(dropdown, options, currentCategory, categoriesArray = null, arrayName = 'categories')**
- **createDropdownItem(option, currentCategory, categoriesArray = null, arrayName = 'categories')**
- **if(option.indent > 0)**
- **if(option.indent === 1)**
- **attachItemEventListeners(item, option, currentCategory, categoriesArray = null, arrayName = 'categories')**
- **if(!option.disabled)**
- **attachDropdownEventListeners(dropdown, button)**
- **if(e.key === 'Escape')**
- **positionDropdown(dropdown, button)**
- **if(left + dropdownWidth > window.innerWidth)**
- **if(top + dropdownHeight > window.innerHeight)**
- **createSearchSection(currentCategory, categoriesArray, arrayName)**
- **createSearchInput()**
- **createSearchResultsList()**
- **createConfirmButton()**
- **updateConfirmButtonState(btn, enabled)**
- **if(enabled)**
- **renderSearchResults(resultsList, categories, searchSection)**
- **if(categories.length === 0)**
- **if(searchSection._selectedCategory !== item)**
- **handleSearchItemSelect(item, row, radio, searchSection)**
- **if(r._radio)**
- **if(searchSection._selectedCategory === item)**
- **attachSearchEventListeners(searchSection)**
- **getValidMoveTargets(category, categoriesArray = null)**
- **addTargetCategoriesRecursively(categories, currentCategory, options, depth)**
- **if(isLevel3)**
- **moveCategory(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories')**
- **if(this.isMoving)**
- **if(success)**
- **moveCategoryUsingScope(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories')**
- **if(targetCategory)**
- **if(targetLevel === 3)**
- **if(!sourceParent)**
- **if(sourceIndex === -1)**
- **if(!targetCategory.children)**
- **if(this.scope.$apply)**
- **if(sourceStillInOldLocation)**
- **if(!sourceInNewLocation)**
- **rollbackMove(sourceCategory, targetCategory, backupData)**
- **if(targetCategory.children)**
- **if(previousChildren === undefined && targetCategory.children.length === 0)**
- **findCategoryParent(category, categoriesArray = null)**
- **if(!result)**
- **showSuccessMessage(message)**
- **showErrorMessage(message)**
- **getLevel(category, categoriesArray = null)**
- **getAllDescendants(category)**
- **if(element)**
- **if(!window.angular)**
- **if(!scope)**
- **if(nodes.length > 0)**
- **if(containerScope)**
- **if(!scope.categories || scope.categories.length === 0)**
- **if(scope.posCategories && scope.posCategories.length > 0)**
- **if(document.readyState === 'loading')**
- **function()**
- **isDescendant(potentialAncestor, potentialDescendant)**
- **getCategoryLevel(categories, targetCategory, currentLevel = 1)**
- **getCategoryDescendants(category)**
- **waitForElement(selector, timeout = 10000)**
- **getAngularScope(element)**
- **findCategoriesScope(element)**
- **waitForTreeNodes(timeout = 15000)**
- **init()**

#### test-core-logic.js
- purpose: 分類移動邏輯 - 核心演算法測試
這個檔案包含可獨立執行的測試，驗證 Step 5-6 的核心邏輯。
使用方式：node test-core-logic.js
##### 函式
- **for(let cat of categories)**
- **if(cat._id === id)**
- **if(found)**
- **if(found !== undefined)**
- **if(level !== null)**
- **if(!category || !category.children)**
- **for(let child of category.children)**
- **if(movingCategory._id === targetParent?._id)**
- **if(targetLevel === null)**
- **if(newLevel > CONFIG.MAX_LEVELS)**
- **for(let cat of cats)**
- **if(depth < CONFIG.MAX_LEVELS)**
- **if(!condition)**
- **if(actual !== expected)**
- **findCategoryById(categories, id)**
- **findParent(categories, categoryId, parent = null)**
- **getLevel(categories, categoryId, currentLevel = 1)**
- **getAllDescendants(category)**
- **validateMove(categories, movingCategory, targetParent)**
- **buildValidTargetList(categories, movingCategory)**
- **traverse(cats, depth)**
- **test(name, fn)**
- **assert(condition, message)**
- **assertEqual(actual, expected, message)**

### Python

#### snapshot.py
- purpose: snapshot.py
Purpose: Scan a project and generate a Markdown snapshot (structure, functions, dependencies).
Targets: JS/TS/JSX/TSX/Vue/Node.js/React/Python projects.
Usage:   python snapshot.py [--root...
##### 函式
- **is_secrets_file(filename: str)** - Check if a filename matches known secrets file patterns.
- **contains_secrets(content: str, check_patterns: bool = True)** - Check if content contains potential secrets.
- **redact_secrets(content: str)** - Redact potential secrets from content.
- **redact_n8n_credentials(workflow_data: dict)** - Redact credentials from n8n workflow JSON.
- **is_excluded(path: Path, excludes: List[str], root: Path)** - Exclude if any of the path's parts match an excluded base name or if an excluded
- **load_gitignore_patterns(root: Path)** - Load root .gitignore patterns (best-effort, simple glob subset).
- **is_gitignored(rel_path: str, patterns: List[str], is_dir: bool)** - Very small subset of .gitignore semantics:
- **is_python_stdlib(module_name: str)** - 檢查模組是否為 Python 標準庫
- **normalize_python_import(import_str: str)** - 規範化 import 名稱 (numpy.linalg -> numpy)
- **extract_python_imports(text: str)**
- **extract_js_imports(text: str)**
- **classify_imports(mods: List[str], root: Path, lang: str)**
- **extract_python_module_purpose(text: str)**
- **extract_js_module_purpose(text: str)**
- **extract_swift_module_purpose(text: str)** - Extract file purpose from Swift documentation comments.
- **extract_python_function_docs(text: str)**
- **summarize_params(params_str: str)**
- **iter_entries_sorted(dir_path: Path)**
- **scan_files(dir_path: Path, root: Path, excludes: List[str], extensions: List[str])** - Collect files with given extensions while respecting excludes (by parts).
- **EntryPoint.to_dict(self)**
- **WorkspaceInfo.to_dict(self)**
- **detect_circular_dependencies(graph: Dict[str, List[str]])** - 偵測圖中的循環依賴。
- **detect_python_function_calls(content: str, defined_funcs: List[str])** - 偵測 Python 文件中的函式呼叫關係。
- **detect_js_function_calls(content: str, defined_funcs: List[str])** - 偵測 JavaScript/TypeScript 文件中的函式呼叫關係。
- **detect_swift_function_calls(content: str, defined_funcs: List[str])** - 偵測 Swift 文件中的函式呼叫關係。
- **detect_circular_calls(call_graph: Dict[str, List[str]])** - 偵測呼叫圖中的循環呼叫(例如 A -> B -> A)。
- **calculate_cyclomatic_complexity_python(content: str)**
- **calculate_cyclomatic_complexity_js(content: str)**
- **calculate_cyclomatic_complexity_swift(content: str)**
- **extract_function_body(content: str, func_name: str, lang: str)**
- **classify_complexity_risk(complexity: int)** - 根據複雜度值分類風險等級。
- **generate_complexity_recommendation(complexity: int, risk: str, func_name: str)**
- **detect_python_entry_points(content: str, filename: str)** - Detect Python entry points: if __name__, @click, @app.route, def main().
- **detect_gas_entry_points(content: str, filename: str)** - Detect Google Apps Script entry points: triggers
- **detect_swift_entry_points(content: str, filename: str)** - Detect Swift entry points: @main, App protocol, AppDelegate, SceneDelegate.
- **detect_html_entry_points(content: str, filename: str)** - Detect HTML entry points: script tags.
- **detect_package_json_entry_points(content: str, filename: str)** - Detect JS/TS entry points from package.json.
- **detect_n8n_entry_points(content: str, filename: str)** - Detect n8n workflow entry points: trigger nodes, webhooks, schedules.
- **detect_entry_points(content: str, filename: str, file_path: Path)** - Main entry point detection function. Routes to language-specific detectors.
- **render_entries_json(all_entries: List[EntryPoint])** - Render all entry points to entries.json format.
- **get_content_hash(content: str)** - Generate SHA-256 hash of content for cache validation.
- **validate_cache_schema(cache_data: Dict)** - 驗證快取架構版本是否相容.
- **upgrade_cache_schema(old_cache: Dict)** - 將舊快取升級到新架構.
- **path_to_atlas_filename(rel_path: str)** - Convert a relative path to an atlas filename.
- **atlas_filename_to_path(filename: str)** - Convert an atlas filename back to a relative path.
- **extract_services_from_files_info(files_info: Dict[str, Dict], func_map: Dict[str, List[Dict]])** - Extract unique services used from n8n workflow files.
- **build_dependency_graph(files_info: Dict[str, Dict])** - 構建文件-包依賴關係圖.
- **build_function_index(func_map: Dict[str, List[Dict]])** - 建立函式快速搜尋索引（僅公開函式）.
- **build_entry_points_summary(entry_points: List[EntryPoint])** - 統計進入點類型.
- **parse_python_params_with_types(params_str: str)** - Parse Python function parameters and extract type annotations.
- **extract_python_docstring(lines: List[str], func_line_idx: int)** - Extract the docstring following a function definition.
- **parse_python_docstring_types(docstring: str)** - Parse docstring to extract parameter types and return type.
- **build_python_signature(name: str, params: List[Dict[str, str]], return_type: str)** - Build a full function signature string with types.
- **extract_jsdoc_before_line(lines: List[str], line_idx: int)** - Extract JSDoc comment block immediately preceding a function definition.
- **parse_jsdoc_types(jsdoc: str)** - Parse JSDoc comment to extract parameter types and return type.
- **parse_ts_params_with_types(params_str: str)** - Parse TypeScript function parameters and extract type annotations.
- **extract_function_purpose(jsdoc: str = "", docstring: str = "", comment: str = "")** - 從 JSDoc/docstring/inline comment 提取函式用途摘要（首行或簡短描述）。
- **build_js_signature(name: str, params: List[Dict[str, str]], return_type: str)** - Build a full function signature string with types (TypeScript style).
- **extract_prev_comment(lines: List[str], idx: int, lang: str)**
- **parse_vue_script(content: str)** - Extract <script> ... </script> blocks (including <script setup>)
- **parse_js_family(content: str, filename: str)** - Parse JS/TS/JSX/TSX heuristically with type extraction.
- **enrich_with_types(entry: Dict[str, str], line_idx: int, params_raw: str, return_type_raw: str = "")** - Enrich a function entry with type information from JSDoc and TS annotations.
- **parse_python(content: str, filename: str)** - Heuristic Python def/class parsing with type extraction.
- **parse_swift_params(params_str: str)** - Parse Swift function parameters with types.
- **build_swift_signature(name: str, params: List[Dict[str, str]], return_type: str, throws: bool = False)** - Build Swift function signature string.
- **parse_swift(content: str, filename: str)** - Swift parser with full type extraction.
- **ParserRegistry.get_parser(self, ext: str)** - 獲取副檔名的 parser
- **ParserRegistry.get_capabilities(self, ext: str)** - 獲取副檔名的能力
- **ParserRegistry.list_languages(self)** - 列出所有已註冊的語言（有 capabilities 的）
- **ParserRegistry.supports_feature(self, ext: str, feature: str)** - 檢查某副檔名是否支持某功能。
- **initialize_builtin_parsers()** - 初始化所有內置 parser 和其能力
- **get_parser_registry()** - 取得全局 parser registry，使用 lazy initialization
- **register_parser(ext: str, fn: ParserFn)** - Register/override a parser for a given extension.
- **parse_functions_for_file(path: Path, root: Path)**
- **parse_functions_for_text(path: Path, text_override: Optional[str])**
- **collect_package_jsons_from_files(manifest_files: List[Path])** - Parse package.json manifests from a pre-collected list.
- **collect_node_lockfiles_from_files(manifest_files: List[Path])** - Best-effort parsing for Node lockfiles. Returns:
- **collect_python_requirements_from_files(manifest_files: List[Path])** - Parse requirements*.txt and pyproject.toml from a pre-collected list.
- **get_language_from_path(file_path: str)** - 從文件路徑確定語言名稱。
- **group_files_by_language(func_map: dict)** - 按語言分組文件。
- **parse_n8n_workflow(path: Path)** - Parse an n8n workflow JSON file and return pseudo-function entries for nodes.
- **generate_dashboard_html(atlas_dir: Path)**
- **calculate_risk_percentages(functions_data: dict)**
- **get_risk_emoji(risk: str)** - 根據風險等級返回 emoji。
- **find_phase8_section(content: str)** - 找出 snapshot.md 中現存的 Phase 8 摘要章節。
- **extract_analysis_from_connections(connections_path: Path)**
- **format_analysis_summary(analysis: dict)** - 將分析結果格式化為 Markdown。
- **update_snapshot_with_analysis(snapshot_path: Path, analysis_markdown: str)** - 智能更新 snapshot.md，實現冪等性。
- **append_phase8_summary_to_snapshot(atlas_dir: Path, snapshot_path: Path)** - 整合所有函式，自動追加/更新 Phase 8 分析摘要到 snapshot.md。
- **main(argv: Optional[List[str]] = None)**

## 依賴清單

_（未找到相依檔案）_

## 摘要

- 檔案數：4
- 函式數：275
- 依賴數：0
- 語言/副檔名分佈：
  - .js: 3
  - .py: 1
