---
layout: page
title: tag
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
