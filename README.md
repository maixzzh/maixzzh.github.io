# Minima-based Personal Blog (Liquid Glass support)

This repository contains a personal blog built on the Jekyll Minima theme with support for the "Liquid Glass" customizations. The site is intended to be simple, easy to preview locally, and compatible with GitHub Pages (safe mode).

[Preview: https://mxkfemkkk.github.io/](https://mxkfemkkk.github.io/)

## Highlights / Features

- Manual dark/light mode toggle — users can switch between light and dark themes manually. The site provides a UI control to toggle the theme and preserve the preference across visits.
- Liquid Glass theme support — glassmorphism-inspired visuals and UI polish driven by the "Liquid Glass" customizations layered on top of Minima.
- Native LaTeX formula rendering — inline and display math are supported out of the box (KaTeX/MathJax-powered), so technical posts can include properly formatted mathematics without extra configuration.
- GitHub Pages compatible — safe-mode friendly and does not depend on unsupported plugins.
- Simple manual pagination — works without pagination plugins (10 posts per page by default).

## Local preview

Requirements:
- Ruby
- Bundler
- Jekyll

Install dependencies and run the local server:

```bash
bundle install
bundle exec jekyll serve
```

Open your browser at: http://localhost:4000

## Writing posts

Create new posts under the `_posts/` directory. File names must follow the Jekyll convention:

`YYYY-MM-DD-slug.md`

Example front matter:

```markdown
---
title: Your Post Title
tags: [tag1, tag2]
d: A one-line short description.
---

Post content goes here...
```

Notes:
- `d`: a short description shown on post lists and post pages.
- Publication date is determined by the file name. The date must be less than or equal to the current date or Jekyll will not publish the post.

## Pagination (manual)

GitHub Pages builds run in safe mode and do not allow most pagination plugins. This theme uses simple manual pagination. Each page shows 10 posts.

When your total post count exceeds `10 × N`, create a new paged index:

1. Create `posts/page{N+1}/index.html` (for example `posts/page3/index.html` for the 21–30 posts).
2. Add front matter to the file, for example:

```yaml
---
layout: posts
offset: 20
---
```

The `offset` value should be `10 × N` (zero-based). In the example above, page 3 uses `offset: 20` to show posts 21–30.

## Site configuration

Common places to update site settings and assets:

- Site title / homepage name: `_config.yml` → `title`
- Social links: `_includes/social.html` (replace placeholder UIDs for Bilibili / Zhihu / Weibo with real values). Email is taken from `_config.yml` → `email`.
- Avatar: replace `assets/images/avatar.svg` with your avatar image.
- Signature: `_config.yml` → `signature`

## Deployment

This theme is compatible with GitHub Pages. Because Pages builds use safe mode, avoid relying on unsupported plugins. To build locally before deploying:

```bash
bundle exec jekyll build
```

Then publish the generated `_site/` to GitHub Pages as usual (push to `gh-pages` or use the `main` branch GitHub Pages settings depending on your repository setup).

## Troubleshooting

- If a post does not appear, check that the date in the filename is not in the future.
- Confirm that social UIDs in `_includes/social.html` are replaced with valid identifiers.
- If CSS or assets do not load, verify paths under `assets/` and that files are committed.

## Contributing

Feel free to open issues or submit pull requests to improve the theme, fix bugs, or update documentation.

---

If you want the README in another language or formatted differently, say which language or format (e.g., Chinese, shorter version, or expanded developer notes) and the README will be updated accordingly.