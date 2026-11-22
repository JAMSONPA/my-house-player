import asyncio, os
from playwright.async_api import async_playwright
res = []
def ok(c, m): res.append(c); print(('  OK    ' if c else '  FALHA ') + m)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720})
        await ctx.add_init_script("window.MYHOUSE_ANDROID = {ip: '192.168.68.116', codigo: '4821'};")
        pg = await ctx.new_page(); erros = []; pg.on('pageerror', lambda e: erros.append(str(e)))
        await pg.goto('http://localhost:8787/index.html'); await pg.wait_for_timeout(900)
        t = await pg.inner_text('#stage')
        ok('192.168.68.116:8787/enviar' in t and '4821' in t, 'login mostra o endereço /enviar e o código')
        ok(await pg.evaluate("!document.documentElement.classList.contains('pc')"), 'dicas no estilo controle de TV (não teclado de PC)')
        await pg.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'capturas-pc', 'android-login.png'))
        await pg.click('[data-act=tab][data-v=m]')
        await pg.fill('input[data-bind=url]', 'http://localhost:8099/lista-ts.m3u')
        await pg.click('[data-act=go]'); await pg.wait_for_timeout(1500)
        await pg.fill('input[data-bind=name]', 'Teste'); await pg.click('[data-act=criar]'); await pg.wait_for_timeout(300)
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(2500)
        try:
            await pg.wait_for_function('document.getElementById("v").currentTime > 2 && document.getElementById("v").videoWidth > 0', timeout=15000); v = True
        except Exception: v = False
        ok(v, 'canal ao vivo em MPEG-TS toca')
        h = await pg.evaluate("[...document.querySelectorAll('.hint')].pop().innerText")
        ok('OK' in h and 'Enter' not in h, 'dica mostra OK: ' + h[:40].replace('\n', ' '))
        await pg.evaluate('MYHOUSE_TECLA(405)'); await pg.wait_for_timeout(600)
        ok(await pg.evaluate("!!document.querySelector('#ov').innerHTML.trim()"), 'tecla amarela do controle (vinda do Android) abre as categorias')
        await pg.evaluate('MYHOUSE_TECLA(461)'); await pg.wait_for_timeout(400)
        ok(await pg.evaluate("!document.querySelector('#ov').innerHTML.trim()"), 'tecla Voltar do controle (vinda do Android) fecha')
        ok(not erros, 'sem erros de JavaScript ' + str(erros[:2]))
        await b.close()
    print(f'Resumo: {sum(res)} OK, {len(res)-sum(res)} falhas')
asyncio.run(main())
