#!/usr/bin/env python3
import math, pathlib, re

D = pathlib.Path(__file__).parent

FOREST = "#14432E"
BRASS  = "#A97D2B"
BRASS2 = "#C9A34E"

# ---------------------------------------------------------------- helpers
def stars(fill, size=15):
    p = "M12 1.9l3.06 6.2 6.84 1-4.95 4.82 1.17 6.82L12 17.52 5.88 20.74l1.17-6.82L2.1 9.1l6.84-1z"
    s = "".join(f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" aria-hidden="true"><path d="{p}" fill="{fill}"/></svg>' for _ in range(5))
    return f'<span class="stars" role="img" aria-label="5 out of 5 stars">{s}</span>'

def ico(body, size=24, stroke=FOREST, w=1.5, box=24):
    return (f'<svg viewBox="0 0 {box} {box}" width="{size}" height="{size}" fill="none" '
            f'stroke="{stroke}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" '
            f'aria-hidden="true">{body}</svg>')

# ---------------------------------------------------------------- contour art
def contours(clusters, opacity_scale=1.0, colors=(FOREST, BRASS), base_op=0.075, vb="0 0 1440 720", cls="contours"):
    out = []
    for (cx, cy, n, r0, step, seed) in clusters:
        for k in range(n):
            r = r0 + k * step
            pts = []
            for i in range(129):
                t = i / 128 * 2 * math.pi
                rr = r * (1 + 0.085 * math.sin(3 * t + k * 0.45 + seed)
                            + 0.05 * math.sin(5 * t + 1.3 + seed * 0.7)
                            + 0.03 * math.sin(7 * t + k * 0.2))
                pts.append(f"{cx + rr*math.cos(t):.1f} {cy + rr*math.sin(t)*0.78:.1f}")
            col = colors[0] if k % 3 else colors[1]
            op = base_op * opacity_scale * (1 - k / (n * 1.6))
            out.append(f'<path d="M{pts[0]}L{"L".join(pts[1:])}Z" fill="none" stroke="{col}" '
                       f'stroke-opacity="{op:.3f}" stroke-width="1.1"/>')
    return (f'<svg class="{cls}" viewBox="{vb}" preserveAspectRatio="xMidYMid slice" '
            f'aria-hidden="true" focusable="false">{"".join(out)}</svg>')

HERO_CONTOURS = contours([(1215, 150, 11, 78, 58, 0.0), (110, 690, 7, 52, 46, 1.9)], base_op=0.085)
QUOTE_CONTOURS = contours([(180, 120, 9, 66, 54, 0.6), (1290, 600, 8, 60, 50, 2.4)],
                          colors=("#FFFFFF", BRASS2), base_op=0.11, vb="0 0 1440 780", cls="contours2")

STRIPES = ('<svg class="stripes" aria-hidden="true" width="100%" height="100%">'
           '<defs><pattern id="mowstripe" width="164" height="164" patternUnits="userSpaceOnUse" '
           'patternTransform="rotate(-22)"><rect width="82" height="164" fill="#ffffff" opacity="0.028"/>'
           '</pattern></defs><rect width="100%" height="100%" fill="url(#mowstripe)"/></svg>')

# ---------------------------------------------------------------- logo mark
def mark(size=44):
    """Monogram: hairline brass ring, forest badge, stylised leaf + blade of grass."""
    s = size
    return f'''<svg class="mark" viewBox="0 0 48 48" width="{s}" height="{s}" role="img" aria-label="Garcia Bro's Landscaping emblem">
<circle cx="24" cy="24" r="23" fill="none" stroke="{BRASS}" stroke-opacity=".55" stroke-width="1"/>
<circle cx="24" cy="24" r="19.5" fill="{FOREST}"/>
<path d="M24 33.6c0-6.6 3.1-11.4 8.6-13.9-.5 7.3-3.6 11.9-8.6 13.9z" fill="{BRASS2}" fill-opacity=".92"/>
<path d="M24 33.6c0-7.4-3.4-12.6-9.4-15.3.6 8.1 3.9 13.1 9.4 15.3z" fill="#EDF3E7" fill-opacity=".95"/>
<path d="M24 34.8V22.4" stroke="#EDF3E7" stroke-opacity=".8" stroke-width="1.5" stroke-linecap="round"/>
<path d="M15.6 36.6h16.8" stroke="{BRASS2}" stroke-width="1.4" stroke-linecap="round"/>
</svg>'''

# ---------------------------------------------------------------- site plan
def site_plan():
    lawnA, lawnB = "#BCD5AE", "#A9C899"
    bed = "#E4EDD8"
    hard = "#E7E3D6"
    house = "#FFFDF7"
    ink = FOREST

    def mow_h(x, y, w, h, rx=3):
        return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="url(#mowH)" stroke="{ink}" stroke-opacity=".2"/>'
    def mow_v(x, y, w, h, rx=3):
        return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="url(#mowV)" stroke="{ink}" stroke-opacity=".2"/>'

    def tree(cx, cy, r):
        rings = "".join(
            f'<circle cx="{cx}" cy="{cy}" r="{r*f:.1f}" fill="none" stroke="#5E8C63" stroke-opacity=".45" stroke-width="1"/>'
            for f in (0.72, 0.46))
        scallop = "".join(
            f'<circle cx="{cx + r*0.98*math.cos(i/9*2*math.pi):.1f}" cy="{cy + r*0.98*math.sin(i/9*2*math.pi):.1f}" r="{r*0.26:.1f}" fill="#7FAA83"/>'
            for i in range(9))
        return (f'<g>{scallop}<circle cx="{cx}" cy="{cy}" r="{r}" fill="#78A47D"/>{rings}'
                f'<circle cx="{cx}" cy="{cy}" r="2.4" fill="#4B7350"/></g>')

    def shrubs(pts, r=6.5):
        return "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#8FB98F" stroke="#5E8C63" stroke-opacity=".5" stroke-width=".9"/>' for x, y in pts)

    def chip(cx, cy, w, text, lx, ly):
        h = 21
        return (f'<g><path d="M{cx} {cy} L{lx} {ly}" stroke="{ink}" stroke-opacity=".45" stroke-width="1" stroke-dasharray="2 3"/>'
                f'<circle cx="{lx}" cy="{ly}" r="2.6" fill="{BRASS}"/>'
                f'<rect x="{cx-w/2}" y="{cy-h/2}" width="{w}" height="{h}" rx="4" fill="#fff" stroke="{ink}" stroke-opacity=".2"/>'
                f'<text x="{cx}" y="{cy+3.6}" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" '
                f'font-weight="600" letter-spacing="1.15" fill="{ink}" fill-opacity=".72">{text}</text></g>')

    # fence with post ticks
    fence_pts = [(44, 336), (44, 44), (556, 44), (556, 336)]
    fence_path = f'M{fence_pts[0][0]} {fence_pts[0][1]}' + "".join(f'L{x} {y}' for x, y in fence_pts[1:])
    posts = []
    for (x1, y1), (x2, y2) in zip(fence_pts, fence_pts[1:]):
        dist = math.hypot(x2 - x1, y2 - y1)
        n = max(2, int(dist // 26))
        for i in range(n + 1):
            t = i / n
            posts.append(f'<circle cx="{x1+(x2-x1)*t:.1f}" cy="{y1+(y2-y1)*t:.1f}" r="2.1" fill="{BRASS}" fill-opacity=".85"/>')

    return f'''<svg viewBox="0 0 600 540" width="100%" role="img" aria-label="Illustrative site plan of a property showing mowed lawn areas, planting beds, a fence line and a driveway">
<defs>
  <pattern id="mowH" width="600" height="24" patternUnits="userSpaceOnUse">
    <rect width="600" height="12" fill="{lawnA}"/><rect y="12" width="600" height="12" fill="{lawnB}"/>
  </pattern>
  <pattern id="mowV" width="24" height="600" patternUnits="userSpaceOnUse">
    <rect width="12" height="600" fill="{lawnA}"/><rect x="12" width="12" height="600" fill="{lawnB}"/>
  </pattern>
  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M20 0H0v20" fill="none" stroke="{ink}" stroke-opacity=".055" stroke-width="1"/>
  </pattern>
</defs>

<rect width="600" height="540" fill="#FBF9F2"/>
<rect width="600" height="540" fill="url(#grid)"/>

<!-- street + sidewalk -->
<rect x="0" y="490" width="600" height="50" fill="{hard}"/>
<path d="M0 490h600" stroke="{ink}" stroke-opacity=".16"/>
<path d="M0 515h600" stroke="#FFFFFF" stroke-opacity=".8" stroke-width="2" stroke-dasharray="16 14"/>
<text x="300" y="534" text-anchor="middle" font-family="Inter,sans-serif" font-size="8.5" font-weight="600" letter-spacing="2.4" fill="{ink}" fill-opacity=".33">STREET</text>
<rect x="0" y="478" width="600" height="12" fill="#F1EDE1"/>

<!-- plot boundary -->
<rect x="24" y="24" width="552" height="454" rx="6" fill="none" stroke="{ink}" stroke-opacity=".22" stroke-dasharray="7 5"/>

<!-- lawns -->
{mow_h(44, 52, 512, 60)}
{mow_v(44, 132, 72, 196)}
{mow_h(44, 348, 200, 128)}
{mow_h(266, 348, 124, 128)}
{mow_h(516, 348, 40, 128)}

<!-- driveway + walkway -->
<rect x="398" y="300" width="114" height="178" fill="{hard}" stroke="{ink}" stroke-opacity=".18"/>
<path d="M398 340h114M398 380h114M398 420h114" stroke="{ink}" stroke-opacity=".1"/>
<rect x="248" y="340" width="18" height="138" fill="#EDE9DC" stroke="{ink}" stroke-opacity=".16"/>

<!-- beds -->
<path d="M396 136h160v156H396z" fill="{bed}" stroke="{ink}" stroke-opacity=".16"/>
{tree(505, 178, 34)}
{shrubs([(416,268),(444,276),(472,268),(500,276),(528,268),(548,276)])}
<rect x="132" y="314" width="252" height="26" rx="4" fill="{bed}" stroke="{ink}" stroke-opacity=".16"/>
{shrubs([(150,327),(178,327),(206,327),(292,327),(320,327),(348,327),(374,327)], r=6)}

<!-- hedge along the left of the house -->
{shrubs([(124,146),(124,168),(124,190),(124,212),(124,234),(124,256),(124,278),(124,300)], r=8)}
{tree(80, 214, 27)}

<!-- house -->
<rect x="132" y="132" width="252" height="180" rx="3" fill="{house}" stroke="{ink}" stroke-opacity=".55" stroke-width="1.6"/>
<path d="M132 132l82 58M384 132l-82 58M132 312l82-58M384 312l-82-58M214 190h88v64h-88z" fill="none" stroke="{ink}" stroke-opacity=".22"/>
<rect x="214" y="288" width="88" height="24" fill="#F4F0E3" stroke="{ink}" stroke-opacity=".3"/>
<text x="258" y="176" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" font-weight="600" letter-spacing="1.6" fill="{ink}" fill-opacity=".4">RESIDENCE</text>

<!-- fence line -->
<path d="{fence_path}" fill="none" stroke="{BRASS}" stroke-opacity=".9" stroke-width="2" stroke-dasharray="9 5"/>
{"".join(posts)}

<!-- callouts -->
{chip(322, 84, 92, "FENCE LINE", 322, 46)}
{chip(326, 396, 132, "LAWN MAINTENANCE", 326, 452)}
{chip(478, 108, 118, "LANDSCAPE BEDS", 470, 250)}
</svg>'''

# ---------------------------------------------------------------- icons
ARROW_W = ('<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" '
           'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
           '<path d="M3.5 10h12M11 5.5l4.5 4.5-4.5 4.5"/></svg>')

PHONE_ICON = ico('<path d="M6.2 3.5h3l1.5 3.8-1.9 1.1a10.5 10.5 0 0 0 4.8 4.8l1.1-1.9 3.8 1.5v3a1.5 1.5 0 0 1-1.7 1.5C10.6 16.6 5.4 11.4 4.7 5.2A1.5 1.5 0 0 1 6.2 3.5z"/>',
                 size=16, stroke="currentColor", w=1.55)

CHECK = ico('<circle cx="12" cy="12" r="9"/><path d="M8.2 12.2l2.6 2.6 5-5.4"/>', size=16, stroke=BRASS, w=1.5)
CLOCK = ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.4 2"/>', size=16, stroke=BRASS, w=1.5)
PIN   = ico('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>', size=16, stroke=BRASS, w=1.5)

def g_glyph(color=FOREST, size=17):
    return (f'<b style="font-family:Lora,Georgia,serif;font-size:{size}px;font-weight:600;'
            f'color:{color};line-height:1;letter-spacing:0;">G</b>')

def g_circle_light():
    return ('<span style="width:20px;height:20px;border-radius:50%;border:1px solid rgba(255,255,255,.4);'
            'display:inline-grid;place-items:center;font-family:Lora,Georgia,serif;font-size:12px;'
            'font-weight:600;color:#fff;line-height:1;">G</span>')

LOCK = ico('<rect x="5" y="10" width="14" height="9.5" rx="2"/><path d="M8.2 10V7.6a3.8 3.8 0 0 1 7.6 0V10"/>',
           size=14, stroke="#8C978F", w=1.4)

# service icons -------------------------------------------------------------
def svc_lawn():
    return ico(f'<path d="M3.2 17.6V13.4h6.6l1.8-3.4h4.4l2.4 7.6z"/>'
               f'<circle cx="6.4" cy="18.2" r="2.2"/><circle cx="15.8" cy="18.2" r="2.2"/>'
               f'<path d="M16.4 12.2 20.2 5.4h1.6" stroke="{BRASS}"/>'
               f'<path d="M2 21.4h20" stroke="{BRASS}"/>', size=28)

def svc_landscape():
    return ico(f'<path d="M11.6 20.6v-5.4"/>'
               f'<path d="M8.6 15.4A4.2 4.2 0 0 1 7 7.7 4.9 4.9 0 0 1 16.2 6a4 4 0 0 1-.7 9.4z"/>'
               f'<path d="M3.4 20.6h16.8" stroke="{BRASS}"/>', size=28)

def svc_fence_install():
    p = lambda x: f'<path d="M{x} 20.4V10.4l2-2 2 2v10"/>'
    return ico(f'{p(3.2)}{p(10)}{p(16.8)}'
               f'<path d="M2.4 13.2h19.2M2.4 17h19.2" stroke="{BRASS}"/>', size=28)

def svc_fence_repair():
    p = lambda x: f'<path d="M{x} 20.4V10.4l2-2 2 2v10"/>'
    return ico(f'{p(3.2)}{p(10)}'
               f'<path d="M16.8 20.4v-8.2l2-2 2 2v8.2" stroke="{BRASS}"/>'
               f'<path d="M2.4 14.6h19.2M2.4 18h19.2"/>'
               f'<path d="M18.8 7.4V3.6M17.2 5.2l1.6-1.6 1.6 1.6" stroke="{BRASS}"/>', size=28)

def svc_commercial():
    return ico(f'<path d="M2.4 20.9h19.2" stroke="{BRASS}"/>'
               f'<path d="M4.6 20.6V4.6h8.2v16"/>'
               f'<path d="M7 8.2h1.4M10.4 8.2h1.4M7 11.8h1.4M10.4 11.8h1.4M7 15.4h1.4M10.4 15.4h1.4"/>'
               f'<path d="M17.8 20.6v-5"/><circle cx="17.8" cy="12.2" r="3.4"/>', size=28)

SERVICES = [
    ("Lawn Care Maintenance", svc_lawn(),
     "Regular cutting, edging and clean up on a schedule, so the lawn stays in shape instead of getting away from you."),
    ("Landscaping &amp; Installation", svc_landscape(),
     "Planting beds, shrubs, ground cover and the shaping work that makes the front of a property look cared for."),
    ("Fence Installation", svc_fence_install(),
     "New wood fencing, set straight and set properly, for privacy, for pets, or for marking a boundary."),
    ("Fence Repair", svc_fence_repair(),
     "Leaning posts, broken pickets and storm damage put right, without replacing a fence that does not need replacing."),
    ("Commercial Grounds Care", svc_commercial(),
     "Grounds maintenance for business properties in Montgomery and Prattville, on a rhythm that suits the site."),
]

def service_cards():
    out = []
    for title, icon, desc in SERVICES:
        out.append(f'''<article class="svc">
        <span class="svc-ico">{icon}</span>
        <h3>{title}</h3>
        <p>{desc}</p>
        <a class="more" href="#estimate">Request an estimate {ARROW_W}</a>
      </article>''')
    return "\n      ".join(out)

# credential list icons (brass, on dark)
C_PIN   = ico('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>', size=18, stroke=BRASS2, w=1.5)
C_PHONE = ico('<path d="M6.2 3.5h3l1.5 3.8-1.9 1.1a10.5 10.5 0 0 0 4.8 4.8l1.1-1.9 3.8 1.5v3a1.5 1.5 0 0 1-1.7 1.5C10.6 16.6 5.4 11.4 4.7 5.2A1.5 1.5 0 0 1 6.2 3.5z"/>', size=18, stroke=BRASS2, w=1.5)
C_STAR  = ico('<path d="M12 3.4l2.7 5.4 6 .9-4.35 4.2 1.03 5.95L12 17.05 6.62 19.85l1.03-5.95L3.3 9.7l6-.9z"/>', size=18, stroke=BRASS2, w=1.5)
C_BUILD = ico('<path d="M3 20.5h18"/><path d="M5 20.5V6.5h8v14"/><path d="M8 10h2M8 14h2"/><path d="M17 20.5v-4.6"/><circle cx="17" cy="12.6" r="3"/>', size=18, stroke=BRASS2, w=1.4)

# pillar icons (light on dark)
LIGHT = "rgba(255,255,255,.94)"
P_LEAF  = ico(f'<path d="M3.2 17.6V13.4h6.6l1.8-3.4h4.4l2.4 7.6z"/>'
              f'<circle cx="6.4" cy="18.2" r="2.2"/><circle cx="15.8" cy="18.2" r="2.2"/>'
              f'<path d="M16.4 12.2 20.2 5.4h1.6" stroke="{BRASS2}"/>'
              f'<path d="M2 21.4h20" stroke="{BRASS2}"/>', size=34, stroke=LIGHT, w=1.5)
P_FENCE = ico(f'<path d="M3 20.4V10.4l2-2 2 2v10M10 20.4V10.4l2-2 2 2v10M17 20.4V10.4l2-2 2 2v10"/>'
              f'<path d="M2 13.2h20M2 17h20" stroke="{BRASS2}"/>', size=34, stroke=LIGHT, w=1.5)
P_BUILD = ico(f'<path d="M2.4 20.9h19.2" stroke="{BRASS2}"/>'
              f'<path d="M4.6 20.6V4.6h8.2v16"/>'
              f'<path d="M7 8.2h1.4M10.4 8.2h1.4M7 11.8h1.4M10.4 11.8h1.4M7 15.4h1.4M10.4 15.4h1.4"/>'
              f'<path d="M17.8 20.6v-5"/><circle cx="17.8" cy="12.2" r="3.4"/>', size=34, stroke=LIGHT, w=1.5)
P_CLOCK = ico(f'<circle cx="12" cy="12" r="9"/><path d="M12 6.6V12l3.8 2.2" stroke="{BRASS2}"/>', size=34, stroke=LIGHT, w=1.5)

# quote-section icons
Q_PHONE = ico('<path d="M6.2 3.5h3l1.5 3.8-1.9 1.1a10.5 10.5 0 0 0 4.8 4.8l1.1-1.9 3.8 1.5v3a1.5 1.5 0 0 1-1.7 1.5C10.6 16.6 5.4 11.4 4.7 5.2A1.5 1.5 0 0 1 6.2 3.5z"/>', size=19, stroke=BRASS2, w=1.5)
Q_PIN   = ico('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>', size=19, stroke=BRASS2, w=1.5)
Q_CLOCK = ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.4 2"/>', size=19, stroke=BRASS2, w=1.5)

F_PIN   = ico('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>', size=15, stroke="rgba(255,255,255,.45)", w=1.5)
F_PHONE = ico('<path d="M6.2 3.5h3l1.5 3.8-1.9 1.1a10.5 10.5 0 0 0 4.8 4.8l1.1-1.9 3.8 1.5v3a1.5 1.5 0 0 1-1.7 1.5C10.6 16.6 5.4 11.4 4.7 5.2A1.5 1.5 0 0 1 6.2 3.5z"/>', size=15, stroke="rgba(255,255,255,.45)", w=1.5)

SVC_PIN = ico('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>', size=15, stroke=BRASS, w=1.5)

# ---------------------------------------------------------------- assemble
tpl = (D / "template.html").read_text()

repl = {
    "__INTER__": (D / "inter.b64").read_text().strip(),
    "__LORA__": (D / "lora.b64").read_text().strip(),
    "__LORAI__": (D / "lora-i.b64").read_text().strip(),
    "__MARK__": mark(44),
    "__MARK_SM__": mark(38),
    "__CONTOURS__": HERO_CONTOURS,
    "__CONTOURS2__": QUOTE_CONTOURS,
    "__STRIPES__": STRIPES,
    "__SITEPLAN__": site_plan(),
    "__SERVICE_CARDS__": service_cards(),
    "__ARROW_W__": ARROW_W,
    "__PHONE_ICON__": PHONE_ICON,
    "__STARS5__": stars(BRASS),
    "__STARS5_BRASS__": stars(BRASS2, 17),
    "__CHECK__": CHECK,
    "__CLOCK__": CLOCK,
    "__PIN__": SVC_PIN,
    "__GLYPH_G__": g_glyph(),
    "__GLYPH_G_LIGHT__": g_circle_light(),
    "__C_PIN__": C_PIN, "__C_PHONE__": C_PHONE, "__C_STAR__": C_STAR, "__C_BUILD__": C_BUILD,
    "__P_LEAF__": P_LEAF, "__P_FENCE__": P_FENCE, "__P_BUILD__": P_BUILD, "__P_CLOCK__": P_CLOCK,
    "__Q_PHONE__": Q_PHONE, "__Q_PIN__": Q_PIN, "__Q_CLOCK__": Q_CLOCK,
    "__F_PIN__": F_PIN, "__F_PHONE__": F_PHONE,
    "__LOCK__": LOCK,
}

for k, v in repl.items():
    tpl = tpl.replace(k, v)

left = re.findall(r"__[A-Z0-9_]+__", tpl)
if left:
    raise SystemExit(f"unreplaced placeholders: {sorted(set(left))}")

out = pathlib.Path("/home/user/mission-control/mockups/garcia-bros-landscaping/mockup.html")
out.write_text(tpl)
print(f"wrote {out}  ({len(tpl)/1024:.0f} KB)")
