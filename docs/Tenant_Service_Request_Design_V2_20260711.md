# Tenant Service Request — 设计方案 V2(修订版)

日期:2026-07-11
基于:GPT 原方案(Google Doc《租客保修流程程序 20260711》)+ Claude 对两个项目真实代码的核实结果
状态:设计定稿,待只读盘点确认后实施

---

## 0. V2 相对原方案的改动清单

| # | 原方案假设 | 核实结果 | V2 改动 |
|---|-----------|---------|---------|
| 1 | "所有提交通过 Netlify Function"是复用现有能力 | 04 无 netlify.toml、无 netlify/functions 目录;现有表单是浏览器直连 Apps Script exec URL(`VITE_STUDIO_EXEC_URL` 打包进前端,公开) | Netlify Functions 是**新增层**,需新建 netlify.toml + netlify/functions/;并把"盘点 VITE_STUDIO_EXEC_URL 权限范围"列为前置任务 |
| 2 | Tenant Log 可追加事件引用 | `v1SaveTenantLogEntry_` 写的是 25 列租约主档(押金/租金/业主),不是流水日志 | 事件引用**不写 Tenant Log 主档**,改写 Property Events 表(见改动 3) |
| 3 | 可能需要新建 Service Request 表,让 Codex 盘点 | `V1_PropertyEvents` 已有 eventId/date/owner/property/unit/tenantId/eventType/status/followUpRequired/notes/nextAction,但缺 urgency、附件、进入许可、承包商、resolution、completedAt | **决定:新建 Service Requests 表**作为唯一数据源;Property Events 追加一条引用行(eventType = Tenant Service Request, relatedDocument = Request ID),不改现有表结构 |
| 4 | 身份匹配 = Email + 电话后4位 + 地址/Unit 三项输入 | 地址/Unit 自由文本匹配易失败("Basement Suite" vs "Bsmt");电话字段格式质量未验证 | 精确匹配只用 **Email + Phone Last 4**;匹配成功后由后台返回简化地址让租客**确认**(非输入匹配);盘点时抽查电话字段格式 |
| 5 | 照片最多 5 张,限制格式和大小(未给具体方案) | Netlify 同步 Function body 上限约 6MB,base64 膨胀 33%,手机原图 5 张必超 | **前端 canvas 压缩至 ≤1MB/张,逐张提交**,每张独立请求;V1 无视频(与原方案一致) |
| 6 | 60 天设备凭证免重复验证 | 原方案未写清失效机制 | 明确:凭证只免"重新输入",**每次提交后台仍校验 active tenant 状态**;租约结束即失效,与凭证有效期无关 |
| 7 | Bridge 认证方式未定 | 内部 Apps Script 已有 `VANISLAND_API_TOKEN` fail-closed 令牌门禁(WebApp.gs / V1_Router.gs),Script Properties 存储 | **复用同一模式**:bridge 专用 token 存 Netlify 环境变量,Apps Script 端 Script Properties 校验,fail-closed |
| 8 | Email 通知(未提配额) | GmailApp.sendEmail 已有现成代码(AppsScript_WebApp_Full.gs) | 复用;备注 Gmail 每日发信配额(普通账户 100/天),当前业务量安全 |

其余原方案内容(业务闭环、安全边界、表单字段、管理类型路由、通知格式、V1/V1.1/V2 分期)**保留不变**。

---

## 1. 业务闭环(不变)

租客打开 Vanisland AI Studio 公共入口 → 身份匹配 → 填写报修/事故/一般请求 → 上传照片 → 系统生成 Request ID → 租客收到收件确认 → Mabel 收到通知 → 内部创建唯一 Service Request → Property Events 写入引用 → 安排 subcontractor → 更新状态 → 完成并保留完整时间线

## 2. 架构(修订版)

```
Browser (04 Studio, 新路由 /tenant-service-request)
    ↓  HTTPS, 无任何内部 URL/ID/secret
Netlify Function: tenant-verify          【新增文件】
Netlify Function: tenant-service-request 【新增文件】
    ↓  携带 BRIDGE_TOKEN(Netlify 环境变量)
Internal Apps Script Bridge(01 项目,新增 V1_TenantServiceRequest.gs)
    - verifyTenant:只返回 { verified, sessionToken }
    - createTenantServiceRequest:创建记录,返回 Request ID
    ↓
Service Requests 表(新建,唯一数据源)
    + Property Events 引用行
    + Drive 附件文件夹(private)
    + GmailApp 通知(租客 receipt + Mabel 提醒)
```

单向数据流,内部数据不反向暴露。公共端永远不知道内部 Sheet ID、Apps Script URL、凭证、owner/tenant 数据库。

**前置安全任务(实施前必做)**:盘点现有 `VITE_STUDIO_EXEC_URL` 与 `VITE_HOME_SALE_EXEC_URL` 指向的 Apps Script 部署权限范围。若它们能读写内部管理数据,该洞优先于本项目修补。

## 3. 身份验证(修订版)

第一次使用:
1. 租客输入 Email + 电话后 4 位(仅此两项)
2. 后台精确匹配 active tenant
3. 匹配成功 → 返回简化地址(如 "693 3rd Street — Basement Suite")让租客点击确认
4. 确认后发放签名 sessionToken(短时效),进入表单

不显示:业主姓名、其他租客、内部 Tenant ID、完整电话、租约资料。
失败提示统一模糊:"We could not verify your information. Please contact your property manager."

后续使用(V1.1):同设备保存 60 天签名凭证,免重新输入;**每次提交后台仍校验 active 状态**。

## 4. 表单内容(不变)

页面:Tenant Service Request / 租客报修与服务申请

类别:Appliance Issue / Plumbing / Electrical / Heating-Cooling / Water Leak / Building Maintenance / Damage-Accident Report / Safety Concern / General Request

必填:类别、具体位置、描述、首次发现时间、紧急程度、是否持续、是否允许进入、合适进入时间

紧急提示(必须显示):
> For fire, active flooding, gas smell, immediate electrical danger, or life-safety emergencies, call 911 or the appropriate emergency service first. Do not wait for this form to be reviewed.

## 5. 附件(修订版)

- 最多 5 张照片,V1 无视频
- **前端 canvas 压缩至 ≤1MB/张(JPEG, 长边 ≤2000px),逐张独立请求提交**(规避 Netlify Function ~6MB body 上限与 base64 膨胀)
- 仅允许 image/jpeg、image/png、image/webp
- 文件名由系统生成:`TSR-20260711-0001_photo1.jpg`
- 保存至 private Drive 文件夹(复用现有 DriveApp 模式),Service Request 记录只存文件链接

## 6. 数据模型(修订版)

**新建 Google Sheet 表:Service Requests(唯一数据源)**

| 字段 | 说明 |
|------|------|
| Request ID | TSR-YYYYMMDD-NNNN,复用 v1GenerateEventId_ 的生成模式 |
| Tenant ID / Property ID / Owner ID | 后台匹配填入 |
| Management Type | MANAGED / OWNER_MANAGED / INACTIVE / UNKNOWN |
| Category / Location / Description | 表单 |
| Urgency / Ongoing / Access Permission / Preferred Access Times | 表单 |
| Attachments | Drive 链接,分号分隔 |
| Submitted At / Status / Assigned Contractor / Resolution / Completed At | 生命周期 |
| IP Digest / Turnstile Result | 审计 |

**引用写入(修订)**:
- Property Events 追加一行:eventType = "Tenant Service Request",relatedDocument = Request ID,status = New —— 复用 `v1SavePropertyEvent_` 的表结构,不改列
- Tenant Log 主档**不写入**(它是租约主档,非事件日志)
- Landlord Log:待盘点确认其结构后决定是否写引用行,或仅依赖 Property Events

全量数据只存在 Service Requests 表一处,杜绝三处不同步。

## 7. 管理类型路由(不变)

系统按 Property/Owner 记录自动判断,租客不可选:
- **MANAGED**(V1):创建 SR + Property Events 引用 + 通知 Mabel + 租客 receipt
- **OWNER_MANAGED**(V2):创建 SR + 标记 Forwarded to Owner + 自动通知业主 + 租客 receipt,不给 Mabel 创建执行任务
- **INACTIVE / UNKNOWN**:不写正式台账,进 Manual Review,不透露失败原因

## 8. 安全控制(修订版)

保留原方案全部条目,补充/修订:
- 精确匹配 active tenant(Email + Phone4,地址改为确认制)
- Cloudflare Turnstile 静默验证(经核实 04 目前**没有**任何反机器人机制,需新增)
- 同一 IP 15 分钟最多 5 次验证;同一租客每小时最多 3 次提交
- Bridge token:Netlify 环境变量 ↔ Apps Script Script Properties,fail-closed(复用 VANISLAND_API_TOKEN 模式,但**用独立的新 token**,不共用现有 token)
- 验证接口只返回 `{ "verified": true, "sessionToken": "..." }`,绝不返回内部 JSON
- 附件白名单 MIME + 系统命名 + private 文件夹
- 记录提交时间、IP 摘要、验证结果、Request ID

## 9. 通知(不变,补充配额备注)

V1 只用 Email(复用 GmailApp.sendEmail 现有代码):
- 租客 receipt:`Tenant Service Request Received — TSR-20260711-0001`
- Mabel 通知:`[NEW TENANT REQUEST] TSR-20260711-0001 — Plumbing`,Gmail 建过滤规则(自动加星 + Important + Tenant Requests 标签 + 手机通知)

备注:Gmail 普通账户每日发信配额 100 封,当前业务量安全,量大后再评估。
SMS 放 V2:普通请求 Email,Urgent 请求 Email + SMS。V1 不引入 Twilio。

## 10. 上线顺序(不变)

- **V1**:身份匹配、报修表单、图片上传(压缩+逐张)、receipt、Email 通知、Service Requests 表、Property Events 引用 —— 仅开放给直接管理的 active tenants
- **V1.1**:60 天设备凭证、短视频上传、维修状态更新
- **V2**:Owner-managed 自动转发、定期 inspection、Urgent SMS、subcontractor assignment

## 11. 实施路线(需要怎么做)

**Step 0 — 人工确认(Mabel,5 分钟)**
1. 登录 Netlify 确认 04 站点(Landlord-AI-Marketing-Studio repo)确实由 Netlify 托管、可以启用 Functions
2. 确认新增两个环境变量的权限(BRIDGE_TOKEN、TURNSTILE_SECRET)

**Step 1 — Codex 只读盘点(不改任何代码)**
使用第 12 节命令。目标:确认剩余未知项——01 内部系统的 active tenant 匹配字段与电话格式质量、Landlord Log 结构、现有 Drive 上传可复用的具体函数、`VITE_STUDIO_EXEC_URL` 权限范围。

**Step 2 — 实施(盘点通过后,按此顺序,每步可独立验证)**
1. 01 项目:新建 Service Requests Sheet + `V1_TenantServiceRequest.gs`(verifyTenant / createTenantServiceRequest,token 门禁),独立测试
2. 04 项目:新增 netlify.toml + netlify/functions/tenant-verify.js + tenant-service-request.js,配置环境变量
3. 04 项目:新增路由 `/tenant-service-request` + 表单页面(含图片压缩、Turnstile)
4. 端到端测试(用测试租客记录):验证 → 提交 → SR 创建 → Property Events 引用 → 两封邮件
5. 按 01 项目部署规则:报告路径/仓库/分支/改动文件 → push GitHub → Netlify 自动部署 → 报告 commit hash

**Step 3 — 验收测试(最低集)**
- 真实 active tenant 验证成功;inactive/错误信息验证失败且提示模糊
- 5 张手机原图可全部提交成功(压缩生效)
- Request ID 唯一且格式正确;Property Events 出现引用行;全量数据只在 SR 表一处
- 租客 receipt 与 Mabel 通知均送达
- 浏览器 DevTools 网络面板中不出现任何 Apps Script URL、Sheet ID、token
- 频率限制生效(第 6 次验证尝试被拒)

## 12. Codex 只读盘点命令(修订版)

```
Read-only architecture investigation only. Do not modify code, configuration,
Google Sheets, Apps Script deployments, Netlify settings, or production data.

Goal:
Validate the remaining unknowns for the Tenant Service Request bridge between:
1. Public application: /Users/mabelchen/Mabel Project/04_landlord-ai-marketing-studio
2. Internal application: /Users/mabelchen/Mabel Project/01_Vanisland_UI_Portal

The following facts are ALREADY VERIFIED — do not re-derive them, build on them:
- 04 has NO netlify.toml and NO netlify/functions directory; Netlify Functions
  will be a new layer. Frontend currently calls Apps Script exec URLs directly
  via VITE_STUDIO_EXEC_URL and VITE_HOME_SALE_EXEC_URL (src/utils/api.js,
  src/utils/homeSaleSheet.js).
- 04 routing lives in src/App.jsx (react-router-dom v7); the new page will be
  /tenant-service-request.
- 01 internal Apps Script uses a fail-closed token gate (VANISLAND_API_TOKEN in
  Script Properties; see WebApp.gs and V1_Router.gs). The bridge will reuse this
  pattern with a NEW dedicated token.
- v1SaveTenantLogEntry_ (V1_TenantLog.gs) writes a 25-column lease master record,
  NOT an event log. Event references will go to Property Events instead.
- v1SavePropertyEvent_ (V1_PropertyEvents.gs) exists with eventId/date/owner/
  property/unit/tenantId/eventType/status/relatedDocument columns; the design
  appends a reference row there and creates a NEW Service Requests sheet as the
  single source of truth.
- GmailApp.sendEmail and DriveApp folder-upload code exist in
  AppsScript_WebApp_Full.gs and can be reused.

Please inspect and report ONLY the remaining unknowns:
1. The exact active-tenant data source: which sheet/columns hold tenant email,
   phone, active status, property, unit. Sample (without exposing real personal
   data in the report) whether the phone column format reliably yields the last
   4 digits.
2. The Landlord Log schema (v1SaveLandlordLogEntry_, 19 columns): is there a
   sensible column for a Service Request reference, or should Landlord Log be
   skipped in V1 in favor of Property Events only?
3. The exact scope and permissions of the Apps Script deployments behind
   VITE_STUDIO_EXEC_URL and VITE_HOME_SALE_EXEC_URL: what actions do they expose,
   and can any of them read internal tenant/owner/finance data? Flag any
   existing exposure as a security finding.
4. The best existing Drive upload function to reuse for tenant photos, and which
   parent folder structure to use for a new private "Tenant Service Requests"
   attachments folder.
5. Which file in 01 is the correct live entry point to add
   V1_TenantServiceRequest.gs alongside (confirm the active deployment bundle —
   there are multiple .gs bundles including archived ones).
6. Whether any anti-bot mechanism exists anywhere in 04 (verified: none found in
   src/; double-check Netlify UI-level settings cannot be inspected from code —
   note this as a manual check for Mabel).
7. Confirm the Request ID generation pattern to reuse (v1GenerateEventId_ or
   equivalent) and that TSR-YYYYMMDD-NNNN will not collide with existing IDs.
8. Minimal list of files to create/modify in both projects, and the exact new
   environment variables required (BRIDGE_TOKEN, TURNSTILE_SECRET, others?).

Do not implement, create schemas, deploy, commit, or push.
Return a concise report answering points 1-8 and confirm or amend the V2 design
in docs/Tenant_Service_Request_Design_V2_20260711.md.
```

---

## 13. 只读盘点结果(2026-07-11,Claude 执行,替代第 12 节 Codex 命令)

第 12 节命令的 8 个问题已全部盘点完毕,**无需再发给 Codex**。结果如下:

**Q1 租客数据源与电话格式**
数据源:主表 `19HQIXmwCGmeEBlvlRvuv8RM6gNiM49M_79Ise_rEnF0` 的 "租客信息 Tenants" tab。代码(V1_Lookups.gs `v1BuildTenantsLookup_`)读取:tenantId(A)、tenantName(B)、primaryEmail(D)、secondaryTenantName(E)、secondaryEmail(G)、property(H)、unit(I)、ownerId(J)、monthlyRent(K)、deposit(O)、status(U/V 列)。
**C 列代码未读取**,按 Owners 表"姓名/电话/邮箱"的列序推断为租客1电话,F 列为租客2电话。⚠️ 待 Mabel 打开表确认 C/F 列表头及电话填写率。
电话质量证据:Owners tab 电话有空白、有 "604-218-2100(William)" 带注释格式。因此验证逻辑必须:**去除所有非数字字符后取后 4 位**;电话为空的租客自动落入 Manual Review,不硬拒。

**Q2 Landlord Log**
19 列,财务导向(monthlyRentDue/amount/amountType/carryForward)。虽有 relatedCategory/status/evidenceLink,语义不合。
**决定:V1 跳过 Landlord Log,引用只写 Property Events**(替代第 6 节的"待盘点"项)。

**Q3 现有 exec URL 权限范围**
04 的 `apps-script/Code.gs` 全文不含内部主表 ID;暴露动作全部为 studio 域(listings/leads/applications/strategy/briefs)。写操作有 `auth` 门禁,上传有 `validateUploadToken_`。**未发现内部租客/业主/财务数据暴露,现状安全边界成立。**
备注:`saveContact_`、`savePropertyStrategyAssessment_` 为无 token 公共写入,与本项目无关但可日后加频率限制。

**Q4 附件上传(对第 5 节的优化)**
04 studio Apps Script 已有完整的 token 门禁上传:`uploadFile_` / `uploadToSubfolder_` / `validateUploadToken_`(为租房申请而建)。
**推荐方案 B**:验证成功后 bridge 签发一次性 upload token → 浏览器直接上传到 studio Apps Script → 新建 private "Tenant Service Requests" Drive 文件夹 → 提交时只传文件 ID 给内部 bridge。
优点:绕开 Netlify Function ~6MB body 限制(Apps Script POST 上限 ~50MB),复用已验证代码。前端压缩(≤1MB/张)仍保留。

**Q5 01 活跃部署 bundle**
根目录 `V1_*.gs + WebApp.gs` 为 portal bundle,但根目录无 .clasp.json(`sandbox_push_tmp*` 和 `apps-script-live-backups/` 均属另一个 rent-collection 脚本)。
⚠️ 待 Mabel 确认 V1 portal 对应的 Apps Script 项目及推送方式(疑为编辑器手动粘贴)。`V1_TenantServiceRequest.gs` 加入该项目。

**Q6 反机器人**
04 代码内无任何 Turnstile/captcha。Turnstile 为全新增。
频率限制:Netlify Function 无状态,不引入新存储服务;**改在 Apps Script 端用 CacheService 做限流**(IP 摘要 15 分钟 5 次验证、租客每小时 3 次提交)。

**Q7 Request ID**
复用 `v1NextSequenceForPrefix_`(V1_IdGenerator.gs)。现有前缀为 EVT-YYYYMM-NNN 和月份前缀,TSR-YYYYMMDD-NNNN 无碰撞风险。

**Q8 文件与环境变量清单**

01 项目(内部):
- 新建:`V1_TenantServiceRequest.gs`(verifyTenant / createTenantServiceRequest / CacheService 限流 / GmailApp 通知)
- 修改:`V1_Config.gs`(enums.propertyEventTypes 加 `tenant_service_request`;sheets 加 serviceRequests;allowedPostActions 不加——bridge 动作走独立 token 门禁,不进 admin/staff 路由)
- 新建 Sheet tab:`Service Requests`(第 6 节字段)
- Script Properties 新增:`TSR_BRIDGE_TOKEN`

04 项目(公共):
- 新建:`netlify.toml`、`netlify/functions/tenant-verify.mjs`、`netlify/functions/tenant-service-request.mjs`
- 新建:`src/pages/TenantServiceRequest.jsx`(表单 + canvas 压缩 + Turnstile)
- 修改:`src/App.jsx`(加路由 `/tenant-service-request`)
- 修改:`apps-script/Code.gs`(加 issueTsrUploadToken 动作,复用 uploadFile_ 通道;方案 B)
- Netlify 环境变量新增:`TSR_BRIDGE_TOKEN`、`TSR_INTERNAL_EXEC_URL`、`TURNSTILE_SECRET_KEY`
- 前端构建变量:`VITE_TURNSTILE_SITE_KEY`(公开安全)

**原剩余 2 个人工确认项——已于 2026-07-11 由 Claude 直接核实,全部关闭:**

1. **Tenants 表电话列(已确认)**:C 列 = 主租客电话 Primary Phone,F 列 = 次租客电话 Secondary Phone(整表 xlsx 导出核对)。数据质量:40 行租客记录,35 个 Active;**35/35 电话可提取后 4 位、35/35 有邮箱、Email+后4位组合无碰撞**。Email + Phone Last 4 验证方案完全可行。Manual Review 兜底逻辑仍保留(防未来数据缺失)。
2. **V1 live 源码(已确认)**:据 `docs/PHASE_0_DEPLOYMENT_AND_SOURCE_CONFIRMATION.md`(2026-07-04),**live V1 = `V1_Bundle_TOKEN_PATCHED.gs`**(URL 为 `.env.local` 的 `VITE_V1_APPS_SCRIPT_URL`,token fail-closed 已线上验证);根目录散装 `V1_*.gs` ×19 是旧模块副本(归档候选),仅作代码参考。**修订 Q8:`V1_TenantServiceRequest.gs` 必须加入 bundle 对应的 Apps Script 项目,配置改动也改 bundle 内的 V1_CONFIG,不改散装文件。**

**关联安全提醒(非本项目,但优先级更高)**:PHASE_0 文档 F-2 已记录 Receipt 部署(`VITE_RECEIPT_SCRIPT_URL`)**无 token gate**,匿名可达数据读取路径,属高风险暴露面。建议在做本项目前或同期先修复该项。

---

*本文档可追溯性:改动清单第 0 节与第 13 节的每条核实结果均来自 2026-07-11 对两个项目源码及主表的直接检查(文件名已标注)。原方案其余部分未经改动照搬,以 Google Doc 原文为准。*
