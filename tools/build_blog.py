#!/usr/bin/env python3
"""Build the static blog and sitemap.

Posts live in content/blog/*.md: header lines (key: value, `faq: Q | A` may
repeat), a line with `---`, then Markdown. Output goes to blog/<slug>/index.html,
blog/index.html and sitemap.xml. Run: python3 tools/build_blog.py
Needs: pip install markdown
"""
import html
import json
import pathlib
import re
from datetime import date

import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://pipgrove.com"
APP = "https://apps.apple.com/app/apple-store/id6831633288?pt=129745812&amp;ct=blog&amp;mt=8"


def parse(path):
    raw = path.read_text(encoding="utf-8")
    head, body = raw.split("\n---\n", 1)
    meta, faq = {}, []
    for line in head.strip().splitlines():
        k, v = line.split(":", 1)
        v = v.strip()
        if k == "faq":
            q, a = [x.strip() for x in v.split("|", 1)]
            faq.append((q, a))
        else:
            meta[k.strip()] = v
    meta["faq"] = faq
    md = markdown.Markdown(extensions=["tables", "toc", "attr_list"])
    meta["html"] = md.convert(body)
    meta["words"] = len(re.findall(r"\w+", body))
    return meta


HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#070b16">
<meta name="apple-itunes-app" content="app-id=6831633288">
<meta property="og:type" content="{ogtype}">
<meta property="og:title" content="{ogtitle}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/icon.png">
<link rel="preload" href="/assets/fonts/instrument-serif-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/manrope-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/blog.css">
<script src="/assets/ga.js" defer></script>
{ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="bar">
  <a class="brand" href="/"><img src="/assets/icon.png" alt="" width="30" height="30"><span>Pipgrove</span></a>
  <nav aria-label="Main"><a href="/blog/">Blog</a><a class="get" href="{APP}">Get the app</a></nav>
</header>
"""

FOOT = """<footer class="foot">
  <div class="inner">
    <p>Pipgrove is a calm iPhone coach for quitting added sugar. <a href="/">See how it works</a>.</p>
    <nav aria-label="Pipgrove links"><a href="/blog/">Blog</a><a href="https://www.instagram.com/pipgrove" rel="me noopener">Instagram</a><a href="https://www.tiktok.com/@pipgrove" rel="me noopener">TikTok</a><a href="/support.html">Support</a><a href="/privacy.html">Privacy</a><a href="/health.html">Health note</a></nav>
    <p class="legal">Articles are for general information and are not medical advice. Apple and the App Store are trademarks of Apple Inc. © 2026 Pipgrove</p>
  </div>
</footer>
</body>
</html>
"""


def nice_date(d):
    y, m, dd = map(int, d.split("-"))
    return date(y, m, dd).strftime("%B %-d, %Y")


def post_page(p, others):
    url = f"{SITE}/blog/{p['slug']}/"
    article = {
        "@context": "https://schema.org", "@type": "BlogPosting",
        "headline": p["title"], "description": p["description"],
        "datePublished": p["date"], "dateModified": p["date"],
        "author": {"@type": "Organization", "name": "Pipgrove", "url": SITE + "/"},
        "publisher": {"@type": "Organization", "name": "Pipgrove", "logo": {"@type": "ImageObject", "url": SITE + "/assets/icon.png"}},
        "image": SITE + p["image"], "mainEntityOfPage": url, "wordCount": p["words"],
    }
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Pipgrove", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "Blog", "item": SITE + "/blog/"},
        {"@type": "ListItem", "position": 3, "name": p["title"], "item": url}]}
    lds = [article, crumbs]
    if p["faq"]:
        lds.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faq"]]})
    ld = "\n".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in lds)
    faq_html = ""
    if p["faq"]:
        faq_html = '<section class="post-faq" aria-labelledby="faq-h"><h2 id="faq-h">Quick answers</h2>' + "".join(
            f"<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>" for q, a in p["faq"]) + "</section>"
    more = "".join(f'<li><a href="/blog/{o["slug"]}/">{html.escape(o["title"])}</a></li>' for o in others)
    minutes = max(1, round(p["words"] / 230))
    out = HEAD.format(title=html.escape(p.get("seotitle", p["title"])), description=html.escape(p["description"]), url=url,
                      ogtype="article", ogtitle=html.escape(p["title"]), ld=ld, SITE=SITE, APP=APP)
    out += f"""<main id="main" class="post">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Pipgrove</a> / <a href="/blog/">Blog</a></nav>
  <header class="post-head">
    <h1>{html.escape(p['title'])}</h1>
    <p class="dek">{html.escape(p['description'])}</p>
    <p class="meta">By the Pipgrove team. <time datetime="{p['date']}">{nice_date(p['date'])}</time>, {minutes} min read.</p>
  </header>
  <article class="prose">
{p['html']}
  </article>
  {faq_html}
  <aside class="cta" aria-label="Get Pipgrove">
    <img src="/assets/art/pip_cheer.webp" alt="" width="120" height="120" loading="lazy" decoding="async">
    <div><p class="cta-h">Beat cravings. <em>Grow a garden.</em></p><p>Pipgrove gives you an SOS for cravings, a garden that grows with every sugar-free day and a kind letter each morning. Free for your first week.</p>
    <a class="badge" href="{APP}">Download on the App Store</a></div>
  </aside>
  <section class="more" aria-labelledby="more-h"><h2 id="more-h">Keep reading</h2><ul>{more}</ul></section>
</main>
"""
    out += FOOT
    return out


def index_page(posts):
    url = f"{SITE}/blog/"
    ld = '<script type="application/ld+json">' + json.dumps({
        "@context": "https://schema.org", "@type": "Blog", "name": "The Pipgrove blog", "url": url,
        "blogPost": [{"@type": "BlogPosting", "headline": p["title"], "url": f"{SITE}/blog/{p['slug']}/", "datePublished": p["date"]} for p in posts]},
        ensure_ascii=False) + "</script>"
    out = HEAD.format(title="Quit Sugar Blog: Cravings, Withdrawal, Habits",
                      description="Plain, research-backed guides to sugar cravings, sugar withdrawal and building a calmer relationship with sugar.",
                      url=url, ogtype="website", ogtitle="The Pipgrove blog", ld=ld, SITE=SITE, APP=APP)
    cards = "".join(f"""<li class="card"><a href="/blog/{p['slug']}/"><img src="{p['image']}" alt="" width="96" height="96" loading="lazy" decoding="async"><span><b>{html.escape(p['title'])}</b><small>{html.escape(p['description'])}</small></span></a></li>""" for p in posts)
    out += f"""<main id="main" class="blog-index">
  <header class="post-head"><h1>Notes from <em>the garden.</em></h1><p class="dek">Plain, research-backed guides to sugar cravings, withdrawal and habits that last. No diet culture, no shame.</p></header>
  <ul class="cards">{cards}</ul>
</main>
"""
    out += FOOT
    return out


def main():
    posts = sorted((parse(f) for f in (ROOT / "content/blog").glob("*.md")), key=lambda p: p["date"], reverse=True)
    for p in posts:
        d = ROOT / "blog" / p["slug"]
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(post_page(p, [o for o in posts if o is not p]), encoding="utf-8")
    (ROOT / "blog").mkdir(exist_ok=True)
    (ROOT / "blog/index.html").write_text(index_page(posts), encoding="utf-8")
    today = date.today().isoformat()
    urls = [("/", today, "1.0"), ("/blog/", today, "0.8")] + [(f"/blog/{p['slug']}/", p["date"], "0.7") for p in posts] + \
           []
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
        f"  <url><loc>{SITE}{u}</loc><lastmod>{m}</lastmod><priority>{pr}</priority></url>\n" for u, m, pr in urls) + "</urlset>\n"
    (ROOT / "sitemap.xml").write_text(sm, encoding="utf-8")
    print(f"built {len(posts)} posts")


if __name__ == "__main__":
    main()
