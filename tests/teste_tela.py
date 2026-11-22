import asyncio, os
from playwright.async_api import async_playwright
res = []
def ok(c, m): res.append(c); print(('  OK    ' if c else '  FALHA ') + m)
CAIXA = "(()=>{const r=document.getElementById('stage').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,innerWidth,innerHeight]})()"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for (w, h, dpr) in [(960, 540, 2), (1280, 720, 1.5), (1920, 1080, 1), (1366, 768, 1)]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr)
            await ctx.add_init_script("window.MYHOUSE_ANDROID = {ip: '192.168.68.116', codigo: '4821'};")
            pg = await ctx.new_page(); await pg.goto('http://localhost:8787/index.html'); await pg.wait_for_timeout(1700)
            l, t, r, bt, W, H = await pg.evaluate(CAIXA)
            ok(l >= -0.5 and t >= -0.5 and r <= W + 0.5 and bt <= H + 0.5 and (abs(r - l - W) < 1 or abs(bt - t - H) < 1), f'tela {w}x{h}: app inteiro visível e ocupando a tela ({l:.0f},{t:.0f})-({r:.0f},{bt:.0f})')
            if w == 960:
                await pg.evaluate("Store.d.settings.tela=92;Store.save();scaleStage()")
                l, t, r, bt, W, H = await pg.evaluate(CAIXA)
                ok(abs((r - l) - W * 0.92) < 2 and abs(l - (W - (r - l)) / 2) < 1.5 and t > 0, f'tamanho 92%: encolhe e fica centralizado ({l:.0f},{t:.0f})')
                await pg.evaluate("Store.d.settings.tela=100;Store.save()")
            await ctx.close()
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720}); pg = await ctx.new_page()
        await pg.goto('http://localhost:8099/app/index.html'); await pg.wait_for_timeout(800)
        await pg.evaluate("""(async()=>{Store.d.lists=[{id:'l1',type:'xtream',server:'http://localhost:8099',user:'teste',pass:'1234',name:'T'}];Store.d.activeList='l1';Store.d.profiles=[{id:'p1',name:'Teste',color:0}];Store.d.activeProfile='p1';Store.save();})()""")
        await pg.goto('http://localhost:8099/app/index.html'); await pg.wait_for_timeout(1200)
        await pg.evaluate("App.reset('ajustes')"); await pg.wait_for_timeout(600)
        t = await pg.inner_text('#stage')
        ok('Tamanho da tela' in t and '88%' in t, 'Ajustes mostra a opção Tamanho da tela')
        await pg.click('[data-act=tela][data-v="92"]'); await pg.wait_for_timeout(400)
        ok(await pg.evaluate("Store.d.settings.tela===92 && !!document.querySelector('[data-act=tela][data-v=\"92\"].sel')"), 'escolher 92% grava e marca a opção')
        await pg.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'capturas-pc', '')+'ajustes-tela-92.png')
        await b.close()
    print(f'Resumo: {sum(res)} OK, {len(res)-sum(res)} falhas')
asyncio.run(main())
