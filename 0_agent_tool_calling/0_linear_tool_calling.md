# Linear 使用備忘

目的：提供 LLM 以一致方式操作 Linear（單一 codebase 用單一專案；討論用 Comments；分類用 Labels）。

## 基本原則
- 專案 Project：同一 codebase 使用一個核心專案（例：Momo Table Enhancer），避免任務分散到多個小專案。
- Issue：所有工作/需求/bug 均開 Issue，掛在核心專案下。
- Comments：團隊討論、備註、決策都放在 Issue 的 Comments，不另建自訂欄位。
- Labels：用來分類領域/類型（如 storage、ui、repo-maintenance、diagnostic、bug、perf 等），支援搜尋與報表。
- Backlog：視為 Inbox/許願池，未排期的 Issue 先放這裡，定期 grooming 後拉進 Cycle。
- Cycle：固定節奏迭代（1–2 週）放本期要完成的 Issue；結束後開下一個。
- Milestone：對應明確交付（版本/發布/客戶交付），可橫跨多個 Cycle。

## 操作建議
1) 新需求/bug：在核心專案建立 Issue，寫清楚描述，立即加對應 Labels。  
2) 討論：在 Issue Comments 留言（決策、備註、檢討）；不要把備註塞到自訂欄位。  
3) 排程：定期從 Backlog 選高優先 Issue 拉進當期 Cycle。  
4) 大目標：若有版本/發布日期，建 Milestone，相關 Issue 掛上該 Milestone。  
5) 測試/驗證：驗證完成後更新 Issue 狀態為 Done，並在 Comments 簡述結果/輸出。  
6) 併案：同類小工作只開新 Issue，不開新 Project；用 Labels 區分主題即可。

## 常用名詞速覽
- Project：專案，大傘（同一 codebase 建議一個）。  
- Issue：單一工作項。  
- Label：標籤，用於分類篩選。  
- Backlog：未排期/Inbox/許願池。  
- Cycle：固定長度迭代，放本期要做的 Issue。  
- Milestone：有明確交付日期或大目標的集合，可跨多個 Cycle。  
- Comments：討論與決策記錄的首選位置。
