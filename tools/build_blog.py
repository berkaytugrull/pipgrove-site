#!/usr/bin/env python3
"""Build the static blog (English + other languages) and the sitemap.

Posts live in content/blog/*.md: header lines (key: value, `faq: Q | A` may
repeat, optional `lang: pt`), a line with `---`, then Markdown. English posts go
to blog/<slug>/, other languages to <lang>/blog/<slug>/. Each language gets its
own index. A post can embed an interactive tool with
<div class="tool" data-tool="sugar-calc"></div> (see assets/tools.js).
Run: python3 tools/build_blog.py   Needs: pip install markdown
"""
import html
import json
import pathlib
import re
from datetime import date

import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://pipgrove.com"


def app_link(ct):
    return f"https://apps.apple.com/app/apple-store/id6831633288?pt=129745812&amp;ct={ct}&amp;mt=8"


MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

S = {
    "en": dict(
        locale="en_US", home="/", blog="/blog/", app=app_link("blog"), get="Get the app", blog_label="Blog",
        by="By the Pipgrove team.", read="min read", quick="Quick answers", more="Keep reading",
        cta_h="Beat cravings. <em>Grow a garden.</em>",
        cta_p="Pipgrove gives you an SOS for cravings, a garden that grows with every sugar-free day and a kind letter each morning. Free for your first week.",
        badge="Download on the App Store",
        foot="Pipgrove is a calm iPhone coach for quitting added sugar. <a href=\"/\">See how it works</a>.",
        legal="Articles are for general information and are not medical advice. Apple and the App Store are trademarks of Apple Inc. © 2026 Pipgrove",
        other='<a href="/pt/" hreflang="pt" lang="pt">Português</a>',
        idx_title="Quit Sugar Blog: Cravings, Withdrawal, Habits",
        idx_desc="Plain, research-backed guides to sugar cravings, sugar withdrawal and building a calmer relationship with sugar.",
        idx_h1="Notes from <em>the garden.</em>",
        idx_dek="Plain, research-backed guides to sugar cravings, withdrawal and habits that last. No diet culture, no shame.",
        idx_og="The Pipgrove blog",
    ),
    "pt": dict(
        locale="pt_BR", home="/pt/", blog="/pt/blog/", app=app_link("pt-blog"), get="Baixar o app", blog_label="Blog",
        by="Pela equipe Pipgrove.", read="min de leitura", quick="Respostas rápidas", more="Continue lendo",
        cta_h="Vença a vontade. <em>Cultive um jardim.</em>",
        cta_p="O Pipgrove tem um SOS para a vontade de doce, um jardim que cresce a cada dia sem açúcar e uma carta gentil toda manhã. Grátis na primeira semana. Por enquanto o app está em inglês.",
        badge="Baixar na App Store",
        foot="Pipgrove é um coach calmo para iPhone que ajuda a largar o açúcar adicionado. <a href=\"/pt/\">Veja como funciona</a>.",
        legal="Os artigos são informativos e não substituem orientação médica. Apple e App Store são marcas da Apple Inc. © 2026 Pipgrove",
        other='<a href="/" hreflang="en" lang="en">English</a>',
        idx_title="Blog para largar o açúcar: vontade de doce e hábitos",
        idx_desc="Guias simples e baseados em pesquisa sobre vontade de comer doce, abstinência de açúcar e hábitos que duram.",
        idx_h1="Notas do <em>jardim.</em>",
        idx_dek="Guias simples sobre vontade de doce e hábitos que duram. Sem dieta da moda, sem culpa.",
        idx_og="O blog do Pipgrove",
    ),
}


def parse(path):
    raw = path.read_text(encoding="utf-8")
    head, body = raw.split("\n---\n", 1)
    meta, faq = {"lang": "en"}, []
    for line in head.strip().splitlines():
        k, v = line.split(":", 1)
        v = v.strip()
        if k == "faq":
            q, a = [x.strip() for x in v.split("|", 1)]
            faq.append((q, a))
        else:
            meta[k.strip()] = v
    meta["faq"] = faq
    md = markdown.Markdown(extensions=["tables", "toc", "attr_list", "md_in_html"])
    meta["html"] = md.convert(body)
    meta["words"] = len(re.findall(r"\w+", re.sub(r"<[^>]+>", " ", body)))
    meta["path"] = f"{S[meta['lang']]['blog']}{meta['slug']}/"
    return meta


HEAD = """<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#070b16">
<meta name="apple-itunes-app" content="app-id=6831633288">
<meta property="og:type" content="{ogtype}">
<meta property="og:locale" content="{locale}">
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
{extra}{ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="bar">
  <a class="brand" href="{home}"><img src="/assets/icon.png" alt="" width="30" height="30"><span>Pipgrove</span></a>
  <nav aria-label="Main"><a href="{blog}">{blog_label}</a><a class="get" href="{app}">{get}</a></nav>
</header>
"""

FOOT = """<footer class="foot">
  <div class="inner">
    <p>{foot}</p>
    <nav aria-label="Pipgrove links"><a href="{blog}">Blog</a><a href="https://www.instagram.com/pipgrove" rel="me noopener">Instagram</a><a href="https://www.tiktok.com/@pipgrove" rel="me noopener">TikTok</a><a href="/support.html">Support</a><a href="/privacy.html">Privacy</a><a href="/health.html">Health note</a><span class="lang-switch">{other}</span></nav>
    <p class="legal">{legal}</p>
  </div>
</footer>
</body>
</html>
"""


def nice_date(d, lang):
    y, m, dd = map(int, d.split("-"))
    if lang == "pt":
        return f"{dd} de {MONTHS_PT[m - 1]} de {y}"
    return date(y, m, dd).strftime("%B %-d, %Y")


def head(s, lang, **kw):
    return HEAD.format(lang=lang, locale=s["locale"], home=s["home"], blog=s["blog"], blog_label=s["blog_label"],
                       app=s["app"], get=s["get"], SITE=SITE, **kw)


def foot(s):
    return FOOT.format(foot=s["foot"], blog=s["blog"], other=s["other"], legal=s["legal"])


def post_page(p, others):
    s, lang = S[p["lang"]], p["lang"]
    url = SITE + p["path"]
    modified = p.get("updated", p["date"])
    article = {
        "@context": "https://schema.org", "@type": "BlogPosting", "inLanguage": lang,
        "headline": p["title"], "description": p["description"],
        "datePublished": p["date"], "dateModified": modified,
        "author": {"@type": "Organization", "name": "Pipgrove", "url": SITE + "/"},
        "publisher": {"@type": "Organization", "name": "Pipgrove", "logo": {"@type": "ImageObject", "url": SITE + "/assets/icon.png"}},
        "image": SITE + p["image"], "mainEntityOfPage": url, "wordCount": p["words"],
    }
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Pipgrove", "item": SITE + s["home"]},
        {"@type": "ListItem", "position": 2, "name": "Blog", "item": SITE + s["blog"]},
        {"@type": "ListItem", "position": 3, "name": p["title"], "item": url}]}
    lds = [article, crumbs]
    if p["faq"]:
        lds.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faq"]]})
    ld = "\n".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in lds)
    extra = '<script src="/assets/tools.js" defer></script>\n' if 'data-tool=' in p["html"] else ""
    faq_html = ""
    if p["faq"]:
        faq_html = f'<section class="post-faq" aria-labelledby="faq-h"><h2 id="faq-h">{s["quick"]}</h2>' + "".join(
            f"<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>" for q, a in p["faq"]) + "</section>"
    more = "".join(f'<li><a href="{o["path"]}">{html.escape(o["title"])}</a></li>' for o in others[:6])
    minutes = max(1, round(p["words"] / 230))
    out = head(s, lang, title=html.escape(p.get("seotitle", p["title"])), description=html.escape(p["description"]), url=url,
               ogtype="article", ogtitle=html.escape(p["title"]), ld=ld, extra=extra)
    out += f"""<main id="main" class="post">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="{s['home']}">Pipgrove</a> / <a href="{s['blog']}">Blog</a></nav>
  <header class="post-head">
    <h1>{html.escape(p['title'])}</h1>
    <p class="dek">{html.escape(p['description'])}</p>
    <p class="meta">{s['by']} <time datetime="{p['date']}">{nice_date(p['date'], lang)}</time>, {minutes} {s['read']}.</p>
  </header>
  <article class="prose">
{p['html']}
  </article>
  {faq_html}
  <aside class="cta" aria-label="Pipgrove">
    <img src="/assets/art/pip_cheer.webp" alt="" width="120" height="120" loading="lazy" decoding="async">
    <div><p class="cta-h">{s['cta_h']}</p><p>{s['cta_p']}</p>
    <a class="badge" href="{s['app']}">{s['badge']}</a></div>
  </aside>
  <section class="more" aria-labelledby="more-h"><h2 id="more-h">{s['more']}</h2><ul>{more}</ul></section>
</main>
"""
    return out + foot(s)


def index_page(posts, lang):
    s = S[lang]
    url = SITE + s["blog"]
    ld = '<script type="application/ld+json">' + json.dumps({
        "@context": "https://schema.org", "@type": "Blog", "name": s["idx_og"], "url": url, "inLanguage": lang,
        "blogPost": [{"@type": "BlogPosting", "headline": p["title"], "url": SITE + p["path"], "datePublished": p["date"]} for p in posts]},
        ensure_ascii=False) + "</script>"
    out = head(s, lang, title=s["idx_title"], description=s["idx_desc"], url=url, ogtype="website", ogtitle=s["idx_og"], ld=ld, extra="")
    cards = "".join(f"""<li class="card"><a href="{p['path']}"><img src="{p['image']}" alt="" width="96" height="96" loading="lazy" decoding="async"><span><b>{html.escape(p['title'])}</b><small>{html.escape(p['description'])}</small></span></a></li>""" for p in posts)
    out += f"""<main id="main" class="blog-index">
  <header class="post-head"><h1>{s['idx_h1']}</h1><p class="dek">{s['idx_dek']}</p></header>
  <ul class="cards">{cards}</ul>
</main>
"""
    return out + foot(s)


def main():
    posts = sorted((parse(f) for f in (ROOT / "content/blog").glob("*.md")), key=lambda p: p["date"], reverse=True)
    for lang in S:
        mine = [p for p in posts if p["lang"] == lang]
        for p in mine:
            d = ROOT / p["path"].strip("/")
            d.mkdir(parents=True, exist_ok=True)
            (d / "index.html").write_text(post_page(p, [o for o in mine if o is not p]), encoding="utf-8")
        if mine:
            d = ROOT / S[lang]["blog"].strip("/")
            d.mkdir(parents=True, exist_ok=True)
            (d / "index.html").write_text(index_page(mine, lang), encoding="utf-8")
    today = date.today().isoformat()
    # Home pages are translations of each other, so they carry hreflang alternates.
    alt = ('<xhtml:link rel="alternate" hreflang="en" href="https://pipgrove.com/"/>'
           '<xhtml:link rel="alternate" hreflang="pt" href="https://pipgrove.com/pt/"/>'
           '<xhtml:link rel="alternate" hreflang="x-default" href="https://pipgrove.com/"/>')
    urls = [("/", today, "1.0", alt), ("/pt/", today, "0.9", alt)]
    for lang in S:
        mine = [p for p in posts if p["lang"] == lang]
        if mine:
            urls.append((S[lang]["blog"], today, "0.8", ""))
            urls += [(p["path"], p.get("updated", p["date"]), "0.7", "") for p in mine]
    sm = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
          'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n') + "".join(
        f"  <url><loc>{SITE}{u}</loc><lastmod>{m}</lastmod><priority>{pr}</priority>{a}</url>\n" for u, m, pr, a in urls) + "</urlset>\n"
    (ROOT / "sitemap.xml").write_text(sm, encoding="utf-8")
    print(f"built {len(posts)} posts")


if __name__ == "__main__":
    main()
