import asyncio, json, os
from playwright.async_api import async_playwright
res = []
def ok(c, m): res.append(c); print(('  OK    ' if c else '  FALHA ') + m)
FAKE = """window.MYHOUSE_ANDROID = {ip: '192.168.68.116', codigo: '4821'};
window.MyHouseAndroid = { versao: () => 101, nomeVersao: () => '1.1.1', sair: () => {},
  atualizar: (u) => { window.__atu = u; setTimeout(() => MYHOUSE_ATUALIZACAO('baixando'), 50); } };"""
async def rodada(b, versao_publicada):
    ctx = await b.new_context(viewport={'width': 1280, 'height': 720})
    await ctx.add_init_script(FAKE)
    pg = await ctx.new_page(); erros = []; pg.on('pageerror', lambda e: erros.append(str(e)))
    await pg.route('**/p?u=*versao.json*', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'versao': versao_publicada, 'nome': '1.1.%d' % (versao_publicada - 100)})))
    await pg.goto('http://localhost:8787/index.html'); await pg.wait_for_timeout(600)
    await pg.evaluate("""Store.d.lists=[{id:'l1',type:'xtream',server:'http://localhost:8099',user:'teste',pass:'1234',name:'T'}];Store.d.activeList='l1';Store.d.profiles=[{id:'p1',name:'Teste',color:0}];Store.d.activeProfile='p1';Store.save()""")
    await pg.goto('http://localhost:8787/index.html'); await pg.wait_for_timeout(9500)
    return pg, erros
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg, erros = await rodada(b, 105)
        ok('Nova versão do MY HOUSE disponível' in await pg.inner_text('#toast'), 'ao abrir, avisa que há versão nova')
        await pg.evaluate("App.reset('ajustes')"); await pg.wait_for_timeout(400)
        await pg.click('[data-act=sec][data-v=sobre]'); await pg.wait_for_timeout(400)
        t = await pg.inner_text('.aj-body')
        ok('Atualização do app' in t and '1.1.5' in t, 'Ajustes › Sobre mostra a versão nova 1.1.5')
        ok('(app 1.1.1)' in t, 'mostra a versão instalada')
        await pg.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'capturas-pc', '')+'atualizacao-disponivel.png')
        await pg.click('[data-act=instalarapp]'); await pg.wait_for_timeout(500)
        ok((await pg.evaluate('window.__atu') or '').endswith('/releases/download/apk/MyHouse.apk'), 'botão Atualizar baixa o MyHouse.apk do GitHub')
        ok('Baixando a versão nova' in await pg.inner_text('#stage'), 'mostra "Baixando a versão nova…"')
        await pg.evaluate("MYHOUSE_ATUALIZACAO('permissao')"); await pg.wait_for_timeout(300)
        ok('instalar apps' in await pg.inner_text('#toast'), 'explica a permissão de instalar apps')
        ok(not erros, 'sem erros de JavaScript ' + str(erros[:2]))
        await pg.context.close()
        pg, erros = await rodada(b, 101)
        ok('Nova versão' not in await pg.inner_text('#toast'), 'sem versão nova: não incomoda ao abrir')
        await pg.evaluate("App.reset('ajustes')"); await pg.wait_for_timeout(400)
        await pg.click('[data-act=sec][data-v=sobre]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act=verapp]'); await pg.wait_for_timeout(800)
        ok('versão mais nova' in await pg.inner_text('.aj-body'), 'Verificar atualização: diz que já está em dia')
        await pg.context.close()
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720}); pg = await ctx.new_page()
        await pg.goto('http://localhost:8099/app/index.html'); await pg.wait_for_timeout(600)
        await pg.evaluate("""Store.d.lists=[{id:'l1',type:'xtream',server:'http://localhost:8099',user:'teste',pass:'1234',name:'T'}];Store.d.activeList='l1';Store.d.profiles=[{id:'p1',name:'Teste',color:0}];Store.d.activeProfile='p1';Store.save()""")
        await pg.goto('http://localhost:8099/app/index.html'); await pg.wait_for_timeout(800)
        await pg.evaluate("App.reset('ajustes')"); await pg.wait_for_timeout(400)
        await pg.click('[data-act=sec][data-v=sobre]'); await pg.wait_for_timeout(300)
        ok('Atualização do app' not in await pg.inner_text('.aj-body'), 'na TV LG a opção não aparece (lá não se atualiza sozinho)')
        await b.close()
    print(f'Resumo: {sum(res)} OK, {len(res)-sum(res)} falhas')
asyncio.run(main())
