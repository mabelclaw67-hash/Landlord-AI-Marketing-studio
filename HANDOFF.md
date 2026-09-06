# Landlord AI Marketing Studio — HANDOFF

最后更新：2026-09-06

## 已完成证据

- Cloudinary 上传/回写代码确实存在且可定位，不是文档空谈：`apps-script/Code.gs` 中 `uploadVideoToCloudinary_`（约第 6736 行起）实现 Drive→Cloudinary 上传，并在约第 6823 行把结果写回 `publicVideoUrl` 列；`updatePublicVideoUrl_`（第 6836 行）单独封装了这一写入逻辑。来源：直接读取 `apps-script/Code.gs`（MEMORY.md §5 明确点名的"Relevant files"之一，用于核实其架构描述是否属实）。
- `MEMORY.md` §10"Key Commits"表引用的 5 个 commit 哈希（`0a23e2a`、`19342ff`、`7d1167a`、`7579be8`、`985b039`）经 `git log` 核实**全部真实存在**，提交信息与文档描述基本对应；其中标记"恢复 Cloudinary 播放"的 `985b039` 经 `git merge-base --is-ancestor` 确认**是当前 main 分支 HEAD 的祖先**——这次回退动作确实合入了主分支，不是文档单方面宣称。来源：`MEMORY.md` §10 + git 历史核实。
- `publicVideoUrl` 确实写回 `LISTINGS_SHEET`，其代码常量为 `var LISTINGS_SHEET = "01 Listings";`（`apps-script/Code.gs` 第 26 行）——证实"01 Listings"这个表名在代码层面确实存在且被使用。来源：直接读取 `apps-script/Code.gs`（注意：这个表名在六份必读文件里都没有直接出现过，见下方"未验证"第 1 条）。

## 当前阻塞/未验证项

1. **"01 Listings" 这个表名，六份必读文件里都没有出现过。** `MEMORY.md` 只写"sheet column `publicVideoUrl`"，不点名表名；`apps-script/README.md`（不在必读清单内，但内容相关）把这个表叫做"Listings"，同样没写"01"前缀，与代码常量不完全一致。**标注：文档层面对表名的说法不一致，不能只靠文档确认表名，需以代码常量或实际打开 Sheet 为准。**
2. **Cloudinary"迁移"没有任何专门文档记录进度。** 六份必读文件里没有一份使用"migration"描述 Cloudinary 状态，目录里也**确实没有找到**文件名包含 CLOUDINARY 或 MIGRATION 的文件（按你的要求明确说明，不是没找到就假装读到了）。实际的迁移代码是 `apps-script/Code.gs` 里的 `migrateExistingVideos_()`（约第 6871 行起），代码注释写明"Run once from the Apps Script editor"——这是一个需要人工手动触发的一次性脚本，不是自动/持续迁移。
   **未验证** —— 本地环境无法直接读取表数据，需人工在 Google Sheets 里查看。已排查过的读取途径：本设备上没有 `.clasp.json`、没有安装 `clasp` CLI、没有任何 Google service account / API credential 文件；`.env.local` 里只有 Apps Script 前端调用用的 `VITE_STUDIO_EXEC_URL`（一个 exec 端点，不是 Sheets API 凭证）；即便想直接用这个 exec URL 做只读探测，本设备的网络出站也被代理按域名白名单拦截（`script.google.com`、`sheets.googleapis.com` 均返回 `blocked-by-allowlist`），连探测请求都发不出去。也就是说不是"不想查"，是当前环境确实没有任何可用凭证或网络路径能碰到这张表的实时数据，`migrateExistingVideos_()` 是否曾被手动执行过仍然无法核实。
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

## 使用说明

开工前先读这份文件；本文件基于 `MEMORY.md`、`README.md`、`PROJECT_OVERVIEW.md`、`docs/DOCUMENT_FIRST_UPLOAD_HANDOFF_2026-07-29.md`、`docs/AI_DISPUTE_REVIEW_HANDOFF_2026-07-25.md`（六份必读文件中实际存在的部分），以及对 `apps-script/Code.gs` 和 git 历史的直接核实提取；如果源文件之后又更新，这份 HANDOFF 需要同步更新。
