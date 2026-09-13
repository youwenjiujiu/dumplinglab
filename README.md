# Dumpling Lab — 扫码点餐

新加坡餐厅用的扫码菜单，静态菜单前端搭配持久化收单 API。每张桌贴一个
`https://<host>/?table=<n>` 二维码，无构建步骤，浏览器直接运行。

## 当前体验（仪表台 · 对标 playgrnd.tools）

前端为 `web/panel.css` + `web/panel.js`（此前的滚动卡片版与翻页版都在 `web/legacy/`，不部署）。参照 playgrnd.tools 的"仪器"语法：暖灰纸面 + 颗粒、页面四角与作品四周的裁切标记、宽字距等宽小字、黑色胶囊、行里只有编号 / 名字 / 价格三样；所有颜色都来自菜品。

- **索引页**：桌面三栏——左：桌号/菜品数/分类数、分类与饮食索引、一个安静自转的 3D 菜（唯一装饰）；中：筛选胶囊（筛选 | 搜索 | 清除 | 随机）与菜品索引表（表头可按名称 / 价格排序）；右：索引状态、排序胶囊、票据摘要。手机单栏折叠。
- **菜品页**（整页，不是弹窗）：左上 logo — 菜名、编号 / 分类、"← 全部菜品"；中间"份数 | − 1 + | 加入 · 价格"复合胶囊，菜品置于一个巨大的淡表盘（圆 + 十字线）之上、四角裁切标记框住；照片开场，一拖进 3D；右侧"规格"键值表（价格 / 份量 / 辣度 / 过敏原 / 呈现）与"菜品 / 做法"分节；底部键位提示。← → 上一道 / 下一道，ESC 返回，URL 带 `#dish-id` 可直达。
- 票据从右侧抽出；下单落红印；呼叫服务员带原因；中英文。

## 本地运行与验收

```sh
node server.mjs
# http://localhost:8377/?table=12&lang=zh
# http://localhost:8377/staff

npm test
```

测试覆盖 iPhone 与桌面视口、无横向溢出、搜索筛选、原图 Three.js 纹理来源、真实收单、断网不清空购物车、
两台设备同桌加菜/减菜/备注/结账同步，以及语言切换。

## 线上收单

生产环境的 `/api/cart`、`/api/order`、`/api/call`、`/api/feed` 和 `/api/resolve` 是 Vercel Functions，
每个未处理订单/呼叫都单独写入 Vercel Blob，避免函数重启丢单或并发覆盖。
同一个 `table + group` 下的手机共享一份购物车：加菜、减菜和备注以独立操作写入，各设备约每 1.2 秒同步。
下单会先为本次看到的购物车操作加并发声明，再收单并清除这批操作；下单期间别人新加的菜会保留在购物车里。
已经提交的菜会进入同组所有手机都能看到的「本桌已点」，不会从大家眼前消失。普通同桌默认使用 A 组；拼桌客人点击
「正在拼桌？创建独立点餐组」后获得独立组链接，组间购物车与历史互不可见，店员端仍按实际桌号并标明组别。

首次上线前，在 Vercel 项目的 **Storage** 页创建一个 **Private Blob** store，并连接
Production 环境，再添加 `DL_STAFF_PASSWORD` 环境变量作为店员端密码。Vercel 会自动注入 Blob 凭证；未配置时 API 会返回 503，顾客端保留已选菜品并提示重试，
不会再显示假的“已下单”。店员打开 `/staff`，页面每 2 秒同步未处理队列；点击“已完成/已处理”后，记录会移入 Blob 的 `resolved` 归档，不直接删除。

## 运营修改（后台 /admin）

```bash
node server.mjs            # 启动后打开 http://localhost:8377/admin
```

- **菜品照片**：后台「照片」页每道菜一张卡片，「上传照片」选一张手机照片即可。服务器用本地 rembg 去掉背景
  （食物像素不改），生成 `web/img/<菜品id>-cutout.png` 并写入 `menu-data.js` 的 `img`；菜单立刻换成照片，
  详情页自动接入原图的有限角度 3D。原图留在 `uploads/`（不进 git）。「删除」退回线稿。
- **发布到线上**：改动先在这台电脑上；点「发布到线上」等于在 `web/` 里运行 `vercel --prod --yes`
  （这台电脑需已 `vercel login`）。
- **3D 工作台**：同一页第二个标签，照片 → 多视角 → Tripo 重建 → 候选审核 → 发布到菜单，流程见
  [`docs/3D-PIPELINE.md`](docs/3D-PIPELINE.md)。
- **公司网络**：如果办公网络会替换 HTTPS 证书（`vercel` 报 self-signed certificate），把系统钥匙串里那张公司根证书导出为仓库根目录的 `deploy-ca.pem`（已 gitignore），后台发布和命令行 `NODE_EXTRA_CA_CERTS=deploy-ca.pem vercel --prod` 都会用它。
- **后台密码**：`security add-generic-password -s dumplinglab-admin -a admin -w <密码>`（或环境变量
  `DL_ADMIN_PASSWORD`），重启服务后 `/admin` 和 `/api/admin/*` 需要 HTTP Basic 登录；没设密码时只有本机能打开。
- 售罄：将菜品的 `soldOut` 设为 `true`。
- 单张主图的拍摄要求见 [`docs/PHOTO-3D-CAPTURE-BRIEF.md`](docs/PHOTO-3D-CAPTURE-BRIEF.md)。
