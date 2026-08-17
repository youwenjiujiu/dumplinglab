# Dumpling Lab — 扫码点餐

新加坡餐厅用的静态扫码菜单。每张桌贴一个
`https://<host>/?table=<n>` 二维码，无构建步骤，浏览器直接运行。

## 当前体验

- 57 道菜按 11 个分类浏览，支持搜索、素食、香辣和不含猪肉筛选。
- 图册/清单两种排版；手机两列，桌面自适应且左右留白对称。
- 三张真实菜品 PNG 直接作为 Three.js 纹理，支持有限角度触摸空间视差；正面与餐厅原图一致，
  不经过生成模型，也不替换成另一碗菜。
- 没有照片的菜使用各自的程序化插画作为明确的视觉占位，不冒充摄影。
- 详情、口味、过敏原、数量、做法选择、购物车、备注、下单确认完整可用。
- 中英文切换，币种为 S$；Scto Grotesk A 字族已本地化加载。

## 目录

```text
web/
  index.html       页面外壳
  style.css        视觉与响应式布局
  app.js           菜单、详情、购物车、语言与 3D 接入
  photo3d.js       原 PNG 纹理、平滑深度曲面与有限角度触摸旋转
  model3d.js       隔离的生成式 GLB 研发查看器（生产未引用）
  models/          隔离的 3D 研发候选（生产未引用）
  menu-data.js     菜品、价格与图片配置
  i18n.js          中文文案与 UI 字符串
  art.js           无照片菜品的明确插画占位
  img/             透明底真实菜品照片
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
