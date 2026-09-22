# 张麦轩个人博客 · 技术文档

> 本文档面向"要修改这个站点的人"——无论是三个月后的作者本人，还是接手维护的第三方。
> 它不解释什么是 Jekyll，只解释**这个仓库里的每一行为什么这么写**，以及**动它的时候会踩到哪些坑**。
>
> 对应版本：`master` 分支 `16b81f4`（博客排版修改）
> 生成日期：2026-09-22

---

## 目录

1. [文档说明](#1-文档说明)
2. [项目定位与技术选型](#2-项目定位与技术选型)
3. [仓库结构与文件清单](#3-仓库结构与文件清单)
4. [构建流水线：从 Markdown 到 HTML](#4-构建流水线从-markdown-到-html)
5. [配置层：_config.yml 全解](#5-配置层_configyml-全解)
6. [模板层：布局与包含](#6-模板层布局与包含)
7. [样式层：四文件级联架构](#7-样式层四文件级联架构)
8. [视觉风格系统：liquid / frost / solid](#8-视觉风格系统liquid--frost--solid)
9. [颜色主题系统：light / dark / auto](#9-颜色主题系统light--dark--auto)
10. [悬浮胶囊导航](#10-悬浮胶囊导航)
11. [JavaScript 运行时](#11-javascript-运行时)
12. [响应式设计](#12-响应式设计)
13. [无障碍设计](#13-无障碍设计)
14. [内容创作指南](#14-内容创作指南)
15. [分页、标签与归档](#15-分页标签与归档)
16. [SEO、RSS 与元信息](#16-seorss-与元信息)
17. [本地开发、构建与部署](#17-本地开发构建与部署)
18. [已知问题清单](#18-已知问题清单)
19. [维护操作手册](#19-维护操作手册)
20. [附录：速查表](#20-附录速查表)

---

## 1. 文档说明

### 1.1 这个站点的"特殊"之处

README 里说这是一个"基于 Minima 主题的个人博客"。这句话在**文件层面**是准确的，但在**实际运行层面**具有相当的误导性。真实情况是：

- `_config.yml` 里写了 `theme: minima`，Gemfile 里装了 `minima ~> 2.5`；
- 但 `_layouts/` 和 `_includes/` 目录下**每一个** Minima 提供的模板都被同名文件覆盖了；
- `head.html` 加载的是 `assets/css/main.css`，而 Minima 编译产物是 `assets/main.css`——**两者路径不同**，也就是说 Minima 的样式表**从来没有被链接过**；
- 所以 Minima 在这个项目里的实际贡献是：一个空的 Sass 编译任务（产出 12KB 无人引用的 CSS）和一个 `minima-social-icons.svg`。

真正构成这个站点的是**四层自研 CSS**（`main.css` → `glass.css` → `glass-overrides.css` → `post.css`）、**四个零依赖 JS 模块**、以及一套**用 `data-*` 属性驱动的双轴视觉状态机**（视觉风格 × 颜色主题，共 3×2=6 种组合，外加 `auto` 的实时跟随）。

`glass.css` 是从第三方库 `glass-refraction@0.1.0` 原样 vendor 进来的 Liquid Glass 设计系统，而 `glass-overrides.css` 是把它从"深海军蓝暗色玻璃"改造成"适配浅色背景的轻玻璃"的全部补丁。这两者之间的关系，是本项目 CSS 复杂度的核心来源。

### 1.2 阅读路线建议

| 你的目的 | 建议阅读 |
| --- | --- |
| 只想写一篇新文章 | 第 14 章 + 第 15 章 |
| 想改配色/文字 | 第 5 章 + 第 7.2 节（令牌表） |
| 想加一个新页面 | 第 6 章 + 第 20 章 |
| 想改导航栏/玻璃效果 | 第 8 章 + 第 10 章 --- **强烈建议连第 7.7 节一起看** |
| 想修 bug | 第 18 章 |
| 完全不知道从哪下手 | 第 3 章 → 第 4 章 → 第 7.1 节 |

### 1.3 约定

- 文中所有路径均相对于仓库根目录。
- 行号引用格式为 `文件:行号`，对应 `16b81f4` 版本。
- 选择器特异性用 **`(a,b,c)`** 记号表示：a = ID 选择器数，b = 类/属性/伪类数，c = 元素/伪元素数。这是 CSS 级联排序的实际依据。
- 标注 **⚠️** 的是"改这里会出问题"的警告。

---

## 2. 项目定位与技术选型

### 2.1 需求约束

这个博客的选型由三条硬约束倒推出来：

1. **必须跑在 GitHub Pages 上**。GitHub Pages 的经典构建走的是 safe mode——不允许自定义插件，只能用白名单里的 gem。这一条直接杀死了 `jekyll-paginate`、`jekyll-archives` 这类常用插件（`jekyll-paginate` 曾被短暂移除白名单，现在虽在名单内但版本行为不稳定）。
2. **必须支持 LaTeX 公式**。作者是 OI/竞赛背景（见 `about.md`：CSP-J、iCode），技术文章里要写复杂度分析、图论公式。
3. **必须能在无网络的环境下本地预览**（在校学生，网络环境不可控）。

### 2.2 选型结果

| 需求 | 方案 | 代价 |
| --- | --- | --- |
| 静态站点生成 | Jekyll 3.9+（Gemfile 锁 `~> 3.9`，实际本地装了 3.10.0） | 无 |
| 主题基础 | Minima 2.5.2（只为了满足 `theme:` 字段和 Markdown 默认值，实际全量覆盖） | 12KB 死 CSS |
| 分页 | **手工分页**——每个分页是一个独立的物理目录 + `offset` front matter | 需要手动创建目录 |
| 公式渲染 | MathJax 3.2.2（`tex-svg.js`，CDN 加载） | 依赖 CDN；首次渲染有 FOUC |
| 评论 | Gitalk（**当前未启用**，见 18.2） | 无 |
| 玻璃效果 | vendor `glass-refraction@0.1.0` 的 CSS 部分（`glass.css`，5,588 字节 ≈ **5.5KB**） | 需要一层 override 文件把它浅色化 |
| 深色模式 | 自研：`data-theme` 属性 + CSS 自定义属性 | 需要手写两套令牌 |

> **关于文件体积的一个澄清**：仓库根目录的 `fluent.css` 是 78KB / 1091 行，但它**没有接入任何页面**（`head.html` 不引用它）。它是一份"参考文档"——`post.css` 顶部注释写明"参照 fluent.css（Typora Fluent 主题）移植"。真正参与渲染的 CSS 总量是：
>
> | 文件 | 字节 | 是否加载 |
> | --- | --- | --- |
> | `assets/css/main.css` | 11,245 | ✅ |
> | `assets/css/glass.css` | 5,588 | ✅ |
> | `assets/css/glass-overrides.css` | 27,074 | ✅ |
> | `assets/css/post.css` | 6,230 | ✅ |
> | `fluent.css` | 78,756 | ❌ 仅参考 |
> | `_site/assets/main.css`（Minima 编译产物） | ~12KB | ❌ 无引用 |

---

## 3. 仓库结构与文件清单

### 3.1 完整目录树

```
.
├── _config.yml                  # Jekyll 全局配置（14 个键）
├── Gemfile / Gemfile.lock       # Ruby 依赖（bundler 4.0.21）
├── .bundle/config               # 清华 TUNA 镜像源
├── .gitignore
│
├── _layouts/                    # 5 个布局（其中 4 个覆盖 Minima 同名文件；posts 为本站新增）
│   ├── default.html             # 根布局：<html> 骨架
│   ├── home.html                # 首页：个人信息卡 + 最新 3 篇 + 侧边栏
│   ├── post.html                # 文章页：标题卡 + 正文卡 + 评论
│   ├── posts.html               # 归档列表 + 手工分页
│   └── page.html                # 普通页面（about / tags / theme）
│
├── _includes/                   # 7 个片段
│   ├── head.html                # <head>：SEO + 防闪脚本 + 4 CSS + 4 JS
│   ├── head-custom.html         # MathJax 配置（被 head.html 包含）
│   ├── header.html              # 导航：品牌 + 链接 + 主题菜单 + 汉堡
│   ├── footer.html              # 页脚：年份 + RSS
│   ├── social.html              # 4 个社交链接（⚠️ href 仍是 "xxx"）
│   ├── style-switches.html      # /theme/ 页的分段控件
│   └── gitalk.html              # 评论区（⚠️ 未启用且 URL 有误）
│
├── _posts/                      # 文章源文件
│   ├── 2026-09-19-cspyj.md      # CSP 初赛游记（tag: [考试游记]）
│   └── 2026-9-21-music.md       # 音乐收藏（tag: [音乐]，文件名未补零）
│
├── posts/
│   ├── index.html               # 第 1 页，offset: 0
│   └── page2/index.html         # 第 2 页，offset: 10（⚠️ 孤儿页）
│
├── index.md                     # 首页（layout: home）
├── about.md                     # 关于（layout: page）
├── tags.md                      # 标签云（layout: page, permalink: /tags/）
├── theme.md                     # 设置页（layout: page, permalink: /theme/）
│
├── assets/
│   ├── css/                     # ← 真正的样式层
│   │   ├── main.css             # 令牌定义 + 布局骨架（565 行）
│   │   ├── glass.css            # 第三方 vendor，勿改（199 行）
│   │   ├── glass-overrides.css  # 站点定制（794 行，全项目最复杂）
│   │   └── post.css             # 文章版式（268 行）
│   ├── js/                      # ← 运行时
│   │   ├── glass-style.js       # 视觉风格切换（34 行）
│   │   ├── glass-theme.js       # 颜色主题切换（66 行）
│   │   ├── theme-menu.js        # 桌面下拉菜单（60 行）
│   │   └── nav-shrink.js        # 滚动收缩 + 汉堡面板（78 行）
│   ├── images/avatar.jpg        # 头像（另有失效的 avatar.vg，见 18.6）
│   ├── bg.jpg / bg-dark.jpg     # 页面背景（浅色 / 深色）
│   ├── in-posts/                # 文章内嵌图
│   └── *.png                    # README 预览截图
│
├── file/                        # 各种附件（PDF/RAR/PNG/ZIP，直接对外下载）
├── fluent.css                   # ⚠️ 78KB，未加载，仅作移植参考
├── README.md                    # 面向访客的说明（英文）
└── Help.md                      # 本文件
```

### 3.2 三类文件的处理方式

Jekyll 对源文件按"有无 front matter"分流，这个规则解释了很多"为什么这个文件长这样"：

| 类型 | 判据 | 处理 | 本仓库中的例子 |
| --- | --- | --- | --- |
| **可渲染页** | 有 `---` front matter（YAML 块） | 经过 Liquid + Markdown 处理，套用布局 | `index.md`、`about.md`、`tags.md`、`theme.md`、`posts/index.html` |
| **静态文件** | 无 front matter | **原样拷贝**到 `_site/`，不做任何处理 | `assets/**`、`file/**`、`fluent.css`、`README.md`、`Help.md` |
| **特殊目录** | 下划线开头 | Jekyll 内部使用，默认不输出 | `_layouts/`、`_includes/`、`_posts/`、`_site/`、`_config.yml` |

> ⚠️ **由此产生的两个副作用**：
>
> 1. **本文件 `Help.md` 会被原样发布**到 `https://maixzzh.github.io/Help.md`。如果你不希望它公开，在文件开头加一段空 front matter（孤立的 `---` / `---` 两行）是不够的——那只会让它被当作无布局页面渲染。正确做法是在 `_config.yml` 的 `exclude:` 列表里加上 `Help.md`。
> 2. 同理，`README.md` 也会被发布到 `/README.md`（当前线上确实存在）。

### 3.3 布局继承树

```
default.html  ←─────────────────────────────┐
  ├── home.html    (index.md)               │
  ├── page.html    (about.md / tags.md / theme.md)
  ├── posts.html   (posts/index.html / posts/page2/index.html)
  └── post.html    (★ 所有 _posts/*.md，由 _config.yml defaults 指定)
```

`_config.yml` 的 `defaults` 段落做了这件事：

```yaml
defaults:
  - scope:
      path: ""          # 任意路径
      type: posts       # 只要是 posts 集合的文档
    values:
      layout: post      # 自动套用 post 布局
```

所以每篇文章的 front matter 里**不需要写 `layout: post`**——写了也不会出错，只是冗余。

---

## 4. 构建流水线：从 Markdown 到 HTML

### 4.1 构建阶段概览

`bundle exec jekyll build` 的执行顺序（实测耗时约 0.9 秒）：

```
① 读取 _config.yml          → 合并默认值，得到有效配置
② 加载插件                  → jekyll-feed, jekyll-seo-tag（均为 GitHub Pages 白名单）
③ 应用主题                  → 从 minima-2.5.2 gem 加载 _layouts/_includes/_sass/assets
④ 扫描源文件                → 分类为 Pages / StaticFiles / Collections(posts)
⑤ 站点自有文件优先级更高    → 同名文件覆盖主题文件
⑥ 解析文章的 front matter    → 提取 title/tags/d 等
⑦ 建立 site.posts 集合       → 按文件名日期倒序
⑧ 建立 site.tags 索引        → Jekyll 自动聚合
⑨ 逐页渲染                  → Liquid → Markdown → HTML，套用布局
⑩ Sass 编译                 → minima.scss → _site/assets/main.css（无人引用）
⑪ jekyll-seo-tag 注入       → 替换 {% seo %} 为完整 meta 块
⑫ jekyll-feed 生成          → 写出 _site/feed.xml
⑬ 拷贝静态文件              → assets/ file/ fluent.css README.md …
```

### 4.2 布局渲染顺序（重要）

Liquid 的布局是**从内到外**打包的。以文章页 `_posts/2026-09-21-music.md` 为例：

```
第 1 步  渲染 Markdown 正文        → HTML 片段
第 2 步  套用 _layouts/post.html   → {{ content }} 被替换为第 1 步结果
第 3 步  套用 _layouts/default.html → {{ content }} 被替换为第 2 步结果
第 4 步  写出 _site/2026/09/21/music/index.html
```

关键在于：**第 3 步的 `{% include header.html %}` 里，`page` 变量指向的仍然是文章文档本身**（不是布局文件）。所以 `_includes/header.html` 里的 `page.url`、`page.layout` 能正确判断当前页面——这是导航高亮能工作的原因（见 6.7）。

### 4.3 输出路径规则

由 `_config.yml` 的 `permalink: /:year/:month/:day/:title/` 决定：

| 源文件 | 输出路径 |
| --- | --- |
| `_posts/2026-09-21-music.md` | `_site/2026/09/21/music/index.html` |
| `about.md` | `_site/about/index.html` |
| `tags.md`（有 `permalink: /tags/`） | `_site/tags/index.html` |
| `posts/index.html` | `_site/posts/index.html` |
| `posts/page2/index.html` | `_site/posts/page2/index.html` |

其中 `:title` 取的是**文件名中日期之后的部分**，而不是 front matter 里的 `title`。所以 `_posts/2026-9-21-music.md` 的 URL 是 `/2026/09/21/music/`——注意 `:month` 会被 `date_format` 补零为 `09`，但**文件名里的月份写成 `9` 也是合法的**（Jekyll 的日期匹配正则是 `\d{2,4}-\d{1,2}-\d{1,2}`）。

> ⚠️ 虽然合法，但建议统一写成补零形式（`2026-09-21-`）。混用会导致文件名排序与时间排序不一致，在文件管理器里看着很乱。

### 4.4 一个容易忽略的事实：单换行不产生 `<br>`

`_config.yml` 里写的是：

```yaml
markdown: kramdown
```

但**没有**配置 `kramdown: input: GFM`。Gemfile 里虽然装了 `kramdown-parser-gfm`，但没有被 `_config.yml` 选中，所以实际生效的是 **kramdown 原生解析器**。

实测差异（这是本文档中实测验证过的结论）：

| 语法 | kramdown 原生（本项目实际） | GFM（未启用） |
| --- | --- | --- |
| 段内单换行 | `<p>行一\n行二</p>` 不换行 | `<p>行一<br />行二</p>` 换行 |
| `~~删除~~` | 原样输出字面量 `~~删除~~` | `<del>删除</del>` |
| `- [ ] 任务` | 普通列表项，显示 `[ ] 任务` | 带 checkbox 的任务列表 |
| 表格 `\| a \| b \|` | ✅ 正常工作 | ✅ 正常工作 |
| ```` ``` ```` 围栏代码块 | ✅ 正常工作 | ✅ 正常工作 |
| 裸 URL 自动链接 | ❌ | ❌（默认都不支持） |

**实践影响**：写文章时如果你想强制换行，必须用以下两种方式之一：

```markdown
第一行末尾加两个空格  
第二行（这样才会换行）
```

或者更可靠地直接插入 HTML：

```markdown
第一行<br>第二行
```

`about.md` 里那句"我是张麦轩，一个岛城的苦逼初中生，这是的博客。"后面跟了一个空行再接引用块，正是为了避免依赖单换行行为。

---

## 5. 配置层：_config.yml 全解

文件只有 27 行，但每一个键都值得说明。

```yaml
title: 张麦轩
```

- **用途**：`_includes/header.html` 的品牌文字、`_layouts/home.html` 的个人卡片姓名、`{% seo %}` 生成的 `<title>`、`feed.xml` 的 `<title>`。
- **注意**：这个值同时是"站点名"和"用户名"，语义被复用。改它会影响 4 处。

```yaml
email: maixuanzhang7@gmail.com
```

- **用途**：**当前无任何代码引用**。`_includes/social.html` 里的"邮箱"链接硬编码的是 `href="xxx"`，并没有读这个变量。README 里说"Email is taken from `_config.yml` → `email`"——这是**与实现不符的文档描述**（见 18.3）。

```yaml
description: 习惯把世界看成点和边：相遇是边，时间是边权，回忆是强连通分量；愿我们之间的图没有负环，只有一条通往彼此的最短路。
```

- **用途**：`{% seo %}` 生成 `<meta name="description">` 和 `og:description`；`feed.xml` 的 `<subtitle>`。
- **注意**：很长（约 60 个汉字），在搜索结果里会被截断，但这属于有意为之的"副标题"用法。

```yaml
signature: Life topo-sorted, bound for the shortest AC path.
```

- **用途**：仅 `_layouts/home.html:11` 使用（`.signature`）。
- **注意**：这是**唯一**在页面上显示英文的地方，其余都是中文。

```yaml
lang: zh-CN
```

- **用途**：`_layouts/default.html:2` 的 `<html lang>`、`{% seo %}` 的 `og:locale`、以及内联防闪脚本的 `default` 兜底。
- **连带影响**：`feed.xml` 的 `xml:lang="zh-CN"`。

```yaml
url: "https://maixzzh.github.io"
baseurl: ""
```

- **用途**：所有绝对 URL 的拼接基准（`{% seo %}` 的 canonical、`feed.xml` 的条目链接）。
- **⚠️ 严重警告**：`baseurl` 必须保持空字符串。这是**用户站点**（仓库名就是 `maixzzh.github.io`），部署在域名根目录。如果错误地填成 `/maixzzh.github.io`，所有 CSS/JS/图片路径都会变成 `/maixzzh.github.io/assets/...` 而 404。
- **历史遗留**：`assets/css/main.css:1` 的注释仍写着 `mxkfemkkk.github.io`，README 里的预览链接也是 `mxkfemkkk.github.io`——这两个是**旧的占位/账号名**，与当前的 `url: maixzzh.github.io` 不一致。不影响运行，但会误导人（见 18.9）。

```yaml
theme: minima
markdown: kramdown
```

见 4.4 与第 2 章的说明。

```yaml
plugins:
  - jekyll-feed
  - jekyll-seo-tag
```

- **必须是白名单插件**：GitHub Pages safe mode 在遇到非白名单插件时会让**整个构建失败**（错误信息形如 `The jekyll-xxx plugin is not whitelisted`）。这两个都在名单内。
- **`jekyll-feed`**：输出 `_site/feed.xml`（Atom 格式），被 `_includes/footer.html` 链接为 "RSS"。
- **`jekyll-seo-tag`**：替换 `{% seo %}` 标签为完整的 meta 块（og / twitter / JSON-LD）。
- **注意**：Gemfile 里有 `kramdown-parser-gfm` 但未在 `plugins:` 中列出——它不是一个 Jekyll 插件，而是一个解析器 gem，通过 `kramdown: input: GFM` 启用，这里没有启用。

```yaml
permalink: /:year/:month/:day/:title/
date_format: "%Y-%m-%d"
```

- `permalink` 决定文章 URL 形态（见 4.3）。
- `date_format` **不是 Jekyll 内置键**，只是一个自定义变量，供模板用 `{{ post.date | date: site.date_format }}` 引用。出现在：`_layouts/home.html:23`、`_layouts/post.html:16`、`_layouts/posts.html`（无，用的是 excerpt）、`tags.md:10`。

```yaml
defaults:
  - scope: {path: "", type: posts}
    values: {layout: post}
```

见 3.3。

### 5.1 配置键与使用点的交叉对照

| 配置键 | 被引用于 | 状态 |
| --- | --- | --- |
| `title` | `{% seo %}`(内部)、`header.html:8`、`home.html:8/:10`、`footer.html:2` | ✅ |
| `email` | — | ⚠️ **无引用** |
| `description` | `{% seo %}` 内部 | ✅ 间接 |
| `signature` | `home.html:11` | ✅ |
| `lang` | `default.html:2` | ✅ |
| `url` | `{% seo %}`、`feed.xml` | ✅ 间接 |
| `baseurl` | `relative_url` 过滤器 | ✅ 间接 |
| `date_format` | `home.html:23`、`post.html:16`、`tags.md:10` | ✅ |
| `gitalk` | `gitalk.html:1` | ❌ **未定义**（故评论区不渲染） |

---

## 6. 模板层：布局与包含

### 6.1 _layouts/default.html —— 根骨架

```html
<!DOCTYPE html>
<html lang="{{ site.lang | default: "zh-CN" }}" data-glass="liquid" data-theme="light">
<head>
  {% include head.html %}
</head>
<body>
  {% include header.html %}
  <main class="container">
    {{ content }}
  </main>
  {% include footer.html %}
</body>
</html>
```

**要点**：

1. **`data-glass="liquid"` 与 `data-theme="light"` 是硬编码的初值**。这两个属性在 `<head>` 里的内联脚本执行后会被立刻覆写为 localStorage 中的真实值。硬编码的作用是：**即使 JS 被完全禁用**，页面仍然以"液态玻璃 + 浅色"这个默认组合正常渲染，不会变成无样式的裸 HTML。
2. `data-theme="light"` 与内联脚本的结果理论上可能不一致（比如用户选了深色）。但由于内联脚本在 `<head>` 内、样式表**之前**执行，此时尚未发生首次绘制，所以不会看到闪烁。这是"三段式防闪"的第一步（见 6.7）。
3. `<main class="container">` 提供 1000px 居中容器。**注意**：在 liquid/frost 模式下，导航栏是 `position: fixed` 脱离文档流的，靠 `body { padding-top: 88px }` 让出空间（见 10.5）。

### 6.2 _layouts/home.html —— 首页

结构是一个 CSS Grid 两栏布局：

```
.home (grid: 1fr / 296px)
├── .home-main          ← 主栏
│   ├── .profile-card   ← 头像 + 姓名 + 签名（.glass-card）
│   ├── .home-feed      ← 最新 3 篇文章
│   │   └── .feed-item ×3  ← 标题 / 摘要(d) / 标签 / 日期（.glass-card）
│   └── {{ content }}   ← index.md 里的那段 .intro 文字
└── .home-side          ← 侧栏（sticky, top: 76px）
    └── .side-card      ← "关注我" + social.html
```

**三个设计决策**：

- **`limit: 3` 是硬编码的**。首页固定显示最新 3 篇，不随文章总数变化。
- **`{{ content }}` 放在 feed 之后、主栏之内**。所以 `index.md` 里那段 `<p class="intro">相遇为边...</p>` 会显示在文章列表**下方**。这是刻意的——视觉上像一个"落款"。
- **`.home-side` 用 `position: sticky; top: 76px`**。`76px` 是为 liquid/frost 的悬浮胶囊导航留的视觉间隙（胶囊静止态 `top: 20px` + 高度约 42px ≈ 62px，留出 14px 余量）。

### 6.3 _layouts/post.html —— 文章页

这是全站唯一有"设计说明"注释的布局，注释本身值得完整保留：

```
标题区（标题 / 标签 / 摘要 / 日期）独立成一张卡片，用 .glass-card 接入
玻璃风格系统：liquid 走扫光玻璃、frost 走纯模糊、solid 走白底。
正文 .post 不受影响，仍按站点策略强制高斯模糊（见 glass-overrides.css）。
两者都放在 .post-article 内，保证 <article> 语义完整（标题属于文章）。
```

模板代码：

```liquid
{% assign post_tags = page.tags | default: page.tag %}
<article class="post-article">
  <header class="post-header glass-card">
    <h1>{{ page.title }}</h1>
    {% if post_tags %}<div class="post-tags">{{ post_tags | join: ", " }}</div>{% endif %}
    {% if page.d %}<p class="post-d">{{ page.d }}</p>{% endif %}
    <time class="post-date">{{ page.date | date: site.date_format }}</time>
  </header>

  <div class="post">
    <div class="post-content">{{ content }}</div>
  </div>
</article>

{% include gitalk.html %}
```

**关键点**：

1. **标题与正文是两张独立的卡片**，视觉上上下相接。`post.css:30-33` 用 `margin: 24px 0 0` 让标题卡的下边距与正文卡的上边距**折叠**（margin collapsing）成 24px，看起来像一整块。如果不理解这一点，改 `margin` 很容易做出"中间有道缝"的效果。
2. **两卡的左右内边距必须一致**：桌面 `48px`、移动端 `20px`。桌面写在 `post.css:11`（`.post`）和 `:31`（`.post-header`），移动端写在 `:249` 和 `:255`——**四处两两成对**，改一个必须改另一个，否则标题和正文的左边缘会错位。
3. **`page.tags | default: page.tag` 中的 `default` 分支实际上是死代码**。Jekyll 在 `Document#populate_tags` 里调用 `Utils.pluralized_array_from_hash(data, "tag", "tags")`，会把 `tag:` 和 `tags:` 两个键**合并**进 `page.tags`。所以无论你在 front matter 里写哪个，`page.tags` 都有值。这个 `default` 是防御性写法，无害但会让人误以为单数形式需要特殊处理。
4. **`<time>` 没有 `datetime` 属性**。规范上 `datetime` 应该存在（`<time datetime="2026-09-21">`），当前只是显示文本。对 SEO 和可访问性有轻微影响（见 18.10）。
5. `{% include gitalk.html %}` 在液态/frost 模式下会渲染在 `.post` 卡片**之外**，因此不会继承卡片的玻璃背景。

### 6.4 _layouts/posts.html —— 归档列表 + 手工分页

```liquid
{% assign start = page.offset | default: 0 %}
<h1>文章</h1>
<ul class="post-list">
  {% for post in site.posts limit: 10 offset: start %}
  <li class="card glass-card">
    <h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
    {% if post.d %}<p class="post-d">{{ post.d }}</p>{% endif %}
    <p class="excerpt">{{ post.excerpt | strip_html | truncate: 100 }}</p>
  </li>
  {% endfor %}
</ul>
<nav class="pagination">…</nav>
```

**分页算法**：

- `start = page.offset`（默认 0），即"跳过前 N 篇"。
- `limit: 10`，即每页固定 10 篇。
- 所以第 N 页的 `offset = 10 × (N-1)`。

**翻页链接的构造**：

```liquid
{% if start > 0 %}
  {% assign prev_num = start | divided_by: 10 %}
  <a href="{% if prev_num == 1 %}{{ "/posts/" | relative_url }}{% else %}...page{{prev_num}}/...{% endif %}">上一页</a>
{% endif %}
<span>第 {{ start | divided_by: 10 | plus: 1 }} 页</span>
{% assign remaining = site.posts.size | minus: start | minus: 10 %}
{% if remaining > 0 %}…下一页…{% endif %}
```

`prev_num == 1` 是一个**特殊的路径处理**：第 1 页的规范路径是 `/posts/` 而不是 `/posts/page1/`，所以需要 if 分支。

`remaining > 0` 的判据保证：恰好 10 的整数倍篇文章时不会出现空的下一页。

**⚠️ 已知缺陷（见 18.1）**：第 9 行 `<h2>…</h3>` 标签错配。

**⚠️ 样式约束（见 7.7.3 原则 2）**：`<li>` 上必须**同时**有 `card` 和 `glass-card` 两个类。`main.css:389` 的注释解释了原因：

> 不要在这里写 `background` / `border`：本选择器特异性 `(0,1,1)` 高于 `.glass-card` 的 `(0,1,0)`，会把玻璃背景压掉，导致玻璃效果失效。

### 6.5 _layouts/page.html

```liquid
<article class="page glass-card">
  <h1>{{ page.title }}</h1>
  <div class="page-content">{{ content }}</div>
</article>
```

最简单的一个布局。整张卡片套 `.glass-card`，所以 about / tags / theme 三个页面都参与玻璃风格系统。

⚠️ `.page` 同时被 `main.css:439-446` 定义了 `background: var(--card)`，特异性 `(0,1,0)`，与 `.glass-card` **相同**。谁赢取决于加载顺序：`main.css` 先、`glass.css` 后 → `.glass-card` 赢。但这是个**脆弱的平衡**，如果将来有人调整 `<link>` 顺序，整个页面的玻璃效果会消失（见 7.7.1 #2）。

### 6.6 _includes/head.html —— 三段式防闪

这是全站最关键的 40 行。它的结构是**严格有序**的：

```
① <meta charset>
② <meta viewport>
③ {% seo %}                        ← SEO meta 注入
④ {% include head-custom.html %}   ← MathJax 配置
⑤ <script> 内联防闪脚本 </script>   ← ★ 必须在样式表之前
⑥ <link> × 4  ← main / glass / glass-overrides / post
⑦ <script defer> × 4  ← glass-style / glass-theme / theme-menu / nav-shrink
```

**为什么内联脚本必须在 ⑥ 之前？**

浏览器解析 `<head>` 是自上而下的。当它遇到 `<link rel="stylesheet">` 时，会暂停渲染直到样式表下载并解析完毕（CSS 是渲染阻塞资源）。如果脚本放在样式表之后，那么在"样式表已就绪"到"脚本执行完毕"之间存在一个时间窗，此时页面会以 `<html data-glass="liquid" data-theme="light">` 的默认值绘制一帧——如果用户选的是深色，就会看到一次**白闪**。

把脚本放在样式表**之前**，让 DOM 的 `data-*` 属性在样式表生效前就确定，就从根本上消除了这一帧。

脚本逻辑：

```js
var s = 'liquid';
try {
  var stored = localStorage.getItem('glass-style');
  if (stored === 'liquid' || stored === 'frost' || stored === 'solid') { s = stored; }
} catch (e) { /* localStorage 不可用（隐私模式等）时保持默认 */ }
document.documentElement.dataset.glass = s;

var t = 'auto';
try {
  var storedTheme = localStorage.getItem('glass-theme');
  if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'auto') { t = storedTheme; }
} catch (e) { /* 同上 */ }
if (t === 'auto') {
  t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}
document.documentElement.dataset.theme = t;
```

**四个防御性设计**：

1. **`try/catch` 包裹 `localStorage`**。Safari 无痕模式、部分企业策略、`file://` 协议下，访问 `localStorage` 会**抛异常**（不是返回 null）。不捕获的话脚本中断，`data-theme` 保持 HTML 里的 `"light"`，深色用户会看到浅色页面且无法切换。
2. **白名单校验**。`stored === 'liquid' || ...` 而不是直接赋值——防止 localStorage 被污染成非法值时产生无样式的页面。
3. **`window.matchMedia` 存在性检查**。极老的浏览器没有这个 API，`&&` 短路保证不抛异常。
4. **`auto` 在这里就被解析成具体值**，而不是把 `"auto"` 写进 DOM。原因见 9.2。

### 6.7 _includes/header.html —— 导航

结构分四块（从左到右）：

```html
{% assign current = page.url %}
<header class="site-header glass" id="site-header">
  <nav class="site-nav">
    <!-- ① 品牌 -->
    <a class="brand {% if current == "/" %}active{% endif %}" href="/">
      <img class="brand-avatar" src="/assets/images/avatar.jpg" alt="" width="26" height="26">
      <span class="brand-text">{{ site.title }}</span>
    </a>

    <!-- ② 导航链接 -->
    <div class="nav-links" id="nav-links">
      <a href="/posts/" class="{% if current contains "/posts/" or page.layout == "post" %}active{% endif %}">文章</a>
      <a href="/tags/"  class="{% if current == "/tags/" %}active{% endif %}">标签</a>
      <a class="nav-about {% if current == "/about/" %}active{% endif %}" href="/about/">关于</a>
      <a class="nav-theme-link {% if current == "/theme/" %}active{% endif %}" href="/theme/">设置</a>
    </div>

    <!-- ③ 主题下拉菜单（仅桌面） -->
    <div class="theme-menu" id="theme-menu">…</div>

    <!-- ④ 汉堡按钮（仅移动端） -->
    <button class="nav-toggle" id="nav-toggle" …><span class="nav-toggle-bar"></span>×3</button>
  </nav>
</header>
```

**高亮逻辑的三个细节**：

1. **文章的"文章"高亮用了双重条件**：`current contains "/posts/"` **或** `page.layout == "post"`。为什么不统一用 URL 前缀？因为文章的 URL 是 `/2026/09/21/music/`，根本不包含 `/posts/`。所以必须靠 `page.layout` 兜底。
2. **`{% assign current = page.url %}` 在 `<header>` 之外**。因为 Liquid 的 `assign` 作用域是文件级，放在里面也一样，但放在顶部更清晰。
3. **`active` 类在 liquid/frost 下被改写为背景块**（`glass-overrides.css:650-654`），因为胶囊导航里的下划线太局促。

**`.nav-theme-link` 的显隐规则**是全项目最容易改错的地方之一：

| 视口 | liquid / frost | solid |
| --- | --- | --- |
| 桌面 (≥769px) | `display: none`（`glass-overrides.css:609-610`） | `display: none`（`glass-overrides.css:250-252`） |
| 移动 (≤768px) | `display: block`，作为汉堡面板的一行（`:730-731`） | `display: inline`（`:218`） |

---

## 7. 样式层：四文件级联架构

### 7.1 加载顺序与职责边界

```
main.css            ─┬─ ① 定义全部设计令牌（:root 与 html[data-theme="dark"]）
                     ├─ ② 布局骨架（container/card/nav/home/post-list/page）
                     └─ ③ 响应式断点（768px）

glass.css           ─┬─ 第三方 vendor（glass-refraction@0.1.0）
                     ├─ 定义 --gr-* 私有令牌
                     └─ 提供 .glass / .glass-card / .glass-pill 三个类
                     ⚠️ 原样 vendor，勿手工修改

glass-overrides.css ─┬─ ① 覆盖 --gr-* 令牌，把暗色玻璃改成浅色玻璃
                     ├─ ② 三态风格系统（liquid/frost/solid）
                     ├─ ③ 主题下拉菜单
                     └─ ④ 悬浮胶囊导航 + 汉堡面板
                     ★ 全项目最复杂的文件

post.css            ─┬─ 文章版式（Fluent 主题移植）
                     └─ 文章卡片与标题卡的几何对齐
```

**为什么是这个顺序？** 因为后加载的同特异性规则获胜。`glass-overrides.css` 必须在 `glass.css` 之后（覆盖 vendor），`post.css` 必须在 `main.css` 之后（覆盖 `.post` 的默认样式）。

⚠️ **改 `<link>` 顺序会让整个视觉系统错乱**。`head.html:34-37` 的四行顺序是有意义的，不要重排。

### 7.2 设计令牌体系

`main.css:8-47` 定义了浅色令牌，`main.css:55-104` 定义了深色覆盖。所有令牌分为四组：

#### 第 1 组：基础色（10 个：9 个颜色 + 1 个背景图）

| 令牌 | 浅色 | 深色 | 用途 |
| --- | --- | --- | --- |
| `--bg` | `#f6f6f6` | `#0f1216` | 页面背景 |
| `--card` | `#ffffff` | `#181d24` | 卡片背景 |
| `--border` | `#ebebeb` | `#2a313b` | 卡片边框 |
| `--hover-bg` | `#f7f8fa` | `#1f2630` | 悬停背景 |
| `--text` | `#1a1a1a` | `#e8eaed` | 标题文字 |
| `--text-2` | `#646464` | `#a0a8b4` | 次要文字 |
| `--text-3` | `#8590a6` | `#7a8494` | 元信息 |
| `--blue` | `#0084ff` | `#3d9bff` | 知乎蓝（主色） |
| `--blue-hover` | `#0069e0` | `#66b2ff` | 悬停蓝 |
| `--body-bg-image` | `url("/assets/bg.jpg")` | 渐变遮罩 + `bg-dark.jpg` | 页面背景图 |

#### 第 2 组：文章语义色（12 个）

这一组的浅色值是**从 `post.css` 里原有的字面量提取出来的**，中括号注释明确写着"浅色值 = 原字面量，像素不变"。提取的目的是让深色模式能覆盖它们。

| 令牌 | 浅色 | 深色 |
| --- | --- | --- |
| `--heading` | `#08090b` | `#e8eaed` |
| `--body-text` | `#24292e` | `#c9d1d9` |
| `--link` | `#486df1` | `#7aa2ff` |
| `--post-meta` | `#6a737d` | `#8b949e` |
| `--post-date-color` | `#959da5` | `#7d8590` |
| `--post-border` | `#f1f3f4` | `#2a313b` |
| `--table-border` | `#dfe2e5` | `#2e3540` |
| `--code-bg` | `#fafbfc` | `#1e242c` |
| `--table-stripe` | `#f8f8f8` | `#1c2229` |
| `--hr` | `#e7e7e7` | `#2e3540` |
| `--mark-bg` | `#ffde67` | `#6b5d14` |
| `--mark-text` | `#080a10` | `#f2e7b8` |

> 这一组令牌的来源很有意思：`#24292e`、`#6a737d`、`#dfe2e5`、`#fafbfc`、`#f8f8f8` 都是 **GitHub 的 Primer 调色板**（GitHub 页面级 token）。它们是从 `fluent.css` 里继承过来的——`fluent.css` 本身就是一个照抄 GitHub 配色、仿 Fluent Design 的 Typora 主题。所以这套博客的文章区配色，血脉上可以追溯到 GitHub 的 Markdown 渲染。

#### 第 3 组：玻璃令牌（8 个）

| 令牌 | 浅色 | 深色 |
| --- | --- | --- |
| `--glass-tint-start` | `rgba(255,255,255,0.30)` | `rgba(18,22,35,0.48)` |
| `--glass-tint-end` | `rgba(255,255,255,0.30)` | `rgba(12,16,28,0.42)` |
| `--glass-card-bg` | `linear-gradient(160deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,.30) 100%)` | `linear-gradient(160deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.06) 100%)` |
| `--glass-fallback-bg` | `rgba(255,255,255,0.92)` | `rgba(28,34,44,0.92)` |
| `--frost-nav-bg` | `rgba(255,255,255,0.78)` | `rgba(28,34,44,0.88)` |
| `--frost-card-bg` | `rgba(255,255,255,0.78)` | `rgba(28,34,44,0.85)` |
| `--post-frost-bg` | `rgba(255,255,255,0.78)` | `rgba(28,34,44,0.85)` |
| `--control-bg` | `rgba(255,255,255,0.65)` | `rgba(255,255,255,0.08)` |

**注意浅色的玻璃策略**：`--glass-tint-start/end` 都是 0.30 的白色，而 `--glass-card-bg` 是 0.55→0.30 的渐变。这不是随意取值——它是在 `bg.jpg` 背景图上**叠加白色**。如果背景图变暗或换成深色插画，这组值会立刻导致文字对比度不足。

> ⚠️ **`--control-bg` 是唯一在深色模式下用"白色系"的令牌**（`rgba(255,255,255,0.08)`），因为它是给"已经变暗的玻璃头部"上的分段控件用的，需要用亮色叠加提亮。

#### 第 4 组：vendor 私有令牌（`--gr-*`）

由 `glass.css` 定义、`glass-overrides.css:4-18` 覆盖：

| 令牌 | vendor 默认 | 本站值 | 理由（代码注释原文） |
| --- | --- | --- | --- |
| `--gr-blur` | `26px` | `9px` | "默认 26px 过重" |
| `--gr-blur-card` | `20px` | `9px` | — |
| `--gr-saturation` | `1.7` | `1.35` | — |
| `--gr-saturation-card` | `1.5` | `1.3` | — |
| `--gr-shimmer-duration` | `7s` | `8s` | "导航扫光放缓" |
| `--gr-specular-duration` | `5s` | `8s` | "呼吸高光放缓" |
| `--gr-radius` | `20px` | `8px`（`.glass`）/ `9999px`（胶囊导航） | 与站点 8px 统一 |
| `--gr-radius-card` | `16px` | `8px` | 同上 |

### 7.3 main.css 详解

565 行，按注释分为 12 个区段。除令牌外值得注意的：

**（1）全局 Reset**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
```

`border-box` 是整个布局体系的基石。第 10 章里胶囊导航的 `padding` 动画、`.container` 的 `max-width: 1000px` 都依赖它。如果改成 `content-box`，所有固定宽度都会凭空多出 padding。

**（2）导航基线**

```css
.site-header { position: sticky; top: 0; z-index: 100; }
.site-nav { max-width: 1000px; margin: 0 auto; padding: 0 16px; display: flex; align-items: center; gap: 28px; min-height: 56px; }
.site-nav .nav-about { margin-left: auto; }
```

这是 **solid 模式**和**无 JS 环境**下的导航形态：通栏白条、sticky 吸顶、56px 高、`gap: 28px`。

`margin-left: auto` 把"关于"推到了右侧——在原始设计里，导航是"品牌 | 文章 标签 …(右推)… 关于"的布局。后来引入 `nav-links` 包一层后，`glass-overrides.css:659-660` 用 `html[data-glass="liquid"] .nav-links .nav-about { margin-left: 0 }` 把它压掉了（因为现在整个 `.nav-links` 是一个组）。

**（3）`.post-list li` 的特异性陷阱**

```css
/* 卡片外壳交给 .card glass-card（同 .feed-item 的写法）。
   不要在这里写 background / border：本选择器特异性 (0,1,1) 高于
   .glass-card 的 (0,1,0)，会把玻璃背景压掉，导致玻璃效果失效 */
.post-list li { padding: 18px 20px; }
```

这段注释是本项目最有价值的"活文档"之一。它记录了一个真实的踩坑：`.post-list li` 是 `(0,1,1)`，而 `.glass-card` 是 `(0,1,0)`，前者胜。所以只要在这里写了 `background`，玻璃卡片就会变成实心白块。**解决方法就是只写 padding。**

**（4）首页 Grid**

```css
.home {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 296px;
  gap: 20px;
  align-items: start;
}
```

`minmax(0, 1fr)` 而不是 `1fr` 是关键——`1fr` 的隐含最小值是 `auto`，当主栏里出现 `<pre>` 长代码时会把 Grid 撑爆（横向滚动条出现在整个页面上而不是代码块内）。`minmax(0, 1fr)` 把最小尺寸强制为 0，配合 `.home-main { min-width: 0 }` 让 `overflow-x: auto` 正常工作。

**（5）响应式断点**

```css
@media (max-width: 768px) {
  body { background-attachment: scroll; }   /* iOS 不支持 fixed，且性能差 */
  .home { grid-template-columns: 1fr; }     /* 单栏 */
  .home-side { position: static; }          /* 取消 sticky */
  .avatar { width: 64px; height: 64px; }    /* 88 → 64 */
  .site-nav { flex-wrap: wrap; }            /* solid 模式下换行 */
  ...
}
```

### 7.4 glass.css 详解（vendor）

199 行，从 `https://unpkg.com/glass-refraction@0.1.0/dist/css/glass.css` 原样复制。**顶部注释明确规定"原样 vendor，勿手工修改；站点定制见 glass-overrides.css"**。如果你确实需要改它，正确做法是在 `glass-overrides.css` 里覆盖，而不是编辑这个文件——否则将来升级 vendor 时改动会丢失。

它提供三个类：

| 类 | 用途 | 核心实现 |
| --- | --- | --- |
| `.glass` | 导航栏外壳 | 双层渐变背景 + 扫光动画 + `blur(26px) saturate(1.7) brightness(1.08)` |
| `.glass-card` | 卡片 | 160deg 渐变 + `blur(20px) saturate(1.5)` + 悬停上浮 |
| `.glass-pill` | 胶囊（**本站未使用**） | 半透明白 + `blur(8px)` |

#### `.glass` 的三个视觉层

```
.glass          ← 本体：背景渐变 + backdrop-filter + 外阴影环
  ::before      ← 呼吸高光（specular-breathe 5s 循环）
                  · 180deg 白色渐隐（顶部 7% 亮）
                  · 90deg 水平亮线（background-size: 100% 1px，模拟玻璃上缘反射）
  ::after       ← 色散边缘（chromatic aberration）
                  · 4 个径向渐变（蓝/紫/粉/绿），模拟棱镜分光
                  · 4 条 inset 单像素彩色描边
```

**层级关系由 `z-index` 控制**：`::after` 是 `z-index: 2`，`::before` 是 `z-index: 3`，两者都是 `pointer-events: none`。内容默认层级（auto=0）在它们**之下**——这就是为什么标题栏里的文字不会被这些装饰层遮挡（装饰层是半透明的），也是为什么 `.theme-menu-panel` 必须用 `z-index: 10` 才能盖住它们（注释原文："需 > .glass::before(3) / ::after(2)，盖过扫光/色散"）。

**`isolation: isolate`** 创建了层叠上下文，保证这两个伪元素不会溢出影响到外部元素。

#### `.glass-card` 的悬停

```css
.glass-card { transition: transform .35s cubic-bezier(.4,0,.2,1), box-shadow .35s …; }
.glass-card:hover { transform: translateY(-2px); box-shadow: …更亮更大…; }
.glass-card::after { opacity: 0; transition: opacity .35s ease; }  /* 色散边缘 */
.glass-card:hover::after { opacity: 1; }                          /* 悬停才显示色散 */
```

注意 `.glass-card::after` 的色散边缘**默认透明**，只有悬停才显现——这是卡片和导航的差异（导航的色散是常驻的）。

### 7.5 glass-overrides.css 详解

794 行，本项目最复杂也最需要理解的 CSS 文件。按功能分为 7 个区段（行号为 `16b81f4` 版本）：

| 区段 | 行号 | 内容 |
| --- | --- | --- |
| ① 令牌覆盖 | 4-18 | `--gr-blur` 等 6 个变量的重定义 |
| ② 浅色化改造 | 15-63 | 把 vendor 的暗色玻璃改成浅色 + 回退兜底 |
| ③ 三态风格系统 | 83-227 | `html[data-glass="frost"]` / `[data-glass="solid"]` 的完整覆盖 |
| ④ 文章正文强制策略 | 229-247 | liquid/frost 下正文用 frost，solid 下用实底 |
| ⑤ 主题下拉菜单 | 279-464 | macOS 风格两级菜单 |
| ⑥ 悬浮胶囊导航 | 466-668 | 桌面端滚动收缩 |
| ⑦ 移动端汉堡面板 | 670-779 | 移动端导航形态 |

#### 浅色化改造的三个手法

**手法 A：变量注入（用于 `.glass`）**

```css
.glass, .glass-card, .glass-pill {
  --gr-bg-start: var(--glass-tint-start);
  --gr-bg-end:   var(--glass-tint-end);
}
```

`.glass` 的背景渐变在 vendor 里写的是 `var(--gr-bg-start)` / `var(--gr-bg-end)`，所以只要能改这两个变量的值就能换色。把变量赋值写在 `.glass` 自身（而不是 `:root`）上，意义是：**这些变量会随 `data-theme` 变化**——因为 `--glass-tint-start` 是在 `html[data-theme="dark"]` 里被重定义的，而 `.glass` 作为 `html` 的后代继承到的是当前主题下的值。这是一个很漂亮的"用继承代替媒体查询"的技巧。

**手法 B：直接覆盖（用于 `.glass-card`）**

```css
/* —— 覆盖库硬编码的深海军蓝卡片背景（rgba(15,18,30,0.52)）为浅色 —— */
.glass-card { background: var(--glass-card-bg); }
```

`.glass-card` 的背景在 vendor 里是**硬编码的字面量** `linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(15,18,30,0.52) 100%)`，没有走变量，所以改不了。只能在同特异性下用后加载覆盖。

⚠️ **代价**：这也覆盖掉了 `background-size` 等属性。如果将来 vendor 版本给 `.glass-card` 加了 `background-size`，需要在这里补回来。

**手法 C：补回被覆盖的属性（用于导航定位）**

```css
/* —— 吸顶导航：库的 .glass 把 position 覆盖成 relative，这里补回 sticky —— */
.site-header.glass { position: sticky; top: 0; … }
```

`.glass` 里的 `position: relative` 是必需的（为了让 `::before`/`::after` 的 `inset: 0` 有定位锚点），但它覆盖了 `main.css` 里 `.site-header` 的 `sticky`。所以需要一个 `(0,2,0)` 的 `.site-header.glass` 来同时满足两者。这是"层次化 CSS 架构"的典型代价。

#### `@supports` 回退

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass, .glass-pill { --gr-bg-start: var(--glass-fallback-bg); --gr-bg-end: var(--glass-fallback-bg); }
  .glass-card { background: var(--glass-fallback-bg); }
}
```

当浏览器不支持 `backdrop-filter`（Firefox 103 之前、部分国产浏览器内核）时，玻璃卡片只有 30% 白，叠在插画背景上完全看不清文字。这个回退把不透明度提到 **0.92**——接近实心，保证可读性。

这个 `@supports` 块在 `glass-overrides.css` 里出现了**两次**（`:55-63` 全站回退、`:173-176` frost 模式回退），是刻意的：后者针对 frost 模式（frost 本身靠 `backdrop-filter` 做模糊，不支持时效果完全消失，必须单独兜底）。

#### `prefers-reduced-motion` 支持

```css
@media (prefers-reduced-motion: reduce) {
  .glass, .glass-card, .glass-pill,
  .glass::before, .glass::after,
  .glass-card::before, .glass-card::after,
  .glass-pill::before, .glass-pill::after {
    animation: none !important;
    transition: none !important;
  }
}
```

**⚠️ 注意这里没有用 `html[data-glass]` 限定**，而是裸的 `.glass*`——因为它是"基础设施级"的无障碍兜底，应该覆盖所有模式。`!important` 在这里是必要的，因为它要与后面几百行里的各种 `animation` 声明竞争。

同样的 `@media` 块在本文件里出现 **3 次**（`:73-81`、`:459-464` 菜单过渡、`:782-794` 胶囊导航），分别针对不同区段。

### 7.6 post.css 详解

268 行，从 `fluent.css`（Typora Fluent 主题）移植，只作用于文章页。

**核心版式数据**：

| 元素 | 字号 | 行高 | 边距 |
| --- | --- | --- | --- |
| `.post h1` | `1.75rem` | `1.2` | `0 0 10px`，`letter-spacing: -0.04rem` |
| `.post-content h2` | `1.25em` | `1.225` | `1rem 0` |
| `.post-content h3` | `1.0em` | `1.43` | `1rem 0` |
| `.post-content h4` | `0.875em` | — | `1rem 0` |
| `.post-content h5` | `0.74em` | — | `1rem 0` |
| `.post-content h6` | `0.625em` | — | `1rem 0` |
| `.post-content p` | 继承 | 继承 | `0.5em 0` |
| `.post-content ul/ol` | 继承 | 继承 | `0.8em 0`，`padding-left: 30px` |
| `.post-content code` | `0.9em` | — | `padding: 2px 4px` |
| `.post-content pre code` | `0.875rem` | `1.45` | — |

**⚠️ 字号的相对单位混用**：`h1` 用 `rem`，`h2`~`h6` 用 `em`。而 `h2` 的 `1.25em` 是相对于**父元素**（`.post-content`，即根字号 16px），得到 20px。如果想改整体缩放，注意这两种单位的行为不同。

**（1）标题卡与正文卡的几何对齐（关键）**

```css
html[data-glass] .post-header { border-radius: 4px; }   /* ★ 必须带 html[data-glass] */
.post-header { padding: 32px 48px 28px; margin: 24px 0 0; }
.post-content h1, .post-header h1 { … }  /* 两张卡的字号必须一致 */
```

注释解释了为什么需要 `html[data-glass]` 前缀：

> 必须带 `html[data-glass]`：solid 模式下的 `html[data-glass="solid"] .glass-card { border-radius: 8px }` 特异性为 `(0,2,1)`，靠 `post.css` 后加载取**等特异性**才能压过。

这是一场精密的特异性战争：`main.css` 的 `.card` 是 8px 圆角，`glass-overrides.css` 里 solid 模式把 `.glass-card` 也设回 8px，但 `post.css` 的 `.post` 是 4px 圆角。要让标题卡的圆角（默认 8px）和正文卡（4px）对齐，就必须用 `(0,2,1)` 的选择器把标题卡也压成 4px。

⚠️ **改圆角的话，三处要一起改**：`.post`、`html[data-glass] .post-header`、以及 `glass-overrides.css` 里 solid 模式的 `.glass-card` 覆盖。

**（2）死声明（见 18.9）**

```css
.post-content p {
  margin-top: 0.5em;        /* ← 立即被下面覆盖 */
  margin-bottom: 2.5em;     /* ← 立即被下面覆盖 */
  margin: 0.5em 0;          /* ← 实际生效 */
  color: var(--body-text);
}
```

前两条 `margin-*` 是简写 `margin: 0.5em 0` 之前的遗留，完全无效。**从注释看，作者可能本意是 `margin-bottom: 2.5em`（更大的段间距）**，但被自己的简写覆盖了。如果觉得文章段落太挤，可以试试删掉简写那行——不过要注意那会改变整体的疏密节奏。

**（3）引用块的改造痕迹**

```css
.post-content blockquote {
  color: var(--post-meta);
  font-style: italic;
  border-left: 4px solid var(--table-border);
  border-top: none;        /* ← 显式置 none，说明原本有 */
  border-right: none;
  border-bottom: none;
  background-color: transparent;
  padding: 0 0 0 1em;
  margin: 0.8em 0;
  border-radius: 0;
}
```

注释里保留了作者当时的心理活动（"按你的需求加上"、"GitHub 偶尔在引用中强调"）。实际效果是"GitHub 风格的左竖线引用 + 斜体"。`fluent.css` 里的引用是有背景色和四边圆角边框的，这里全部推平了。

**（4）Gitalk 与 MathJax**

```css
.post-comments { margin: 24px 0; }
.mjx-container { color: var(--body-text); }
```

`.mjx-container` 那条很重要：MathJax 的 SVG 输出默认用 `currentColor`，如果不指定，公式会继承某个祖先的颜色，在深色模式下可能变成不可见的深灰。显式绑定到 `--body-text` 保证公式和正文同色。

### 7.7 特异性冲突与解决策略（核心章节）

这是维护本项目**最需要理解**的一节。四层 CSS 带来了大量特异性冲突，代码里散落着"必须这样写否则失效"的注释。这里把它们系统化。

#### 7.7.1 冲突速查表

| # | 冲突 | 双方特异性 | 谁赢 | 解决方式 |
| --- | --- | --- | --- | --- |
| 1 | `.post-list li` 的 background vs `.glass-card` 的 background | `(0,1,1)` vs `(0,1,0)` | 前者 | **不在 `.post-list li` 写 background** |
| 2 | `.card`(main) vs `.glass-card`(glass) | `(0,1,0)` vs `(0,1,0)` | 后者（后加载） | 依赖加载顺序 |
| 3 | `.site-header` sticky vs `.glass` relative | `(0,1,0)` vs `(0,1,0)` | 后者（后加载） | `.site-header.glass` `(0,2,0)` 补回 |
| 4 | `.glass-card` 圆角 8px(solid) vs `.post-header` 需 4px | `(0,2,1)` vs 需 `(0,2,1)` | post.css（后加载） | `html[data-glass] .post-header` |
| 5 | `.feed-item:hover`(main) vs `.glass-card:hover`(glass) | `(0,2,0)` vs `(0,2,0)` | **后者**（glass.css 后加载） | `.feed-item.glass-card:hover` `(0,3,0)` |
| 6 | `.nav-links a`（显示） vs `.site-header .nav-theme-link`（隐藏） | `(0,2,2)` vs `(0,3,1)` | **后者**（b 位 3 > 2） | 后者天然更高；源注释把前者记作 `(0,2,1)`（漏算 `a`），但结论正确 |
| 7 | `.site-nav .nav-about{margin-left:auto}` vs 胶囊布局 | `(0,2,0)` vs `(0,3,1)` | 后者 | `html[data-glass] .nav-links .nav-about` |
| 8 | `.post` 背景 vs 风格系统的正文策略 | `(0,1,0)` vs post.css 后加载 | 需 `html[data-glass]` 前缀 | `html[data-glass="liquid"] .post` `(0,2,1)` |

#### 7.7.2 ⚠️ 一处源码注释本身是错的（已实测验证）

`glass-overrides.css:44-45` 的注释声称：

> 库的 `.glass-card:hover` **(0,1,0)** 被 main.css 的 `.feed-item:hover` **(0,2,0)** 压掉，补同级规则恢复玻璃悬停效果

**这个说法不成立**，有两处问题：

1. `.glass-card:hover` 的特异性是 `(0,2,0)`（1 个类 + 1 个伪类），不是注释里写的 `(0,1,0)`——注释漏算了 `:hover`。
2. 把 `.glass-card:hover` 的正确值 `(0,2,0)` 代回去，它和 `.feed-item:hover` 的 `(0,2,0)` **完全相等**——此时决定胜负的不是特异性，而是**样式表的加载顺序**。`head.html:34` 先加载 `main.css`、`:35` 后加载 `glass.css`，所以**后者的 `.glass-card:hover` 才是赢家**，与注释的结论正好相反。

实测验证（Firefox 无头模式，构造两个同特异性规则 + 同款 `<link>` 顺序）：

```
a.css:  .feed-item  { box-shadow: rgb(1,1,1) 0 0 0 0; }
b.css:  .glass-card { box-shadow: rgb(2,2,2) 0 0 0 0; }
文档顺序: a.css → b.css
计算结果: RESULT=rgb(2, 2, 2) 0px 0px 0px 0px   ← 后加载者胜
```

**实际后果**：`glass-overrides.css:46-52` 的 `.feed-item.glass-card:hover` 与 `glass.css:136` 的 `.glass-card:hover` **属性值逐字节相同**，所以在 liquid 模式下它是**冗余规则**——删掉它渲染结果不变。

**但它在 solid 模式下是必需的**（见 8.4）：solid 下 `html[data-glass="solid"] .glass-card:hover`（`(0,3,1)`）会把悬停效果清空，需要 `html[data-glass="solid"] .feed-item.glass-card:hover`（`(0,4,1)`）单独补回那种轻微的 `0 2px 8px` 阴影。所以**这条 liquid 规则不要删**——它是从"作者误判"里长出来的，但配合 solid 的分支构成了一套完整的三态处理。

> 这也说明一件事：**阅读本项目 CSS 时不能全信注释**。若某条注释描述的机制与级联规则冲突，以级联规则为准，并顺手修掉注释。

#### 7.7.3 三条实用原则

**原则 1：当你要覆盖一个"后加载的同特异性规则"时，需要提高一级特异性。**

典型是 #4：`post.css` 要压过 `glass-overrides.css`，但两者同为 `(0,2,1)`，正常情况下后加载的赢——但 `post.css` 也在 `glass-overrides.css` **之后**加载（`head.html:37` 在 `:36` 之后），所以它能赢。**但这是一个隐性依赖**：如果有人把 `post.css` 挪到 `glass-overrides.css` 之前，标题卡的圆角会突然变成 8px。

**原则 2：不要在一个"看起来无害"的选择器里写视觉属性。**

典型是 #1。`.post-list li` 只是想要 `padding`，但顺手写 `background` 就会杀掉玻璃效果。

**原则 3：看到 `html[data-glass]` / `html[data-theme]` 前缀，先找它想压过谁。**

这两个前缀的唯一用途就是"从 `(0,1,x)` 提到 `(0,2,x)`"。**它们不是用来做"仅在玻璃模式下生效"的条件判断的**——虽然看起来像。判断某个规则是否受风格影响，应该看 `html[data-glass="..."]` 的具体值（`liquid`/`frost`/`solid`），而不是看有没有 `html[data-glass]`。

#### 7.7.4 `!important` 的使用情况

全项目只有 **3 行** `!important`（`glass-overrides.css:78`、`:79`、`:792`），全部集中在 `prefers-reduced-motion` 块中。这是合理的：无障碍兜底必须无条件获胜。**除此之外没有滥用**——这是一个健康的信号，说明特异性都通过结构解决了。

---

## 8. 视觉风格系统：liquid / frost / solid

### 8.1 三态定义

| 值 | 名称 | 视觉特征 |
| --- | --- | --- |
| `liquid` | 液态 | 扫光动画 + 色散边缘 + 呼吸高光 + 悬停上浮（默认） |
| `frost` | 模糊 | 纯高斯模糊，无动画无阴影无描边 |
| `solid` | 纯色 | 完全还原"最初的白卡片"——无模糊无动画 |

驱动方式：`<html data-glass="...">`。

### 8.2 liquid —— 默认态，无需覆盖

liquid 就是 `glass.css` + `glass-overrides.css` 第二章的自然结果。**没有任何 `html[data-glass="liquid"]` 的"启用"规则**，只有"禁用其他东西"的规则（比如 7.5 里的正文策略）。

这是一个好的设计：默认值不产生代码，只有偏离默认才产生代码。

### 8.3 frost —— 纯模糊

```css
html[data-glass="frost"] .glass {
  background: var(--frost-nav-bg);      /* 覆盖库的两层渐变（含 background-size 复位） */
  -webkit-backdrop-filter: blur(10px);  /* 纯模糊，去掉 saturate/brightness */
  backdrop-filter: blur(10px);
  box-shadow: none;                     /* 去描边环 / 内高光 / 深度投影 */
  animation: none;                      /* 去扫光 */
}

/* 去呼吸高光、色散边缘、顶部亮线 */
html[data-glass="frost"] .glass::before,
html[data-glass="frost"] .glass::after,
html[data-glass="frost"] .glass-card::before,
html[data-glass="frost"] .glass-card::after { content: none; }
```

**⚠️ 用 `content: none` 而不是 `display: none`** 清除伪元素。这是有讲究的：`display: none` 会让伪元素仍然存在于布局计算中（在某些浏览器上），而 `content: none` 是"这个伪元素不存在"的标准表达。虽然实践中两者效果类似，但 `content: none` 更语义化。

**⚠️ 关于 `background-size` 的注释**："覆盖库的两层渐变（含 background-size 复位）"。原因是 `.glass` 在 vendor 里写了 `background-size: 200% 100%, 100% 100%`，这是为扫光动画准备的（第一个渐变宽度是容器的 2 倍）。当 frost 把 `background` 换成单层纯色时，`background-size` 的两个值会**错位匹配**到新的背景层上——单层背景只会取第一个值 `200% 100%`，导致纯色背景被拉伸成 2 倍宽，视觉上不正常。虽然这个例子里纯色拉伸看不出差别，但这是一个**真实的隐患**，注释作者的细心值得记录。

frost 模式下的模糊半径是**分级的**：

| 元素 | 桌面 | 移动端 |
| --- | --- | --- |
| `.glass`（导航） | `10px` | `8px` |
| `.glass-card` | `8px` | `6px` |

移动端降低模糊半径是**性能考虑**：`backdrop-filter` 在移动 GPU 上开销显著，每个卡片都要重采样背景。

### 8.4 solid —— 还原最初形态

solid 的目标是"回到没有玻璃系统的样子"：

```css
html[data-glass="solid"] .site-header.glass {
  background: var(--card);      /* 还原白色吸顶头 */
  border-radius: 0;             /* 原头部是通栏直角，无圆角 */
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  animation: none;
}

html[data-glass="solid"] .glass-card {
  background: var(--card);      /* 还原 .card 白底 */
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: none;
  transition: box-shadow 0.2s;  /* 还原 main.css 原始悬停过渡 */
}

html[data-glass="solid"] .glass-card:hover { transform: none; box-shadow: none; }

/* feed 卡片保留原始轻微悬停阴影（同 main.css .feed-item:hover） */
html[data-glass="solid"] .feed-item.glass-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
```

**⚠️ 最后那条规则的注释值得注意**："feed 卡片保留原始轻微悬停阴影"。为什么 solid 下卡片悬停要特殊处理？

因为 `main.css:274-276` 本来就有 `.feed-item:hover { box-shadow: 0 2px 8px … }`。在 liquid 模式下，`glass.css` 的 `.glass-card:hover` 会盖住它（同 `(0,2,0)`、后加载，见 7.7.1 #5）——所以 liquid 下 feed 卡片得到的是**玻璃悬停**。而 solid 模式下 `html[data-glass="solid"] .glass-card:hover`（`(0,2,1)`）把悬停效果**清空**了，如果不补回这一条，feed 卡片就完全失去悬停反馈——比 liquid 和 frost 还"素"。所以这条规则正是为了让三种模式在"悬停"这个维度上保持一致性。

（特异性账本：`glass-overrides.css:46-52` 那条无风格限定的 `.feed-item.glass-card:hover` 是 `(0,3,0)`，低于 solid 清空规则的 `html[data-glass="solid"] .glass-card:hover` `(0,3,1)`——因为**比较特异性时 `b` 位先于 `c` 位**，(0,3,1) > (0,3,0)。所以那条规则在 solid 下确实被清空，必须再叠一层 `html[data-glass="solid"]` 把特异性提到 `(0,4,1)` 才能把轻微阴影补回来。）

**solid 模式的导航形态**完全不同于 liquid/frost：

| | liquid / frost | solid |
| --- | --- | --- |
| 定位 | `position: fixed` 悬浮胶囊 | `position: sticky` 通栏 |
| 宽度 | `fit-content`（内容决定） | 100% 通栏 |
| 圆角 | `9999px` 胶囊 | `0` 直角 |
| 滚动收缩 | 有 | **无** |
| 移动端 | 汉堡面板 | 换行通栏 |
| `body` 顶部留白 | `padding-top: 88px` | 无 |

正因为差异如此之大，`glass-overrides.css` 里所有胶囊导航规则都**严格限定**在 `html[data-glass="liquid"]` 和 `html[data-glass="frost"]` 之下。文件里的注释写得很明确：

> solid 模式刻意保持「通栏直角白条」，故胶囊规则一律以 `html[data-glass="liquid"]` / `[data-glass="frost"]` 限定。JS 只负责切 `.is-shrunk`，风格隔离与降级全部由 CSS 承担。

**最后这句话是理解整个架构的钥匙**：JS 不做风格判断，CSS 全权负责隔离。所以 `nav-shrink.js` 在 solid 模式下**照样会切 `.is-shrunk` 类**，只是没有任何 CSS 规则响应它。这是"关注点分离"的教科书式应用。

---

## 9. 颜色主题系统：light / dark / auto

### 9.1 双轴状态机

视觉风格和颜色主题是**两个正交的轴**：

```
                    light        dark         auto(→解析)
liquid       data-glass="liquid" data-theme="light"/"dark"
frost    ×   data-glass="frost"
solid        data-glass="solid"
```

两个轴由两个独立的 JS 模块管理（`glass-style.js` / `glass-theme.js`），各自维护自己的 localStorage 键（`glass-style` / `glass-theme`），互不干扰。

### 9.2 为什么 CSS 里没有 `prefers-color-scheme`

这是本项目一个**非常关键且反直觉**的设计决定。`main.css:52-53` 的注释：

> 触发由 head 内联脚本 + glass-theme.js 解析（localStorage 'glass-theme' 显式选择优先，'auto' 用 matchMedia 跟随系统）；CSS 不用 `prefers-color-scheme` 媒体查询，避免"系统深色 + 手动浅色"冲突

**问题的本质**：如果 CSS 里有 `@media (prefers-color-scheme: dark) { … }`，那么在"系统是深色 + 用户手动选了浅色"的情况下，媒体查询会匹配，深色样式会生效——用户的显式选择被系统偏好覆盖了。这对"手动选择"这个功能是致命的。

**解决方案**：把 `auto` 在 JS 层就**解析成具体值**再写入 DOM。

```js
function resolve(choice) {
  if (choice === 'auto') { return (mql && mql.matches) ? 'dark' : 'light'; }
  return choice;
}
function apply(choice) {
  root.dataset.theme = resolve(choice);   /* ← DOM 里永远只有 light 或 dark */
  …
}
```

于是 CSS 只需要关心两个值：

```css
:root { /* 浅色令牌 */ }
html[data-theme="dark"] { /* 深色令牌覆盖 */ }
```

**代价**：`auto` 模式下，用户选择（`auto`）和解析结果（`light`/`dark`）是两个不同的值。`apply()` 里按钮态按**用户选择**判断（`buttons[i].getAttribute('data-theme') === choice`），而 DOM 属性按**解析值**写。这就解释了 `glass-theme.js` 里为什么要单独维护一个 `current` 变量：

```js
var current = 'auto';   /* 当前用户选择（含 auto） */
…
function setTheme(choice) {
  current = choice;
  apply(choice);        /* apply 内部 resolve，DOM 得到具体值 */
  localStorage.setItem('glass-theme', choice);   /* 存的是用户选择，不是解析值 */
}
```

`current` 还必须被 `mql` 的 change 监听器读到：

```js
var onChange = function () { if (current === 'auto') { apply('auto'); } };
```

**注意这里没有调用 `setTheme`，而是直接 `apply`**——因为系统偏好变化不应该写入 localStorage（用户的选择没变，还是 `auto`）。注释明确写了："仅此处写 localStorage，系统变化不写"。

### 9.3 深色模式的视觉处理

深色令牌有一个特殊的地方——**页面背景不是纯色/渐变，而是一张图片加遮罩**：

```css
html[data-theme="dark"] {
  --body-bg-image:
    linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)),   /* 半透明黑遮罩（75%） */
    url("/assets/bg-dark.jpg");
}
```

**注意注释与实际值的偏差**：注释写"半透明黑遮罩（75%）"，但实际值是 `0.45`（45%）。这是一处**注释与代码不符**（见 18.8）。0.45 才是实际生效的不透明度。

代码里还保留了被注释掉的**纯渐变方案**（`main.css:68-75`）：

```css
/*--body-bg-image:
  radial-gradient(900px 520px at 90% -60px, rgba(64, 120, 255, 0.14), transparent 62%),
  radial-gradient(760px 420px at -40px 60px, rgba(64, 120, 255, 0.09), transparent 60%),
  linear-gradient(170deg, #0d1220 0%, #10151f 28%, #0f1522 52%, #10151f 78%, #0d1220 100%);*/
```

同样，浅色模式也保留了对应的渐变方案（`main.css:122-128`）。这些是历史版本，留着可能是为了将来切换回去。**如果 `bg.jpg` 或 `bg-dark.jpg` 丢失/变大，可以直接取消注释这两块，无需图片资源。** 这是一个有用的应急开关。

### 9.4 深色模式的覆盖范围

`html[data-theme="dark"]` 覆盖了全部 **3 组令牌共 30 个变量**（`main.css:56-103`，与 `:root` 的 30 个一一对应）。逐个检查一遍会发现一个规律：**浅色值多是"纯色"，深色值多是"提亮/压暗 30-50% 的变体"**，并且对比度关系保持一致。

几个值得注意的：

| 令牌 | 浅色 | 深色 | 变化逻辑 |
| --- | --- | --- | --- |
| `--blue` | `#0084ff` | `#3d9bff` | **提亮**。深色背景上 `#0084ff` 对比度不足（约 3.2:1），提亮后达到约 5.5:1 |
| `--mark-bg` | `#ffde67` | `#6b5d14` | **大幅压暗**。亮黄高亮在深色页面会很刺眼，改成橄榄色 |
| `--mark-text` | `#080a10` | `#f2e7b8` | 与 `mark-bg` **反转**（深字浅底 → 浅字深底） |
| `--code-bg` | `#fafbfc` | `#1e242c` | 注意深色值比 `--card`(`#181d24`) **亮一点**，让代码块在卡片内可辨识 |

---

## 10. 悬浮胶囊导航

这是本项目**技术含量最高**的部分。只在 liquid / frost 下生效。

### 10.1 形态

```
静止态（页面顶部）                     收缩态（下滚 >50px）
┌─────────────────────────────────┐              ╭──────────────╮
│ ⬤ 张麦轩   文章  标签  关于  主题 │   ──滚动──▶  │ ⬤  主题      │
└─────────────────────────────────┘              ╰──────────────╯
  top: 20px  padding: 8px 16px                    top: 12px  padding: 6px 12px
  圆角 9999px，宽度随内容                     头像 26→20px，文字与链接折叠
```

### 10.2 定位方案

```css
html[data-glass="liquid"] .site-header.glass,
html[data-glass="frost"]  .site-header.glass {
  --nav-pill-top: 20px;
  --nav-pill-top-shrunk: 12px;
  --nav-pad-y: 8px;
  --nav-pad-x: 16px;
  --nav-pad-y-shrunk: 6px;
  --nav-pad-x-shrunk: 12px;
  --nav-ease: cubic-bezier(0.25, 1, 0.5, 1);
  --nav-dur: 0.5s;
  --nav-dur-fast: 0.35s;

  position: fixed;
  top: var(--nav-pill-top);
  left: 50%;
  transform: translateX(-50%);
  width: fit-content;
  max-width: calc(100vw - 32px);
  --gr-radius: 9999px;
  border-bottom: none;
  transition: top var(--nav-dur) var(--nav-ease);
}
```

**几个关键决定**：

1. **`left: 50%` + `transform: translateX(-50%)`** 是经典的绝对居中。为什么不用 `margin: 0 auto`？因为 `.site-header` 是 `position: fixed`，`margin: auto` 对 `fixed` 元素在有确定宽度时才有效，而这里是 `fit-content`。用 `transform` 更可靠。

2. **`width: fit-content`** 是收缩动画的基础。胶囊的宽度**由内容决定**——当链接折叠后内容变窄，宽度自然收缩，不需要 JS 计算宽度。这比固定宽度方案优雅得多。

3. **`max-width: calc(100vw - 32px)`** 防止内容过宽时溢出视口。

4. **`--gr-radius: 9999px`** 的真胶囊方案。注释解释了为什么不用固定的 `50px`：
   > 真胶囊（等效需求里的 50px，内容变高也不破）；`.glass::before/::after` 用 `inherit`，扫光与色散边缘自动跟随圆角

   因为 `glass.css` 里的伪元素用的是 `border-radius: inherit`，所以只要改父元素变量，装饰层自动跟随。

5. **`border-bottom: none`** 压过文件上方 `:30-37` 给 `.site-header.glass` 加的 `border-bottom: 1px solid var(--border)`（那是给 solid/sticky 形态用的）。

6. **`transition` 只过渡 `top`**。注释：
   > 只过渡 top：`backdrop-filter` 与 `transform` 同时动画会触发背景重采样瑕疵；这里只动一个 fixed 元素的 top，开销可忽略

   **这是很重要的一条性能/画质经验**。`backdrop-filter` 的元素在做 `transform` 动画时，浏览器需要对每一帧重新采样背景（因为模糊区域在移动），会产生可见的瑕疵（边缘抖动、模糊渗色）。而只改 `top` 不产生新的层叠上下文，重采样问题轻得多。

   同时注意：**`transform: translateX(-50%)` 本身是静态的**，不参与过渡，所以也不会有这个问题。如果当初写成 `transform: translate(-50%, -8px)` 来做收缩，就会踩坑。

### 10.3 内层压缩

```css
html[data-glass="liquid"] .site-header .site-nav,
html[data-glass="frost"]  .site-header .site-nav {
  max-width: none;      /* 压过 main.css 的 1000px 通栏布局 */
  margin: 0;
  min-height: 0;        /* 压过 main.css 的 56px */
  gap: 0;               /* 间距改由子元素 margin 控制 */
  padding: var(--nav-pad-y) var(--nav-pad-x);
  transition: padding var(--nav-dur) var(--nav-ease);
}
```

**⚠️ `gap: 0` 的原因值得记录**：

> 间距改由子元素 `margin` 控制：`gap` 的过渡在旧 Safari 上不可靠

`gap` 从 28px 过渡到 0 在 Safari 上会跳变（不插值）而不是平滑过渡。改用子元素的 `margin` 就正常了。所以你会看到 `.brand { margin-right: 16px }` 和 `.nav-links a { margin: 0 6px }` 这种写法——它们本可以用 `gap` 简化，但为了动画兼容性放弃了。

### 10.4 文字折叠

```css
.brand-text {
  display: inline-block;
  max-width: 8rem;
  white-space: nowrap;
  overflow: hidden;
  opacity: 1;
  visibility: visible;
  transition: max-width var(--nav-dur, 0.5s) var(--nav-ease, ease),
              opacity var(--nav-dur-fast, 0.35s) var(--nav-ease, ease),
              visibility 0s 0s;
}

html[data-glass="liquid"] .site-header.is-shrunk .brand-text,
html[data-glass="frost"]  .site-header.is-shrunk .brand-text {
  max-width: 0;
  opacity: 0;
  transition: max-width var(--nav-dur) var(--nav-ease),
              opacity var(--nav-dur-fast) var(--nav-ease),
              visibility 0s var(--nav-dur);   /* ← 延迟 0.5s */
  visibility: hidden;
}
```

**四个精妙之处**：

1. **用 `max-width` 折叠而不是 `width`**。注释：
   > 用 `max-width` 折叠（可过渡），而非 `width:0`（auto→0 不可过渡）

   CSS 无法对 `width: auto` 做过渡（`auto` 不是可插值的关键字）。`max-width` 有确定值（`8rem`），可以插值到 `0`。

2. **`white-space: nowrap` + `overflow: hidden`** 缺一不可。没有 `nowrap`，"张麦轩"三个字会在 `max-width` 缩小时逐字换行成竖排；没有 `overflow: hidden`，文字会溢出到 `max-width` 之外。

3. **`visibility` 的延迟切换**。注释：
   > `visibility` 延后到淡出播完再翻转：既不截断动画，又把元素移出 Tab 焦点序列（`opacity:0` 的元素仍可被聚焦）

   **这是全项目最细致的一个细节**。`opacity: 0` 的元素**仍然可以被键盘 Tab 聚焦**——用户在收缩态的导航里按 Tab，焦点会落到一个看不见的"张麦轩"链接上，体验极差。`visibility: hidden` 会移出焦点序列，但如果立即切换，`opacity` 的淡出动画会被打断（因为 `visibility: hidden` 的元素不渲染）。

   解决方案：`transition: visibility 0s var(--nav-dur)`——**延迟 0.5 秒后瞬间（0s）切换**。展开时是 `visibility 0s 0s`（立即显示，让淡入可见）。

4. **`transition` 必须完整重写**。CSS 的 `transition` 是整体替换而非合并的，所以展开态和收缩态都要写出完整的 `transition`，不能只写变化的属性。这一点在导航链接的规则里也被注释强调：

   ```css
   /* 折叠过渡与悬停过渡必须写在同一条 transition 里，否则互相覆盖 */
   transition: max-width var(--nav-dur) var(--nav-ease),
               opacity var(--nav-dur-fast) var(--nav-ease),
               padding var(--nav-dur) var(--nav-ease),
               margin var(--nav-dur) var(--nav-ease),
               background 0.2s, color 0.2s,
               visibility 0s 0s;
   ```

   注意这里把 `background 0.2s, color 0.2s`（悬停过渡）也塞进了同一条 `transition`。如果不这样做，写两条 `transition` 声明的话后者会完全覆盖前者。

### 10.5 为 fixed 导航让出空间

```css
html[data-glass="liquid"] body,
html[data-glass="frost"]  body { padding-top: 88px; }

@media (max-width: 768px) {
  html[data-glass="liquid"] body,
  html[data-glass="frost"]  body { padding-top: 80px; }
}
```

**88px 的来历**：胶囊 `top: 20px`（桌面与移动端**同为 20px**，移动端没有覆盖 `--nav-pill-top`）+ 胶囊自身高度（`.site-nav` 的 `padding: 8px 16px` × 2 + 内容高度，桌面约 53px，因为 `.nav-links a` 有 `padding: 6px 12px`）+ 视觉间隙约 15px ≈ 88px。

移动端给的是 **80px**，差值来自两处：胶囊内容高度变为约 50px（`.nav-links` 已移入面板，高度由品牌头像 26px 与汉堡按钮 34px 决定），以及作者选择的间隙更紧（约 10px）。**这不是由 `--nav-pill-top` 决定的**——那个值两边都是 20px。改 `--nav-pill-top` 时必须同步调整这两个 `padding-top`。

**⚠️ 副作用**：`padding-top` 加在 `body` 上而非 `main` 上，所以页脚也受影响（页脚本来靠 `margin-top: 20px` 定位，这里不影响）。但如果将来把 `padding-top` 移到 `main` 上，需要重新核对所有页面的垂直节奏。

### 10.6 品牌下划线的移除

```css
html[data-glass="liquid"] .site-header .brand.active,
html[data-glass="frost"]  .site-header .brand.active { border-bottom: none; }
```

`main.css:188-192` 的 `.site-nav a.active` 会给当前页加一条 2px 蓝色下划线。在胶囊里这条线太局促（而且品牌区已经有蓝色文字了），所以去掉。注释解释了替代的视觉语言：

> 头像 + 蓝色文字已足够表示「当前在首页」

---

## 11. JavaScript 运行时

### 11.1 四个模块的职责边界

| 文件 | 行数 | 职责 | 依赖 |
| --- | --- | --- | --- |
| `glass-style.js` | 34 | 写 `data-glass`，持久化 | 无 |
| `glass-theme.js` | 66 | 写 `data-theme`，持久化，监听系统偏好 | 无 |
| `theme-menu.js` | 60 | 桌面下拉菜单开合 | 无 |
| `nav-shrink.js` | 78 | 滚动收缩 + 汉堡面板 | 无 |

**"无依赖"是硬约束**——四个都是 IIFE，不共享状态，不互相调用。这样任何一个加载失败都不会连累其他（虽然实际上它们都是同源同目录的静态文件，一起失败的概率更高）。

### 11.2 共同的架构模式

四个模块都遵循同一套模板：

```js
(function () {
  'use strict';

  // ① 元素获取 + 早退
  var el = document.getElementById('xxx');
  if (!el) { return; }         /* 元素不存在则不做事 */

  // ② 状态机：单一状态源
  function isOpen() { return el.classList.contains('open'); }
  function setOpen(open) { el.classList.toggle('open', open); /* 同步 aria */ }

  // ③ 事件委托：document 级
  document.addEventListener('click', function (e) { … });

  // ④ 键盘支持：Esc 关闭 + 焦点归还
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { … } });

  // ⑤ 媒体查询变化响应
  var mq = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;

  // ⑥ 初始化
})();
```

**几个共同的设计决定**：

**（1）状态存在 DOM 类名上，不存 JS 变量。**

`nav-shrink.js` 用 `header.classList.contains('nav-open')` 判断菜单状态（唯一的例外是 `shrunk` 有 JS 变量，因为迟滞判断需要记住上一次的状态）。这样做的好处是：**CSS 和 JS 共享同一个"真相"**，不会出现 JS 以为开着、CSS 没显示的不一致。

**（2）事件委托到 `document`。**

即使按钮是在 DOM 就绪后才动态插入的（虽然本项目没有这种场景），委托也能工作。代码里的写法：

```js
document.addEventListener('click', function (e) {
  var btn = e.target && e.target.closest ? e.target.closest('button[data-style]') : null;
  if (btn) { setStyle(btn.getAttribute('data-style')); }
});
```

**⚠️ `e.target.closest` 的存在性检查**是必要的：点击可能落在文本节点或 SVG 元素上，而极老的浏览器（IE）没有 `closest`。这个 `&&` 短路是廉价的安全网。

**（3）`aria-pressed` 与 `.active` 类同步。**

```js
var buttons = document.querySelectorAll('button[data-style]');
for (var i = 0; i < buttons.length; i++) {
  var on = buttons[i].getAttribute('data-style') === name;
  if (on) { buttons[i].classList.add('active'); }
  else    { buttons[i].classList.remove('active'); }
  buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
}
```

**关键点**：`querySelectorAll` 是**全文档**查询，而不是限定在某个容器内。这就是为什么"导航里的主题菜单"和"/theme/ 页的分段控件"能自动保持同步——它们操作的是同一组 DOM（因为菜单和页面控件不共存于同一个视口，但**在同一个文档里**）。

实际上这是个重要细节：桌面端打开 `/theme/` 页面时，导航里有主题菜单按钮，页面里也有分段控件按钮。点击任一处，**两边都会同步高亮**。这不是巧合，是 `querySelectorAll` 全文档查询的直接结果。

### 11.3 nav-shrink.js 的迟滞算法

这是四个模块里唯一有"算法"的：

```js
var SHRINK_AT = 50;    /* 下滑超过 50px → 收缩 */
var EXPAND_AT = 40;    /* 回到 40px 以内 → 展开（迟滞区间） */
var shrunk = false;
var ticking = false;

function update() {
  ticking = false;
  var y = window.pageYOffset || document.documentElement.scrollTop || 0;
  var next = shrunk ? (y > EXPAND_AT) : (y > SHRINK_AT);
  if (next === shrunk) { return; }
  shrunk = next;
  header.classList.toggle('is-shrunk', shrunk);
  if (shrunk && header.classList.contains('nav-open')) { setMenu(false); }
}

window.addEventListener('scroll', function () {
  if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
}, { passive: true });
```

**（1）迟滞（hysteresis）而非防抖**

注释一针见血：

> 迟滞：收缩/展开用不同阈值，避免 y 停在 50px 附近时来回抽搐。比防抖更好——防抖会让收缩延迟到停止滚动之后才发生，观感是「停下来才突然瘪掉」

这是**控制论里的施密特触发器**思想在 UI 里的应用。用单一阈值 `50px` 的话，当滚动位置恰好在 50 附近波动（比如惯性滚动的尾巴、或者用户缓慢拖动），状态会高频翻转，视觉上就是"抽搐"。

防抖（debounce）能解决抽搐，但代价是：**滚动过程中不响应，必须停下来才触发**。用户体验变成"滚着滚着停住了，导航才突然瘪一下"。

迟滞方案：**收缩阈值 50px、展开阈值 40px**。中间 10px 是不敏感区。实际效果：向上滚到 45px 时不会展开（因为 45 > 40），要继续滚到 40 以下才展开。既有即时响应，又不会抽搐。

**（2）rAF 节流**

`scroll` 事件在滚动时**每帧可能触发多次**（不同浏览器策略不同，Chrome 约每 16ms 一次但有时更密）。如果每次都执行 `update()`，会有大量重复计算。

rAF 节流的模式是：设一个 `ticking` 标志，第一次触发时置 `true` 并请求下一帧；后续触发直接跳过；帧回调里把 `ticking` 置回 `false`。

```js
if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
```

**为什么用 rAF 而不是 `setTimeout`？** 因为 rAF 回调在浏览器的**渲染时机**执行，与绘制同步。用 `setTimeout(fn, 16)` 会与渲染时机错位，可能在一帧内触发两次或在两帧后才触发。

**（3）`{ passive: true }`**

```js
window.addEventListener('scroll', handler, { passive: true });
```

告诉浏览器"这个处理器不会调用 `preventDefault()`"。浏览器因此**不需要等待处理器执行完**就知道滚动不需要被取消，可以直接滚动。这对滚动的流畅度有明显提升（尤其在移动端）。

**⚠️ 一旦声明 `passive: true` 就不能再调 `preventDefault()`**（会静默失败并打印控制台警告）。这里没有调用，安全。

**（4）收缩时自动收菜单**

```js
if (shrunk && header.classList.contains('nav-open')) { setMenu(false); }
```

注释：
> 收缩时若移动端面板开着，一并收起，避免「瘪胶囊 + 展开面板」的怪状态

**（5）首屏同步**

```js
update();   /* 文件末尾 */
```

注释：
> 首屏即已滚动（刷新保留滚动位置 / 锚点跳转）时立即同步一次状态

如果不调用这一次，用户刷新一个已经滚到一半的页面时，导航会先以展开态出现，直到用户第一次滚动才收缩。**这是一个容易被遗忘但很重要的初始化调用**——注意它是在**事件监听器注册之后**调用的，顺序正确。

### 11.4 移动端汉堡面板的交互细节

```js
/* 点击面板外关闭；点面板内链接后关闭 */
document.addEventListener('click', function (e) {
  if (!isMenuOpen()) { return; }
  if (toggle && toggle.contains(e.target)) { return; }   /* 交给上面的 toggle 处理 */
  if (header.contains(e.target)) {
    if (e.target.closest && e.target.closest('.nav-links a')) { setMenu(false); }
    return;
  }
  setMenu(false);
});
```

**三条分支的逻辑**：

1. **点击汉堡按钮本身** → 提前返回，因为 `toggle` 的 `click` 监听器已经处理了（如果这里也处理，会"切换两次"导致状态不变）。
2. **点击 header 内但不是链接**（比如品牌区、主题菜单）→ 不关闭（`return`），因为用户可能是在操作其他控件。
3. **点击 header 外** → 关闭。

**⚠️ 这里有一个潜在问题**：在 liquid/frost 的移动端，`.nav-links` 是 `.site-header` 的**后代**（DOM 上确实是），所以点击面板内的空白区域会走分支 2（不关闭）。这是符合预期的。但如果将来把面板移到 header 之外（比如用 Portal 模式），逻辑需要相应调整。

**Esc 关闭 + 焦点归还**：

```js
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && isMenuOpen()) {
    setMenu(false);
    if (toggle) { toggle.focus(); }
  }
});
```

**焦点归还是无障碍的基本要求**（WCAG 2.4.3）。菜单关闭后如果焦点丢失（回到 `<body>`），键盘用户需要重新 Tab 整个页面才能回到汉堡按钮。显式 `focus()` 到触发元素是标准做法。

**媒体查询变化时关闭**：

```js
if (menuMq) {
  var onMqChange = function () { if (!menuMq.matches) { setMenu(false); } };
  if (menuMq.addEventListener) { menuMq.addEventListener('change', onMqChange); }
  else if (menuMq.addListener) { menuMq.addListener(onMqChange); }   /* 旧版 Safari */
}
```

**注意 `addEventListener` / `addListener` 的双分支**。旧的 `MediaQueryList.addListener` 已被废弃（Safari 14 之前必须用它），新标准是 `addEventListener('change')`。同样的模式在 `glass-theme.js:54-55` 也出现了。

**窗口从移动端拉到桌面端时**（`!menuMq.matches`），面板被 CSS 隐藏了（因为 `.nav-links` 在 `@media (min-width: 769px)` 下恢复为 `inline-flex`），但 `header.nav-open` 类还在。虽然视觉上看不出问题，但残留的类名是状态污染。主动清理掉是正确的。

### 11.5 theme-menu.js

结构与 nav-shrink 的菜单部分几乎一致，但有一个额外的关键点：

```js
document.addEventListener('click', function (e) {
  if (!isOpen()) { return; }
  if (menu.contains(e.target)) {
    if (e.target.closest && e.target.closest('button[data-style], button[data-theme]')) {
      setOpen(false);   /* 选了选项 → 关闭菜单 */
    }
    return;
  }
  setOpen(false);
});
```

**选择器用逗号连接两个条件**（`button[data-style], button[data-theme]`），一条 `closest()` 同时匹配风格按钮和主题按钮。

**注意：这里没有阻止事件冒泡**。`glass-style.js` 和 `glass-theme.js` 的监听器也挂在 `document` 上，它们会在同一个事件里各自触发。三个监听器的执行顺序由注册顺序决定（`head.html` 里的 script 标签顺序：`glass-style` → `glass-theme` → `theme-menu` → `nav-shrink`），但因为它们操作的是不同的状态，顺序无关紧要。

**⚠️ 一个交互细节**：`theme-menu.js` 的 `setOpen(false)` 会在点击选项后关闭菜单。但因为没有阻止冒泡，`glass-*.js` 也会同时处理这次点击并切换主题。这是**期望行为**——用户既想切换主题，也想关闭菜单。

---

## 12. 响应式设计

### 12.1 断点

全站只有**三个**媒体查询断点（外加一组 `@supports` 和一组 `prefers-reduced-motion` 条件）：

| 断点 | 位置 | 用途 |
| --- | --- | --- |
| `max-width: 768px` | 多处 | 主断点：布局、导航形态、模糊半径 |
| `max-width: 1360px` | `glass-overrides.css:400` | 主题菜单子菜单展开方向 |
| `min-width: 769px` | 多处 | 与 `max-width: 768px` 互斥的另一半 |

**768px 是唯一的"结构断点"**——跨过它，导航形态发生根本变化（胶囊 → 汉堡面板，或通栏 → 换行）。

### 12.2 768px 以下的完整变化清单

| 项目 | ≥769px | ≤768px |
| --- | --- | --- |
| `body` 背景 | `background-attachment: fixed` | `scroll`（iOS 不支持 fixed） |
| `.home` 栅格 | `minmax(0,1fr) 296px` | `1fr`（单栏） |
| `.home-side` | `sticky, top: 76px` | `static` |
| `.avatar` | 88×88 | 64×64 |
| `.name` | `1.625rem` | `1.375rem` |
| `.post` padding | `40px 48px 48px` | `24px 20px` |
| `.post-header` padding | `32px 48px 28px` | `24px 20px 20px` |
| `.site-nav`（solid） | 单行 `gap: 28px` | `flex-wrap: wrap` |
| 导航链接（liquid/frost） | `.nav-links` inline-flex，滚动折叠 | 汉堡面板 |
| 主题菜单 | 显示（`.theme-menu`） | 隐藏 |
| 「设置」链接 | 隐藏 | 显示（面板内） |
| `.nav-switches` | 隐藏 | 隐藏（元素已移除） |
| 玻璃模糊（frost） | nav 10px / card 8px | nav 8px / card 6px |
| `body padding-top` | 88px | 80px |

### 12.3 1360px 断点的来历

```css
/* 窄桌面（≤1360px）：子菜单改向左展开，避免超出视口右缘
   （数学：面板右缘=(视口+1032)/2，子菜单 152px 需视口≥1342px 才右展） */
@media (max-width: 1360px) {
  .theme-menu-sub { left: auto; right: 100%; }
}
```

**这个数字是怎么算出来的？**

核心约束是**子菜单向右展开时不能超出视口右缘**：

```
子菜单右边缘 = 导航右边缘 + 152px  ≤  视口宽度 W
```

其中 152px 来自 `min-width: 9.5rem`（`left: 100%` 使子菜单左边缘贴着触发器的右边缘，所以向右再占 152px）。

导航右边缘的位置分两种风格算：

**（a）liquid / frost —— 胶囊居中**

胶囊 `left: 50%; transform: translateX(-50%)`，宽度 `fit-content`。设胶囊宽度为 `P`，则右边缘 = `(W + P)/2`：

```
(W + P)/2 + 152 ≤ W   ⟹   W ≥ P + 304
```

源码注释取 `P ≈ 1032`，注释给出的门槛是 **1342**——注意这个数字与公式对不上（公式给 1336）。说明 P、1342 三者中至少有一个是估的，注释里也确实是按经验值写的。真正的断点定在 **1360**，比 1336 和 1342 都大，所以**有余量、是安全的**。

**（b）solid —— 通栏布局**

solid 下 `.site-header` 是 `sticky` 通栏，`.site-nav` 是 `max-width: 1000px`（`border-box`，含左右各 16px 内边距）居中。`.theme-menu` 在导航右端，其右边缘 ≈ `(W + 1000)/2 - 16`：

```
(W + 1000)/2 - 16 + 152 ≤ W   ⟹   W ≥ 1272
```

1272 < 1360，所以对 solid 来说，只要视口 > 1360px（即子菜单向右展开的区间），空间**永远够用**。

**结论**：1360px 这个阈值对两种布局都安全——liquid/frost 需要 ≥1336，solid 需要 ≥1272。唯一的代价是 solid 下在 1272~1360px 区间会"过早"向左展开，只是观感问题，不会溢出。

**⚠️ 仍然脆弱的点**：公式里的 `P ≈ 1032` 会随导航项数量变化。每多一个导航项，胶囊宽度约增加 60-70px（`padding: 6px 12px` + 文字 + `margin: 0 6px`）。如果导航项从 3 个增到 5 个，liquid/frost 的门槛会从 1336 升到约 1460，**这时 1360 就不够了，子菜单会溢出视口右缘**。所以新增导航项时要重算（见 19.3 第 4 步）。

---

## 13. 无障碍设计

### 13.1 ARIA 属性清单

| 元素 | 属性 | 值 | 维护者 |
| --- | --- | --- | --- |
| `.theme-menu-trigger` | `aria-haspopup` | `"menu"` | 静态 |
| `.theme-menu-trigger` | `aria-expanded` | `"true"/"false"` | `theme-menu.js` |
| `.theme-menu-panel` | `role` | `"menu"` | 静态 |
| `.theme-menu-panel` | `aria-labelledby` | `"theme-menu-trigger"` | 静态 |
| `.theme-menu-item` | `role="menuitem"` + `tabindex="0"` | — | 静态 |
| `.theme-menu-sub` | `role="group"` + `aria-label` | `"颜色模式选项"` / `"透明模式选项"` | 静态 |
| 风格按钮 | `aria-pressed` | `"true"/"false"` | `glass-style.js` |
| 主题按钮 | `aria-pressed` | `"true"/"false"` | `glass-theme.js` |
| `.nav-toggle` | `aria-label` | `"导航菜单"` | 静态 |
| `.nav-toggle` | `aria-expanded` | `"true"/"false"` | `nav-shrink.js` |
| `.nav-toggle` | `aria-controls` | `"nav-links"` | 静态 |
| `.glass-switch` / `.theme-switch` | `role="group"` + `aria-label` | `"视觉风格"` / `"颜色主题"` | 静态 |

### 13.2 装饰性元素的处理

```html
<span class="nav-toggle-bar" aria-hidden="true"></span>   <!-- 汉堡三条横线 -->
<span class="theme-menu-caret" aria-hidden="true">▸</span> <!-- 子菜单箭头 -->
```

SVG 图标全部带 `aria-hidden="true"`，可读文本放在旁边的 `<span>` 里：

```html
<a class="social-link" href="xxx" target="_blank" rel="noopener">
  <svg viewBox="0 0 24 24" aria-hidden="true">…</svg>
  <span>哔哩哔哩</span>
</a>
```

**⚠️ 品牌头像的 `alt=""`**：

```html
<img class="brand-avatar" src="/assets/images/avatar.jpg" alt="" width="26" height="26">
```

空 `alt` 是**正确**的——因为旁边的 `.brand-text` 已经提供了同样的信息（站点名）。如果写成 `alt="张麦轩"`，屏幕阅读器会读两遍。

**⚠️ 对比：`home.html` 的头像用了站点名做 `alt`**：

```html
<img class="avatar" src="{{ "/assets/images/avatar.jpg" | relative_url }}" alt="{{ site.title }}">
```

这里正确，因为旁边的 `<h1 class="name">` 是标题而非纯文本——不过严格说也重复了。属于可接受的范围。

### 13.3 焦点样式

```css
.theme-menu-trigger:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
.glass-switch button:focus-visible { outline: 2px solid var(--blue); outline-offset: 1px; }
```

**⚠️ 所有焦点样式都用了 `:focus-visible` 而不是 `:focus`**。这是现代最佳实践——`:focus-visible` 只在"键盘操作导致的聚焦"时匹配，鼠标点击时**不显示**焦点环。这样既保留了键盘可访问性，又避免了鼠标用户看到难看的轮廓。

**覆盖清单**（`grep focus-visible assets/css/*.css`，共 8 处）：

| 有自定义焦点环 | 无（回退到浏览器默认） |
| --- | --- |
| `.theme-menu-trigger`（`:316`） | **`.site-nav a`**（导航链接） |
| `.theme-menu-item`（`:360`、`:372`） | **`.social-link`**（社交链接） |
| `.theme-menu-sub button`（`:429`） | `.brand`（品牌链接） |
| `.glass-switch button` / `.theme-switch button`（`:135-136`） | `.pagination a` |
| `.nav-toggle`（`:753-754`，仅移动端 + liquid/frost） | |

也就是说，**导航栏和侧栏的主要链接都没有自定义焦点样式**，用户在浅色背景上按 Tab 会看到浏览器默认的深色轮廓。不算错误（可见即可用），但风格上与菜单控件不统一。

### 13.4 `prefers-reduced-motion`

全项目有 **3 处** `@media (prefers-reduced-motion: reduce)`：

| 位置 | 覆盖对象 |
| --- | --- |
| `glass-overrides.css:73-81` | `.glass` / `.glass-card` / `.glass-pill` 及其伪元素的 `animation` 和 `transition` |
| `glass-overrides.css:459-464` | `.theme-menu-panel` / `.theme-menu-sub` 的过渡 |
| `glass-overrides.css:782-794` | 胶囊导航的相关过渡（导航外壳、内层、头像、文字、链接、汉堡横线） |

**为什么需要三处而不是一处？**

因为**无障碍默认样式与动画的加载顺序**。如果把所有东西塞进一个 `@media` 块放在文件开头，后面 700 行的规则会以"同特异性、后加载"的方式覆盖掉 `animation: none`——除非用 `!important`。作者选择了分组放置 + `!important`（只在各自的分组内），这是一个务实的折中。

**⚠️ 注意玻璃装饰的动画没有被完全禁用**：`glass.css` 里的 `glass-shimmer`（扫光，8s）和 `specular-breathe`（呼吸高光，8s）是 `.glass` 和 `.glass::before` 的 `animation`。第一处 `@media` 块覆盖了它们（`.glass` 和 `.glass::before` 都在选择器列表里）。所以**是完整的**。

### 13.5 语义化 HTML

| 布局 | 使用的语义元素 |
| --- | --- |
| `default.html` | `<main class="container">` |
| `home.html` | `<section class="profile-card">`、`<article class="feed-item">`、`<aside class="home-side">` |
| `post.html` | `<article class="post-article">`、`<header class="post-header">`、`<time class="post-date">` |
| `posts.html` | `<ul class="post-list">`、`<nav class="pagination">` |
| `footer.html` | `<footer class="site-footer">` |
| `header.html` | `<header>`、`<nav>` |

**⚠️ 两处可以改进**：

1. `_layouts/posts.html` 的 `<h1>文章</h1>` 在 `<ul>` 之外，页面没有 `<article>` 包裹列表。可以接受。
2. `.nav-toggle` 的 `aria-label="导航菜单"` 是静态的，最好在打开时改成 "关闭导航菜单"（当前靠 `aria-expanded` 表达状态，也算合格）。
3. `<time>` 缺少 `datetime` 属性（见 18.10）。

---

## 14. 内容创作指南

### 14.1 新建一篇文章

**第 1 步**：在 `_posts/` 下创建文件，文件名格式 `YYYY-MM-DD-slug.md`：

```bash
_posts/2026-09-25-my-new-post.md
```

**第 2 步**：写 front matter：

```yaml
---
title: "文章标题"
d: "一句话摘要，会显示在首页卡片和文章列表里"
tag: [标签1, 标签2]
---
```

**可选字段**：

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 无（**必填**） | 显示在卡片和文章页 |
| `d` | string | 无 | 摘要。首页卡片和列表页会显示 |
| `tag` / `tags` | array | 无 | 两者等价（Jekyll 自动合并） |
| `layout` | string | `post`（由 defaults 提供） | 一般不用写 |

**⚠️ 关于 `d`**：这是**非标准字段**（不是 Jekyll 内置的 `description` 或 `excerpt`）。全站只有两处引用它：`home.html:20`（首页卡片）和 `post.html:15`（文章页标题卡）。写成 `description:` 不会报错但**不会显示**。

**第 3 步**：写正文（Markdown + Liquid）。

**第 4 步**：本地预览：

```bash
bundle exec jekyll serve --livereload
```

**第 5 步**：确认 URL。URL 由文件名决定：`_posts/2026-09-25-my-new-post.md` → `/2026/09/25/my-new-post/`。**改文件名等于改 URL**（旧链接会 404，没有重定向）。

### 14.2 日期陷阱

**⚠️ 这是最常见的"文章不显示"原因**：

Jekyll 会**忽略**所有日期晚于当前时间的文章。如果今天是 2026-09-22，你写了一篇 `_posts/2026-09-25-future.md`，它在本地不会出现——**不会有任何错误提示**。

解决方案：
- 用过去的日期写文件名；
- 或者临时在 `_config.yml` 加 `future: true`（会让未来文章也发布，但 GitHub Pages 上会立即公开）。

**⚠️ 时区问题**：Jekyll 默认用系统时区。GitHub Pages 构建机器用 UTC。所以"今天"的文章在 GitHub Pages 上可能因为时差被推迟一天发布。如果遇到文章在本地正常、线上不出现的情况，多半是这个原因。

### 14.3 数学公式

MathJax 已在 `head-custom.html` 配置好，支持四种定界符：

| 语法 | 模式 |
| --- | --- |
| `$...$` | 行内 |
| `\(...\)` | 行内 |
| `$$...$$` | 块级 |
| `\[...\]` | 块级 |

配置详情：

```js
MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$','$$'], ['\\[', '\\]']],
    processEscapes: true,
    processEnvironments: true
  },
  svg: { fontCache: 'global' }   /* 全局字体缓存：多个公式共享字形，减少体积 */
};
```

**使用示例**：

```markdown
单源最短路的时间复杂度为 $O((n+m)\log n)$。

$$
\forall u \in V,\; d(u) = \min_{v \in V} \{ d(v) + w(v,u) \}
$$
```

**⚠️ 五个注意事项**：

1. **`$` 定界符与美元符号（价格）冲突**。如果正文里要写 "$100"，必须写成 `\$100`（因为 `processEscapes: true`）。
2. **公式与 CSS 变量的关系**：`.post-content` 是 `color: var(--body-text)`，而 `post.css:266-268` 把 `.mjx-container` 也绑定到 `--body-text`，所以公式在深浅模式下自动跟随。**不要给公式单独指定颜色**。
3. **SVG 输出而非 CHTML**：`svg: { fontCache: 'global' }` 意味着公式会被渲染成 SVG。好处是字体渲染精确、不依赖系统字体；坏处是**公式内的文字不能被选中复制**（选中会得到 SVG 的 XML）。如果需要可复制的公式，需要改成 `chtml` 输出。
4. **`processEnvironments: true`** 支持 `\begin{align}...\end{align}` 等 LaTeX 环境。
5. **JSON 转义陷阱**：如果在公式里用了 `\` 开头的命令，在 Markdown 里写没问题，但如果写在 front matter 的 YAML 里需要加引号。

### 14.4 图片

```markdown
![alt 文本](/assets/in-posts/2026-5/data.png)
```

**推荐做法**：按月份建子目录（`assets/in-posts/2026-5/`）——这是仓库里已有的惯例。

**⚠️ 路径必须以 `/` 开头**（绝对路径），因为文章的 URL 是深层路径（`/2026/09/25/slug/`），相对路径会解析错误。

**⚠️ 图片样式**：`post.css:235-239` 给 `.post-content img` 设置了 `max-width: 100%; border-radius: 4px`。**没有居中**——Markdown 语法产生的 `<img>` 默认在 `<p>` 里左对齐。如果要居中，需要写 HTML：

```html
<p align="center"><img src="/assets/xxx.png" width="60%"></p>
```

或者加个 CSS 类。

### 14.5 嵌入 iframe（如 B 站视频）

`_posts/2026-9-21-music.md` 是范例：

```html
<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=…&bvid=…&cid=…&autoplay=0&p=1"
        scrolling="no" border="0" frameborder="no" framespacing="0"
        allowfullscreen="true"></iframe>
```

**⚠️ 五个注意点**：

1. **`//` 开头的协议相对 URL 在本地预览时会失败**。本地是 `http://localhost:4000`，协议相对 URL 会变成 `http://player.bilibili.com/...`，而 B 站只支持 HTTPS。**本地预览时视频不显示是正常的**，线上正常。想本地也看到，把 `//` 改成 `https://`。
2. **iframe 的默认宽高**。`post.css` 里**没有任何 iframe 的样式规则**，所以 iframe 用的是 HTML 默认尺寸（300×150）。B 站的播放器会被挤成一个小方块。**这是一个待改进项**（见 18.12）。
3. **`scrolling`/`border`/`framespacing` 是废弃属性**。现代浏览器忽略它们。留着无害（B 站官方代码就是这么给的），但可以删。
4. **`frameborder="no"` 已过时**，应改用 CSS `border: 0`。同样无害。
5. **⚠️ 隐私提示**：B 站 iframe 会向 `player.bilibili.com` 发请求，同时会**读取你的 Referer**（从而知道你的博客地址）。这对个人博客一般无所谓，但如果在意可以用 `loading="lazy"` 延迟加载。

### 14.6 代码块

````markdown
```cpp
int main() { return 0; }
```
````

**⚠️ 没有语法高亮**。`_config.yml` 没有配置 `kramdown: syntax_highlighter`，`main.css` / `post.css` 里也**没有任何 Rouge 相关的样式类**（`.highlight` / `.k` / `.s` 等）。所以代码块是**纯文本渲染**，只有等宽字体和浅灰背景。

如果需要语法高亮，有两个选择：

**方案 A（推荐，改动小）**：在 `post.css` 里引入一套 Rouge 主题 CSS。

```css
/* 在 post.css 末尾追加 */
.highlight .k { color: #d73a49; font-weight: bold; }   /* keyword */
.highlight .s { color: #032f62; }                      /* string  */
.highlight .c { color: #6a737d; font-style: italic; }  /* comment */
…
```

这些类名正好可以从 `fluent.css` 里抄（它包含完整的 GitHub 风格高亮规则，而且它的颜色令牌 `--color-cm-*` 已经是本项目令牌的来源）。

**方案 B**：在 `_config.yml` 加：

```yaml
kramdown:
  syntax_highlighter: rouge
```

但这需要自己提供主题 CSS，否则输出的是无样式的 `<div class="highlight">`。

### 14.7 HTML 直写

Markdown 里可以直接写 HTML（kramdown 默认允许）。上面的 iframe 就是例子。`about.md` 里也用了：

```markdown
> **愿我们像强连通分量，彼此可达。**
```

**⚠️ 注意事项**：

- kramdown 默认 `parse_block_html: false`，所以块级 HTML 内部的 Markdown **不会被解析**。也就是说：

  ```html
  <div>
  **这里的粗体不会被解析**
  </div>
  ```

  如果需要，加 `markdown="1"`：`<div markdown="1">`。

- 行内 HTML 中的 Markdown **会被解析**（如上面 iframe 例子中的 `<span>`）。

---

## 15. 分页、标签与归档

### 15.1 手工分页的原理

GitHub Pages safe mode 不允许分页插件，所以本项目用了**物理分页**：每一页是一个真实的目录。

```
posts/index.html        → /posts/        显示第 1-10 篇    offset: 0
posts/page2/index.html  → /posts/page2/  显示第 11-20 篇   offset: 10
posts/page3/index.html  → /posts/page3/  显示第 21-30 篇   offset: 20
```

**每一页的模板完全相同**（都是 `layout: posts`），唯一区别是 front matter 里的 `offset`。

### 15.2 新增一页的步骤

**触发条件**：文章总数超过 `10 × 已有页数`。

| 文章总数 | 需要创建的页 |
| --- | --- |
| 1-10 | 无（`posts/index.html` 已存在） |
| 11-20 | `posts/page2/index.html`（**已存在**） |
| 21-30 | `posts/page3/index.html` |
| 31-40 | `posts/page4/index.html` |

**创建 `posts/page3/index.html`**：

```html
---
layout: posts
offset: 20
---
```

**就这三行**。不需要写任何内容——`_layouts/posts.html` 会渲染列表和翻页导航。

⚠️ **`offset` 必须是 `10 × (页数 - 1)`**。写错会导致文章重复显示或跳过。

### 15.3 分页链接的生成逻辑回顾

```liquid
{% if start > 0 %}
  {% assign prev_num = start | divided_by: 10 %}
  <a href="{% if prev_num == 1 %}{{ "/posts/" | relative_url }}{% else %}{{ "/posts/page" | append: prev_num | append: "/" | relative_url }}{% endif %}">上一页</a>
{% endif %}
<span>第 {{ start | divided_by: 10 | plus: 1 }} 页</span>
{% assign remaining = site.posts.size | minus: start | minus: 10 %}
{% if remaining > 0 %}
  {% assign next_num = start | divided_by: 10 | plus: 2 %}
  <a href="{{ "/posts/page" | append: next_num | append: "/" | relative_url }}">下一页</a>
{% endif %}
```

**边界情况验证**：

| 场景 | `start` | `remaining` | 结果 |
| --- | --- | --- | --- |
| 第 1 页，共 5 篇 | 0 | `5-0-10 = -5` | 无上一页，无下一页 ✓ |
| 第 1 页，共 25 篇 | 0 | `25-0-10 = 15` | 无上一页，有下一页 → `/posts/page2/` ✓ |
| 第 2 页，共 25 篇 | 10 | `25-10-10 = 5` | 有上一页 → `/posts/`，有下一页 → `/posts/page3/` ✓ |
| 第 3 页，共 25 篇 | 20 | `25-20-10 = -5` | 有上一页 → `/posts/page2/`，无下一页 ✓ |
| 第 3 页，共 30 篇（整） | 20 | `30-20-10 = 0` | 有上一页，**无下一页** ✓ |

**最后一行是关键**：恰好 30 篇时，第 3 页显示 21-30 篇，`remaining = 0`，正确不显示"下一页"。

### 15.4 标签系统

`tags.md` 是整个标签索引页：

```liquid
---
layout: page
title: Tags - 标签
permalink: /tags/
---
{% for tag in site.tags %}
<h2>{{ tag[0] }}</h2>
<ul>
  {% for post in tag[1] %}
  <li>{{ post.date | date: site.date_format }} · <a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>
{% endfor %}
```

**`site.tags` 的数据结构**：一个 Hash，键是标签名，值是文章数组：

```
"考试游记" => [post1]
"音乐"    => [post2]
```

Liquid 遍历 Hash 时每个元素是 `[key, value]` 数组，所以用 `tag[0]` 取标签名、`tag[1]` 取文章数组。

**⚠️ 标签是自动聚合的**：不需要在任何地方"注册"标签。写文章时 front matter 里写 `tag: [新标签]`，`/tags/` 页面上自动出现。

**⚠️ 关于 `tag:` 与 `tags:` 的关系**（这一点容易混淆）：

Jekyll 源码 `lib/jekyll/document.rb`：

```ruby
def populate_tags
  merge_data!({"tags" => Utils.pluralized_array_from_hash(data, "tag", "tags")})
end
```

`pluralized_array_from_hash` 会**同时读取** `tag` 和 `tags` 两个键并合并成一个数组。所以：

- `tag: [音乐]` ✓ 有效
- `tags: [音乐]` ✓ 有效
- `tag: [音乐]` + `tags: [游记]` → `page.tags == [音乐, 游记]`（合并）

**两者完全等价，建议统一用一种**。当前仓库里两篇文章都用了 `tag:`（单数），而 README 的示例用的是 `tags: [tag1, tag2]`（复数）——这是**文档与实现的不一致**（见 18.4）。

**⚠️ 标签页没有排序保证**。`site.tags` 的顺序取决于 Jekyll 内部的 Hash 迭代顺序（Ruby 的 Hash 保持插入顺序，插入顺序取决于文章的扫描顺序）。当前只有 2 个标签看不出问题，标签多了以后可能需要排序。如果想按标签名排序，需要改用：

```liquid
{% assign sorted_tags = site.tags | sort %}
{% for tag in sorted_tags %}
```

（Liquid 的 `sort` 过滤器对 Hash 会按 key 排序并返回数组对。）

**⚠️ 标签页没有文章计数**。这是个常见的增强点：

```liquid
<h2>{{ tag[0] }} <span class="tag-count">({{ tag[1] | size }})</span></h2>
```

### 15.5 首页最新文章

`_layouts/home.html:16`：

```liquid
{% for post in site.posts limit: 3 %}
```

`site.posts` 是**按日期倒序**的数组（Jekyll 保证），所以 `limit: 3` 取的就是最新 3 篇。

**⚠️ 如果文章总数少于 3，首页会显示全部**（`limit` 只是上限）。当前只有 2 篇，所以首页显示 2 个卡片。

---

## 16. SEO、RSS 与元信息

### 16.1 {% seo %} 的输出

`jekyll-seo-tag` 会根据 `_config.yml` 和页面变量生成：

```html
<title>张麦轩 | 习惯把世界看成点和边：…</title>
<meta name="generator" content="Jekyll v3.10.0" />
<meta property="og:title" content="张麦轩" />
<meta property="og:locale" content="zh_CN" />
<meta name="description" content="习惯把世界看成点和边：…" />
<meta property="og:description" content="…" />
<link rel="canonical" href="https://maixzzh.github.io/" />
<meta property="og:url" content="https://maixzzh.github.io/" />
<meta property="og:site_name" content="张麦轩" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="张麦轩" />
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebSite","description":"…","headline":"张麦轩","name":"张麦轩","url":"https://maixzzh.github.io/"}
</script>
```

**⚠️ 首页标题的生成规则**：`{站点名} | {站点描述}`。这个 `|` 分隔符是 jekyll-seo-tag 的默认值，会把整整 56 个字的站点描述拼上去，使首页 `<title>` 达到 **62 个字符**（"张麦轩 | " = 6 + 描述 56）。Google 的搜索结果标题通常截断在 60 字符左右，所以描述的后半段基本看不到。文章页的 `<title>` 是 `{文章标题} | {站点名}`，长度正常。

**改进方向**（可选）：

- 如果觉得太长，可以给首页的 `_layouts/default.html` 加 `{% seo title=false %}` 再手写 `<title>`；
- 或者在 `_config.yml` 里加 `title_separator: "-"` 之类（但分隔符不是问题，长度才是）。

**⚠️ 文章页的 `<title>`**：`{文章标题} | {站点名}`。这个长度通常合适。

**⚠️ 缺少的元信息**：

| 缺失项 | 影响 | 添加方式 |
| --- | --- | --- |
| `og:image` | 分享到微信/QQ 时无缩略图 | 在 post 的 front matter 加 `image: /assets/xxx.png` |
| `author` | JSON-LD 里无作者信息 | `_config.yml` 加 `author: 张麦轩` |
| `twitter:site` | 无 | 不适用（无 Twitter 账号） |

### 16.2 RSS

`jekyll-feed` 自动生成 `_site/feed.xml`（Atom 1.0），被 `footer.html` 链接：

```html
<p>© {{ site.time | date: "%Y" }} {{ site.title }} · <a href="{{ "/feed.xml" | relative_url }}">RSS</a></p>
```

`site.time` 取的是**构建时间**，所以年份会自动更新（不需要每年改一次）。

**⚠️ Feed 里包含完整文章内容**（`<content type="html">` + CDATA）。对于音乐收藏这类含 iframe 的文章，订阅阅读器里会显示一堆 iframe。如果想要摘要模式，需要在 `_config.yml` 配置：

```yaml
feed:
  excerpt_only: true
```

### 16.3 站点地图

**⚠️ 没有 sitemap**。GitHub Pages 默认不生成 `sitemap.xml`（那是 `jekyll-sitemap` 插件的工作，虽然它在白名单内但当前没有安装）。

**添加方式**：

1. 在 `Gemfile` 加 `gem "jekyll-sitemap"`
2. 在 `_config.yml` 的 `plugins:` 加 `- jekyll-sitemap`

对于个人博客，sitemap 对百度和 Google 的收录有帮助。

---

## 17. 本地开发、构建与部署

### 17.1 环境准备

**系统依赖**（以 Manjaro 为例，作者当前使用的发行版）：

```bash
sudo pacman -S ruby base-devel
```

**Ruby 版本**：Gemfile.lock 的 BUNDLED WITH 是 `4.0.21`，本机 Ruby 是 3.4.0（从 gem 路径推断）。

**Bundler 配置**：`.bundle/config` 已配置清华镜像：

```yaml
BUNDLE_MIRROR__HTTPS://RUBYGEMS__ORG/: "https://mirrors.tuna.tsinghua.edu.cn/rubygems"
```

**⚠️ 这个键名的大小写和格式很特殊**（`BUNDLE_MIRROR__<大写 URL>`，双下划线分隔）。它是 Bundler 的约定：把 URL 里的 `:` 和 `.` 转义成下划线。**不要手动改这个文件**，用 `bundle config mirror.https://rubygems.org <url>` 命令生成。

### 17.2 安装与运行

```bash
# 安装依赖
bundle install

# 本地预览（自动打开浏览器不需要额外参数，自己访问 http://localhost:4000）
bundle exec jekyll serve

# 带热重载（保存文件后自动刷新浏览器）
bundle exec jekyll serve --livereload

# 指定端口（4000 被占用时）
bundle exec jekyll serve --port 4001

# 监听所有网卡（让手机在同一局域网访问，测试真实移动端）
bundle exec jekyll serve --host 0.0.0.0
```

**⚠️ `bundle exec` 不能省**。直接跑 `jekyll serve` 会用系统全局安装的 gem（版本可能不匹配），出现莫名其妙的错误。

**⚠️ 新 Ruby 的兼容性**：Gemfile 里的 `webrick`、`base64`、`csv`、`bigdecimal` 四个 gem 是**必需的**，但它们被移出标准库的版本不同：

| gem | 何时不再是默认 gem |
| --- | --- |
| `webrick` | **Ruby 3.0**（从标准库降级为 bundled gem；因为它是 Web 服务器，多数程序用不到） |
| `base64` / `csv` / `bigdecimal` | **Ruby 3.4**（从 default gem 降级为 bundled gem，Ruby 3.3 起会打印弃用警告） |

如果删掉它们，`bundle exec jekyll serve` 会报 `cannot load such file -- webrick`（或其他三个对应的报错）。`Gemfile` 里这四行是**为了兼容新 Ruby 才加的**，不是项目本身需要它们。

### 17.3 构建

```bash
bundle exec jekyll build                    # 输出到 _site/
bundle exec jekyll build --destination /tmp/site   # 输出到别处
bundle exec jekyll build --verbose          # 详细日志
```

**实测耗时**：约 0.9 秒（本项目规模）。

**⚠️ `_site/` 已在 `.gitignore` 中**，不会被提交：

```
_site/
.jekyll-cache/
.bundle/
vendor/bundle/
.sass-cache/
Gemfile.lock.tmp
```

### 17.4 部署到 GitHub Pages

这个仓库**本身就是** GitHub Pages 的用户站点（仓库名 `maixzzh.github.io`），所以部署是**自动的**：

```bash
git add .
git commit -m "描述你的改动"
git push origin master
```

推送后 GitHub 会**自动触发 Pages 构建**，通常 1-2 分钟上线。

**⚠️ 三个关键限制**：

1. **必须是 `master` 或 `main` 分支**（当前用的是 `master`）。GitHub Pages 的用户站点只能从默认分支的根目录或 `/docs` 目录发布。
2. **`plugins:` 必须是白名单插件**。当前 `jekyll-feed` 和 `jekyll-seo-tag` 都在白名单内。**如果加了非白名单插件（如 `jekyll-paginate-v2`、`jekyll-archives`），整个构建会失败**，且错误信息出现在 GitHub 的 Actions 日志或仓库 Settings → Pages 里。

   **完整白名单**（GitHub Pages 常用部分）：`jekyll-coffeescript`、`jekyll-default-layout`、`jekyll-feed`、`jekyll-gist`、`jekyll-github-metadata`、`jekyll-optional-front-matter`、`jekyll-paginate`、`jekyll-readme-index`、`jekyll-redirect-from`、`jekyll-relative-links`、`jekyll-seo-tag`、`jekyll-sitemap`、`jekyll-titles-from-headings`、`jekyll-avatar`、`jemoji`、`jekyll-mentions`、`jekyll-include-cache`。

3. **构建环境不是你的本地环境**。GitHub Pages 用的是：
   - Jekyll **3.9.4**（不是本地的 3.10.0）
   - Ruby 3.x
   - **UTC 时区**
   - 不支持自定义 gem（`Gemfile` 对 Pages 构建**无效**）

   所以**"本地正常但线上失败"**的常见原因是：用了新版本 Jekyll 的特性、依赖了 Gemfile 里的自定义 gem、或踩到时区问题。

**⚠️ 关于 `theme: minima`**：`minima` 在 GitHub Pages 的白名单主题里，所以能用。但因为所有布局都被覆盖了，实际它只贡献了 Sass 编译。

### 17.5 部署前检查清单

```bash
# 1. 干净构建，确认无错误
rm -rf _site .jekyll-cache
bundle exec jekyll build

# 2. 检查是否有构建警告
bundle exec jekyll build --verbose 2>&1 | grep -i "warn\|error"

# 3. 检查生成的 URL 与预期一致
ls -R _site | head -40

# 4. 本地 serve 一遍，手动点一遍所有页面
bundle exec jekyll serve
```

**手动检查项**：

- [ ] 首页显示最新文章
- [ ] 导航栏四个链接都能跳转，高亮正确
- [ ] 主题菜单（桌面）能开合，选项能切换
- [ ] `/theme/` 页的三个风格 × 三个主题共 9 种组合都正常
- [ ] 刷新页面后选择被记住
- [ ] 移动端（DevTools 模拟 ≤768px）：汉堡菜单能开合
- [ ] 文章页的公式渲染正常
- [ ] 深浅色模式下所有文字都可读

### 17.6 一个常见的"发布后没更新"问题

**原因**：GitHub Pages 有 CDN 缓存（Fastly），约 **10 分钟**。刚推送完立即刷新可能还是旧版。

**验证方法**：在 URL 后加随机参数绕过缓存：`https://maixzzh.github.io/?v=123`。如果带参数是新版、不带是旧版，就是缓存问题。

**⚠️ 另一个容易踩的坑**：浏览器自己会缓存 CSS/JS。因为 `head.html` 里的 `<link>` 没有版本号，浏览器可能用旧的 CSS 渲染新的 HTML，导致样式错乱。**强制刷新**（`Ctrl+Shift+R`）能解决。

**长期方案**：给静态资源加版本查询串。Jekyll 没有内置的缓存清除机制，但可以手动：

```html
<link rel="stylesheet" href="{{ "/assets/css/main.css" | relative_url }}?v={{ site.time | date: '%s' }}">
```

**⚠️ 副作用**：每次构建的 `site.time` 都不同，会导致**每次部署都让所有用户重新下载全部 CSS/JS**（破坏缓存的意义）。更好的做法是手动维护一个版本号（比如 `?v=1.2.0`，只在改动 CSS 时递增）。

---

## 18. 已知问题清单

按严重程度排序。**⚠️ 标记的表示可能有实际影响**。

### 18.1 ⚠️ `_layouts/posts.html` 标签错配

**位置**：`_layouts/posts.html:9`

```html
<h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
<!--                                                       ^^^ 应为 </h2> -->
```

**影响**：浏览器会容错处理（HTML5 解析器在遇到 `</h3>` 时会隐式闭合 `<h2>`），所以**视觉上完全正常**。但：

- HTML 验证器会报错
- 如果要引入 DOM 处理（比如阅读进度、目录生成），解析树可能与预期不符

**修复**：

```html
<h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
```

### 18.2 ⚠️ Gitalk 评论区的两个问题

**位置**：`_includes/gitalk.html`

```liquid
{% if site.gitalk and site.gitalk.clientID %}
<div id="gitalk-container" class="post-comments"></div>
<link rel="stylesheet" href="https://unpkg.com//dist/gitalk.css">   ← 问题 1
<script src="https://unpkg.com/gitalk/dist/gitalk.min.js"></script>
…
{% endif %}
```

**问题 1：CSS 的 URL 缺少包名。**

```
https://unpkg.com//dist/gitalk.css
      ↑ 这里应该是 unpkg.com/gitalk@1.7.2/dist/gitalk.css
```

正确写法：

```html
<link rel="stylesheet" href="https://unpkg.com/gitalk@1.7.2/dist/gitalk.css">
```

**问题 2：`_config.yml` 里没有 `gitalk` 键，所以整块代码从不渲染。**

`_config.yml` 只有 14 个键（见第 5 章），没有 `gitalk`。所以 `site.gitalk` 是 `nil`，`{% if %}` 为假，评论区完全不存在。

**这意味着**：评论区功能实际上是**未启用状态**，`gitalk.html` 是"潜伏代码"。如果将来要启用，需要：

1. 在 GitHub 创建 OAuth App（拿到 clientID / clientSecret）
2. 创建一个存放评论的仓库，开启 Issues
3. 在 `_config.yml` 添加：

```yaml
gitalk:
  clientID: "你的 Client ID"
  clientSecret: "你的 Client Secret"
  repo: "评论仓库名"
  owner: "你的 GitHub 用户名"
  admin: "你的 GitHub 用户名"
```

4. **修复上面提到的 CSS URL**

**⚠️ 安全提示**：`clientSecret` 会被明文写进 `_config.yml` 并提交到公开仓库。Gitalk 的设计要求这样（它是公开的 OAuth App secret，不是用户密码），但要知道**任何人都能看到它**。如果介意，可以用环境变量或干脆换用更现代的方案（如 giscus，基于 GitHub Discussions，不需要 secret）。

**⚠️ `id: '{{ page.path }}'`**：Gitalk 用这个作为评论的唯一标识。注释说"文章文件路径，每篇唯一且长度小于50"。**注意：如果重命名文章文件，之前的评论会"丢失"**（因为 id 变了）。改文件名要慎重。

### 18.3 ⚠️ 社交链接仍是占位符

**位置**：`_includes/social.html:2,6,10,14`

```html
<a class="social-link" href="xxx" target="_blank" rel="noopener">…哔哩哔哩…</a>
<a class="social-link" href="xxx" target="_blank" rel="noopener">…知乎…</a>
<a class="social-link" href="xxx" target="_blank" rel="noopener">…微博…</a>
<a class="social-link" href="xxx">…邮箱…</a>
```

**影响**：首页侧边栏"关注我"卡片里，4 个链接**全部指向 `/xxx`**（404）。这是**当前最明显的用户可见缺陷**。

**修复**：

```html
<a class="social-link" href="https://space.bilibili.com/1512804294" …>哔哩哔哩</a>
<a class="social-link" href="https://www.zhihu.com/people/zhibp1rsb" …>知乎</a>
<a class="social-link" href="微博主页地址" …>微博</a>
<a class="social-link" href="mailto:{{ site.email }}">邮箱</a>
```

**注意**：B 站和知乎的 URL **已经在 `about.md` 里有了**，可以直接抄过来：

```markdown
* [知乎](https://www.zhihu.com/people/zhibp1rsb)
* [B站](https://space.bilibili.com/1512804294)
```

**⚠️ 邮箱那一行还缺少 `target="_blank"` 一致性**（其他三个有），但 `mailto:` 链接本来就不该用 `target`，所以这是正确的。如果把邮箱改成 `mailto:{{ site.email }}`，那 `site.email` 就有了用处（当前它**完全没有被引用**）。

### 18.4 ⚠️ README 与实现不一致

**位置**：`README.md`

| README 的说法 | 实际 |
| --- | --- |
| "Email is taken from `_config.yml` → `email`" | `social.html` 硬编码 `href="xxx"`，不读配置 |
| front matter 示例用 `tags: [tag1, tag2]` | 实际文章都用 `tag:`（单数），虽然两者等价 |
| "Site title / homepage name: `_config.yml` → `title`" | ✅ 正确 |
| 预览链接指向 `mxkfemkkk.github.io` | 实际域名是 `maixzzh.github.io` |
| "This theme uses simple manual pagination. Each page shows 10 posts." | ✅ 正确 |

**建议**：更新 README 的预览链接和 social 部分的描述。

### 18.5 ⚠️ `posts/page2/` 是孤儿页

**位置**：`posts/page2/index.html`

**问题**：当前只有 **2 篇文章**，一页就能装下。`posts/page2/` 存在但：

- 第 1 页的 `remaining = 2 - 0 - 10 = -8`，所以**不显示"下一页"链接**
- 直接访问 `/posts/page2/` 会看到空列表 + "第 2 页" + "上一页"

**这不影响任何用户**（因为没有入口），但属于状态不一致。README 明确说"当文章总数超过 `10 × N` 时才创建 `posts/page{N+1}/`"。

**修复选项**：

- **A（推荐）**：删除 `posts/page2/index.html`，等文章到 11 篇时再建。
- **B**：保留（作为"预置的下一层"，省得将来忘了怎么建）。但要在 README 里说明。

我倾向 A——因为一个空的第 2 页在搜索引擎眼里是"低质量重复内容"，虽然当前没有 sitemap 所以不会被抓取。

### 18.6 ⚠️ 失效的 `avatar.vg`

**位置**：`assets/images/avatar.vg`（466 字节，实为 SVG 内容）

**问题**：

1. **扩展名拼写错误**（`.vg` 而不是 `.svg`）。
2. **没有任何代码引用它**（已用 `grep` 全仓库确认）。
3. **它会被 Jekyll 拷贝到 `_site/assets/images/avatar.vg`** 并公开可访问。

**它是怎么来的？**（`git log --follow` 还原）

| 提交 | 对 avatar 做了什么 |
| --- | --- |
| `8c22756` | 初始模板：`assets/images/avatar.svg`（466 字节的占位 SVG：蓝圆底 + 文字） |
| `928e1c0` | **新增** `assets/images/avatar.vg`（12 行 / 466 字节，**就是上一步那个 SVG 的副本**）；同一提交把 `assets/images/avatar.svg` 从 466 字节覆盖成 46,172 字节——也就是换成了现在的 JPG 内容 |
| `16b81f4` | 把 `assets/images/avatar.svg` 重命名为 `assets/images/avatar.jpg`（`R100`，内容未变） |

所以 **avatar.vg 不是"被重命名"产生的，而是一次复制操作时目标文件名打错**（`cp avatar.svg avatar.vg` 之类）留下的孤儿：它保存的是**最早的占位 SVG**，而 `avatar.svg` 在同一提交里被换成了真实头像字节，最后才改名成 `.jpg`。

**修复**：

```bash
git rm assets/images/avatar.vg
```

（如果确实需要 SVG 版本的头像，把它重命名为 `avatar.svg` 并在需要的地方引用。）

**修复**：

```bash
git rm assets/images/avatar.vg
```

（如果确实需要 SVG 版本的头像，重命名为 `avatar.svg` 并在需要的地方引用。）

### 18.7 ⚠️ `fluent.css` 被发布但不使用

**位置**：`fluent.css`（78,756 字节）

**问题**：

1. 它**不在任何 `<link>` 里**（已确认 `head.html` 只加载 `assets/css/` 下的 4 个文件）；
2. 但它在仓库根目录、无 front matter，所以**会被原样拷贝到 `_site/fluent.css`**，任何人都能下载这 78KB；
3. 它只是 `post.css` 的**移植参考**。

**修复选项**：

- **A（推荐）**：在 `_config.yml` 加 `exclude: [fluent.css]`，保留文件但不发布。
- **B**：移动到 `_reference/fluent.css`（下划线开头不会被处理，但需要确认下划线目录确实被忽略——是的，Jekyll 默认忽略下划线开头的文件/目录）。
- **C**：删除（如果不再需要参考）。但从 `post.css` 的注释看，作者是刻意保留它作为"字体/配色来源"的档案，删除会损失这个信息。

### 18.8 ⚠️ 注释与代码不符（5 处）

| 位置 | 注释说 | 实际是 |
| --- | --- | --- |
| `main.css:76` | "半透明黑遮罩（75%）" | `rgba(0,0,0,0.45)` = **45%** |
| `main.css:1` | `mxkfemkkk.github.io 主样式` | 当前域名是 `maixzzh.github.io` |
| `glass-overrides.css:44-45` | `.glass-card:hover` 是 `(0,1,0)`，被 `(0,2,0)` 的 `.feed-item:hover` 压掉 | 两者**同为 `(0,2,0)`**，且 glass.css 后加载 → 玻璃规则**获胜**。整条"被压掉"的因果链不成立（详见 7.7.2，已实测验证） |
| `glass-overrides.css:583-585` | "「设置」链接的显隐规则必须带上 `.site-header`…桌面隐藏" | 该注释下方的规则（`:586-587`）实际是 `.theme-menu { margin-left: 8px }`，而它描述的 `.nav-theme-link { display: none }` 在 `:609-610`（注释与代码错位了） |
| `glass-overrides.css:584` | "下方 `.nav-links a` 的规则同为 **(0,2,1)**" | 实际是 **`(0,2,2)`**——`.nav-links a` 末尾的 `a` 是元素选择器，要计入 `c` 位。（**结论不受影响**：`(0,3,1)` 仍在 `b` 位取胜） |

**影响**：都不影响运行，但会误导后续维护者。**除第 3 条外，建议修正注释而不是改代码**（因为代码是对的）。

**⚠️ 特别说明 `main.css:76` 那条**：0.45 和 0.75 的视觉差异很大。如果按注释去"修正"成 0.75，深色背景会明显变暗。**代码是正确的，改注释。**

**⚠️ 第 3 条不一样**——`glass-overrides.css:44-45` 这条注释会主动把人带进沟里：它让读者以为 main.css 的选择器压过了 glass.css，进而可能在调整样式加载顺序时做出错误判断。建议直接改写，见 7.7.2 给出的正确表述。

### 18.9 ⚠️ 死代码清单

以下代码当前**不会被任何渲染路径执行**：

| 位置 | 内容 | 说明 |
| --- | --- | --- |
| `glass-overrides.css:89-93` | `.nav-switches { display: inline-flex; … }` | `.nav-switches` 已从 `header.html` 移除 |
| `glass-overrides.css:217` | `@media (max-width:768px) { .nav-switches { display: none } }` | 同上。**⚠️ 只删这一行，不要删整个 `@media` 块**——同块内 `:218` 的 `.nav-theme-link` 规则是活的 |
| `glass-overrides.css:286-288` | `@media (min-width:769px) { .nav-switches { display: none } }` | 同上（注释已说明是"保险"） |
| `post.css:82-83` | `margin-top: 0.5em; margin-bottom: 2.5em;` | 被紧随其后（`:84`）的 `margin: 0.5em 0` 覆盖 |
| `_layouts/post.html:10` | `page.tags \| default: page.tag` 的 `default` 分支 | Jekyll 已合并 `tag`/`tags` |
| `_layouts/default.html:2` | `data-theme="light"` | 被内联脚本立即覆盖（保留作为 JS 禁用时的默认值是有意的） |
| `_config.yml:2` | `email` | 无任何引用（见 18.3） |
| `_includes/social.html` | 4 个 `href="xxx"` | 见 18.3 |

**建议**：`.nav-switches` 相关的 3 处可以安全删除。`post.css` 的 `margin-*` 需要先确认作者的意图（见 7.6）。

### 18.10 轻微改进项

**（1）`<time>` 缺 `datetime` 属性**

```html
<!-- 当前 -->
<time class="post-date">{{ page.date | date: site.date_format }}</time>
<!-- 建议 -->
<time class="post-date" datetime="{{ page.date | date_to_xmlschema }}">{{ page.date | date: site.date_format }}</time>
```

影响：SEO 结构化数据、屏幕阅读器对日期的解析。**注意 `tags.md:10` 里的日期不在 `<time>` 元素内**，同样可以改进。

**（2）`.avatar` 的 `alt="{{ site.title }}"` 与旁边的 `<h1>` 重复**

严格按 WCAG，重复的文本替代会增加屏幕阅读器的噪音。可以改成 `alt=""`（因为 `<h1>` 已经提供了信息）。

**（3）代码块没有语法高亮**（见 14.6）

**（4）iframe 没有样式约束**（见 14.5）

建议在 `post.css` 添加：

```css
.post-content iframe {
  width: 100%;
  max-width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
  border: 0;
  border-radius: 4px;
  margin: 0.8em 0;
}
```

**⚠️ `aspect-ratio` 的兼容性**：Chrome 88+、Safari 15+、Firefox 89+ 支持。旧浏览器会回退到 iframe 的默认高度（150px）。如果需要更广的兼容性，用 padding-bottom 技巧：

```css
.post-content iframe {
  width: 100%; height: auto; aspect-ratio: 16/9;
  border: 0; border-radius: 4px;
}
```

**（5）缺少 sitemap**（见 16.3）

**（6）没有 404 页面**

访问不存在的 URL 会得到 GitHub Pages 的默认 404。可以添加一个 `404.html`（Jekyll 会自动识别）：

```html
---
layout: page
permalink: /404.html
title: "404 - 页面不存在"
---
<p>你访问的页面不存在。<a href="/">回到首页</a></p>
```

**（7）Git 工作区有未提交的删除**

`git status` 显示：

```
D _post/2026-08-13-example.md
D _post/2026-08-13-example2.md
D _post/2026-08-13-example3.md
```

这三个文件曾位于 `_post/`（**单数**，是笔误——Jekyll 只认 `_posts/`），已经删除了但**删除操作没有提交**。建议：

```bash
git add -A
git commit -m "清理误建的 _post 目录"
```

**（8）`assets/images/avatar.vg` 之外，`file/` 目录里有一些敏感内容**

`file/` 目录包含一些个人纠纷相关的 PDF/RAR/ZIP（从文件名可看出）。**这些文件会被公开发布**到 `https://maixzzh.github.io/file/…`。如果这些是私密材料，需要移到 `_config.yml` 的 `exclude` 列表或者干脆不放在仓库里（用外部网盘）。

⚠️ **这一条不是技术问题，是一个需要作者本人确认的内容策略问题。**

### 18.11 文档建议：把 `1360px` 的推导写清楚

`glass-overrides.css:398-405` 的注释给了推导的前提（`面板右缘=(视口+1032)/2`）和结论（`需视口≥1342px`），但**这两个数字对不上**：把 1032 代进不等式得到的是 1336，不是 1342。三者中至少有一个是估的，注释没说清哪个是估的，也没说 solid 模式下的情况。

按 12.3 的完整分析，两种布局的实际门槛是：

| 布局 | 门槛公式 | 代入值 |
| --- | --- | --- |
| liquid / frost（胶囊居中） | `W ≥ P + 304`，P ≈ 胶囊宽度 | ≈ **1336**（P=1032） |
| solid（通栏 1000px 容器） | `W ≥ 1272` | **1272** |

两者都 < 1360，所以当前阈值**是安全的**。建议把注释改成：

```css
/* 窄桌面（≤1360px）：子菜单改向左展开，避免超出视口右缘。
   约束：子菜单右边缘 = 导航右边缘 + 152px(min-width:9.5rem) ≤ 视口宽。
   · liquid/frost 胶囊居中 → 门槛 ≈ 胶囊宽 + 304 ≈ 1336px（胶囊按 1032 估）
   · solid 通栏(容器 1000px) → 门槛 ≈ 1272px
   取 1360 对两者都留有余量。
   ⚠️ 胶囊宽度随导航项数量增长（每项约 +65px），新增导航项后需重算。 */
```

### 18.12 问题优先级建议

如果要动手修，建议按这个顺序：

| 优先级 | 问题 | 工作量 |
| --- | --- | --- |
| **P0** | 18.3 社交链接 `href="xxx"` | 5 分钟 |
| **P0** | 18.10（8）`file/` 目录内容审查 | 需作者决策 |
| **P1** | 18.1 `<h2></h3>` 标签错配 | 1 分钟 |
| **P1** | 18.5 删除孤儿 `posts/page2/` | 1 分钟 |
| **P1** | 18.6 删除 `avatar.vg` | 1 分钟 |
| **P2** | 18.2 Gitalk（要么修好启用，要么删掉） | 15 分钟 / 30 分钟 |
| **P2** | 18.10（4）iframe 样式 | 10 分钟 |
| **P2** | 18.7 `exclude: [fluent.css]` | 2 分钟 |
| **P3** | 18.8 / 18.9 注释与死代码清理 | 20 分钟 |
| **P3** | 18.10（1）（3）（5）（6）增强 | 各 10-30 分钟 |

---

## 19. 维护操作手册

### 19.1 常见任务速查

| 我想… | 改哪里 |
| --- | --- |
| 改站点名 / 首页姓名 | `_config.yml` → `title` |
| 改首页签名 | `_config.yml` → `signature` |
| 改站点描述（SEO 用） | `_config.yml` → `description` |
| 换头像 | 替换 `assets/images/avatar.jpg`（保持文件名） |
| 换背景图 | `assets/bg.jpg`（浅色） / `assets/bg-dark.jpg`（深色） |
| 改关于页 | `about.md` |
| 改导航项 | `_includes/header.html` |
| 加社交链接 | `_includes/social.html` |
| 改主色调（知乎蓝） | `assets/css/main.css` → `--blue`（浅色）/ `html[data-theme="dark"]` → `--blue`（深色） |
| 改文章版式字号 | `assets/css/post.css` |
| 改玻璃模糊强度 | `assets/css/glass-overrides.css:4-11` → `--gr-blur*` |
| 改导航收缩阈值 | `assets/js/nav-shrink.js:15-16` → `SHRINK_AT` / `EXPAND_AT` |
| 加新页面 | 根目录建 `.md`，front matter 写 `layout: page` + `permalink` |
| 加新分页 | 建 `posts/pageN/index.html`，front matter 写 `offset` |
| 启用评论 | 见 18.2 |

### 19.2 修改配色（最常做的改动）

**只改一种颜色**（比如主色从知乎蓝改成别的）：

```css
/* main.css:16-17 浅色 */
--blue: #0084ff;
--blue-hover: #0069e0;

/* main.css:64-65 深色 */
--blue: #3d9bff;
--blue-hover: #66b2ff;
```

**⚠️ 但只改 `--blue` 是不够的**。全仓库还有 **3 处硬编码的蓝色**（`rgba(0, 132, 255, …)`），其中**只有 1 处是活的**：

| 位置 | 值 | 状态 |
| --- | --- | --- |
| `glass-overrides.css:124` | `rgba(0, 132, 255, 0.08)` | ✅ **生效中**——分段控件/菜单项的悬停背景 |
| `main.css:123` | `rgba(0, 132, 255, 0.12)` | ❌ 在 `/*background: …*/` 注释块内（`:122-128`），不生效 |
| `main.css:124` | `rgba(0, 132, 255, 0.09)` | ❌ 同上 |

所以实际只需要改 **1 处**（`glass-overrides.css:124`）。另外两处是历史遗留的注释代码，改主色时可以顺手一起改，或者干脆删掉那两行注释掉的渐变（它们和 `bg.jpg` 方案二选一，见 9.3）。

**建议**：把 `glass-overrides.css:124` 也提取成令牌，比如 `--blue-tint: rgba(0, 132, 255, 0.08)`（深色下给个对应值），这样改主色就只需改 `--blue` / `--blue-hover` / `--blue-tint` 三组（浅深各一套）。

**⚠️ 顺带提醒**：`glass-overrides.css:124` 的 `0.08` 是针对**浅色**背景调的。如果换成深色背景（`data-theme="dark"`），这个 8% 蓝色的悬停反馈会几乎看不见——所以提取令牌时应同时给深色值（比如 `rgba(61, 155, 255, 0.15)`）。

**改整体色调（比如要一套暖色调）**：需要改 `main.css:8-47` 和 `:55-104` 里的**全部 32 个令牌**。建议用取色工具（如 OKLCH 空间插值）保持对比度关系。

### 19.3 新增一个导航项

**第 1 步**：在 `_includes/header.html` 的 `.nav-links` 里加一行：

```html
<a href="{{ "/archive/" | relative_url }}" class="{% if current == "/archive/" %}active{% endif %}">归档</a>
```

**第 2 步**：创建 `archive.md`：

```markdown
---
layout: page
title: 归档
permalink: /archive/
---
（内容）
```

**⚠️ 第 3 步（容易遗忘）**：检查 `glass-overrides.css:615` 的 `max-width: 6rem`（该规则的两条选择器在 `:612-613`）。6rem = 96px，"归档"两个字够用。但如果是**四个字**的导航项（如"标签索引"），在 0.9375rem 字号下约 60px，加 padding 24px = 84px，仍在 96px 内。超过 4 个字需要加大 `max-width`，否则折叠动画的起点会被截断。

**⚠️ 第 4 步**：检查 1360px 断点的数学（见 12.3）。liquid/frost 下门槛是 `胶囊宽度 + 304`；每多一个导航项，胶囊约加宽 65px，门槛就抬高约 65px。当前 3 项的门槛约 1336，加到 5 项时约 1466——**已经超过 1360，子菜单会溢出视口右缘**。此时需要把断点从 1360 改到 1500 左右。

### 19.4 修改玻璃效果强度

**统一调整**：

```css
/* glass-overrides.css:4-11 */
:root {
  --gr-blur: 9px;            /* 导航模糊半径 */
  --gr-blur-card: 9px;       /* 卡片模糊半径 */
  --gr-saturation: 1.35;     /* 导航饱和度增强 */
  --gr-saturation-card: 1.3; /* 卡片饱和度增强 */
  --gr-shimmer-duration: 8s; /* 导航扫光周期 */
  --gr-specular-duration: 8s;/* 呼吸高光周期 */
}
```

**⚠️ 性能警告**：`backdrop-filter` 的开销与**模糊半径的平方**大致成正比，且与**应用元素的面积**成正比。在低端设备上：

- `--gr-blur: 9px` 是舒适值
- 超过 `20px` 会有明显的滚动卡顿（尤其是移动端）
- 移动端已有额外的降级（`:66-70`），不要删掉那段

**只调 liquid 的强度**：改上面的 `:root` 会影响 frost 吗？**不会**——frost 的模糊半径是硬编码在 `html[data-glass="frost"] .glass { backdrop-filter: blur(10px) }` 里的，不用 `--gr-blur`。所以两者独立可调。

### 19.5 添加一种新的视觉风格

假设要加一种 `minimal`（极简：无色散、无扫光、只有细边框）：

**第 1 步**：`glass-style.js:9` 加入白名单：

```js
var STYLES = ['liquid', 'frost', 'solid', 'minimal'];
```

**⚠️ 第 2 步**：`_includes/head.html` 的内联脚本也要加（否则刷新时会闪）：

```js
if (stored === 'liquid' || stored === 'frost' || stored === 'solid' || stored === 'minimal') {
```

**⚠️ 这两处必须同步**。`head.html` 里的白名单是 `glass-style.js` 的**重复实现**（因为内联脚本要在 JS 文件加载前执行）。这是一个**已知的代码重复点**，加新风格时最容易漏掉其中一处。

**第 3 步**：加按钮。两处：

- `/theme/` 页：`_includes/style-switches.html`
- 导航菜单：`_includes/header.html` 的 `.theme-menu-sub`

```html
<button type="button" data-style="minimal" aria-pressed="false">极简</button>
```

**第 4 步**：写 CSS（在 `glass-overrides.css` 的风格系统区段）：

```css
html[data-glass="minimal"] .glass,
html[data-glass="minimal"] .glass-card {
  background: var(--card);
  border: 1px solid var(--border);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: none;
  animation: none;
}
html[data-glass="minimal"] .glass::before,
html[data-glass="minimal"] .glass::after,
html[data-glass="minimal"] .glass-card::before,
html[data-glass="minimal"] .glass-card::after { content: none; }

/* 如果希望 minimal 也用胶囊导航，需要把 liquid/frost 的选择器列表加上 minimal */
```

**⚠️ 第 5 步（最关键）**：决定 `minimal` 是否使用**胶囊导航**。

如果想，需要把 `glass-overrides.css` 里**所有** `html[data-glass="liquid"], html[data-glass="frost"]` 的选择器都加上 `minimal`。实测 `data-glass="liquid"` 在该文件里出现 **37 次**（其中大量是成对的双选择器），需要逐条判断是否属于胶囊系统——这是一项繁琐且极易漏改的工作。

（顺带说明：**没有** `html[data-glass="solid"]` 的胶囊规则，这正是 8.4 描述的"solid 保持通栏"的实现方式。）

**更好的做法**：把"是否用胶囊导航"抽象成一个属性。比如给 `<html>` 再加一个 `data-nav="pill|bar"` 属性，CSS 里用 `html[data-nav="pill"]` 来限定胶囊规则。这样加新风格时只需决定它的 `data-nav` 值。

### 19.6 修改颜色主题的默认值

当前默认是 `auto`（跟随系统）。改成默认浅色：

**⚠️ 要改两处**（同样的重复问题）：

1. `_includes/head.html:20`：`var t = 'auto';` → `var t = 'light';`
2. `assets/js/glass-theme.js:60`：`var initial = 'auto';` → `var initial = 'light';`
3. `_includes/style-switches.html`：把 `class="active" aria-pressed="true"` 从"自动"移到"浅色"
4. `_includes/header.html` 的 `.theme-menu-sub` 里"自动"按钮的 `aria-pressed`（初始值是 `"false"`，因为 JS 会立刻修正，所以不改也不会出错——但为了 HTML 静态正确性应该改）

---

## 20. 附录：速查表

### 20.1 全部 CSS 自定义属性

**基础色（10 个 × 2 套）**

| 属性 | 浅色 | 深色 |
| --- | --- | --- |
| `--bg` | `#f6f6f6` | `#0f1216` |
| `--card` | `#ffffff` | `#181d24` |
| `--border` | `#ebebeb` | `#2a313b` |
| `--hover-bg` | `#f7f8fa` | `#1f2630` |
| `--text` | `#1a1a1a` | `#e8eaed` |
| `--text-2` | `#646464` | `#a0a8b4` |
| `--text-3` | `#8590a6` | `#7a8494` |
| `--blue` | `#0084ff` | `#3d9bff` |
| `--blue-hover` | `#0069e0` | `#66b2ff` |

**文章语义色（12 个 × 2 套）**：见 7.2 第 2 组表格。

**玻璃色（8 个 × 2 套）**：见 7.2 第 3 组表格。

**vendor 令牌（8 个，其中前 6 个被 `glass-overrides.css:4-11` 覆盖）**

| 属性 | 值 | 用途 |
| --- | --- | --- |
| `--gr-blur` | `9px` / 移动 `10px` | 导航模糊 |
| `--gr-blur-card` | `9px` / 移动 `8px` | 卡片模糊 |
| `--gr-saturation` | `1.35` | 导航饱和度 |
| `--gr-saturation-card` | `1.3` | 卡片饱和度 |
| `--gr-radius` | `8px` / 胶囊 `9999px` | 导航圆角 |
| `--gr-radius-card` | `8px` | 卡片圆角 |
| `--gr-shimmer-duration` | `8s` | 扫光周期 |
| `--gr-specular-duration` | `8s` | 呼吸周期 |

**导航令牌（9 个，定义在 `html[data-glass="liquid"] .site-header.glass` / `html[data-glass="frost"] .site-header.glass` 上）**

| 属性 | 值 |
| --- | --- |
| `--nav-pill-top` | `20px` |
| `--nav-pill-top-shrunk` | `12px` |
| `--nav-pad-y` | `8px` |
| `--nav-pad-x` | `16px` |
| `--nav-pad-y-shrunk` | `6px` |
| `--nav-pad-x-shrunk` | `12px` |
| `--nav-ease` | `cubic-bezier(0.25, 1, 0.5, 1)` |
| `--nav-dur` | `0.5s` |
| `--nav-dur-fast` | `0.35s` |

### 20.2 `data-*` 属性总表

| 属性 | 位置 | 值 | 写入者 |
| --- | --- | --- | --- |
| `data-glass` | `<html>` | `liquid` \| `frost` \| `solid` | 内联脚本 + `glass-style.js` |
| `data-theme` | `<html>` | `light` \| `dark` | 内联脚本 + `glass-theme.js` |
| `data-style` | `<button>` | `liquid` \| `frost` \| `solid` | 静态 HTML |
| `data-theme` | `<button>` | `light` \| `dark` \| `auto` | 静态 HTML |

**⚠️ 注意 `data-theme` 在 `<html>` 和 `<button>` 上的语义不同**：

- `<html data-theme="light">` → 只有解析后的值（`light` / `dark`）
- `<button data-theme="auto">` → 用户的选择（含 `auto`）

### 20.3 localStorage 键

| 键 | 值 | 写入者 | 读取者 |
| --- | --- | --- | --- |
| `glass-style` | `liquid` \| `frost` \| `solid` | `glass-style.js` | 内联脚本 + `glass-style.js` |
| `glass-theme` | `light` \| `dark` \| `auto` | `glass-theme.js` | 内联脚本 + `glass-theme.js` |

**⚠️ 两个键名没有前缀命名空间**（比如 `mxk:glass-style`）。在同一域名的其他项目下有冲突风险（实际上 `maixzzh.github.io` 是用户站点，项目站点会是 `maixzzh.github.io/project/`，**共享同一个 localStorage 域**）。如果将来有其他项目也用 `glass-theme` 这个键，会互相污染。建议加前缀。

### 20.4 玻璃 / 导航类名索引

⚠️ **本节只列玻璃与导航系统相关的类名**，不含 `main.css` 里的基础布局类（`.container` / `.card` / `.home` / `.post-list` / `.pagination` …）和 `post.css` 里的正文类（`.post-content` / `.post-header` / `.post-tags` …）。

| 类名 | 定义位置 | 用途 |
| --- | --- | --- |
| `.glass` | `glass.css:43` | 玻璃外壳（导航栏） |
| `.glass-card` | `glass.css:119` | 玻璃卡片 |
| `.glass-pill` | `glass.css:187` | ⚠️ 见下方说明 |
| `.glass-card--no-hover` | `glass.css:143` | 禁用悬停（**未使用**） |
| `.is-shrunk` | `glass-overrides.css:529` | 导航收缩态 |
| `.nav-open` | `glass-overrides.css:715` | 汉堡面板打开态 |
| `.open` | `glass-overrides.css:339` | 主题菜单打开态 |
| `.active` | 多处 | 当前项高亮 |
| `.nav-links` | `glass-overrides.css:477` | 导航链接组（`display: contents` 基线） |
| `.brand` / `.brand-avatar` / `.brand-text` | `glass-overrides.css:482-497` | 品牌区三段 |
| `.nav-toggle` / `.nav-toggle-bar` | `glass-overrides.css:734-766` | 汉堡按钮 |
| `.theme-menu*` | `glass-overrides.css:291-451` | 主题下拉菜单 |
| `.glass-switch` / `.theme-switch` | `glass-overrides.css:96-139` | /theme/ 页分段控件 |
| `.nav-switches` | `glass-overrides.css:89` | **死代码** |

#### ⚠️ 关于 `.glass-pill`：别和"胶囊导航"搞混

这是本项目**最容易误读的一处**，值得单独说明。

**这里有两个不同的"胶囊"：**

| | 是什么 | 状态 |
| --- | --- | --- |
| `.glass-pill` | vendor 库 `glass-refraction` 提供的**通用药丸形小组件**（半透明白底 + `blur(8px)`，199 行文件里的 `:187-199`）。设计用途是标签、徽章、小按钮这类内联元素。 | **本站从未使用**。没有任何 HTML 引用它 |
| `.site-header.glass` + `--gr-radius: 9999px` | 第 10 章讲的**悬浮胶囊导航**——整条导航栏做成一个胶囊，是本站的核心视觉特征 | **大规模使用**。liquid / frost 两种风格下、所有页面、所有视口宽度都靠它 |

**为什么容易混**：`glass.css` 里的 `.glass-pill` 用 `border-radius: var(--gr-radius-pill)`，而导航胶囊用的是 `--gr-radius: 9999px`——两者都是"胶囊圆角"，名字里都有"pill"，但一个是被弃用的 vendor 组件，另一个是本站的招牌。

**所以要记住**：看到"胶囊"两个字的**默认含义是导航栏**（第 10 章、8.3、8.4、12.2、20.1 的"导航令牌"等章节都是这个意思）；`.glass-pill` 是唯一例外，它是**未使用的 vendor 遗留**。

> `.glass-pill` 虽然没有 HTML 引用，但它的选择器在 CSS 里还挂在几个**共享规则**上——`glass-overrides.css:15`、`:56`、`:74`、`:77` 处它与 `.glass` / `.glass-card` 写在同一条选择器列表里。**不要为了"清理死代码"把这些选择器列表里的 `.glass-pill` 摘掉**：规则本身是活的（服务于 `.glass` / `.glass-card`），摘掉只是徒增改动风险；而单独为 `.glass-pill` 写的那几条（`glass.css:187-199`）去掉省不下多少字节，留着还能让 vendor 文件保持原样。**结论：原样保留。**

### 20.5 断点总表

| 断点 | 触发 | 变化 |
| --- | --- | --- |
| `max-width: 768px` | 移动端 | 单栏布局、汉堡导航、模糊降级、背景 `scroll` |
| `min-width: 769px` | 桌面 | 双栏、胶囊折叠、主题菜单显示 |
| `max-width: 1360px` | 窄桌面 | 子菜单向左展开 |
| `prefers-reduced-motion: reduce` | 系统设置 | 禁用全部动画过渡 |
| `@supports not (backdrop-filter)` | 老浏览器 | 玻璃底色加浓到 0.92 |

### 20.6 文件修改影响面速查

改这些文件时，**需要同时检查**的地方：

| 改这个 | 也要看 |
| --- | --- |
| `_config.yml` 的 `title` | 无（自动生效，4 处引用） |
| `_config.yml` 的 `baseurl` | ⚠️ 必须保持空字符串 |
| `_includes/head.html` 的内联脚本 | `assets/js/glass-style.js` / `glass-theme.js` 的**白名单** |
| `assets/css/glass-overrides.css` 的风格选择器 | 所有 `html[data-glass="liquid"]` / `[data-glass="frost"]` 的出现处 |
| `post.css` 的 `.post` 圆角 | `html[data-glass] .post-header` 的圆角、`glass-overrides.css` 的 solid 覆盖 |
| `post.css` 的 `.post` padding | `.post-header` 的 padding（桌面 + 移动端） |
| `main.css` 的 `.site-nav` | `glass-overrides.css` 的 `.site-header .site-nav` 覆盖 |
| `_includes/header.html` 的导航项 | `glass-overrides.css` 的 `.nav-links a { max-width }`、1360px 断点数学 |
| `_layouts/posts.html` 的每页数量 | 所有 `posts/pageN/index.html` 的 `offset` |

### 20.7 术语表

| 术语 | 含义 |
| --- | --- |
| **玻璃风格** | `data-glass` 的三个值（liquid / frost / solid），控制"视觉材质" |
| **颜色主题** | `data-theme` 的两个解析值（light / dark），控制"配色" |
| **令牌** | CSS 自定义属性（`--xxx`），本项目的设计变量系统 |
| **胶囊导航** | liquid/frost 模式下 `position: fixed` 的悬浮圆角导航条 |
| **收缩态** | 滚动超过 50px 后导航进入的状态（`.is-shrunk`） |
| **迟滞** | 用两个不同阈值避免状态抖动（50px 收缩 / 40px 展开） |
| **FOUC** | Flash of Unstyled Content，样式加载前的闪烁 |
| **防闪** | 在 `<head>` 内联脚本、样式表之前写入 `data-*` 属性 |
| **手工分页** | 用物理目录 + `offset` 实现的静态分页（因为不能用插件） |
| **vendor** | 从第三方复制进仓库、不手工修改的文件（`glass.css`） |
| **孤儿页** | 存在但没有入口链接的页面（`posts/page2/`） |

---

## 结语

这份文档记录了截至 `16b81f4` 的完整技术状态。项目最值得称道的地方是**注释密度**——`glass-overrides.css` 里有大量"为什么这么写"的说明（特异性陷阱、动画性能、无障碍细节），这些是维护成本最低的文档形式，因为它们就在代码旁边。

最需要警惕的地方是**状态分散**：视觉风格有 3 个白名单（内联脚本、`glass-style.js`、按钮的 HTML），颜色主题同样有 3 个。加新值时必须同步，否则会出现"切换后刷新就丢了"这类难以定位的 bug。

如果将来要大改，建议优先做两件事：

1. **把白名单提取成单一来源**（比如在 `_config.yml` 里定义 `glass_styles: [liquid, frost, solid]`，Liquid 生成按钮，JS 从 `<meta>` 标签读取）。这能一举消除第 19.5 / 19.6 节描述的重复问题。
2. **把"是否用胶囊导航"从玻璃风格里解耦**（用独立的 `data-nav` 属性），这样加新风格时不需要改动 20 处选择器。

最后，别忘了修 18.3 的 `href="xxx"`——那 4 个链接现在是全站唯一"点了一定出错"的地方。

---

*文档结束。如有疑问或发现文档与代码不符之处，以代码为准，并请顺手更新这份文档。*
