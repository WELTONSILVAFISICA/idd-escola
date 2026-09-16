/**
 * js/admin.js
 * -----------------------------------------------------------------------
 * Lógica do painel administrativo — versão GitHub Pages + Supabase.
 *
 * Principais diferenças em relação à versão com servidor Node.js:
 *   - O login não fala mais com uma rota própria (/api/admin/login); ele
 *     usa o sistema de autenticação do próprio Supabase
 *     (supabaseClient.auth.signInWithPassword). Por isso agora o login
 *     pede e-mail e senha, não só senha.
 *   - As respostas e estatísticas não vêm mais de rotas /api/...; são
 *     buscadas direto na tabela "respostas" do Supabase. As regras de
 *     segurança (Row Level Security) do banco são o que garante que só um
 *     usuário autenticado consegue ler essa tabela — veja supabase/schema.sql.
 *   - Os agregados para os gráficos (total por nível, por horas de uso,
 *     etc.) são calculados aqui mesmo em JavaScript, a partir das linhas
 *     recebidas — para o volume de dados de uma escola, isso é suficiente
 *     e evita ter que criar views separadas no banco.
 * -----------------------------------------------------------------------
 */

(function () {
  'use strict';

  const telaLogin = document.getElementById('tela-login');
  const telaDashboard = document.getElementById('tela-dashboard');
  const campoEmail = document.getElementById('campo-email');
  const campoSenha = document.getElementById('campo-senha');
  const loginErro = document.getElementById('login-erro');

  // Verificação defensiva: se o Supabase ou algum script auxiliar não
  // carregou, mostra um aviso claro em vez de deixar a tela sem reação.
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    telaLogin.innerHTML =
      '<div style="max-width:380px;padding:20px;background:#fef2f2;color:#7f1d1d;border-radius:16px;font-family:sans-serif;">' +
      '<strong>Não foi possível carregar o painel.</strong><br/><br/>' +
      'A biblioteca do Supabase não carregou. Verifique sua conexão com a ' +
      'internet e recarregue a página.</div>';
    console.error('window.supabase não está disponível — o script do CDN falhou ao carregar.');
    return;
  }
  if (
    !window.IDD_SUPABASE_URL ||
    window.IDD_SUPABASE_URL.indexOf('SEU-PROJETO') !== -1 ||
    !window.IDD_SUPABASE_ANON_KEY ||
    window.IDD_SUPABASE_ANON_KEY.indexOf('SUA-CHAVE') !== -1
  ) {
    telaLogin.innerHTML =
      '<div style="max-width:380px;padding:20px;background:#fef2f2;color:#7f1d1d;border-radius:16px;font-family:sans-serif;">' +
      '<strong>App ainda não configurado.</strong><br/><br/>' +
      'Edite o arquivo js/supabase-config.js com a URL e a chave do seu ' +
      'projeto Supabase.</div>';
    console.error('js/supabase-config.js ainda está com os valores de exemplo.');
    return;
  }

  const supabaseClient = window.supabase.createClient(
    window.IDD_SUPABASE_URL,
    window.IDD_SUPABASE_ANON_KEY
  );

  async function fazerLogin() {
    loginErro.classList.remove('visivel');
    const email = campoEmail.value.trim();
    const senha = campoSenha.value;
    if (!email || !senha) return;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
    if (error) {
      loginErro.textContent = 'E-mail ou senha incorretos.';
      loginErro.classList.add('visivel');
      return;
    }
    await mostrarDashboard();
  }

  async function fazerLogout() {
    await supabaseClient.auth.signOut();
    mostrarLogin();
  }

  function mostrarLogin(mensagemErro) {
    telaLogin.style.display = 'flex';
    telaDashboard.style.display = 'none';
    if (mensagemErro) {
      loginErro.textContent = mensagemErro;
      loginErro.classList.add('visivel');
    }
  }

  async function mostrarDashboard() {
    telaLogin.style.display = 'none';
    telaDashboard.style.display = 'block';
    await carregarDados();
  }

  function formatarDecimal(valor, casas = 2) {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
    return Number(valor).toFixed(casas).replace('.', ',');
  }

  function media(lista, campo) {
    const valores = lista.map((r) => r[campo]).filter((v) => v !== null && v !== undefined);
    if (!valores.length) return null;
    return valores.reduce((soma, v) => soma + Number(v), 0) / valores.length;
  }

  function renderizarCardsResumo(itens) {
    const container = document.getElementById('cards-resumo');
    const cards = [
      { rotulo: 'Total de respostas', valor: itens.length },
      { rotulo: 'IDD médio', valor: formatarDecimal(media(itens, 'idd')) },
      { rotulo: 'Ansiedade média', valor: formatarDecimal(media(itens, 'ansiedade'), 1) + ' / 5' },
      { rotulo: 'Sono médio', valor: formatarDecimal(media(itens, 'sono'), 1) + ' / 5' },
    ];
    container.innerHTML = '';
    cards.forEach((c) => {
      const div = document.createElement('div');
      div.className = 'card-resumo';
      div.innerHTML = `<div class="rotulo">${c.rotulo}</div><div class="valor">${c.valor}</div>`;
      container.appendChild(div);
    });
  }

  function agruparPorNivel(itens) {
    return window.IDD_FAIXAS_ORDEM.map((nivelId) => {
      const faixa = window.IDD_FAIXAS[nivelId];
      const total = itens.filter((r) => r.nivel_id === nivelId).length;
      return { nivel_id: nivelId, label: faixa.label, cor: faixa.cor, total };
    });
  }

  function agruparPorHorasUso(itens) {
    const grupos = {};
    itens.forEach((r) => {
      const chave = r.horas_uso_rotulo || '—';
      if (!grupos[chave]) grupos[chave] = { rotulo: chave, pontuacao: r.horas_uso, total: 0 };
      grupos[chave].total += 1;
    });
    return Object.values(grupos).sort((a, b) => a.pontuacao - b.pontuacao);
  }

  function renderizarLegendaPizza(porNivel) {
    const container = document.getElementById('legenda-pizza');
    container.innerHTML = '';
    porNivel.forEach((n) => {
      const item = document.createElement('div');
      item.className = 'legenda-item';
      item.innerHTML = `<span class="legenda-ponto" style="background:${n.cor}"></span>${n.label} (${n.total})`;
      container.appendChild(item);
    });
  }

  function renderizarTabela(itens) {
    const container = document.getElementById('conteudo-tabela');
    if (!itens.length) {
      container.innerHTML = '<div class="vazio">Ainda não há respostas registradas.</div>';
      return;
    }
    const linhas = itens
      .slice(0, 50)
      .map((r) => {
        const dataFormatada = new Date(r.criado_em).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        return `<tr>
          <td>${dataFormatada}</td>
          <td>${r.idade}</td>
          <td>${escapeHtml(r.escolaridade === 'medio' ? 'Ensino Médio' : 'Fundamental')}</td>
          <td>${formatarDecimal(r.idd)}</td>
          <td><span class="badge-nivel" style="background:${corDoNivel(r.nivel_id)}">${escapeHtml(r.nivel_label)}</span></td>
        </tr>`;
      })
      .join('');

    container.innerHTML = `
      <table class="tabela-respostas">
        <thead>
          <tr><th>Data</th><th>Idade</th><th>Escolaridade</th><th>IDD</th><th>Nível</th></tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>`;
  }

  function corDoNivel(id) {
    const faixa = window.IDD_FAIXAS[id];
    return faixa ? faixa.cor : '#6b7280';
  }

  function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = String(texto);
    return div.innerHTML;
  }

  async function carregarDados() {
    const { data, error } = await supabaseClient
      .from('respostas')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(1000);

    if (error) {
      alert('Não foi possível carregar os dados: ' + error.message);
      return;
    }

    const itens = data || [];

    renderizarCardsResumo(itens);
    const porNivel = agruparPorNivel(itens);
    renderizarLegendaPizza(porNivel);

    window.IDDCharts.graficoPizza(
      document.getElementById('grafico-pizza'),
      porNivel.map((n) => ({ label: n.label, total: n.total, cor: n.cor }))
    );
    window.IDDCharts.graficoBarras(
      document.getElementById('grafico-barras'),
      agruparPorHorasUso(itens).map((h) => ({ label: h.rotulo, total: h.total })),
      '#3b82f6'
    );
    window.IDDCharts.graficoDispersao(
      document.getElementById('grafico-dispersao'),
      itens.map((r) => ({ x: r.sono_horas_est, y: r.idd })),
      '#8b5cf6'
    );

    renderizarTabela(itens);
  }

  // ---------------------------------------------------------------------
  document.getElementById('btn-entrar').addEventListener('click', fazerLogin);
  campoSenha.addEventListener('keydown', (e) => { if (e.key === 'Enter') fazerLogin(); });
  campoEmail.addEventListener('keydown', (e) => { if (e.key === 'Enter') fazerLogin(); });
  document.getElementById('btn-sair').addEventListener('click', fazerLogout);

  // Ao carregar a página, verifica se já existe uma sessão válida
  // (o Supabase guarda isso sozinho, não precisamos gerenciar token manualmente).
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) mostrarDashboard();
    else mostrarLogin();
  });
})();
