#!/usr/bin/env python3
"""Builds ask tota blog posts from a metadata json + a body html fragment.

usage:  python3 .blogtools/build.py            # build every post in .blogtools/posts
        python3 .blogtools/build.py slug slug  # build only these

Each post needs .blogtools/posts/<slug>.json and .blogtools/posts/<slug>.body.html.
Output goes to blog/<slug>.html. The nav, zodiac rail and footer come from
.blogtools/chrome_top.html and .blogtools/chrome_foot.html so every post stays identical.
"""
import json, sys, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = ROOT / '.blogtools'
POSTS = TOOLS / 'posts'
OUT = ROOT / 'blog'
SITE = 'https://www.asktota.com'

CHROME_TOP = (TOOLS / 'chrome_top.html').read_text()
CHROME_FOOT = (TOOLS / 'chrome_foot.html').read_text()

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="{description}" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
  <meta name="theme-color" content="#fbf3e0" />
  <link rel="canonical" href="{url}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="{url}" />
  <meta property="og:site_name" content="Ask Tota" />
  <meta property="og:title" content="{og_title}" />
  <meta property="og:description" content="{og_description}" />
  <meta property="og:image" content="{SITE}/assets/og-image.png" />
  <meta name="author" content="Ask Tota" />
  <meta name="color-scheme" content="light" />
  <meta property="og:locale" content="en_IN" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="article:published_time" content="{published}" />
  <meta property="article:modified_time" content="{modified}" />
  <meta property="article:section" content="{section}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{og_title}" />
  <meta name="twitter:description" content="{og_description}" />
  <meta name="twitter:image" content="{SITE}/assets/og-image.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap" rel="stylesheet" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="stylesheet" href="../styles.css" />
  <script type="application/ld+json">
{jsonld}
  </script>
  <!-- Vercel Web Analytics -->
  <script>
    window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
</head>
<body>{chrome_top}

  <main class="blog-main" id="main">
      <article class="blog-article">
        <header class="blog-header">
          <p class="section-kicker">{kicker}</p>
          <h1>{h1}</h1>
          <p class="blog-dek">{dek}</p>
          <p class="blog-byline">{byline}</p>
        </header>

{body}
      </article>
  </main>
{chrome_foot}
  <script src="../script.js"></script>
</body>
</html>
"""


def build(slug):
    meta = json.loads((POSTS / f'{slug}.json').read_text())
    body = (POSTS / f'{slug}.body.html').read_text().rstrip() + '\n'
    url = f'{SITE}/blog/{slug}.html'
    modified = meta.get('modified', meta['published'])

    graph = [
        {
            "@type": "BlogPosting",
            "headline": meta['og_title'],
            "description": meta['description'],
            "datePublished": meta['published'],
            "dateModified": modified,
            "author": {"@type": "Organization", "name": "Ask Tota"},
            "publisher": {
                "@type": "Organization", "name": "Ask Tota",
                "logo": {"@type": "ImageObject", "url": f"{SITE}/icon-512.png"},
                "url": f"{SITE}/",
            },
            "mainEntityOfPage": {"@type": "WebPage", "@id": url},
            "@id": f"{url}#post",
            "url": url,
            "isPartOf": {"@type": "Blog", "@id": f"{SITE}/blog/#blog", "name": "Ask Tota Blog"},
            "inLanguage": "en",
            "articleSection": meta['section'],
            "keywords": meta['keywords'],
            "image": {"@type": "ImageObject", "url": f"{SITE}/assets/og-image.png", "width": 1200, "height": 630},
            "speakable": {"@type": "SpeakableSpecification", "cssSelector": [".blog-header h1", ".blog-dek"]},
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Ask Tota", "item": f"{SITE}/"},
                {"@type": "ListItem", "position": 2, "name": "Blog", "item": f"{SITE}/blog/"},
                {"@type": "ListItem", "position": 3, "name": meta['og_title'], "item": url},
            ],
        },
        {
            "@type": "FAQPage",
            "@id": f"{url}#faq",
            "mainEntity": [
                {"@type": "Question", "name": f['q'],
                 "acceptedAnswer": {"@type": "Answer", "text": f['a']}}
                for f in meta['faq']
            ],
        },
    ]
    jsonld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)
    jsonld = '\n'.join('    ' + line for line in jsonld.splitlines())

    page = PAGE.format(
        SITE=SITE, url=url, jsonld=jsonld, chrome_top=CHROME_TOP, chrome_foot=CHROME_FOOT,
        title=html.escape(meta['title'], quote=True),
        description=html.escape(meta['description'], quote=True),
        og_title=html.escape(meta['og_title'], quote=True),
        og_description=html.escape(meta['og_description'], quote=True),
        published=meta['published'], modified=modified,
        section=html.escape(meta['section'], quote=True),
        kicker=meta.get('kicker', 'THE BLOG &middot; EXPLAINER'),
        h1=meta['h1'], dek=meta['dek'],
        byline=f"{meta['byline_date']} &middot; {meta['read_time']}",
        body=body,
    )
    (OUT / f'{slug}.html').write_text(page)
    return slug, len(page)


if __name__ == '__main__':
    slugs = sys.argv[1:] or sorted(p.stem for p in POSTS.glob('*.json'))
    for s in slugs:
        name, size = build(s)
        print(f'built blog/{name}.html  ({size:,} bytes)')
