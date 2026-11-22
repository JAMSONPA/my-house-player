import asyncio, os
from playwright.async_api import async_playwright
BASE = 'http://localhost:8787/index.html'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'capturas-pc'); os.makedirs(OUT, exist_ok=True)
res = []
def ok(c, m): res.append(c); print(('  OK    ' if c else '  FALHA ') + m)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required'])
        pg = await (await b.new_context(viewport={'width': 1280, 'height': 720})).new_page()
        erros = []; pg.on('pageerror', lambda e: erros.append(str(e)))
        await pg.goto(BASE); await pg.wait_for_timeout(800)
        await pg.click('[data-act=tab][data-v=m]')
        await pg.fill('input[data-bind=url]', 'http://localhost:8099/lista-ts.m3u')
        await pg.click('[data-act=go]'); await pg.wait_for_timeout(1500)
        await pg.fill('input[data-bind=name]', 'Teste'); await pg.click('[data-act=criar]'); await pg.wait_for_timeout(300)
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(2500)
        ok('Esporte Total' in await pg.inner_text('#stage'), 'lista M3U com canais em MPEG-TS conecta')
        ok(await pg.evaluate('!!window.mpegts'), 'biblioteca mpegts.js carregada no PC')
        try:
            await pg.wait_for_function('document.getElementById("v").currentTime > 2 && document.getElementById("v").videoWidth > 0', timeout=15000); tocando = True
        except Exception: tocando = False
        ok(tocando, 'canal ao vivo em MPEG-TS mostra imagem e anda')
        await pg.screenshot(path=f'{OUT}/ts-ao-vivo.png')
        await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(300); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(500)
        t0 = await pg.evaluate('document.getElementById("v").currentTime')
        try:
            await pg.wait_for_function(f'document.getElementById("v").currentTime > 2', timeout=15000); ok(True, 'trocar de canal continua tocando')
        except Exception: ok(False, 'trocar de canal continua tocando')
        ok(not erros, 'sem erros de JavaScript ' + str(erros[:2]))
        await b.close()
    print(f'Resumo: {sum(res)} OK, {len(res)-sum(res)} falhas')
asyncio.run(main())
