# Builds public/guide.html from the tutorial script and the FAQ list.
# Usage: python3 tools/build_guide.py tools/讲解稿.md public/guide.html tools/faq.json
# One section per "## title" in 讲解稿.md, bullets as points, picture public/guide/NN.jpg.
import re, html, sys, json
src, out, faq_src = sys.argv[1], sys.argv[2], sys.argv[3]
FM = 'https://filemanager.czechgames.com/storage/files/'
SRC = {'rb': ('基础规则书', FM + 'lost-ruins-of-arnak/rules/lost-ruins-of-arnak-rules-zh-s.pdf'),
       'el': ('《探险队长》规则书', FM + 'lost-ruins-of-arnak-expedition-leaders/rules/lost-ruins-of-arnak-expedition-leaders-rules-zh-s.pdf'),
       'me': ('《失踪的探险队》规则书', FM + 'lost-ruins-of-arnak-the-missing-expedition/rules/AR3%20rulebook%20ZH-S%2007.pdf'),
       'cb': ('冒险手册', FM + 'lost-ruins-of-arnak-the-missing-expedition/other-downloads/campaign-book/AR3%20campaign%20rules%20ZH-S%2008.pdf'),
       'bgg': ('设计者在 BGG 的回答', None)}
faq = json.load(open(faq_src))
def cite(f):
    name, url = SRC[f['src']]
    url = f.get('url') or url
    label = f'来源：{name}' + (f'第 {f["p"]} 页' if f.get('p') else '')
    return f'<a href="{url}" target="_blank" rel="noopener">{label}</a>'
cats = list(dict.fromkeys(f['cat'] for f in faq))
faq_html = ''.join(f'<h3 class="fq-cat">{html.escape(c)}</h3>' + ''.join(
    f'<details class="card fq"><summary>{html.escape(f["q"])}</summary><p>{html.escape(f["a"])} {cite(f)}</p></details>'
    for f in faq if f['cat'] == c) for c in cats)
secs = re.findall(r'^## (.+?)\n(.*?)(?=^## |\Z)', open(src).read(), re.M | re.S)
toc = '<a class="fqa" href="#faq">常见问题</a>' + ''.join(f'<a href="#s{i}">{html.escape(t)}</a>' for i, (t, _) in enumerate(secs, 1))
body = ''
for i, (t, b) in enumerate(secs, 1):
    pts = ''.join(f'<li>{html.escape(x)}</li>' for x in re.findall(r'^- (.+)$', b, re.M))
    body += f'''<section class="card gs" id="s{i}"><h2 class="h"><span><i>{i:02d}</i>{html.escape(t)}</span></h2>
<img src="guide/{i:02d}.jpg" width="800" height="394" alt="{html.escape(t)}" loading="{'eager' if i < 3 else 'lazy'}"><ul>{pts}</ul></section>\n'''
open(out, 'w').write(f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0f2219">
<title>新手教程 · 阿纳克遗迹</title>
<meta property="og:title" content="新手教程 · 阿纳克遗迹">
<meta property="og:image" content="https://arnak.leisurecat.cloud/img/icon-512.jpg">
<link rel="icon" href="img/icon-64.png">
<link rel="apple-touch-icon" href="img/icon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&family=Noto+Serif+SC:wght@600;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>
<div style="position:absolute;width:0;height:0;overflow:hidden"><img src="img/icon-512.jpg" alt=""></div>
<div class="hero"><div class="en">LOST RUINS OF ARNAK</div><h1>新手教程</h1><div class="orn"></div></div><div class="band"></div>
<div class="wrap guide">
<p class="note">依据 CGE 官方规则书（简体中文版，一刻馆出版）用自己的话整理，有疑问以规则书为准。官方规则书可在 <a href="https://www.czechgames.com/games/lost-ruins-of-arnak" target="_blank" rel="noopener">CGE 官网</a>下载。</p>
<h2 class="h">图文讲解<small>{len(secs)} 节</small></h2>
<nav class="toc">{toc}</nav>
{body}<h2 class="h" id="faq">常见问题<small>{len(faq)} 条</small></h2>
<p class="note">官方没有单独的 FAQ 或勘误，以下依据各本规则书和设计者在 BGG 上的回答整理，点开查看答案。</p>
{faq_html}
<a class="btn" href="./">返回首页</a>
<footer>非官方玩家工具 · 插图为原创绘制</footer>
</div>
<script type="module" src="chat.js"></script>
</body>
</html>
''')
print(len(secs), len(faq))
