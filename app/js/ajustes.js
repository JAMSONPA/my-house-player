/* MY HOUSE — Ajustes */
'use strict';

Screens.ajustes = () => {
  const A = { sec: 'apar' };
  const root = () => $('#screen');
  const SECS = [
    ['apar', 'Aparência', 'Modelo da TV ao Vivo, texto'],
    ['listas', 'Minhas listas', 'Login, vencimento, atualizar'],
    ['perfis', 'Perfis', 'Criar e excluir perfis'],
    ['pais', 'Controle dos pais', 'Senha para conteúdo +18'],
    ['sobre', 'Sobre o app', 'Versão e teclas do ' + TK.aparelho]
  ];
  const MODELOS = {
    a: ['Clássico', 'Opção A', 'Guia em grade com a prévia do canal no alto. Mostra mais canais de uma vez.'],
    b: ['Cinema', 'Opção B', 'O canal continua tocando na tela inteira e o guia aparece por cima.'],
    c: ['Lista simples', 'Opção C', 'Letras grandes e só o que está passando agora. A mais fácil de usar.']
  };

  function mini(m) {
    const lin = (n, h, foco) => Array.from({ length: n }, (_, i) => '<div style="height:' + h + 'px;display:flex;gap:3px"><div style="width:44px;border-radius:3px;background:#1C212C"></div><div style="flex:' + (1 + i % 3) + ' 1 0;border-radius:3px;background:' + (i === foco ? '#F2B33D' : '#252A35') + '"></div><div style="flex:2 1 0;border-radius:3px;background:#181C25"></div></div>').join('');
    if (m === 'a') return '<div class="mini" style="display:flex;gap:8px;padding:10px"><div style="width:16px;border-radius:4px;background:#1C212C"></div><div class="grow" style="display:flex;flex-direction:column;gap:6px"><div style="height:74px;display:flex;gap:8px"><div class="grow" style="display:flex;flex-direction:column;gap:6px;padding-top:6px"><div style="width:70%;height:12px;border-radius:3px;background:#F4F1EA"></div><div style="width:45%;height:7px;border-radius:3px;background:#5A6070"></div></div><div style="width:130px;border-radius:6px;background:#2B3A55"></div></div>' + lin(6, 14, 2) + '</div></div>';
    if (m === 'b') return '<div class="mini" style="background:radial-gradient(circle at 62% 28%,#4A6590 0%,#22324B 50%,#0E141F 100%)"><div style="position:absolute;top:14px;left:14px;width:60%;display:flex;flex-direction:column;gap:6px"><div style="width:30%;height:8px;border-radius:3px;background:#D63B3B"></div><div style="width:90%;height:13px;border-radius:3px;background:#F4F1EA"></div></div><div style="position:absolute;left:8px;right:8px;bottom:8px;height:112px;border-radius:8px;background:#0C1017;padding:8px;display:flex;flex-direction:column;gap:5px">' + lin(4, 18, 1) + '</div></div>';
    return '<div class="mini" style="display:flex;gap:8px;padding:10px"><div style="width:60px;display:flex;flex-direction:column;gap:6px">' + '<div style="height:9px;border-radius:3px;background:#262C38"></div>'.repeat(5) + '</div><div class="grow" style="display:flex;flex-direction:column;gap:5px">' +
      Array.from({ length: 6 }, (_, i) => '<div style="height:28px;border-radius:5px;background:#11151D;border:' + (i === 2 ? '2px solid #F2B33D' : '1px solid #1A1F29') + ';display:flex;flex-direction:column;justify-content:center;gap:4px;padding:0 8px"><div style="width:55%;height:6px;border-radius:2px;background:#C9CDD6"></div></div>').join('') +
      '</div><div style="width:110px;display:flex;flex-direction:column;gap:6px"><div style="height:62px;border-radius:6px;background:#2B3A55"></div><div style="width:80%;height:9px;border-radius:3px;background:#F4F1EA"></div></div></div>';
  }

  function corpoApar() {
    const pr = Store.profile();
    const atual = Store.layout();
    const soPerfil = !!(pr && pr.layout);
    const t = Store.d.settings.text || 'normal';
    return '<h1>Aparência da TV ao Vivo</h1><p class="sub" style="margin:-10px 0 0;font-size:2.3rem">Escolha como os canais aparecem. A troca vale na hora; filmes e séries não mudam.</p>' +
      '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px">' +
      Object.keys(MODELOS).map(k => '<div class="modelo f' + (k === atual ? ' uso' : '') + '" data-id="m' + k + '" data-act="modelo" data-v="' + k + '"' + (k === atual ? ' data-first="1"' : '') + '>' + mini(k) +
        '<div class="row" style="justify-content:space-between"><span class="sora" style="font-size:2.8rem;font-weight:600">' + MODELOS[k][0] + '</span>' +
        (k === atual ? '<span class="em-uso">' + ic('check', 18) + 'Em uso</span>' : '<span class="muted" style="font-size:1.8rem">' + MODELOS[k][1] + '</span>') + '</div>' +
        '<span style="font-size:2rem;line-height:1.4;color:var(--sub)">' + MODELOS[k][2] + '</span></div>').join('') + '</div>' +
      (pr ? '<div class="linha f" data-id="scope" data-act="scope"><div><div style="font-size:2.3rem;font-weight:600">Usar só no perfil ' + esc(pr.name) + '</div><div class="muted" style="font-size:1.8rem">Desligado: o modelo vale para todos os perfis desta TV</div></div><span class="toggle' + (soPerfil ? ' ligado' : '') + '"></span></div>' : '') +
      '<div class="linha"><div><div style="font-size:2.3rem;font-weight:600">Tamanho do texto</div><div class="muted" style="font-size:1.8rem">Vale para o app inteiro</div></div><div class="row" style="gap:8px">' +
      [['normal', 'Normal'], ['grande', 'Grande'], ['extra', 'Extra grande']].map(x => '<span class="seg f' + (t === x[0] ? ' sel' : '') + '" data-id="t' + x[0] + '" data-act="texto" data-v="' + x[0] + '">' + x[1] + '</span>').join('') + '</div></div>';
  }

  function corpoListas() {
    return '<h1>Minhas listas</h1>' +
      Store.d.lists.map(l => {
        const ex = expInfo(l), ativa = l.id === Store.d.activeList;
        return '<div class="card" style="display:flex;flex-direction:column;gap:14px;' + (ativa ? 'border-color:#3DBB6C' : '') + '">' +
          '<div class="row" style="justify-content:space-between"><span class="sora" style="font-size:3rem;font-weight:600">' + esc(l.name) + '</span>' + (ativa ? '<span class="em-uso">' + ic('check', 18) + 'Em uso</span>' : '') + '</div>' +
          '<div class="sub" style="font-size:2.1rem;line-height:1.6">' + (l.type === 'm3u' ? 'Link M3U: ' + esc(String(l.url).slice(0, 60)) : 'Servidor: ' + esc(l.server) + '<br>Usuário: ' + esc(l.user)) +
          '<br><span style="color:' + (ex.dias !== null && ex.dias <= 7 ? '#F6CF7E' : 'inherit') + '">' + esc(ex.txt) + '</span></div>' +
          '<div class="row" style="gap:14px">' + (ativa ? '' : '<button class="btn pri f" data-id="u' + l.id + '" data-act="usar" data-v="' + l.id + '">Usar esta lista</button>') +
          '<button class="btn f" data-id="x' + l.id + '" data-act="remover" data-v="' + l.id + '">Remover</button></div></div>';
      }).join('') +
      '<div class="row" style="gap:14px"><button class="btn f" data-id="atu" data-act="atualizar" data-first="1">Atualizar canais, filmes e séries</button><button class="btn f" data-id="add" data-act="addlista">Adicionar outra lista</button></div>';
  }

  function corpoPerfis() {
    return '<h1>Perfis</h1>' +
      Store.d.profiles.map(pr => '<div class="linha"><div class="row" style="gap:20px"><div style="width:64px;height:64px;border-radius:18px;background:' + pr.color + ';display:flex;align-items:center;justify-content:center;font:700 3rem Sora">' + esc(iniciais(pr.name).slice(0, 1)) + '</div>' +
        '<div><div style="font-size:2.5rem;font-weight:600">' + esc(pr.name) + '</div><div class="muted" style="font-size:1.8rem">' + (pr.kids ? 'Infantil' : 'Perfil comum') + (pr.layout ? ' · modelo próprio: ' + MODELOS[pr.layout][0] : '') + '</div></div></div>' +
        (pr.id === Store.d.activeProfile ? '<span class="em-uso">' + ic('check', 18) + 'Em uso</span>' : '<div class="row" style="gap:12px"><button class="btn f" data-id="pu' + pr.id + '" data-act="pusar" data-v="' + pr.id + '">Usar</button><button class="btn f" data-id="px' + pr.id + '" data-act="pexcluir" data-v="' + pr.id + '">Excluir</button></div>') + '</div>').join('') +
      '<div><button class="btn pri f" data-id="pnovo" data-act="pnovo" data-first="1">Novo perfil</button></div>';
  }

  function corpoPais() {
    const on = Pais.ativo();
    const nomes = Pais.nomesProtegidos();
    return '<h1>Controle dos pais</h1><p class="sub" style="margin:-10px 0 0;font-size:2.3rem">Categorias +18 (Adultos, +18, XXX, Hot, Erótico…) só abrem com senha e somem da busca, de “Todos”, dos favoritos e do “Continuar”.</p>' +
      '<div class="linha f" data-id="pon" data-act="paisToggle" data-first="1"><div><div style="font-size:2.3rem;font-weight:600">Exigir senha para conteúdo +18</div><div class="muted" style="font-size:1.8rem">' + (on ? 'Ligado' : 'Desligado: tudo aparece sem senha') + '</div></div><span class="toggle' + (on ? ' ligado' : '') + '"></span></div>' +
      '<div class="linha"><div><div style="font-size:2.3rem;font-weight:600">Senha</div><div class="muted" style="font-size:1.8rem">' + (Pais.padrao() ? 'Usando a senha padrão 1234 — troque por uma só sua' : 'Senha personalizada') + '</div></div>' +
      '<button class="btn f" data-id="ptroca" data-act="paisSenha">Trocar a senha</button></div>' +
      (on && Pais.aberto ? '<div class="linha"><div><div style="font-size:2.3rem;font-weight:600">Conteúdo +18 liberado agora</div><div class="muted" style="font-size:1.8rem">Fica liberado até fechar o app ou trocar de perfil</div></div><button class="btn pri f" data-id="pbloq" data-act="paisBloquear">Bloquear agora</button></div>' : '') +
      '<div class="card" style="padding:24px"><div style="font-size:2.1rem;font-weight:600;margin-bottom:10px">Categorias protegidas encontradas na sua lista</div><div class="sub" style="font-size:2rem;line-height:1.5">' +
      (nomes.length ? nomes.slice(0, 12).map(esc).join(' · ') + (nomes.length > 12 ? ' · e mais ' + (nomes.length - 12) : '') : 'Nenhuma até agora (aparecem aqui depois que você abre TV ao Vivo, Filmes ou Séries).') + '</div></div>';
  }

  function corpoSobre() {
    const teclas = NO_PC ? [
      ['▲ ▼', 'trocar de canal ou de item'], ['◀', 'abrir o menu'], ['Enter', 'assistir / tela cheia / guia'], ['Esc', 'voltar (duas vezes na TV ao Vivo: sair)'],
      ['0–9', 'ir direto ao número do canal'], ['R', 'favoritar / Minha lista'], ['G', 'buscar (no filme: trocar áudio)'],
      ['Y', 'categorias (no filme: legenda)'], ['B', 'último canal (na série: próximo episódio)'],
      ['Page Up / Down', 'canal seguinte / anterior'], ['F11', 'sair ou voltar à tela cheia']
    ] : [
      ['▲ ▼', 'trocar de canal ou de item'], ['◀', 'abrir o menu'], ['OK', 'assistir / tela cheia / guia'], ['Voltar', 'voltar (duas vezes na TV ao Vivo: sair)'],
      ['0–9', 'ir direto ao número do canal'], ['Vermelho', 'favoritar / Minha lista'], ['Verde', 'buscar (no filme: trocar áudio)'],
      ['Amarelo', 'categorias (no filme: legenda)'], ['Azul', 'último canal (na série: próximo episódio)']
    ];
    return '<h1>Sobre o MY HOUSE</h1><p class="sub" style="margin:0;font-size:2.3rem">Versão ' + VERSAO + '. Este app é só o player: os canais, filmes e séries vêm da lista que você assina.</p>' +
      '<div class="card f" data-id="teclas" data-first="1" style="display:grid;grid-template-columns:220px 1fr;gap:14px 24px;font-size:2.2rem">' +
      teclas.map(t => '<span class="k" style="justify-self:start">' + t[0] + '</span><span class="sub">' + t[1] + '</span>').join('') + '</div>';
  }

  const self = {
    render() {
      Video.el.className = 'v-hidden';
      const corpo = A.sec === 'apar' ? corpoApar() : A.sec === 'listas' ? corpoListas() : A.sec === 'perfis' ? corpoPerfis() : A.sec === 'pais' ? corpoPais() : corpoSobre();
      renderKeep(root(), '<div class="bg-cinema"></div><div style="position:absolute;top: 0; right: 0; bottom: 0; left: 0;background:rgba(4,6,10,.6)"></div><div class="aj">' +
        '<nav class="aj-nav"><div class="row" style="gap:14px;padding:0 14px 30px"><span class="acc">' + ic('gear', 34) + '</span><span class="sora" style="font-size:3.8rem;font-weight:700">Ajustes</span></div>' +
        SECS.map(s => '<div class="aj-sec f' + (s[0] === A.sec ? ' sel' : '') + '" data-id="s' + s[0] + '" data-act="sec" data-v="' + s[0] + '"><span class="t">' + s[1] + '</span><span class="d">' + s[2] + '</span></div>').join('') +
        '<div class="grow"></div><div class="hint"><span><span class="k">' + TK.back + '</span>sair dos ajustes</span></div></nav>' +
        '<section class="aj-body">' + corpo + '</section></div>');
    },
    act(n, d) {
      const pr = Store.profile();
      if (n === 'sec') { A.sec = d.v; self.render(); return; }
      if (n === 'modelo') {
        if (pr && pr.layout) pr.layout = d.v; else Store.d.settings.layout = d.v;
        Store.save(); UI.toast('Modelo ' + MODELOS[d.v][0] + ' ativado'); self.render(); return;
      }
      if (n === 'scope' && pr) { pr.layout = pr.layout ? null : Store.layout(); Store.save(); self.render(); return; }
      if (n === 'texto') { Store.d.settings.text = d.v; Store.save(); applyText(); self.render(); return; }
      if (n === 'atualizar') { Api.cache = {}; Api.m3u = null; UI.toast('Pronto: os dados serão baixados de novo da sua lista'); return; }
      if (n === 'addlista') { App.go('login', { canBack: true }); return; }
      if (n === 'usar') {
        Store.d.activeList = d.v; Store.save(); Api.set(cfgOf(Store.list()));
        App.reset('live'); UI.toast('Lista trocada'); return;
      }
      if (n === 'remover') {
        const l = Store.d.lists.find(x => x.id === d.v); if (!l) return;
        App.openOv(Ov.choice('Remover a lista ' + l.name + '?', 'Os dados de acesso serão apagados desta TV.', [['Sim, remover', () => {
          Store.d.lists = Store.d.lists.filter(x => x.id !== d.v);
          if (Store.d.activeList === d.v) Store.d.activeList = Store.d.lists[0] ? Store.d.lists[0].id : null;
          Store.save();
          const nova = Store.list();
          if (!nova) { App.reset('login'); return; }
          Api.set(cfgOf(nova)); self.render();
        }], ['Cancelar', null]]));
        return;
      }
      if (n === 'paisToggle') {
        if (Pais.ativo()) {
          App.openOv(Ov.pin({ titulo: 'Desligar o controle dos pais', texto: 'Digite a senha atual.', check: v => v === Pais.pin() ? true : 'Senha incorreta',
            ok: () => { Store.d.settings.pais = false; Store.save(); UI.toast('Controle dos pais desligado'); self.render(); } }));
        } else { Store.d.settings.pais = true; Pais.bloquear(); Store.save(); UI.toast('Controle dos pais ligado'); self.render(); }
        return;
      }
      if (n === 'paisBloquear') { Pais.bloquear(); UI.toast('Conteúdo +18 bloqueado'); self.render(); return; }
      if (n === 'paisSenha') {
        App.openOv(Ov.pin({ titulo: 'Trocar a senha', texto: 'Primeiro, digite a senha atual.', check: v => v === Pais.pin() ? true : 'Senha incorreta',
          ok: () => App.openOv(Ov.pin({ titulo: 'Nova senha', texto: 'Escolha 4 números.', check: () => true,
            ok: nova => App.openOv(Ov.pin({ titulo: 'Confirme a nova senha', texto: 'Digite os mesmos 4 números de novo.', check: v => v === nova ? true : 'Não confere com a nova senha. Tente de novo.',
              ok: () => { Store.d.settings.pin = nova; Store.save(); UI.toast('Senha do controle dos pais trocada'); self.render(); } })) })) }));
        return;
      }
      if (n === 'pnovo') { App.openOv(Ov.perfilForm(() => self.render(), false)); return; }
      if (n === 'pusar') { Store.d.activeProfile = d.v; Store.save(); App.reset('live'); return; }
      if (n === 'pexcluir') {
        const x = Store.d.profiles.find(q => q.id === d.v); if (!x) return;
        App.openOv(Ov.choice('Excluir o perfil ' + x.name + '?', 'Os favoritos e o “continuar assistindo” dele serão apagados.', [['Sim, excluir', () => {
          Store.d.profiles = Store.d.profiles.filter(q => q.id !== d.v); delete Store.d.pp[d.v]; Store.save(); self.render();
        }], ['Cancelar', null]]));
      }
    },
    key(k) {
      if (k === 'back') { if (!App.back()) App.reset('live'); return; }
      spatialKey(root(), k);
    }
  };
  return self;
};
