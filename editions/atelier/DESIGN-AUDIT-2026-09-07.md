# 菜单视觉与交互核对 · 2026-09-07

后续修订：详情菜图已按用户要求取消转动。当前本地又移除了空购物车的盘子/筷子插画，保留“尚未选菜”与单一“去选菜”按钮；食材详情改为小字号、浅暖色信息区，不再使用加号公式。后两项尚未部署，详见 `INGREDIENTS.md`；下方旋转和空盘记录为此前版本，不代表最新状态。

## 当前实现（按用户最后的选择）

| 问题 | 本轮处理 |
| --- | --- |
| 背景发灰、发黄 | 主页面白底，取消纸张噪点；品牌砖红保留 |
| 中英混排拥挤 | 恢复 EN/中文切换；只显示当前语言；Table 保持简短英文 |
| 价格与“起”换行、S$ | 中文 `$6.80 起`、英文 `From $6.80`；加面 `+$3` |
| 加号过大、另占一行 | 30px 视觉按钮，44px 点击范围；与价格同行 |
| 英文菜名字号不同 | 同一类别共享字号；窄屏英文单列，实测 320/390/768px 不低于 14px |
| 分类难看、数量无用 | 改为图文目录，去编号和数量；标题“菜品分类” |
| 做法/馅料流程复杂 | 无步骤条、无“下一步”；点做法直接显示对应馅料 |
| 不要搭话文案 | 删除“今天想怎么吃”“想吃点什么”；保留功能名称 |
| 修改做法不对齐 | 44px 铅笔按钮，与做法名居中；有中英文无障碍名称 |
| 四种做法动画 | 用户否决矢量烹饪图后已撤回；当前本地恢复四张原有食物照片。新烹饪动画未完成，不以“能播放”代表视觉验收通过 |
| 详情照片转歪 | 改为保持直立的水平 yaw 预览，0/+18/-18/0 度，10秒循环；手动操作接管、关闭停止 |
| 云吞面点开变成云吞图 | 图片统一按具体做法及加面选项解析；详情标题同步；份量变化不换回基础云吞图 |
| 小票缺图/缺称呼 | 成功与历史小票逐项图片；显示订单保存时的提交人，不拿当前昵称覆盖旧订单 |
| 空状态空圆圈、大片留白 | 空盘子与筷子；内容自适应高度；保留单一选菜按钮 |
| 一起点/独立点人物含义一样 | v4：同伴共看手机；陌生人分坐长桌两端、各看自己的手机；不再互相淡变 |
| 青菜灰色方背景 | 新白底生菜图，去除产生矩形边缘的投影；不是透明抠图 |
| 午晚餐 | 同一份菜单、同一价格，不启用时段过滤 |
| 手机和本地不一致 | 已查明线上旧版本与本地不同；响应式吸顶也有差别；去除滚动锚点的双重顶部偏移 |

## 已验证

最新修正：移除四个 `dl-preparation-motion` 实例、页面脚本引用及发布包拷贝，保留原稿文件但不加载。`cooking-browser-test.mjs` 现验证四张照片真实可见、旧矢量组件不存在、四种选择与编辑仍工作；320/390/768px 通过。下列动画验收记录属于已撤回的旧版，不代表当前接受状态。此更改已随 `b66a34d` 部署，见最新发布记录。

- Chrome 独立浏览器，320/390/768px：分类、图片实际加载、空状态高度、编辑图标对齐、字体、语言、图片水平旋转与减少动态效果。
- 四个烹饪场景的动画、热气、暂停/重播、减少动态效果、按钮边界稳定、一次点击选择正确馅料。
- 本地真实 API 点餐：设置 youwen → 下单 → 成功小票 → 历史记录；只读验证原订单 #1460 的 youwen。
- 收单前不显示成功；失败重试沿用同一请求、不重复下单；小票打印正常和减少动态效果。
- 35 个商品、所有有效价格/份量/加料配置、独立点餐组、并发、备注冲突、历史订单、身份与后台鉴权测试。
- 发布包允许清单、资源存在性、JS 语法、客户与服务端目录一致、本地提示移除。
- 测试入口：`design-audit-browser-test.mjs`、`cooking-browser-test.mjs`、`receipt-sharing-browser-test.mjs`、`lunch-ui-test.mjs`、`lunch-build-test.mjs` 以及既有菜单/服务端测试。

## 边界

- 详情水平转动是单张照片的轻微透视预览，不是可看见物体背面的真实 360° 3D 模型。
- 动画/人物图是示意，不是厨房实时画面、实际人数或食材承诺。
- 未连接真实 iPhone Safari；动态地址栏和橡皮筋滚动仍需真机复测，不把桌面模拟声称为真机测试。
- 英文使用既有菜单数据并检查语言显示、术语与字段；无法承诺所有国家的每位读者理解百分之百一致，肉种和过敏源仍以店方确认为准。
- 本地订单不上传至线上；本轮云端验收只操作独立 QA 购物车并清空，不发送订单或呼叫。
- 未发布的实验配色和旧人物 v2/v3 不进入正式发布包。

## 素材与技能

人物使用内置 imagegen；未使用 CLI/API fallback。当前落盘文件：
- `web/img/dining-together-v4.png`
- `web/img/dining-separate-v4.png`
- `web/img/s/dining-together-v4.webp`
- `web/img/s/dining-separate-v4.webp`
- `web/img/oyster-lettuce-clean-v2.png`，以及 `web/img/s/`、`web/img/l/` 同名 WebP。

烹饪、收据与详情动效按 generate-icon-motion 技能在项目内集成，真实按钮与订单逻辑未交给动画。自定义场景源码：
- `generated/preparation-cooking/cooking.js` / `motion-plan.json`
- `generated/table-sharing/developer/web-component/table-sharing.js`
- `generated/receipt-print/developer/web-component/receipt-print.js`
- `generated/table-view-motion/plate-motion-plan.json`

### 人物最终提示词：一起点

Use case: illustration-story. Asset: compact square illustration for a Chinese dumpling restaurant mobile ordering button labelled Together (do not draw text). Pure clean white background. Refined contemporary editorial linocut and cut-paper illustration, confidently sparse shapes, lightly irregular charcoal outlines, matte terracotta, soft charcoal, muted olive, small walnut brown accents. Two clearly ADULT dining companions seated close around one small oval wooden table, angled toward each other, friendly natural interaction. They lean toward ONE smartphone/menu placed between them, one person pointing to it while the other looks. One shared plate of dumplings at table center. Body language clearly shows joint decisions. Slight elevated three-quarter view, believable furniture perspective, normal adult proportions but simplified graphic faces (only a tiny nose profile, no detailed eyes), generous white space, elegant compact silhouette readable at 140px. Different characters from anime: one adult with short curly hair in olive shirt, another adult with short straight hair in terracotta top, relaxed everyday clothing. Complete table and seated figures within frame. Flat editorial shapes, no photo realism, no manga, no glossy 3D, no cute oversized heads, no watercolor faces, no text, no numbers, no borders, no receipts, no background room or scenery. The image must feel like a designed restaurant identity illustration, not a stock lifestyle picture.

### 人物最终提示词：独立点

Use case: illustration-story. Asset: compact square illustration for a Chinese dumpling restaurant mobile ordering button labelled Separate orders (do not draw text). Pure clean white background. Refined contemporary editorial linocut and cut-paper illustration, confidently sparse shapes, lightly irregular charcoal outlines, matte terracotta, soft charcoal, muted olive, small walnut brown accents. Two clearly ADULT STRANGERS sharing ONE long rectangular communal wooden table, seated at diagonally opposite ENDS with a large empty middle section. An adult short-haired man in charcoal shirt sits at the far left end turned slightly outward, looking down at HIS OWN smartphone held close. An adult woman with a short bob wearing muted olive sits at the far right end turned slightly outward, looking at HER OWN smartphone. They DO NOT look at each other, smile at each other, speak, lean toward each other, share a menu, share a dish, or reach across the table. Each has a separate small plate of dumplings directly in their own place; the table center stays empty. Clear personal space and neutral body language: strangers happen to share a physical table but order independently. Slight elevated three-quarter view, believable furniture perspective, normal adult proportions but simplified graphic faces (only a tiny nose profile, no detailed eyes), generous white space, elegant compact silhouette readable at 140px. Complete ONE communal table and seated figures within frame. Flat editorial shapes, no photo realism, no manga, no glossy 3D, no cute oversized heads, no watercolor faces, no text, no numbers, no borders, no receipts, no background room or scenery. The image must feel like a designed restaurant identity illustration, not a stock lifestyle picture.

生菜采用此前内置 imagegen 生成并已目视检查的白底修正版（exec-c7c052ec-c669-417e-913a-94a0aecc4e0b.png）；目标为保留食物与盘子、去除灰色背景，未把 RGB 文件误称为透明图片。

## 共用表单与键盘布局修复（已随本次发布）

- 桌号改为紧凑单标题表单，移除重复的桌号标题和品牌眉题；输入框、错误提示、按钮使用独立网格间距，按钮简化为“确认”或“继续”。
- 称呼编辑不再强制弹键盘；统一桌号、称呼、备注、分享链接的输入字号、内边距和焦点样式。
- 键盘布局在输入框失焦后保持到可见区域真正恢复，避免保存按钮在 pointer-down 和 click 之间移动。备注区域随可见高度滚动，结算按钮保留在可见范围。
- 弹窗锁定并恢复页面滚动；搜索必须先保存滚动位置再固定主区域，关闭时先恢复菜单内容再恢复滚动，避免跳回顶部。
- 遮罩改为文档层连续纯色遮罩，保留原生 dialog 的焦点、inert 与 Escape 行为，不再叠加模糊原生 backdrop。iOS 透明浏览器栏存在相关 WebKit 问题，但不能仅凭截图断定用户遇到同一版本的缺陷。[WebKit 300965](https://bugs.webkit.org/show_bug.cgi?id=300965)
- 新增 `form-layout-browser-test.mjs`：320/390/768px × 中英文，验证桌号、错误提示、称呼保存、备注、核对入口、遮罩与关闭后滚动恢复。全部通过；截图已逐张抽查桌号、英文称呼与备注。
- 本轮截图：`/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-form-layout-AiPIZm`；手机控件回归：`/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-mobile-controls-2P5ZVU`。
- `lunch-ui-test.mjs --browse --named`、`table-entry-test.mjs`、手机控件与设计浏览器回归通过。键盘仅通过合成 visualViewport 测试，**不是 iPhone Safari 真机验收**。
- 转台多角度生成试验未通过连续性验收，未放入发布包。随后用户明确要求取消图片转动；已移除详情照片的自动左右摆、拖动旋转和 slider 语义，保留静态照片。购物车布局与收据动效不受影响。

## 发布记录

### 最新正式发布：主要食材、共用表单与静态详情照片

- 用户明确要求部署，并在部署过程中追加取消菜图旋转。
- 运行时代码：`5b03727`；部署 ID：`dpl_9qPZ42JSLCWvb2SGZ4uiun1qnh6t`。
- 正式网址：https://dumplinglab-menu.vercel.app/
- 不变部署：https://dumplinglab-menu-fe6pxcrbt-youwenjiujius-projects.vercel.app
- 35 个产品都有主要食材区，中英文支持，汤底、加面、芝麻酱和辣味选项联动；完整配方尚未确认，保留明确披露。价格与下单配置不变。
- 候选发布包检查、受保护部署检查已通过；正式域名已切换。隔离测试桌 QAF09F9C0E 已清空，没有下单或呼叫店员。
- 正式域名接口复查通过，隔离测试桌 QA39485EA1 已清空。线上全新浏览器会话覆盖 35 个详情 × 中英文 × 320/390/768px，静态照片、食材、加料、价格排版全部通过，无页面脚本错误；截图：`/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-ingredients-Givqp0`。这不等于 iPhone Safari 真机键盘验收。
- 取消详情照片自动旋转、拖动旋转和滑块语义，未发布转台实验素材。

### 前次发布：搜索空白初始态与撤回示意图

- 用户明确要求部署后，发布运行时代码 `b66a34d`，包含此前 `81aa0de` 的手机交互修复。
- 部署 ID：`dpl_521e57TFgx7EutkjyCxTvpe2CCfi`；已完成正式域名切换。
- 正式网址：https://dumplinglab-menu.vercel.app/
- 不变部署网址：https://dumplinglab-menu-17e454cpo-youwenjiujius-projects.vercel.app
- 发布包、候选受保护部署和正式域名检查均通过；QA235CBFCE 与 QAD9AAB8FB 的测试购物车已清空，无生产下单或呼叫。
- 正式站全新浏览器会话 320/390/768px 验证：空搜索无菜品/数量/筛选区；输入后出现去重结果；清空再次空白；取消可退出；四张食物照片实际加载，矢量烹饪组件和脚本不存在；做法、详情、编辑入口正常。
- 正式站截图：`/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-mobile-controls-MBcOAJ`、`/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-cooking-wTMG3p`。
- 键盘避让验证采用合成 visualViewport，不是 iPhone Safari 真机验收。烹饪动画暂时撤回，尚未重新设计。

### 手机截图反馈：第二轮修复与 10 轮专项回归

按 10 个流程分别检查，不将重复运行同一命令计作“完整检查 10 遍”。修复后结果：

| 轮次 | 检查范围 | 证据与结果 |
| --- | --- | --- |
| 1 | 桌号入口、空值、确认、绑定与草稿 | `mobile-controls-browser-test.mjs`、`table-entry-test.mjs`、`lunch-ui-test.mjs --browse --named` 通过；明确“选择桌号”，无破折号/下拉字符，普通入口不再误带下单核对文案 |
| 2 | 关闭、返回、点击区域 | 新浏览器回归通过；18px SVG、44px 点击区域；关闭详情能回搜索，再取消能回菜单 |
| 3 | 触屏焦点与键盘导航 | 新浏览器回归通过；触屏不画关闭红框/馅料蓝框，键盘保留焦点提示与 Escape |
| 4 | 搜索打开、清空、取消、中文输入法 | 新浏览器回归通过；取消独立可见；Enter 收起输入焦点；组词未完成不提交、不收键盘；去掉原生重复清除叉号 |
| 5 | 搜索结果与数量 | 新浏览器回归通过；“猪肉”4个不同结果，推荐去重；不受未选做法隐藏；零结果正确；搜索卡图片与详情默认做法一致 |
| 6 | 搜索与桌号键盘避让 | 模拟可见高度360px、顶部偏移20px；320/390px 下输入、取消、首条结果、桌号确认按钮均在可见区域内；未自动聚焦桌号；不是 iPhone 真机测试 |
| 7 | 做法、馅料、份量、加料、图片、烹饪动效 | `cooking-browser-test.mjs`、`lunch-test.mjs`、DOM 回归通过；搜索菜品可直接进详情选择做法 |
| 8 | 购物车、分组、并发、备注、提交与重试、呼叫与鉴权 | `shared-test.mjs`、`walkthrough-test.mjs`、`production-test.mjs`、DOM 回归通过；无生产订单或呼叫测试 |
| 9 | 小票名字、成功/历史、语言、空状态、字体 | `design-audit-browser-test.mjs`、`receipt-sharing-browser-test.mjs`、`ui-consistency-test.mjs` 通过；320/390/768px |
| 10 | 发布包、资源与语法 | `lunch-build-test.mjs`、`assets-test.mjs`、`git diff --check` 通过；生产域名验收另记下方 |

新增测试：`mobile-controls-browser-test.mjs`。最终本地截图：`/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-mobile-controls-6RKNSl`。

键盘处理依据：屏幕键盘可能只缩小 visual viewport，不改变 layout viewport；因此接入 `visualViewport` 的高度、偏移与 resize/scroll 更新，而不只依赖 `dvh`。[MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)

本轮仍未连接 iPhone Safari，保留真机验收限制；不承诺所有设备零错误。

### 首轮视觉发布

- 运行时代码提交：`d118b12`（Refine Atelier ordering UI, cooking motion and receipt attribution）。
- 最终部署：`dpl_8zAmZoznzskdMcoeGyF6N3cSBqUU`，已完成 production promotion。
- 正式网址：https://dumplinglab-menu.vercel.app/
- 不变部署网址：https://dumplinglab-menu-24tmfh0tq-youwenjiujius-projects.vercel.app
- 最终受保护部署与正式域名均通过 `deployment-visual-smoke.mjs`：最新脚本/素材、后台鉴权、选菜幂等、分组隔离；QA9ADF02B5 与 QA36C2C275 已清空，未下单或呼叫店员。
- 正式站全新 Chrome 会话只读复核 320/390/768px：四种烹饪动画、点击做法直接选择馅料、编辑图标、云吞面详情图和标题、水平旋转、分类目录、v4 人物、中英切换，均通过且无页面脚本错误。
- 正式站截图：`/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-production-final-VEleun`。
- 首轮候选 `dpl_9DVbLAt1sZPMAxiR5eM9zBZHj7mx` 验收后补修了“全部菜单”的英文 From 价格顺序；正式域名使用的是以上最终部署，不是首轮候选。
