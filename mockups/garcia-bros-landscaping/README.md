# Garcia Bro's Landscaping, homepage mockup

Concept homepage for Garcia Bro's Landscaping (Montgomery, AL). Built as a single
self-contained HTML file with no external network requests of any kind.

## Files

| File | What it is |
| --- | --- |
| `mockup.html` | The mockup. Fonts, artwork and icons are all embedded. Open it directly in a browser. |
| `Garcia-Bro-s-Landscaping-Web-IQ-Website-Preview.png` | Full-page screenshot at a 1200px viewport (2400 x 13230 at 2x). This is the image for the outreach email. |
| `Garcia-Bro-s-Landscaping-Web-IQ-Website-Concept.pdf` | Single tall page PDF of the same render. |

## Design decisions

- **Brand mode: refine.** The company wordmark is set in Lora with a tracked
  uppercase "LANDSCAPING" lockup, paired with a forest-green emblem. Palette is
  forest green, cream and a muted brass accent, which is the archetype direction
  for the niche and reads as a tidied-up version of a landscaping identity.
- **Type:** Lora (headings) + Inter (body), both embedded as base64 woff2, latin subset.
- **Artwork:** all imagery is original vector work (the hero "property plan",
  the service icons, the topographic background texture). No photographs are used
  and none are implied. The plan drawing is labelled "Illustrative" in its own header.

## Weaknesses from the audit, and where each is answered

| Audit finding | Where it is solved |
| --- | --- |
| No contact or quote form (critical) | Full estimate section (`#estimate`) plus "Request an estimate" links on every service card and after every major section. |
| No online estimate request | Name / phone / service dropdown, with optional address and notes. Three required fields. |
| Dated design and layout | Custom layout, custom artwork, consistent 8px spacing rhythm, restrained palette. |
| Weak page title and meta description | Purpose-written `<title>` and `<meta name="description">`. |
| No LocalBusiness / Review structured data | `LandscapingBusiness` JSON-LD with address, `areaServed`, `openingHoursSpecification`, `aggregateRating` and an offer catalog, plus a separate `FAQPage` block. |
| GBP has no description / no hours | The JSON-LD description and the hours table in the footer are both ready to paste into the Google Business Profile. |
| Images lack alt text | Every SVG carries a `role`/`aria-label` or `aria-hidden`, and the form has real labels. |
| No consistent palette | Single token set in `:root`, used throughout. |

## Facts used on the page

Only the supplied approved facts appear: phone (334) 235-5069, 5.0 Google rating
from 1 review, Montgomery AL, 3801 Quenby Dr, Montgomery, AL 36116, and hours of
7:00 AM to 9:00 PM seven days. Prattville is named because it appears in the
company's own tagline. No certifications, licence numbers, awards, memberships,
team names, years in business, job counts or response times are stated anywhere,
and no review text is invented.

## Confirm with the owner before sending

1. **Service list.** The five services shown (lawn care maintenance, landscaping
   and landscape installation, fence installation, fence repair, commercial
   grounds care) match the service pages on the current site, but confirm the
   wording is how they describe themselves.
2. **Hours.** The brief supplies 7:00 AM to 9:00 PM, seven days. Some third party
   directories list Mon to Fri, 7:00 AM to 5:30 PM. Confirm which is current
   before the hours go on the page and on the Google profile.
3. **Logo.** The real logo file could not be retrieved, so the wordmark is set in
   type and paired with a new emblem. Swap in the actual logo artwork if the
   owner wants it kept as is.
4. **Neutral placeholder copy.** These lines are standard positioning statements,
   not verified facts, and should be approved or reworded by the owner:
   - "Show up when we say we will, do the work properly, and leave the property clean."
   - "If something is not right, you call the number on this page and we come back."
   - "We are based here, not routed through a call center."
   - "One number, seven days ... answered 7:00 AM to 9:00 PM" and "goes to the people doing the work."
   - "No pressure to book on the spot."
   - "As more jobs are finished, their reviews land here automatically." (describes a
     proposed feature of the build, a live Google reviews feed.)

## Rebuilding

`mockup.html` is the deliverable and can be edited directly. It is also generated
from `src/template.html` + `src/build.py`, which inline the fonts and draw all of
the SVG artwork.

To regenerate from source, fetch the two font subsets first, then run the build:

```sh
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
curl -A "$UA" -o src/inter.woff2  "https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2"
curl -A "$UA" -o src/lora.woff2   "https://fonts.gstatic.com/s/lora/v37/0QIvMX1D_JOuMwr7Iw.woff2"
curl -A "$UA" -o src/lora-i.woff2 "https://fonts.gstatic.com/s/lora/v37/0QIhMX1D_JOuMw_LIftL.woff2"
for f in inter lora lora-i; do base64 -w0 src/$f.woff2 > src/$f.b64; done
python3 src/build.py
```
