# Active design decisions — 2026-09-09

## 反馈处理规则

用户要求：每说一项就记录，不因追加需求遗漏旧项。后续设计修改先读本文件。

最新决定（覆盖 D02、D03 的实验方案）：用餐方式弹窗**恢复此前原动画**：dinein-serving-v3（桌椅、落盘、蒸汽）和 takeaway-pickup-v5（装盒、手提袋）；只保留现在的透明背景和无边框。端盘 v4、单袋 v6 均被撤回，不在页面/发布包中启用。顶部堂食恢复原 header-dinein-v1 图和浅底配色；深红底、简化桌椅图均拒绝，不得重推。

- 新反馈先追加到清单，再动手；新要求只覆盖明确冲突的旧决定。
- 状态分别记录为「待修改」「待验证」「已验证，待用户确认」「已完成」。写过代码或生成过图片不等于完成。
- 验证必须检查实际页面引用、显示效果与交互，不能只检查素材文件是否存在；本地验证不代表已部署。
- 用户指出仍有问题，立即重新打开该项；明确拒绝的版本不得再次作为最终结果。
- 每次交付说明本次实际完成项与仍未完成项，不把方案建议写成已经实现。

## 当前任务清单

生产发布完成（2026-09-09）：运行代码 `b22738c` 已推广至 `https://dumplinglab-menu.vercel.app`，部署 `dpl_9Cqgs4xCXHPqaUpfy8Ch7WHXS973`。保护地址与公开地址两次只读校验均通过（HTML + 39 个运行文件/素材逐字节一致）。上述晚间补丁已上线；D17 免邮箱接入、已付款退款未实现，不计为已完成项。

晚间补丁验证（2026-09-09 18:26 SGT）：D12–D16、D18–D21、D23–D24 已完成本地实现和回归；D13 按最终要求合并并缩小。`ui-hotfix-browser-test.mjs` 在 320/390/768px 检查真实 DOM、截图、支付初始化延迟、跳过加购、取消二次确认、取消拒绝保留锁定、取消成功后保留菜品继续加菜。所有支付接口为隔离测试替身，无真实扣款或生产数据写入。`tray-art-test.mjs` 逐张检查 50 个缩略图映射；17 项无浏览器测试通过。D17 仅解释当前邮箱限制，未迁移；D22 仅解释点餐组。Stripe 真实移动钱包/付款仍需商户实际支付环境验证。本段不是已部署声明。

2026-09-09 晚间追加，均需实际验证后才能标记完成：
- D24 购物栏改成单行：缩略图、已选份数、总价、查看入口；同步提示隐藏，不改同步机制。
- 回归测试发现原有外带阻塞：OnlineCart 的本地 draft pending 被错误当成堂食未同步操作，导致外带无法结算；只对堂食执行同步检查，外带仍保留持久化草稿。纳入本次结算验证。
- D23 分类弹窗上方空白过大：关闭键与标题共用顶部区域，标题顶部 24px，不再预留整行关闭栏。
- 用户明确授权：上述任务修改并验证完成后直接提交部署。D17 免邮箱支付属于支付接入迁移，仍未实现，不可宣称完成。
- D21 成功页文案改为「下单成功，请在座位稍候。」不使用“发送至门店”。
- D22 用户询问「A1 / A」后一个 A：是点餐组，不是桌号；已解释。主界面合并按钮只有桌号，内部点餐组与独立订单隔离不能随意删除。
- D13 最新覆盖：拒绝压薄的单独桌号行；合并为「堂食 · A1 ⌄」，入口内可改桌号/方式。服务铃移到顶栏，删除独立桌号整行。合并按钮再缩小一档，36px 可见轮廓、44px 点击区域。
- D19 加购明确可跳过：底部加入「不用了，继续结算」，不选也能继续，不变更金额。
- D20 用户拒绝加购红色实心方块加号：沿用菜单细边圆形加号，保留 44px 点击区；选中才实心。
- D18 确认交互按 IMG_7613：取消前弹二次确认「确认取消 / 保留订单」，不编造 15 分钟倒计时。
- D13 顶部留白过大：压缩品牌行和桌号行，上下对称，44px 触控区保留，让菜品提前出现。覆盖 D08 的 12px 留白数值，不覆盖对称要求。
- D14 红色购物栏出现白框：移除图片条多余 tabindex，键盘访问继续使用真正的查看本桌按钮；加购标题自动聚焦不画蓝框。
- D15 加购弹窗不能等待支付组件加载：报价完成显示订单后立即弹出，支付初始化与弹窗并行；加入菜品仍要等初始化完成并安全取消旧付款。
- D16 付款区参照用户 IMG_7612 的简洁逐行方式：先折叠、细分隔线、减少边框阴影；只展示真实支持渠道，不伪造 GrabPay/ShopBack 等。Stripe 内部必要支付信息不可隐藏欺骗用户。
- D17 邮箱为何必填：已核实当前 Checkout Sessions 必须有效邮箱。免邮箱需要支付接入迁移，不可直接去掉 required 或使用假邮箱；本轮保持支付有效性，该项未实现。
- D18 未付款也应能继续点餐：购物清单与结账页明确增加“取消本次付款，继续点餐”，支付方确认失效后解锁、保留原菜品；已付款/处理中不得前端强行取消，不含退款功能。

D12 实现方式：48 张购物栏缩略图恢复真实透明旧素材；红油面、生菜生成抠底连续失败，改用仅作用于缩略图和飞入图的盘碗轮廓 SVG 显示蒙版，原图像素与菜单大图不变。待红底截图检查。

最新回归 D12：发布的新菜图为不透明白底，复用到底部红色购物栏后出现白色方块。用户明确要求修复。局部恢复购物栏原有真实透明缩略图，不改变菜单/详情已批准新大图；没有透明旧素材的红油燃面与生菜需单独抠底。必须审查全部缩略图透明像素和红底重叠效果，不只看白底菜单；修复后单独发布补丁，不回滚整个站点。

**最新状态：已完成生产发布。** 用户再次授权后，运行代码已提交为 `7ae2674`，部署 `dpl_2n8UdvVpUBmyLgcpvrF968uZoxP3` 已推广至 https://dumplinglab-menu.vercel.app/ 。正式网址已验证页面及 36 个脚本/样式/关键素材与发布包一致，包含 preparing-v3、collected-v3。下文暂停记录保留为历史，不再是当前阻塞。详见 PROGRESS-ICONS-RELEASE.md。

发布授权已恢复：用户查看 preparing-v3 / collected-v3 后明确要求「那你提交部署」。本次发布使用这两张 v3，加 received-v2 / ready-v2。先提交源代码、构建检查和受保护地址只读验证，再推广生产；不写生产测试订单或购物车。

发布暂停：用户先授权部署，随后明确喊停，指出「已取餐」袋子图案不像饺子，又指出「制作中」锅内像包子。尚未执行云端发布/推广。仅微调这两处饺子形状，保留手、袋子、锅、蒸汽及配色；未经再次确认不继续生产部署。D11 重新打开，其余两个图标不因此重做。

D11 修订进展：preparing-v3 / collected-v3 已局部重绘并处理真正透明底，接入本地页面。320/390/768px 实际渲染、透明通道与状态逻辑测试通过；待用户视觉确认，生产部署仍暂停。

| 编号 | 用户反馈 / 验收要求 | 状态 |
| --- | --- | --- |
| D01 | 水煮保留白润无酱饺子盘；干拌重新生成裹酱、筷子夹起的碗装构图（appetite-v3），已核实自选口味页面实际加载新图，原 v2 不再用于做法入口。 | 已验证，待用户确认 |
| D02 | 按用户最后决定恢复原 dinein-serving-v3、takeaway-pickup-v5 动画；只去除卡片米白底色与边框，保留标签、按钮动作和减少动态效果支持。 | 已验证，待用户确认 |
| D03 | 深红按钮和简化桌椅被用户拒绝，已恢复原 header-dinein-v1 桌椅与浅色按钮。已检查实际页面引用和移动端截图。 | 已验证，待用户确认 |
| D04 | EN 向右移动，不能影响相邻按钮或触控区域。已改右移 8px，并有 320/390/768 宽度测试。 | 已验证，待用户确认 |
| D05 | Footer 地址与「好好吃饭，下次见。」交换位置；仅保留一处地址，保持紧凑。结构和位置测试已通过，最终视觉仍需复看。 | 待验证（已修改） |
| D06 | 「肉末红油燃面」不能与「肉末辣椒拌面」共用图。已单独生成并接入 red-oil 素材，浏览器检查列表和详情真实 URL 不同且各自一致。 | 已验证，待用户确认 |
| D07 | 拼桌场景要表达陌生人；但「独立点」也适用于朋友、同事，不能等同拼桌。当前一起点为 together-v5，独立点为 separate-v7；保留完整桌椅，不用用户拒绝的 v6 近景。 | 已验证，待用户确认 |
| D08 | 桌号按钮太靠上：上下留白一致，当前上下各 12px，保持独立一行。 | 已验证，待用户确认 |
| D09 | 分类菜单是否用小图表达「推荐、自选口味、面条、配菜」：目前仅提出简洁小插画加文字的建议，未生成、未接入。 | 方案建议，待确定 |
| D10 | 已测量六款面食源图的可见碗宽，用 CSS 独立缩放校准，不改标题排版和图片文件。390px 页面三款肉末面可见碗宽 136/139/138px，差异不超过 4px。 | 已验证，待用户确认 |
| D11 | 四个餐品进度图标已通过内置图像工具生成并接入：小票、冒热气饺子锅、袋装待取、手提已取。红白透明底，保留双语标签、真实状态高亮与已取餐二维码隐藏；320/390/768px 验证通过。 | 已验证，待用户确认 |

## 必须保留的历史设计约束

- 菜品图要诱人，但不能让不同菜品看起来一样；列表与详情必须为同一道菜、同一素材版本。陕西油泼面、清汤鲜肉云吞、鲜虾蟹籽云吞面均曾被用户明确点名，后续图像审查不能遗漏。
- Footer 保留用户认可的 2D 店面，不再使用突兀且门口摆酒瓶的 3D 版本。酒瓶在店内吧台上方，不可移到门口。
- 不要米色外层容器、重复地址、大段占位文案、「下一顿，还在这里。」与「一盘热饺，一桌好时光。」；不出现「重播动画」等演示文案。
- 店面保留清晰的原色，不做不清晰的白色反相线稿；右边无关的门要去掉，但收边必须自然。
- 店面动画是建筑本体从下往上、从左到右的连贯运动，不是遮罩擦除，也不是屋顶与房子拆开。

## 已有实现记录（不代表用户已验收）

- Storefront: owner-approved 2D colored artwork, no 3D model, negative white-line treatment, or animated wipe. Whole connected house moves up/right; crop right annex at window/tile edge. Red background, one compact address, no headline/replay controls.
- Table-number button: symmetric 12px top/bottom padding retained.
- Sharing art: v6 close-up pair was rejected. Keep full-table `dining-together-v5`; separate scene is now `dining-separate-v7`, unrelated strangers with personal space, separate phones and no interaction.
- Meaning: shared seating/拼桌 is a relationship/seating situation, not a requirement for independent ordering. Friends and colleagues may also place independent orders. The two existing actions remain one shared order versus separate order groups; copy explicitly clarifies this. No new relationship restriction or ordering state introduced.
- Red-oil noodles: duplicate image bug corrected. `lunch-v2-mince-red-oil-noodles` now has its own `lunch-mince-red-oil-noodles-generated-v1` base and appetite mapping. Chilli-noodle art unchanged. Ingredients used for the generated image: noodles, minced meat, chilli oil only; actual recipe/portion not inferred from an AI image.
- Verification/artifact evidence lives in the task-specific test scripts: `sharing-art-test.mjs`, `noodle-art-browser-test.mjs`, `menu-art-test.mjs`, `storefront-test.mjs`. Local edits are not a production deployment.
