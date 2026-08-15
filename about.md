---
layout: page
title: about
permalink: /about/
---

# About This Template

Welcome to my about page. This template demonstrates almost every common Markdown element you might need.

---

## Text Formatting

You can make text **bold**, *italic*, or ***both***.  
Alternatively, use __underscores__ for bold and _underscores_ for italic.  
Strikethrough is also possible: ~~this is no longer relevant~~.

---

## Blockquotes

> This is a blockquote. It can span multiple lines.
>
> > And you can nest blockquotes as well.

---

## Lists

### Unordered List
- First item
- Second item
  - Sub-item A
  - Sub-item B
- Third item

### Ordered List
1. Step one
2. Step two
   1. Sub-step 2.1
   2. Sub-step 2.2
3. Step three

### Task Lists (GitHub‑style)
- [x] Completed task
- [ ] Incomplete task
- [ ] Another pending item

---

## Code & Syntax Highlighting

Inline code: `print("Hello, world!")`

Fenced code block (with language specifier):
```python
def greet(name):
    return f"Hello, {name}!"
```

下面是一个完整的 **英文 Markdown 模板**，包含 `Jekyll` 格式的 Front Matter（页面布局、标题和固定链接），并在正文中展示了各类常用 Markdown 元素，同时兼顾了你之前要求的 LaTeX 公式（使用 `$` 和 `$$`）。你可以直接复制该内容，用于创建 `about.md` 或其他页面。

---

```markdown
---
layout: page
title: About
permalink: /about/
---

# About This Template

Welcome to my about page. This template demonstrates almost every common Markdown element you might need.

---

## Text Formatting

You can make text **bold**, *italic*, or ***both***.  
Alternatively, use __underscores__ for bold and _underscores_ for italic.  
Strikethrough is also possible: ~~this is no longer relevant~~.

---

## Blockquotes

> This is a blockquote. It can span multiple lines.
>
> > And you can nest blockquotes as well.

---

## Lists

### Unordered List
- First item
- Second item
  - Sub-item A
  - Sub-item B
- Third item

### Ordered List
1. Step one
2. Step two
   1. Sub-step 2.1
   2. Sub-step 2.2
3. Step three

### Task Lists (GitHub‑style)
- [x] Completed task
- [ ] Incomplete task
- [ ] Another pending item

---

## Code & Syntax Highlighting

Inline code: `print("Hello, world!")`

Fenced code block (with language specifier):
```python
def greet(name):
    return f"Hello, {name}!"
```

Plain code block without language:
```
Just some monospaced text.
```

---

## Tables

| Feature         | Supported | Notes                 |
| :-------------- | :-------: | :-------------------- |
| Bold/Italic     |    ✅     | Yes                   |
| Strikethrough   |    ✅     | Via `~~`              |
| Tables          |    ✅     | Align columns with `:`|
| LaTeX formulas  |    ✅     | With MathJax          |

---

## Links and Images

[Visit my GitHub profile](https://github.com)

![img](/assets/bg.jpg)

---

## Horizontal Rules

Use three or more dashes, asterisks, or underscores:

---

***

___

---

## LaTeX Math (using `$` and `$$`)

### Inline Formulas
The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.  
Euler’s identity: $e^{i\pi} + 1 = 0$.

### Display (Block) Formulas
The Gaussian integral:
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

A matrix:
$$
\begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
$$

Multi-line alignment:
$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \times \mathbf{B} &= \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

---

## Additional Elements

### Footnotes (if supported)
Here is a sentence with a footnote[^1].


# Ref.

[^1]: This is the footnote content.