# 新 Supabase 项目配置步骤（dumplinglab）

项目 ref：`nybhfkwotdmgwlaadpal`
Project URL：`https://nybhfkwotdmgwlaadpal.supabase.co`

已确认状态（2026-09-12 晚，线上实测）：`email: true`、`google: true`，`phone` / `apple`
仍为 false（未接 Twilio / Apple Developer，点餐页已把这两个入口隐藏）。
Site URL = `https://order.dumplinglab.sg`，回调白名单已包含 `/api/member`，
未登记的地址会被 GoTrue 拒绝并退回 Site URL——已用 `/auth/v1/verify` 探测确认。
自定义 SMTP（Resend，`noreply@dumplinglab.sg`）已生效。
Vercel 上 `DL_SUPABASE_URL` / `DL_SUPABASE_ANON` 已填好，点餐站已切到本项目。

---

## 1. URL Configuration（2 分钟，先做这个）

打开 <https://supabase.com/dashboard/project/nybhfkwotdmgwlaadpal/auth/url-configuration>

- **Site URL** 填 `https://order.dumplinglab.sg`
  这是 Supabase 在找不到合法回调时的兜底地址。填错就会出现"登录完跳到别人网站"的问题。
- **Redirect URLs** → Add URL，逐条添加：
  ```
  https://order.dumplinglab.sg/api/member*
  https://order.dumplinglab.sg/*
  ```
- Save。以上均已配置完成。

---

## 2. Email Templates（10 分钟）

打开 <https://supabase.com/dashboard/project/nybhfkwotdmgwlaadpal/auth/templates>

要改两个模板，因为首次登录走「Confirm signup」，老用户走「Magic Link」：

**必须包含 `{{ .Token }}`**，否则 Supabase 发的是登录链接而不是 6 位验证码，
我们的界面是让顾客输验证码的，收到链接就对不上。

Subject：`你的 Dumpling Lab 登录验证码`

Body（两个模板可以用同一份）：

```html
<h2>Dumpling Lab</h2>
<p>你的登录验证码：</p>
<p style="font-size:32px;letter-spacing:6px;font-weight:600">{{ .Token }}</p>
<p>5 分钟内有效。不是你本人操作请忽略本邮件。</p>
```

---

## 3. 自定义发信 SMTP（30–60 分钟，需要一个自己的域名）

不配的话，Supabase 内置发信有严格频率限制（默认每小时几封），只够测试，
开业当天会卡住顾客登录。

推荐 Resend，最省事：

1. <https://resend.com> 注册。
2. **Domains → Add Domain**，填你们的域名（例如 `dumplinglab.sg`）。
3. Resend 会给出几条 DNS 记录（SPF、DKIM、可选 DMARC），到域名注册商后台照抄添加，
   等验证变绿（通常几分钟到一小时）。
4. **API Keys → Create API Key**，权限选 Sending access，复制 key（只显示一次）。
5. 回到 Supabase：<https://supabase.com/dashboard/project/nybhfkwotdmgwlaadpal/settings/auth>
   找到 **SMTP Settings**，打开 Enable Custom SMTP，填：

   | 字段 | 值 |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | 上一步的 API Key |
   | Sender email | `noreply@你们的域名` |
   | Sender name | `Dumpling Lab` |

6. 保存后到 **Authentication → Rate Limits**，把邮件发送上限调高
   （自定义 SMTP 之后才允许调）。

没有域名就先跳过这步：内置发信够我们联调，等域名到位再补。

---

## 4. 手机验证码 / Twilio（需要花钱，新加坡另有合规要求）

打开 <https://supabase.com/dashboard/project/nybhfkwotdmgwlaadpal/auth/providers> → **Phone**

1. <https://twilio.com> 注册，完成实名验证，充值。
2. 两种接法，二选一：
   - **Twilio Verify**（推荐）：Twilio 后台建一个 Verify Service，把 Service SID 填进
     Supabase 的 Twilio Verify 选项。验证码由 Twilio 生成和校验，合规和送达率更好。
   - **Twilio 普通短信**：需要 Account SID、Auth Token、Messaging Service SID。
3. Supabase 里打开 **Enable Phone provider**，填上述凭据，Save。
4. **新加坡特别注意**：本地法规要求字母型发送方名称（Sender ID，比如 `DumplingLab`）
   必须在 SSIR（Singapore SMS Sender ID Registry）注册，否则短信会被强制标记成
   "Likely-SCAM"。注册通过 Twilio 或其他运营商代办，需要公司 UEN，几个工作日。
   没注册前建议先只用邮箱登录。

---

## 5. Google 登录（20 分钟，免费）

**A. Google Cloud 侧**

1. <https://console.cloud.google.com> → 新建项目，名字 `Dumpling Lab`。
2. **APIs & Services → OAuth consent screen**：
   - User Type 选 **External**
   - App name：`Dumpling Lab`；support email 和 developer email 填你的邮箱
   - Scopes 只需要 `.../auth/userinfo.email` 和 `.../auth/userinfo.profile`
   - 保存后可以先留在 Testing 状态自测，正式对外前点 **Publish app**
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**：
   - Application type：**Web application**
   - Name：`Supabase`
   - **Authorized redirect URIs** 填这一条（必须一字不差）：
     ```
     https://nybhfkwotdmgwlaadpal.supabase.co/auth/v1/callback
     ```
   - 创建后复制 **Client ID** 和 **Client secret**

**B. Supabase 侧**

<https://supabase.com/dashboard/project/nybhfkwotdmgwlaadpal/auth/providers> → **Google**
→ 打开开关 → 粘贴 Client ID / Client secret → Save。

Apple 登录同理，但需要 Apple Developer 账号（每年 99 美元）、Services ID 和签名密钥，
建议放到最后。

---

## 配完之后

把已完成的项告诉我，我来：

1. 在 Vercel 填 `DL_SUPABASE_URL` = `https://nybhfkwotdmgwlaadpal.supabase.co`、
   `DL_SUPABASE_ANON` = publishable key
2. 把还没配好的入口用 `DL_AUTH_PHONE_ENABLED` / `DL_AUTH_GOOGLE_ENABLED` /
   `DL_AUTH_APPLE_ENABLED` 设成 `false` 关掉
3. 重新构建部署点餐版本，逐条实测邮箱 / 手机 / Google

最省事的顺序是：**第 1 步做完 + 第 2 步做完就可以切过来**（邮箱登录先跑通、品牌先正确），
SMTP、短信、Google 之后配好一项我就打开一项。

---

## 6. Google 登录改用 One Tap（去掉授权页上的 supabase.co 域名）

原来的跳转式登录，Google 授权页会显示「Google 会将你的信息分享给
**nybhfkwotdmgwlaadpal.supabase.co**」——那串是 Supabase 建项目时随机分配的主机名，
顾客扫码点餐时看到会像钓鱼网站。Google 这行显示的是回调地址的域名，跟后台填的应用名无关。

改成 ID token 流程后，没有"回调地址"这个概念，Google 显示的就是 `order.dumplinglab.sg`。
代码侧已完成（`member-core.js` 的 `google-nonce` / `google-token`，
`rewards-ui.js` 的 `mountGoogle`），生产环境变量 `DL_GOOGLE_CLIENT_ID` 已填。

**还差 Google Cloud 那边一步：**

<https://console.cloud.google.com/apis/credentials>

点进那个 Web 类型的 OAuth 2.0 客户端 ID →
**已获授权的 JavaScript 来源（Authorized JavaScript origins）** → 添加 URI：

```
https://order.dumplinglab.sg
```

保存。Google 那边生效要几分钟到几小时。

**加之前不会坏**：Google 的脚本、取 nonce、渲染按钮，三件事全部成功才会切过去，
否则页面保留原来的跳转按钮。所以这一步没做完，登录照常能用，只是授权页还显示旧域名。

原来的跳转式登录（`action: "oauth"`）保留着，没有删。
