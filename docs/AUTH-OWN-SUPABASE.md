# 会员登录改用 Dumpling Lab 自己的身份项目

起因：登录目前借用侃侃喜剧的 Supabase 项目（`phjodeijcmswkauqdhaz`），所以
验证码邮件写的是「你的 cancan 登录验证码」、发件人是 `hello@can-can.sg`，
Google 登录完还会跳到 `cancancomedy.com`（该项目的 Site URL）。邮件模板、发件
域名、短信签名、回调白名单都是**项目级**设置，和侃侃共用就改不成自己的品牌。

决定（2026-09-12）：Dumpling Lab 建自己的 Supabase 项目。代价是账号不再与侃侃
互通，跨站券桥接需要另行设计——该桥接目前在生产上是关闭的
（`CANCAN_REWARDS_ORIGIN` / `CANCAN_REWARDS_BRIDGE_SECRET` 未配置），
积分奖励也尚未配置任何项目（`/api/rewards` 返回 `rewards: []`），
所以此时切换不会丢失任何真实会员数据。

## 代码侧（已完成）

`web/server/member-production.js` 改读 `DL_SUPABASE_URL` / `DL_SUPABASE_ANON`，
两者缺省时回落到 `CANCAN_APP_SUPABASE_*`。因此在新变量填好之前，线上行为完全不变。

## 需要在 Supabase 后台完成（需要账号权限）

1. 新建项目，区域选 **Southeast Asia (Singapore)**，名称 `dumplinglab`。
2. **Authentication → URL Configuration**
   - Site URL：`https://dumplinglab-menu.vercel.app`
   - Redirect URLs 增加：
     ```
     https://dumplinglab-menu.vercel.app/api/member*
     https://dumplinglab-menu.vercel.app/*
     ```
   - 以后接了自定义域名，照样各加两条。
3. **Authentication → Email Templates**：把 Magic Link / OTP 模板改成 Dumpling Lab
   的措辞（正文里用 `{{ .Token }}` 输出验证码）。
4. **Project Settings → Authentication → SMTP**：接自己的发信服务
   （Resend / SES / Postmark 均可），发件人用 Dumpling Lab 的域名。不配的话
   Supabase 内置发信有严格频率限制，只能用于测试。
5. **手机验证码**：Authentication → Providers → Phone，接短信服务商
   （Twilio / MessageBird），发送方名称设成 Dumpling Lab。这一项要单独花钱。
6. **Google 登录**：在 Google Cloud 建 OAuth 客户端，授权重定向 URI 填
   `https://<新项目 ref>.supabase.co/auth/v1/callback`，把 client id / secret
   填回 Supabase 的 Google provider。
7. **Apple 登录**：需要 Apple Developer 账号，同理配置 Services ID 与密钥。

## 切换（已完成，2026-09-12）

生产环境变量已填：`DL_SUPABASE_URL=https://nybhfkwotdmgwlaadpal.supabase.co`、
`DL_SUPABASE_ANON=<publishable key>`；`DL_AUTH_PHONE_ENABLED` 与
`DL_AUTH_APPLE_ENABLED` 置为 `false`（尚未接 Twilio / Apple）。线上 `/api/member`
返回 `email/password/google` 可用，Google 授权地址指向新项目，回调为
`https://order.dumplinglab.sg/api/member?action=oauth-callback`。

原始操作命令：

```sh
cd web
vercel env add DL_SUPABASE_URL production     # https://<ref>.supabase.co
vercel env add DL_SUPABASE_ANON production    # anon public key
```

然后重新构建部署点餐版本：

```sh
node editions/atelier/build-production.mjs    # 输出临时目录
# 在该目录补上 /order → / 的 307 跳转与 web/.vercel，再 vercel --prod --yes
```

上线后逐项验证：邮箱验证码、手机验证码、Google、Apple，确认邮件署名是
Dumpling Lab、Google 登录回到点餐页而不是喜剧站。

`DL_AUTH_GOOGLE_ENABLED` / `DL_AUTH_APPLE_ENABLED` / `DL_AUTH_PHONE_ENABLED`
控制各入口是否显示；哪一项还没配好就先设成 `false`，避免顾客点了走进死路。

## 遗留

- 侃侃跨站券：新身份不再是侃侃的 token，`/api/cancan` 那条桥若要恢复，需要改成
  按已验证邮箱在两侧对账，而不是转发 provider token。目前该功能未上线，暂不处理。
