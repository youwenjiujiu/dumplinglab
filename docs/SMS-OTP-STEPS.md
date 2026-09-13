# 手机验证码（Twilio + 新加坡 SSIR 登记）

先说结论：**这是四种登录方式里最贵、最慢、最容易踩坑的一个，建议排在最后。**
邮箱验证码 + Google 已经覆盖绝大多数顾客，短信的边际价值不高。
下面把该做的都写清楚，你自己权衡什么时候做。

---

## 为什么新加坡特别麻烦

2023 年 1 月 31 日起，新加坡实行 **SSIR（Singapore SMS Sender ID Registry）** 全面登记制。
没有登记过的字母型发送方名称（比如 `DumplingLab`），运营商会**强制在短信开头加上
`Likely-SCAM`**。顾客收到的会是：

```
Likely-SCAM: Your Dumpling Lab code is 483920
```

在店里扫码点餐的场景下，这基本等于劝退。所以在新加坡做短信验证码，
**SSIR 登记不是可选项**。

SSIR 由 **SGNIC**（新加坡网络资讯中心，IMDA 下属）运营。

---

## 第 1 步：SSIR 登记（先做这个，要等几个工作日）

<https://smsregistry.sg>

需要准备：

| 项目 | 说明 |
|---|---|
| **UEN** | 公司注册号，个人做不了 |
| **Sender ID** | 想显示的名字，**最多 11 个字符**，建议 `DumplingLab`（正好 11 位） |
| **参与的短信通道商** | 登记时要声明由哪些 aggregator 代发。Twilio 是 SSIR 的参与方，选它 |
| **费用** | 有一次性登记费和年费，金额以 smsregistry.sg 官网为准 |

⚠️ **Sender ID 一旦登记就别改**，改名要重新走流程。
⚠️ 侃侃如果已经登记过自己的 Sender ID，**那个不能给饺子用** ——
Sender ID 和品牌绑定，混用会被驳回。

---

## 第 2 步：Twilio 开户

<https://www.twilio.com/try-twilio>

1. 注册，完成邮箱和手机验证。
2. **升级成付费账号并充值** —— 试用额度不能用自定义 Sender ID。
3. 完成 Twilio 的合规资料填报（Messaging Compliance），把新加坡的 SSIR
   登记信息填进去，Twilio 才会允许你用 `DumplingLab` 这个发送方名称。
   <https://console.twilio.com/us1/develop/sms/compliance>

**成本**：发到新加坡号码的短信按条计费，每条大约几分钱新币，
再加 SSIR 的登记费和年费。跟邮箱（Resend 免费额度就够）比是量级差别。

---

## 第 3 步：选一种接法

Supabase 支持两种，**推荐第一种**。

### A. Twilio Verify（推荐）

验证码由 Twilio 生成、发送、校验，送达率和合规性都更好，还自带防刷。

<https://console.twilio.com/us1/develop/verify/services>

- Create new → Friendly name 填 `Dumpling Lab`
- 建好后复制 **Service SID**（`VA` 开头）
- 在这个 Service 的设置里把发送方名称设成登记好的 `DumplingLab`

要填进 Supabase 的：Account SID、Auth Token、**Service SID**

### B. Twilio 普通短信（Programmable Messaging）

自由度高一点，但要自己管模板和防刷。

- Messaging → Services → 建一个 Messaging Service
- 把 `DumplingLab` 这个 Alpha Sender 加进它的 Sender Pool
- 复制 **Messaging Service SID**（`MG` 开头）

要填进 Supabase 的：Account SID、Auth Token、**Messaging Service SID**

Account SID 和 Auth Token 在这里：<https://console.twilio.com>（首页 Account Info）

---

## 第 4 步：填进 Supabase

<https://supabase.com/dashboard/project/nybhfkwotdmgwlaadpal/auth/providers> → **Phone**

- 打开 **Enable Phone provider**
- SMS provider 选 **Twilio** 或 **Twilio Verify**（对应上一步选的那种）
- 填 Account SID / Auth Token / Service SID
- 用普通短信（B 方案）的话，下面的消息模板必须包含 `{{ .Code }}`，例如：
  ```
  你的 Dumpling Lab 登录验证码：{{ .Code }}，5 分钟内有效。
  ```
  用 Twilio Verify（A 方案）则模板由 Twilio 那边管，这里不用填。
- Save

---

## 第 5 步：调频率上限（**这步不能省**）

<https://supabase.com/dashboard/project/nybhfkwotdmgwlaadpal/auth/rate-limits>

店里所有顾客共用一个 WiFi 出口 IP，Supabase 的限流是**按 IP 算**的。
默认每 5 分钟 30 次，午市高峰会集体登录失败。

- SMS 发送上限：按你能接受的短信费用定，建议先设一个不高的数，防刷
- Sign-ups / sign-ins：30 → **150**（每 5 分钟）
- Token verifications：30 → **150**（每 5 分钟）
- Emails：30 → **200**（每小时）

---

## 第 6 步：告诉我

我把 `DL_AUTH_PHONE_ENABLED` 改回 `true`，重新部署，
手机号那个 tab 就会出现在登录面板上。然后我从线上真机跑一遍。

---

## 我的建议

**先别做。** 理由：

1. 邮箱验证码 + Google 一键登录已经覆盖了绝大多数顾客，堂食扫码的场景下
   Google 一键登录甚至比输手机号更快。
2. SSIR 登记要等几个工作日，还要 UEN 和一笔固定费用。
3. 短信按条计费，会员越多越贵，而它带来的转化提升很有限。

真正值得优先做的是 **Apple 登录**（`docs/APPLE-SIGNIN-STEPS.md`）——
开发者账号侃侃已经在付，边际成本是零，而 iPhone 用户在新加坡占比很高。
