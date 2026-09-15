# tools/ — 静态设计快照工具链

把运行中的站点抓成一份自包含的静态副本，用于给第三方做**设计评审**
（对方只是想「看看长什么样」，不需要能用）。产出可以放 GitHub Pages，
也可以直接双击 `index.html` 打开。

跟应用代码无关，不是构建流程的一部分。Node 18+ 即可，无第三方依赖
（用 Chrome DevTools Protocol 驱动本机已装的 Chrome）。

---

## 用法

```bash
# 1. 先起开发服务器
npx next dev -p 3100

# 2. 抓取（在仓库根目录执行）
node tools/ptb-snapshot.mjs ../pintaback-demo              # 带「design preview」提示条
node tools/ptb-snapshot.mjs ../pintaback-demo --no-notice  # 不带

# 3. 校验自包含性（无绝对路径 / 无死链 / 字体在位）
node tools/ptb-verify.mjs ../pintaback-demo

# 4. 与实时站点逐像素比对（可选，最强的一道验证）
node tools/ptb-shot.mjs /tmp/snap.png "file://$PWD/../pintaback-demo/index.html" 1280
node tools/ptb-shot.mjs /tmp/live.png "http://localhost:3100/in" 1280
node tools/ptb-diff.mjs /tmp/snap.png /tmp/live.png /tmp/diff.png
```

---

## 四个脚本

| 脚本 | 作用 |
| --- | --- |
| `ptb-snapshot.mjs` | 抓取 + 重写。剥离脚本、本地化 CSS/字体/图片、把站内链接改成扁平文件名 |
| `ptb-verify.mjs` | 静态校验：绝对路径残留、死链、字体是否真在磁盘上 |
| `ptb-shot.mjs` | 全页截图（CDP 真设备模拟，桌面/移动均可） |
| `ptb-diff.mjs` | 两张截图逐像素比对，报告差异像素数、包围盒、16×16 分桶聚集位置 |

后两个是通用的，不限于本项目。

---

## 两个必须知道的坑

### 1. 字体不本地化 = 整个站静默换字体

Next.js 的字体走 `/_next/static/media/*.woff2`，而 CSS 里 `@font-face` 的
`url()` 是相对**CSS 文件原始位置**（`/_next/static/chunks/`）写的：

```css
@font-face { src: url("../media/5f402bd2....woff2") }
```

所以只下载 CSS 不下载字体，页面**不会报错**，只会静默回退到系统字体。
表现是：`70% deposit · 30% balance on delivery` 这类文案的换行位置变了，
整站字重/字距也不对。本项目靠 `ptb-diff.mjs` 发现（商品详情页少了 20px）。

`ptb-snapshot.mjs` 会用 `new URL(ref, cssUrl)` 按 CSS 的真实位置解析相对路径，
把 9 个 woff2 抓到 `assets/fonts/` 并重写 CSS。`ptb-verify.mjs` 会检查这一点。

### 2. 截图不要用 `--window-size` 模拟移动端

macOS 对窗口有最小宽度限制，`--window-size=390,...` 实际会按更宽的视口排版，
截图只是被裁掉右边 —— 看起来像**页面横向溢出**，其实是假的。
我一开始就被这个骗了，白白怀疑了一轮站点的响应式。

正确做法是用 CDP 的 `Emulation.setDeviceMetricsOverride`，`ptb-shot.mjs` 就是这么做的。

---

## 抓哪些页面

在 `ptb-snapshot.mjs` 顶部两个数组里维护：

- `SKUS` — 商品详情页的 SKU 列表
- `CATEGORIES` — 分类筛选页

商品数据改了这两个数组也要跟着改。需要登录的页面（`/in/orders`、`/in/account`、
`/dashboard`）会被自动改写指向商品列表。
