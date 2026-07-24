# Rental Portal 上线与验证清单 / Deploy & Verify Checklist

**页面 / Page:** `/rentals`（Vanisland Rentals 租客门户；旧地址 `/examples` 仅作 301 兼容跳转，保留给旧链接/二维码使用，不再是对外正式地址）
**生产域名 / Production:** https://www.vanislandproperty.ca/rentals
**Netlify 项目 / Site:** `landlord-ai-marketing-studio`
**仓库 / Repo:** `mabelclaw67-hash/Landlord-AI-Marketing-Studio`（分支 `main`）

**待推送提交 / Commits ready to push（本地已提交，待 push）**

- `f332cad` — Add 'Share This Rental Portal' module（复制链接 + 二维码）
- `93ef71f` — Redesign Rental Portal (/examples) UI（如已推送可忽略）

---

## 1. 推送到 GitHub / Push
在**本机终端**执行（Claude 的 sandbox 无法访问 GitHub）：

```bash
cd "/Users/mabelchen/Mabel Project/04_landlord-ai-marketing-studio"
git log --oneline -1        # 应显示 f332cad
git push origin main
```

- [ ] `git log` 顶部为 `f332cad`
- [ ] `git push` 成功（输出 `..f332cad  main -> main`）
- [ ] （可选）消除 remote 重定向提示：
      `git remote set-url origin git@github.com:mabelclaw67-hash/Landlord-AI-Marketing-Studio.git`

## 2. Netlify 自动部署 / Deploy
- [ ] Netlify → `landlord-ai-marketing-studio` → Deploys 出现新构建
- [ ] 最新一条 deploy 对应 commit `f332cad`
- [ ] 状态为 **Published**（构建无报错）

## 3. 生产环境验证 / Production Verification
打开 https://www.vanislandproperty.ca/rentals ：

- [ ] 首页正常打开，Hero 显示 **"Vanisland Rentals"**
- [ ] Hero 正下方出现 **"Share This Rental Portal / 分享租赁门户"** 模块
- [ ] 点击 **Copy Portal Link / 复制门户链接** → 按钮变 "✓ Link Copied / 已复制链接"
- [ ] 粘贴验证复制内容为 `https://www.vanislandproperty.ca/rentals`
- [ ] 点击 **Show QR Code / 显示二维码** → 二维码展开；再点收起
- [ ] 手机扫二维码 → 打开 `/rentals` 门户
- [ ] 打开 `https://www.vanislandproperty.ca/examples`（旧地址）→ 自动跳转到 `/rentals`
- [ ] EN / 中文切换，整页内容同步变化（含分享模块文案）
- [ ] 房源区 **Share Kit** 仍在（房源/宣传分享，与顶部模块分工）

**主要路由（点击均无 404）:**

- [ ] Browse Rental Listings → `/rentals`
- [ ] Apply Now → `/apply`
- [ ] Start Service Request → `/tenant-service-request`
- [ ] Contact Us → `/tenant-contact`
- [ ] Admin → `/admin`

**质量项:**

- [ ] 真实房源数据正常读取（显示房源卡，而非"加载失败"提示）
- [ ] 底部只有一个深色公司页脚 + 上方轻量 "Tenant Quick Links" 条（**无双 Footer**）
- [ ] Quick Help 各条可展开/收起
- [ ] 桌面端无横向滚动
- [ ] 手机端无横向滚动（重点看房源区和分享模块）

## 4. 收尾确认 / Wrap-up
- [ ] 本次仅前端 UI（`src/pages/Examples.jsx`、`src/styles/global.css`）
- [ ] 未改动 Apps Script / API / Google Sheet / Netlify Functions / 房源业务逻辑
- [ ] 未接触 `01_Vanisland_UI_Portal` 项目
- [ ] `package.json` / `package-lock.json` 无多余依赖（无 Playwright）

---

**已完成的本地验证（供参考，部署前）:** build 通过；复制链接写入剪贴板正确；二维码渲染正常；EN/中文正常；4 视口（1440/1280/768/390）横向滚动为 0；无双 Footer。
