# Apple 登录配置步骤（Dumpling Lab 网页版 + 顺手修好侃侃网页版）

## 背景（先看这段，省得白做）

侃侃 App 里的 Apple 登录用的是 **原生 id_token 流程**（`mobile/lib/auth.ts:571`，
`expo-apple-authentication` → `signInWithIdToken`），这条路只要在 Supabase 的
Client IDs 里填 bundle id 就行，**不需要 Services ID，也不需要密钥**。

侃侃**网页版**的 Apple 登录其实是坏的，只是开关开着。实测：

```
GET phjodeijcmswkauqdhaz.supabase.co/auth/v1/authorize?provider=apple
→ {"error_code":"validation_failed","msg":"Unsupported provider: missing OAuth secret"}
```

所以下面这套东西两边都得从头建。好消息是开发者账号（`cancan@southstarsg.com`）
已经在付费，两个品牌共用，**不用再花 99 美元**。

一把签名 key 可以给整个团队所有 Services ID 签名，所以：
**建 2 个 App ID + 2 个 Services ID + 1 把 key，签 2 段 secret。**

| | Dumpling Lab | 侃侃 |
|---|---|---|
| App ID | `sg.dumplinglab.app`（新建） | `sg.kankan.cancan`（已有，App 在用） |
| Services ID | `sg.dumplinglab.web`（新建） | `sg.kankan.web`（新建） |
| Supabase 回调 | `https://nybhfkwotdmgwlaadpal.supabase.co/auth/v1/callback` | `https://phjodeijcmswkauqdhaz.supabase.co/auth/v1/callback` |

---

## 第 0 步：Team ID —— 已经有了，不用去查

**`KSR6492V5F`**

来源：`~/cancanapp/mobile/ios/CanCan.xcodeproj/project.pbxproj:374` 的
`DEVELOPMENT_TEAM`（Expo prebuild 出来的原生工程里带着）。

开发者后台用 `cancan@southstarsg.com` 登录：<https://developer.apple.com/account>

---

## 第 1 步：建 Dumpling Lab 的 App ID

<https://developer.apple.com/account/resources/identifiers/add/bundleId>

（如果上面这个链接直接跳到列表页，就走
<https://developer.apple.com/account/resources/identifiers/list> → 右上角蓝色 **＋**
→ 选 **App IDs** → Continue → 选 **App** → Continue）

- Description：`Dumpling Lab`
- Bundle ID：选 **Explicit**，填 `sg.dumplinglab.app`
- Capabilities 列表里往下翻，勾上 **Sign in with Apple**（保持默认的
  "Enable as a primary App ID"）
- Continue → Register

---

## 第 2 步：建 Dumpling Lab 的 Services ID

<https://developer.apple.com/account/resources/identifiers/add/serviceId>

- Description：`Dumpling Lab` ← **顾客在 Apple 登录弹窗上看到的就是这个名字，别填错**
- Identifier：`sg.dumplinglab.web`
- Continue → Register

注册完**必须再点进去配一次**（列表里点它）：

<https://developer.apple.com/account/resources/identifiers/list/serviceId>

- 勾上 **Sign in with Apple** → 右边 **Configure**
- Primary App ID：选第 1 步建的 `Dumpling Lab`
- Domains and Subdomains：`nybhfkwotdmgwlaadpal.supabase.co`
- Return URLs：`https://nybhfkwotdmgwlaadpal.supabase.co/auth/v1/callback`
- Next → Done → **Continue → Save**（这一步不点 Save 前面白填）

---

## 第 3 步：建签名 key（一把够两边用）

<https://developer.apple.com/account/resources/authkeys/add>

- Key Name：`Sign in with Apple`
- 勾上 **Sign in with Apple** → 右边 **Configure** → Primary App ID 选
  `Dumpling Lab` → Save
- Continue → Register → **Download**

`.p8` 文件**只能下载一次**，下完存到安全的地方（别提交进 git）。
页面上的 **Key ID**（10 位）也抄下来。

---

## 第 4 步：签 secret

Apple 不发固定密钥，"secret" 是你用 `.p8` 自己签的一段 JWT，**最长 6 个月过期**。
仓库里有脚本，`.p8` 不用离开你的电脑：

```sh
node scripts/apple-client-secret.mjs \
  --key ~/Downloads/AuthKey_XXXXXXXXXX.p8 \
  --key-id XXXXXXXXXX \
  --team-id KSR6492V5F \
  --services-id sg.dumplinglab.web
```

输出的那一长串就是 secret，脚本同时会打印到期日期。**记进日历**：
到期那天 Apple 登录会毫无预兆地全部失败。

---

## 第 5 步：填进 Supabase

<https://supabase.com/dashboard/project/nybhfkwotdmgwlaadpal/auth/providers> → **Apple**

- 打开开关
- Client IDs：`sg.dumplinglab.web`
  （以后饺子有了自己的 iOS App，改成 `sg.dumplinglab.web,sg.dumplinglab.app`，逗号分隔）
- Secret Key (for OAuth)：第 4 步的输出
- Save

做完告诉我，我把 `DL_AUTH_APPLE_ENABLED` 改回 `true` 重新部署，图标就回来了。

---

## 顺手修侃侃的网页版

同一套流程，只换三个值。**不用再建 App ID**（`sg.kankan.cancan` 已经有了，
而且已经开了 Sign in with Apple）。

**A. 建 Services ID** — <https://developer.apple.com/account/resources/identifiers/add/serviceId>

- Description：`CanCan`
- Identifier：`sg.kankan.web`
- 注册后点进去 → 勾 Sign in with Apple → Configure：
  - Primary App ID：`sg.kankan.cancan`
  - Domains：`phjodeijcmswkauqdhaz.supabase.co`
  - Return URLs：`https://phjodeijcmswkauqdhaz.supabase.co/auth/v1/callback`
  - Save

**B. 用同一把 key 再签一段** —— 只换 `--services-id`：

```sh
node scripts/apple-client-secret.mjs \
  --key ~/Downloads/AuthKey_XXXXXXXXXX.p8 \
  --key-id XXXXXXXXXX --team-id KSR6492V5F \
  --services-id sg.kankan.web
```

**C. 填进侃侃的 Supabase** —— <https://supabase.com/dashboard/project/phjodeijcmswkauqdhaz/auth/providers> → Apple

- Client IDs：`sg.kankan.cancan,sg.kankan.web`
  ⚠️ **`sg.kankan.cancan` 必须留着**，删了 App 里的原生 Apple 登录会立刻挂掉
- Secret Key (for OAuth)：B 的输出
- Save

---

## 到期提醒

两段 secret 是同一天签的，会同一天过期。到期前重跑第 4 步和 B，
把新的两段填回各自的 Supabase 即可，Apple 后台不用再动。
