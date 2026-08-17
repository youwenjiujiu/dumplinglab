# 菜品 3D 管线

## 产品规则

菜单数据中的 `model` 与 `img` 是两种不同资产：

- 有 `model`：详情页加载经过审核的 GLB，允许完整水平旋转、有限垂直倾斜和松手惯性。
- 只有 `img`：详情页使用餐厅透明 PNG 做小角度空间预览，并明确标为“原图”，不再称为真实 3D。
- 同时存在时：卡片继续使用 `img` 保证首屏速度；打开详情后用 `model` 替代照片。

当前通过真实 3D 审核的菜品：

- `red-oil-wontons`
- `minced-pork-egg-noodles`
- `wonton-soup-noodles`
- `dry-wonton-noodles`

## 单图生成步骤

1. 使用 `scripts/gen-cutout-sam.mjs` 定位整只碗并生成透明素材。
2. 使用 `scripts/gen-3d.mjs` 的 Hunyuan3 PBR 路径从单张照片推断完整几何和隐藏面。
3. 原始 GLB 只进入 `web/models/candidates/`，绝不自动上线。
4. 在 `web/model-qa.html` 审核正面、45°、90°侧面和背面；碗体塌平、食物融合或纹理拉伸即淘汰。
5. 通过后用 glTF Transform 做 quantize、WebP 纹理和 1024px 纹理上限压缩，输出到 `web/models/production/`。
6. 在 `web/menu-data.js` 写入对应 `model` 文件名，正式详情页才会加载。

当前四只生产 GLB 合计约 1.37 MB；生成前原始候选每只约 20–24 MB。

## 当前实现

- `web/app.js`：根据 `model` 字段选择真实 GLB，根据 `img` 字段选择原图回退。
- `web/model3d.js`：负责 GLB 加载、PBR 灯光、接触阴影、触摸旋转、垂直限位和惯性。
- `web/photo3d.js`：只服务还没有合格模型的旧菜品。
- `web/models/production/`：可部署、已审核、已压缩的正式 GLB。
- `web/models/candidates/`：研发候选，通过 `.vercelignore` 排除。
- `scripts/selftest.mjs`：在 iPhone 与桌面环境验证四只 GLB 的 `generated-glb` 数据源和真实旋转值。

## 真实性边界

单张照片可以生成真实可旋转的几何，但照片看不到的背面属于模型推断。因此“可完整旋转”和“每个隐藏细节都与餐厅这一碗完全一致”不能同时保证。

若将来需要商品级一致性，应按 `docs/PHOTO-3D-CAPTURE-BRIEF.md` 拍摄连续环绕视频或 40–80 张多角度照片，再改用摄影测量或 Gaussian Splat。
