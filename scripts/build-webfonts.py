"""Local Manrope and renamed Noto Sans SC subset; requires fontTools.
Run after changing UI/order text: python scripts/build-webfonts.py.
Optionally reuse downloaded originals with --source-dir PATH.
"""
from pathlib import Path
import argparse, shutil, tempfile, urllib.request
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
URLS = {
    'Manrope.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/Manrope%5Bwght%5D.ttf',
    'Manrope-OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt',
    'NotoSansSC.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf',
    'NotoSansSC-OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/OFL.txt',
}

def build(source):
    out = ROOT / 'dist/fonts'
    out.mkdir(exist_ok=True)
    font = TTFont(source / 'Manrope.ttf')
    font.flavor = 'woff'
    font.save(out / 'Manrope-Variable.woff')
    font = instantiateVariableFont(TTFont(source / 'NotoSansSC.ttf'), {'wght': 400}, inplace=True)
    text = ''.join((ROOT / path).read_text() for path in [
        'dist/app.js', 'dist/pop-colors.js', 'dist/index.html', 'dist/photo-materials.js', 'dist/customization-sheet.js'
    ]) + ''.join(chr(i) for i in range(32, 127))
    options = subset.Options()
    options.notdef_glyph = options.notdef_outline = True
    smaller = subset.Subsetter(options=options)
    smaller.populate(text=text)
    smaller.subset(font)
    for name in font['name'].names:
        if name.nameID in [1, 3, 4, 6, 16]:
            value = 'HidebookOrderSans' if name.nameID == 6 else 'Hidebook Order Sans'
            name.string = value.encode(name.getEncoding())
    font.flavor = 'woff'
    font.save(out / 'Hidebook-Order-Sans.woff')
    for name in ['Manrope-OFL.txt', 'NotoSansSC-OFL.txt']:
        shutil.copy2(source / name, out / name)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', type=Path)
    args = parser.parse_args()
    if args.source_dir:
        build(args.source_dir)
    else:
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder)
            for name, url in URLS.items():
                (source / name).write_bytes(urllib.request.urlopen(url, timeout=60).read())
            build(source)
