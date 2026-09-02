from PIL import Image

src = r'apps/web/public/cheers-logo.png'
out = r'apps/web/public/cheers-logo-nav.png'

img = Image.open(src).convert('RGBA')
pixels = img.load()
w, h = img.size

min_x, min_y, max_x, max_y = w, h, -1, -1
for y in range(h):
    for x in range(w):
        _, _, _, a = pixels[x, y]
        if a > 16:
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

if max_x < min_x:
    raise SystemExit('No visible logo pixels found')

pad = 2
min_x = max(0, min_x - pad)
min_y = max(0, min_y - pad)
max_x = min(w - 1, max_x + pad)
max_y = min(h - 1, max_y + pad)

cropped = img.crop((min_x, min_y, max_x + 1, max_y + 1))

# Normalize to brand ink while preserving alpha
ink = (15, 28, 23)
nav = Image.new('RGBA', cropped.size, (0, 0, 0, 0))
cp = cropped.load()
np = nav.load()
cw, ch = cropped.size

for y in range(ch):
    for x in range(cw):
        _, _, _, a = cp[x, y]
        if a > 0:
            np[x, y] = (*ink, a)

nav.save(out, optimize=True)
print('saved', out, nav.size)
