# 菜单视觉与交互核对 · 2026-09-07

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
| 四种做法动画 | 高汤舀汤、干拌筷子翻拌、水煮锅内冒泡、平底锅煎；各有热气 |
| 详情照片转歪 | 改为保持直立的水平 yaw 预览，0/+18/-18/0 度，10秒循环；手动操作接管、关闭停止 |
| 云吞面点开变成云吞图 | 图片统一按具体做法及加面选项解析；详情标题同步；份量变化不换回基础云吞图 |
| 小票缺图/缺称呼 | 成功与历史小票逐项图片；显示订单保存时的提交人，不拿当前昵称覆盖旧订单 |
| 空状态空圆圈、大片留白 | 空盘子与筷子；内容自适应高度；保留单一选菜按钮 |
| 一起点/独立点人物含义一样 | v4：同伴共看手机；陌生人分坐长桌两端、各看自己的手机；不再互相淡变 |
| 青菜灰色方背景 | 新白底生菜图，去除产生矩形边缘的投影；不是透明抠图 |
| 午晚餐 | 同一份菜单、同一价格，不启用时段过滤 |
| 手机和本地不一致 | 已查明线上旧版本与本地不同；响应式吸顶也有差别；去除滚动锚点的双重顶部偏移 |

## 已验证

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

## 发布记录

- 运行时代码提交：`d118b12`（Refine Atelier ordering UI, cooking motion and receipt attribution）。
- 最终部署：`dpl_8zAmZoznzskdMcoeGyF6N3cSBqUU`，已完成 production promotion。
- 正式网址：https://dumplinglab-menu.vercel.app/
- 不变部署网址：https://dumplinglab-menu-24tmfh0tq-youwenjiujius-projects.vercel.app
- 最终受保护部署与正式域名均通过 `deployment-visual-smoke.mjs`：最新脚本/素材、后台鉴权、选菜幂等、分组隔离；QA9ADF02B5 与 QA36C2C275 已清空，未下单或呼叫店员。
- 正式站全新 Chrome 会话只读复核 320/390/768px：四种烹饪动画、点击做法直接选择馅料、编辑图标、云吞面详情图和标题、水平旋转、分类目录、v4 人物、中英切换，均通过且无页面脚本错误。
- 正式站截图：`/var/folders/9g/vrhfqq3x41ndv5_1b4x2_14c0000gp/T/dumpling-production-final-VEleun`。
- 首轮候选 `dpl_9DVbLAt1sZPMAxiR5eM9zBZHj7mx` 验收后补修了“全部菜单”的英文 From 价格顺序；正式域名使用的是以上最终部署，不是首轮候选。
