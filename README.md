# Dumpling Lab — 扫码点餐

新加坡餐厅用的静态扫码菜单。每张桌贴一个
`https://<host>/?table=<n>` 二维码，无构建步骤，浏览器直接运行。

## 当前体验（双色印刷版 · mono-color）

视觉语言来自 mono-color 双色印刷系统（`~/.claude/skills/mono-color`）：淡米纸、两种油墨（品牌红为主版，炭黑为辅版）、纸张外露、大留白、编辑排版、可控的印刷瑕疵（网点、套印错位、纸张颗粒）。

- 每道有照片的菜在静止时都是**红墨网点印刷图**（`scripts/halftone.mjs` → `web/img/print/`）；手一碰，印刷图"活过来"——有生产模型的变成可旋转的彩色 3D，只有照片的变成彩色实拍。
- 开场：饺印落章 → 「今日主推」印刷转盘，碰一下活过来，再点一下看详情；左右滑动换一道。
- 章节是"规则信息海报"：巨大红色编号压在一条黑线上；卡片是"标本注释"：编号、标签、正圆加号围着一个孤立标本；无照片的菜是同一支红笔的线稿。
- 字体：Anton（拉丁大字）+ 思源宋体 900（中文大字）+ IBM Plex Mono（标签、价格、编号）。
- 下单是一张带齿孔的小票 + 落章；呼叫服务员可带原因（店员端实时显示）。中英文切换。

## 目录

```text
web/
  index.html       页面外壳（开场、今日主推、菜单、订单、呼叫、小票）
  style.css        单一样式系统：令牌（含夜场）、组件、桌面布局
  app.js           菜单、详情、购物车、呼叫、主题、语言与 3D 接入
  showcase.js      今日主推 3D 转盘
  model3d.js       GLB 查看器：自转邀请、拖动/捏合/双击、照片对位、影棚光
  photo3d.js       无模型菜品的照片轻倾斜预览
  menu-data.js     菜品、价格、图片与模型配置
  i18n.js          中英文案
  art.js           logo 同笔触的线稿菜品
  img/             实拍照片与抠图；img/3d-covers/ 模型封面
  models/production/  已审核上线的 GLB
  admin.html       上传照片 → 自动 3D 的工作台
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
