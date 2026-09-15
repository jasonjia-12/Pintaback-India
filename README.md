# Pintaback — 静态设计预览（Static Design Preview）

这是 **Pintaback 印度站**的静态快照，供设计评审使用。
由 `tools/ptb-snapshot.mjs` 自动生成，**每次重新生成会覆盖整个目录**。

- 生成日期：2026-09-15
- 来源：**生产构建**（`npm run build` + `next start`），非开发服务器
- 生成脚本：`Pantaback-印度/tools/ptb-snapshot.mjs`

---

## 这一版能做什么 / 不能做什么

| | |
| --- | --- |
| ✅ 看设计 | 首页、商品列表、分类筛选、8 个商品详情、登录、注册、购物车、支付页 |
| ✅ 看响应式 | 桌面 / 平板 / 手机三档布局都是真的，缩放浏览器窗口即可验证 |
| ✅ 看真实文案 | 所有文字来自真实服务端渲染，不是截图 |
| ❌ 不能登录 | 没有后端 |
| ❌ 不能加购 / 下单 | 所有按钮都是**死的**（脚本已剥离） |
| ❌ 没有后台 | 订单、客户、运营后台全部不在其中 |

页面顶部有一条米色提示条说明这一点。确认不需要的话，用 `--no-notice` 重新生成。

> **这是静态快照，不是网站。** 不要把它当作「网站已上线」交给任何人。

---

## 内容清单

```
index.html                        首页
products.html                     全部商品
products-home-kitchen.html        分类筛选：Home & Kitchen（4 个）
products-tools-hardware.html      分类筛选：Tools & Hardware（4 个）
product-in-hk-00{1..4}.html       商品详情 × 8
product-in-tl-00{1..4}.html
login.html  register.html         登录 / 注册表单
cart.html   payment.html          购物车 / 支付（空状态）
assets/style.css                  样式（含 41 条 @font-face）
assets/fonts/*.woff2              9 个字体文件（Manrope / Newsreader）
images/                           29 张图片
favicon.ico
README.md
```

共 16 个页面、约 5.4 MB。

---

## 为什么是这种结构

**扁平 + 全相对路径。** 所有资源引用都是相对的（`images/...`、`assets/...`、
`product-xxx.html`），没有一处以 `/` 开头。因此这份快照：

- 可以直接双击 `index.html` 从硬盘打开（`file://` 即可，不需要起服务器）
- 可以放在任意子路径下（如 GitHub Pages 项目站的 `/<仓库名>/`）
- 不需要任何构建步骤

**字体是本地化的。** 这一步最容易漏：Next.js 的字体走 `/_next/static/media/*.woff2`，
且 CSS 里 `@font-face` 的 `url()` 是相对 CSS **原始位置**写的。只拷 CSS 不拷字体会
静默回退到系统字体 —— 页面看起来「能用」，但整个站的字体基调变了。
本快照的 CSS 已重写为 `assets/fonts/...`，9 个 woff2 都在本地。

**脚本已全部剥离。** 页面本身是服务端渲染的，markup 和样式在无 JS 时完整。

---

## 这一版对原站做了什么改动

除剥离脚本、本地化资源外，**刻意的内容是两处**：

1. **顶部多了一条米色提示条**（`--no-notice` 可去掉）
2. **商品详情页少了一行 `China reference`**（`--strip-cost`）

第 2 条是有意为之：那一行会同时显示中国采购成本和印度售价，等于把毛利结构
公开给拿到这个链接的任何人 —— 包括作为转售方的合作方。当前数据是占位的，
但换成真实数据前必须先去掉。（`--strip-cost` 只删这一行，其余商业条款
Minimum order / Unit price / Settlement price / Invoicing 全部保留。）

---

## 校验结果

与**生产服务器**逐像素比对（Chrome DevTools Protocol，真设备模拟，整页截图）：

| 页面 | 尺寸 | 差异像素 |
| --- | --- | --- |
| 首页 1280px | 1280×3598 | 36 / 4,605,440 |
| 商品列表 1280px | 1280×1889 | 36 / 2,417,920 |
| 分类筛选 1280px | 1280×1301 | 36 / 1,665,280 |
| 商品详情 390px | 390×2641 | 36 / 1,029,990 |

> 上表用的是 `--no-notice` **且不带** `--strip-cost` 的版本 —— 逐像素比对必须
> 让两边内容完全一致，否则提示条会把整页下移、成本行会让 diff 全红。
> **它证明的是「重写过程没有引入任何渲染差异」**，而不是「交付版和原站一模一样」。
> 交付版和原站的差异，就是上面「这一版对原站做了什么改动」那两条，且都是刻意的。
>
> 那 36 个像素在 4 个页面上都落在**同一处**：顶栏左上角一枚 6×6 的金点
> （包围盒 32,16 → 37,21；手机档为 16,10 → 21,15），是抗锯齿，
> 最大通道差 ≤6/255，肉眼不可见。

其他检查（`tools/ptb-verify.mjs`）：

- 绝对路径残留：**0**
- `<script>` 残留：**0**
- `/_next/` 引用残留：**0**
- 387 处链接/资源引用，全部命中磁盘上的真实文件，无 404
- `document.fonts.check()` 对 Manrope / Newsreader 均返回 true
- 横向溢出：16 个页面 × 3 个断点（390 / 768 / 1280），**48 次检测全部为 0**

---

## 如何重新生成

```bash
cd <Pantaback-印度 仓库目录>       # 即本快照的生成者所在的仓库

npm run build
npx next start -p 3200          # 另开一个终端，保持运行

node tools/ptb-snapshot.mjs ../pintaback-india-demo              # 带提示条
node tools/ptb-snapshot.mjs ../pintaback-india-demo --no-notice  # 不带
node tools/ptb-verify.mjs ../pintaback-india-demo                # 校验
```

⚠️ **不要一边跑 `next dev` 一边 `npm run build`。** 开发服务器会把产物写进同一个
`.next` 目录、与生产构建互相污染。我踩过一次：当时 `next start` 报
`Could not find a production build in the '.next' directory` 并清掉了产物，
一度以为是构建坏了 —— 其实是开发服务器还开着。**先关掉 dev，再 `rm -rf .next && npm run build`。**

商品清单变了的话，改脚本顶部的 `SKUS` 和 `CATEGORIES` 两个数组。

---

## 已知限制

1. **商品数据是占位假数据，价格数字不自洽。**
   售价与采购成本对不上（有低于成本的），**这些数字没有任何商业含义，不要引用**。
   用于设计评审没问题，但正式对外前必须换成真实数据。

2. **顶栏电话、WhatsApp 是 DEMO 占位**（`+91 98 0000 0000`）。

3. **购物车、支付页是空状态。** 它们依赖会话和数据库，静态快照拿不到数据。
   要展示「加购后的样子」需要真实登录环境。

4. **登录 / 注册表单不可用。** 表单可以填，提交没有去处（无 `action`，无脚本）。
