# Dumpling Lab — 扫码点餐

新加坡餐厅用的静态扫码菜单。每张桌贴一个
`https://<host>/?table=<n>` 二维码，无构建步骤，浏览器直接运行。

## 当前体验（可翻页的印刷菜单 · mono-color）

前端从空白页重写（`web/zine.css` + `web/zine.js`），旧的滚动卡片版移至 `web/legacy/`（不部署）。视觉语言来自 mono-color 双色印刷系统（`~/.claude/skills/mono-color`）：淡米纸、两种油墨（品牌红主版 / 炭黑辅版）、纸张外露、大留白、编辑排版、纸张颗粒。照片按照片印刷，不做处理。

- **一本书，横向翻页**：封面（字体宣言 + 目录）→ 11 张章节海报页，底部书脊随时跳转，桌面端左右方向键翻页。
- **每章一种版式**：图像场（照片压着列表）、规则信息（大编号压在一条线上的清单）、物件场（线稿标本网格）、字体宣言（章名本身就是画面）；宽屏时每页展开成对页，左页永远有一个标本。
- **点菜像圈选**：圆形"+"直接加入；点菜名弹出"剪报"——照片开场，拖动进 3D（有模型的菜可旋转、缩放），无模型的照片轻倾斜。
- **票据**：从右侧抽出的订单单据，虚线、等宽字，下单后小票落章。
- 搜索 / 素食 / 香辣 / 不含猪肉 在"查找"覆盖层；呼叫服务员可带原因（店员端实时显示）；中英文切换。

## 目录

```text
web/
  index.html       书的骨架（书脊、查找、剪报、票据、呼叫、小票）
  zine.css         印刷系统：油墨令牌、四种章节版式、对页布局
  zine.js          翻页、章节渲染、剪报与 3D 接入、票据、呼叫、语言
  art.js           logo 同一支红笔的线稿菜品
  model3d.js       GLB 查看器（拖动/捏合/双击、照片对位、影棚光）
  photo3d.js       无模型菜品的照片轻倾斜
  menu-data.js     菜品、价格、图片与模型配置
  i18n.js          中英文案
  img/             实拍照片与抠图；models/production/ 已审核 GLB
  admin.html       上传照片 → 自动 3D 的工作台
  legacy/          上一代滚动式前端（不部署）
scripts/pipeline.mjs  照片 → 抠图 → 多视角 → 3D → 压缩 → 校色 → 对位 → 封面
server.mjs       静态服务 + 店员端实时中继 + /admin 生成接口
```

## 本地运行与验收

```sh
python3 -m http.server 8377 -d web
# http://localhost:8377/?table=12&lang=zh

npm test
```

测试覆盖 iPhone 与桌面视口、无横向溢出、搜索筛选、原图 Three.js 纹理来源、加购和语言切换。

## 运营修改

- 新照片：按摄影规范交付透明 PNG，并在菜单数据中设置 `img`；详情页会直接把这张 PNG
  接入有限角度的原图 3D，不需要生成候选。
- 售罄：将菜品的 `soldOut` 设为 `true`。
- 下单后端：在 `app.js` 的下单处理处接 POS/API；`bellBtn` 是呼叫服务员入口。
- 单张主图的拍摄要求见 [`docs/PHOTO-3D-CAPTURE-BRIEF.md`](docs/PHOTO-3D-CAPTURE-BRIEF.md)。
- 原图空间预览与验收流程见 [`docs/3D-PIPELINE.md`](docs/3D-PIPELINE.md)。
