# Landlord AI Marketing Studio — HANDOFF

最后更新：2026-09-15

## 已完成证据

- Cloudinary 上传/回写代码确实存在且可定位，不是文档空谈：`apps-script/Code.gs` 中 `uploadVideoToCloudinary_`（约第 6736 行起）实现 Drive→Cloudinary 上传，并在约第 6823 行把结果写回 `publicVideoUrl` 列；`updatePublicVideoUrl_`（第 6836 行）单独封装了这一写入逻辑。来源：直接读取 `apps-script/Code.gs`（MEMORY.md §5 明确点名的"Relevant files"之一，用于核实其架构描述是否属实）。
- `MEMORY.md` §10"Key Commits"表引用的 5 个 commit 哈希（`0a23e2a`、`19342ff`、`7d1167a`、`7579be8`、`985b039`）经 `git log` 核实**全部真实存在**，提交信息与文档描述基本对应；其中标记"恢复 Cloudinary 播放"的 `985b039` 经 `git merge-base --is-ancestor` 确认**是当前 main 分支 HEAD 的祖先**——这次回退动作确实合入了主分支，不是文档单方面宣称。来源：`MEMORY.md` §10 + git 历史核实。
- `publicVideoUrl` 确实写回 `LISTINGS_SHEET`，其代码常量为 `var LISTINGS_SHEET = "01 Listings";`（`apps-script/Code.gs` 第 26 行）——证实"01 Listings"这个表名在代码层面确实存在且被使用。来源：直接读取 `apps-script/Code.gs`（注意：这个表名在六份必读文件里都没有直接出现过，见下方"未验证"第 1 条）。

## 当前阻塞/未验证项

1. **"01 Listings" 这个表名，六份必读文件里都没有出现过。** `MEMORY.md` 只写"sheet column `publicVideoUrl`"，不点名表名；`apps-script/README.md`（不在必读清单内，但内容相关）把这个表叫做"Listings"，同样没写"01"前缀，与代码常量不完全一致。**标注：文档层面对表名的说法不一致，不能只靠文档确认表名，需以代码常量或实际打开 Sheet 为准。**
2. **Cloudinary"迁移"没有任何专门文档记录进度。** 六份必读文件里没有一份使用"migration"描述 Cloudinary 状态，目录里也**确实没有找到**文件名包含 CLOUDINARY 或 MIGRATION 的文件（按你的要求明确说明，不是没找到就假装读到了）。实际的迁移代码是 `apps-script/Code.gs` 里的 `migrateExistingVideos_()`（约第 6871 行起），代码注释写明"Run once from the Apps Script editor"——这是一个需要人工手动触发的一次性脚本，不是自动/持续迁移。
   **已核实（2026-09-06）**：当前全部 18 条 Workflow Status = Published 的活跃 listing，其 `publicVideoUrl` 字段均为 Cloudinary 地址（`https://res.cloudinary.com/dpndbcjp4/...`），没有一条仍使用旧的 Google Drive 地址或为空值。唯一一条非 Published 状态的 listing（`LST-2026-004`，Draft）视频地址为空，属正常——草稿未发布，不影响网站展示。数据来自直接读取 Google Sheet "Landlord AI Marketing Studio - Database" 中的"01 Listings"表，CSV 导出核实，非猜测。
   **结论：历史迁移已完成且生效，无需处理，`migrateExistingVideos_()` 无需再手动执行。**
3. **MEMORY.md 对 Cloudinary/视频链路的完成度表述是一句笼统断言**：文件开头写"This file records the architecture that is already verified in production"，第 5 节描述"Correct chain"时没有单独标注这条链路是何时验证的、由谁验证的、验证记录在哪里。唯一能独立核实的支撑证据是 §10 的 commit 哈希（已核实真实存在且合入主分支，见"已完成证据"），但那只能证明"这几次代码改动确实发生过"，不能证明"Cloudinary 上传在生产环境对当前所有 listing 都正常工作"。**仅文档自称"已在生产验证"，除 commit 存在性外，未见具体测试记录、部署版本号或人工验证时间戳。**
4. **README.md 已经是过期文档。** 文件开头自称"Legacy Notice / 这份 README 不完整反映当前生产系统"，其"v0.1 Intentional Limitations"部分仍写着"No Google Sheet / Drive integration"，与 MEMORY.md、PROJECT_OVERVIEW.md 描述的生产架构（Sheets+Drive+Apps Script+Cloudinary 全部在用）明显矛盾。**标注：README.md 不能作为当前状态依据，只能当作项目最早期原型的历史记录。**
5. **PROJECT_OVERVIEW.md 完全没有覆盖 Cloudinary。** 文件标注"Last updated: 2026-05-11"，全文没有一处提到 Cloudinary 或视频功能。**标注：不是"没找到证据"，而是这份文件写作时间早于该功能存在，本身不适用于回答这个问题。**
6. 两份 HANDOFF 命名文件（`DOCUMENT_FIRST_UPLOAD_HANDOFF_2026-07-29.md`、`AI_DISPUTE_REVIEW_HANDOFF_2026-07-25.md`）与 Cloudinary/publicVideoUrl/01 Listings **均无实质相关内容**——前者搜索 0 命中；后者仅一处旁证提到"Cloudinary key 存在于 System Settings 表"（用于说明 Gemini API Key 单独存放，不和 Cloudinary key 混在一起），不涉及迁移进度或验证记录。
7. 两个文件名含"STATUS"的文件（`src/components/ListingStatusBanner.jsx`、`src/components/reports/StatusBadge.jsx`）经查是前端 UI 组件（渲染列表状态徽章/横幅），与本次 handoff 意义上的"项目状态说明"**无关**，如实报告，不假装它们是状态文档。

## 权威数据源

- Google Spreadsheet（主表）ID：`1pRjwVN05ysN0u-c2FZb9xE9sIy7k6iHF09DIrw39Jw4`。来源：`apps-script/README.md` Prerequisites 段；代码对应常量 `SPREADSHEET_ID`（`apps-script/Code.gs` 第 7 行）。
- Listings 表实际 tab 名：`01 Listings`。来源：`apps-script/Code.gs` 第 26 行常量 `LISTINGS_SHEET`。（文档层面 `apps-script/README.md` 的"Sheets created automatically"表格只写了"Listings"，与代码不完全一致，见上方"未验证"第 1 条。）
- Cloudinary 凭证位置：`08 System Settings` 表内的 `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` 三行。来源：`MEMORY.md` §5"Cloudinary credentials live in the `08 System Settings` sheet"；代码对应常量 `SYSTEM_SETTINGS_SHEET = "08 System Settings"`（`apps-script/Code.gs` 第 29 行及第 6731–6734 行注释）。
- Drive 素材根目录：`1RNF_WZWsDECSnIqnaZuXWsbUy-xtmE2r`。来源：`apps-script/README.md`。
- 其他相关 Spreadsheet（非 Listings 用途，避免混淆）：Daily Market Brief 用 `1kmV7FdBX6S06lGIZy3HveryolVbeMsC0pDXrWn4BcC8`；Property Strategy 用 `1F3rPmEMsOoTFWYo3CPD76BS4RuRbSPTCB47g5YTHopE`；Rental Intelligence 用 `1hst3mcCLeCbMmRBnH3OkKEPOEWbSVvONsRxMUiPKg5E`；AI Dispute Review 用独立的 `1Vf19MSfp73g3h-nJg8cCDRwPuoFHMLRMkWMCj7gTZ90`。来源：`apps-script/Code.gs` 常量 + `apps-script/README.md`。
- Apps Script 部署入口：`VITE_STUDIO_EXEC_URL`（前端调用的部署 URL，存在 Netlify 环境变量和 `.env.local` 里）。来源：`PROJECT_OVERVIEW.md` §4/§5。
- Netlify 部署：GitHub `mabelclaw67-hash/Landlord-AI-Marketing-Studio` main 分支推送自动触发。来源：`PROJECT_OVERVIEW.md` §5。

## /rentals 与后台加载变慢排查记录（2026-09-15）

### 背景

`https://www.vanislandproperty.ca/rentals` 加载时抓包发现对 Apps Script exec 端点
发起了 20+ 次独立 POST 请求，怀疑对每个房源循环调用了接口。修复过程中又引出一次
生产性能事故（下方"事故与修复"），最终分三次部署解决。

### 根因

`src/pages/Examples.jsx`（修改前）在 `useEffect` 里对 `active`（已发布房源）数组
做 `Promise.all`，每个房源分别调用 `getPublicListingFolderFiles` +
`getPublicListingSubfolderFiles` 两次，用于解析封面图——N 个房源就是 2N 次 POST。
来源：直接读取修改前的 `src/pages/Examples.jsx`（git history，commit `86bc73e`
之前的版本）。

### 修复 1：批量接口（commit `86bc73e`，Apps Script v172）

- 前端：新增 `getPublicListingCoverBundle()`（`src/utils/storage.js:325`），
  `Examples.jsx` 改成只调用这一个函数一次（`src/pages/Examples.jsx:323`），拿到
  所有房源的图片文件列表后，本地仍用原有的 `resolveRentalListingCover()` 选封面
  ——选择逻辑本身没有改变，只是数据来源从"N 次单独请求"改成"1 次批量请求"。
- 后端：新增 `getPublicListingCoverBundle_()`（当时未分 key，直接
  `CacheService.getScriptCache().put()` 整个 bundle），后端在一次 Apps Script
  执行里内部循环所有已发布房源的 Drive 文件夹，前端因此从 2N 次请求降到 2 次
  （`getListings` + `getPublicListingCovers`）。已用生产数据验证：
  `performance.getEntriesByType('resource')` 统计确认 exec 请求数从 20+ 降到 2。

### 事故与修复 2：缓存写入静默失败（commit `97a757e`，Apps Script v173）

v172 上线后发现 `getPublicListingCovers` 单次请求耗时 25–43 秒（用 Node `fetch`
直接测量，非 curl——curl 对 Apps Script 的重定向交付有已知误判，见
`docs/AI_DEVELOPMENT_RUNBOOK.md` 备注）。排查发现：整个 bundle（20 个房源）
`JSON.stringify` 后实测 **285,401 字节**，远超 `CacheService.put()` 单个 value
**100KB** 的上限，`cache.put()` 每次都抛异常，被 `try/catch` 静默吞掉——**缓存
从未真正生效过**，每次请求都要重新扫描全部房源的 Drive 文件夹。这类长耗时执行
在并发访问下会挤占 Apps Script 的并发执行配额，观察到同一时段后台"My Listings"
管理面板也一起变慢（不是后台代码本身变慢，是共享同一个 Apps Script 项目的执行
资源被占满）。

修复：把单一大 key 拆成**按房源单独的 CacheService key**
（`PUBLIC_LISTING_COVER_CACHE_PREFIX = "pubCover_"`，`apps-script/Code.gs:2841`），
用 `cache.getAll()` / `cache.putAll()` 批量读写（`getPublicListingCoverBundle_`，
`apps-script/Code.gs:2919`）。单个房源序列化后若仍 ≥ 90KB 则直接跳过缓存那一条
（不报错、不影响其他房源，只是那一个房源永远重新扫描）。同时把原来"整体失效"的
`invalidatePublicListingsCache_()` 拆出一个按房源精确失效的
`invalidatePublicListingCoverCache_(listingId)`（`apps-script/Code.gs:2865`），
在 `saveListingUnlocked_` 保存房源、`uploadToSubfolder_` 上传照片时分别调用。

验证：生产环境连续调用 `getPublicListingCovers`，冷启动 18.1 秒，随后两次命中
缓存分别为 2.4 秒、2.8 秒——证实缓存机制本身修复正确。

### 加固：预热触发器 + TTL 延长（commit `3fa9718`，Apps Script v174）

即使 v173 修好了缓存本身，"缓存过期窗口内第一个访客"仍要独自承担一次完整扫描，
且并发访客同时撞上冷缓存仍可能造成执行堆积（v173 部署后的复核一度又测到
22.8 秒 / 28.8 秒的慢请求，怀疑是我自己短时间内高频测试流量叠加真实访问造成的
并发拥堵，而非代码本身回归）。加固方案：

- `PUBLIC_CACHE_TTL_SECONDS` 从 300（5 分钟）延长到 900（15 分钟），
  `getListings_` 和封面缓存共用这一个常量（`apps-script/Code.gs:2846`）。
- 新增 `warmPublicListingCoverCache()`（`apps-script/Code.gs:3000`，直接复用
  `getPublicListingCoverBundle_`，没有另写一套逻辑）配合
  `installPublicListingCoverWarmupTrigger()` / `removePublicListingCoverWarmupTrigger()`
  （`apps-script/Code.gs:3007`/`3016`，写法参照已有的
  `installDailyMarketBriefAutoSync`）建一个每 5 分钟跑一次的定时触发器，15 分钟
  TTL 内刷新 3 次，减少访客撞上冷缓存的概率。
- **遗留操作项**：这两个 install/remove 函数**没有**挂到任何前端可调用的
  dispatcher action 上（和 `installDailyMarketBriefAutoSync`、
  `setupPropertyStrategyFileStorage()` 是同一惯例——一次性手动函数）。`clasp
  run-function installPublicListingCoverWarmupTrigger` 远程执行被拒绝
  （`Unable to run script function. Please make sure you have permission to
  run the script function.`——这个 Apps Script 项目没有关联 GCP 项目，`clasp
  logs` 同样因为这个原因不可用），**必须由人从 Apps Script 编辑器里手动运行一次
  `installPublicListingCoverWarmupTrigger`**，触发器才会真正建立。如果之后
  `clasp deployments`/生产表现异常，先确认这个触发器是否已经装上
  （`ScriptApp.getProjectTriggers()` 里应该能看到 handler 为
  `warmPublicListingCoverCache`、每 5 分钟一次的记录）。

**补充（同一天，Apps Script v175，commit `730e168`）**：第一次在编辑器里手动运行
`installPublicListingCoverWarmupTrigger` 时报错：

```
Exception: Specified permissions are not sufficient to call
ScriptApp.getProjectTriggers. Required permissions:
https://www.googleapis.com/auth/script.scriptapp
```

根因：这个 Apps Script 项目的 `appsscript.json`（**此前完全没有被这个 git 仓库
跟踪**，已在这次一并加进 `apps-script/appsscript.json`）显式声明了 `oauthScopes`
数组，但里面缺了触发器管理需要的 `script.scriptapp` 这一项——显式声明了列表之后，
Apps Script 不会再退回到某种"默认权限集"，所以哪怕手动点 Allow 授权也不会补上
清单里没写的权限。修复：在 `oauthScopes` 里加上
`https://www.googleapis.com/auth/script.scriptapp`（只授予"管理脚本自己的触发
器"，不涉及更多数据访问），部署为 v175。**这一步之后，人工在编辑器里重新运行
`installPublicListingCoverWarmupTrigger` 会弹出一次新的授权确认（针对新加的这个
权限范围）——这次点击 Allow 必须由账号所有者本人完成，Claude 不会代为点击 OAuth
授权确认（这个脚本的清单里已经有 `mail.google.com` 全量 Gmail、`drive` 全量
Drive、`spreadsheets` 等高权限范围，授权确认页面理应由人親自确认）。**

### 遗留已知现象（无需处理）

浏览器 Network 面板会看到同一个 Drive 文件 ID 同时出现在
`drive.google.com/thumbnail?...` 和 `lh3.googleusercontent.com/d/...` 两条请求
里。用生产环境真实文件 ID 实测确认：

```
curl -sS -D - -o /dev/null -L "https://drive.google.com/thumbnail?id=<fileId>&sz=w800"
→ HTTP/2 302, location: https://lh3.googleusercontent.com/d/<同一个fileId>=w800
→ HTTP/2 200 (真正的图片字节)
```

这是 **Google Drive 服务器自己的重定向行为**，每一张缩略图、每一次请求都会经过
这一跳，和请求参数（`sz=w800`/`w1600`/`w640-h480`，对应
`apps-script/Code.gs` 里 `thumbUrl`/`thumbUrlLg`/封面占位图三种格式）无关、
100% 必现，不是代码里的 fallback/重试逻辑（`src/utils/listingPublicMeta.js`、
`src/pages/Examples.jsx`、`src/pages/PublicListing.jsx` 里确认过没有任何
`onError` 切换到 lh3 的逻辑），也不会因为批量接口的部署而改变（每张图仍然各自
产生 1 次 302 + 1 次 200）。**不需要处理**，除非未来评估直接把图片地址换成
`lh3.googleusercontent.com/d/...` 跳过这一跳重定向（跳过之前需要先验证 lh3
地址的长期稳定性和权限规则是否与 `thumbnail` 完全一致，目前未验证，不建议现在改）。

### 涉及的部署 ID / 提交对照表

| Apps Script 版本 | 内容 | Git commit |
|---|---|---|
| v172 | 批量封面接口首次上线（含未发现的 100KB 缓存 bug） | `86bc73e` |
| v173 | 缓存粒度改成按房源独立 key，修复静默失败 | `97a757e` |
| v174 | 预热触发器 + TTL 延长到 15 分钟 | `3fa9718` |
| v175 | 补 `script.scriptapp` OAuth 权限范围，触发器安装函数才能真正运行 | `730e168` |

部署 ID 全程未变：`AKfycbw01LTH_pyJjcxk1GmWizYV3A8sHXy8TV54yMeccJdDQvyIBzgKK4N8gSpqPzWUcK0`
（Script ID `1SottAUJmamosFwhimrmM2zThzQ2ELhyEiKq660vRULi5hGk-oYVTKJBp`），对应
`.env.local` 的 `VITE_STUDIO_EXEC_URL`。

## 使用说明

开工前先读这份文件；本文件基于 `MEMORY.md`、`README.md`、`PROJECT_OVERVIEW.md`、`docs/DOCUMENT_FIRST_UPLOAD_HANDOFF_2026-07-29.md`、`docs/AI_DISPUTE_REVIEW_HANDOFF_2026-07-25.md`（六份必读文件中实际存在的部分），以及对 `apps-script/Code.gs` 和 git 历史的直接核实提取；如果源文件之后又更新，这份 HANDOFF 需要同步更新。
