---
layout: page
title: Tags - 标签
permalink: /tags/
---
{% comment %}
  site.tags 是「标签 → 文章数组」的哈希，没法整体 where_exp 过滤，
  只能在内层逐标签过滤。外层还要判过滤后的篇数：否则只有私密文章的标签
  会留下一个空的 <h2>，标签名本身就泄漏了。
{% endcomment %}
{% for tag in site.tags %}
{% assign tag_posts = tag[1] | where_exp: "p", "p.secret == 0" %}
{% if tag_posts.size > 0 %}
<h2>{{ tag[0] }}</h2>
<ul>
  {% for post in tag_posts %}
  <li>{{ post.date | date: site.date_format }} · <a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>
{% endif %}
{% endfor %}
