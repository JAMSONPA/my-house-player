import asyncio, json, os
from playwright.async_api import async_playwright
CFG=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'lista-config.json')
async def run(conteudo, esperado, nome):
    if conteudo is None:
        if os.path.exists(CFG): os.rename(CFG, CFG+'.off')
    else: open(CFG,'w').write(json.dumps(conteudo))
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1920,'height':1080}); erros=[]
        pg.on('pageerror', lambda e: erros.append(str(e)))
        await pg.goto('http://localhost:8099/app/index.html?compat=1'); await pg.wait_for_timeout(2500)
        t = await pg.inner_text('#stage')
        ok = esperado in t and not erros
        print(('  OK   ' if ok else '  FALHA'), nome, erros[:2])
        await b.close()
async def main():
    await run({"servidor":"http://localhost:8099","usuario":"teste","senha":"1234"}, 'Como você se chama?', 'arquivo preenchido: conecta sozinho e vai para criar perfil')
    await run({"servidor":"http://localhost:8099","usuario":"teste","senha":"errada"}, 'Usuário ou senha incorretos', 'senha errada no arquivo: abre o login com o aviso')
    await run({"servidor":"http://exemplo.com","usuario":"","senha":""}, 'Vamos conectar sua lista', 'arquivo em branco: abre o login normal')
    await run({"servidor":"http://localhost:8099/html","reservas":["http://localhost:8099"],"usuario":"teste","senha":"1234"}, 'Como você se chama?', 'primeiro endereço responde errado: usa o reserva e conecta')
    await run({"servidor":"http://localhost:8099/html","reservas":[],"usuario":"teste","senha":"1234"}, 'BLOCKED_USER_AGENT', 'nenhum endereço serve: mostra o começo da resposta do servidor')
    await run({"m3u":"http://localhost:8099/lista.m3u"}, 'Como você se chama?', 'link M3U no arquivo: baixa a lista e conecta')
    await run({"m3u":"http://localhost:8099/m3u-negado"}, 'INVALID_CREDENTIALS', 'link M3U recusado: mostra o motivo do servidor')
    os.remove(CFG)
asyncio.run(main())
