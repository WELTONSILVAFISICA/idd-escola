/**
 * js/app.js
 * -----------------------------------------------------------------------
 * Lógica do formulário do app IDD — versão GitHub Pages + Supabase.
 *
 * Principais diferenças em relação à versão com servidor Node.js:
 *   - As perguntas não são mais buscadas de uma API; elas já vêm prontas
 *     em window.IDD_PERGUNTAS (carregado por js/questions.js).
 *   - O envio da resposta não é mais um fetch('/api/respostas'); é uma
 *     chamada direta ao Supabase (window.supabase), que insere a linha
 *     no banco e devolve o resultado já calculado pelo banco (o cálculo
 *     em si vive num gatilho do Postgres — veja supabase/schema.sql).
 *
 * O restante do fluxo (etapas, validação, navegação) é idêntico à versão
 * anterior.
 * -----------------------------------------------------------------------
 */

(function () {
  'use strict';

  const appShell = document.getElementById('app-shell');

  // Verificação defensiva: se algum outro arquivo <script> (questions.js,
  // niveis.js) não carregou — por exemplo, por um caminho/maiúsculas
  // incorretos ao subir os arquivos —, mostra um aviso visível na tela em
  // vez de deixar a página "morta" sem nenhuma explicação.
  const dependenciasFaltando = [];
  if (typeof window.IDD_PERGUNTAS === 'undefined') dependenciasFaltando.push('js/questions.js');
  if (typeof window.IDD_FAIXAS === 'undefined') dependenciasFaltando.push('js/niveis.js');
  if (dependenciasFaltando.length) {
    appShell.innerHTML =
      '<div style="padding:24px;font-family:sans-serif;color:#7f1d1d;background:#fef2f2;border-radius:16px;">' +
      '<strong>Não foi possível carregar o app.</strong><br/><br/>' +
      'Estes arquivos não foram encontrados: ' + dependenciasFaltando.join(', ') + '.<br/>' +
      'Confira se todos os arquivos da pasta <code>js/</code> foram enviados ao GitHub, ' +
      'com os nomes exatamente iguais (maiúsculas/minúsculas importam).' +
      '</div>';
    console.error('Dependências ausentes:', dependenciasFaltando);
    return; // interrompe a inicialização deste script aqui, sem travar a página
  }

  const barraProgresso = document.getElementById('barra-progresso');
  const rotuloProgresso = document.getElementById('rotulo-progresso');
  const modeloPergunta = document.getElementById('modelo-pergunta');

  // ---------------------------------------------------------------------
  // Cliente Supabase — criado de forma "preguiçosa" (só quando realmente
  // for enviar uma resposta), dentro de um try/catch. Isso é proposital:
  // se o script do Supabase falhar ao carregar por qualquer motivo (rede,
  // bloqueador de conteúdo, CDN fora do ar), o restante do app — abrir,
  // navegar pelas telas, responder as perguntas — continua funcionando
  // normalmente. Só a etapa final de envio depende do Supabase.
  // ---------------------------------------------------------------------
  let _clienteSupabase = null;
  function obterClienteSupabase() {
    if (_clienteSupabase) return _clienteSupabase;

    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      throw new Error(
        'A biblioteca do Supabase não carregou. Verifique sua conexão com a internet e recarregue a página.'
      );
    }
    if (
      !window.IDD_SUPABASE_URL ||
      window.IDD_SUPABASE_URL.indexOf('SEU-PROJETO') !== -1 ||
      !window.IDD_SUPABASE_ANON_KEY ||
      window.IDD_SUPABASE_ANON_KEY.indexOf('SUA-CHAVE') !== -1
    ) {
      throw new Error(
        'O app ainda não foi configurado: edite js/supabase-config.js com a URL e a chave do seu projeto Supabase.'
      );
    }

    _clienteSupabase = window.supabase.createClient(
      window.IDD_SUPABASE_URL,
      window.IDD_SUPABASE_ANON_KEY
    );
    return _clienteSupabase;
  }

  /** Estado da aplicação */
  const estado = {
    perguntas: window.IDD_PERGUNTAS,
    perfilOpcoes: { sexo: window.IDD_OPCOES_SEXO, escolaridade: window.IDD_OPCOES_ESCOLARIDADE },
    etapas: [],
    indiceAtual: 0,
    respostas: {},
    perfil: { idade: null, sexo: null, escolaridade: null },
  };

  // ---------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------
  function el(tag, props = {}, filhos = []) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([chave, valor]) => {
      if (chave === 'class') node.className = valor;
      else if (chave === 'html') node.innerHTML = valor;
      else node.setAttribute(chave, valor);
    });
    filhos.forEach((filho) => node.appendChild(filho));
    return node;
  }

  function formatarIDD(valor) {
    return Number(valor).toFixed(2).replace('.', ',');
  }

  // ---------------------------------------------------------------------
  // Construção dinâmica das etapas
  // ---------------------------------------------------------------------
  function montarGrupoPills(container, opcoes, name) {
    container.innerHTML = '';
    opcoes.forEach((opcao, indice) => {
      const id = `${name}-${indice}`;
      const label = el('label', { class: 'pill' }, [
        el('input', { type: 'radio', name, value: opcao.valor, id }),
        el('span', { html: opcao.rotulo }),
      ]);
      container.appendChild(label);
    });
  }

  function construirEtapaPerfil() {
    montarGrupoPills(document.getElementById('grupo-sexo'), estado.perfilOpcoes.sexo, 'sexo');
    montarGrupoPills(
      document.getElementById('grupo-escolaridade'),
      estado.perfilOpcoes.escolaridade,
      'escolaridade'
    );
  }

  function construirEtapasPerguntas() {
    const container = modeloPergunta.parentElement;
    modeloPergunta.remove(); // era só um modelo; cada pergunta ganha sua própria cópia

    estado.perguntas.forEach((pergunta) => {
      const etapa = modeloPergunta.cloneNode(true);
      etapa.id = '';
      etapa.dataset.campo = pergunta.campo;
      etapa.classList.remove('ativa');

      etapa.querySelector('#pergunta-titulo').textContent = pergunta.titulo;
      etapa.querySelector('#pergunta-texto').textContent = pergunta.pergunta;

      const opcoesContainer = etapa.querySelector('#pergunta-opcoes');
      opcoesContainer.innerHTML = '';
      pergunta.opcoes.forEach((opcao, i) => {
        const name = `pergunta-${pergunta.campo}`;
        const id = `${name}-${i}`;
        const rotulo = el('label', { class: 'opcao' }, [
          el('input', { type: 'radio', name, value: opcao.valor, id }),
          el('span', { html: opcao.rotulo }),
        ]);
        opcoesContainer.appendChild(rotulo);
      });

      const etapaEnviando = container.querySelector('[data-etapa="enviando"]');
      container.insertBefore(etapa, etapaEnviando);
    });
  }

  // ---------------------------------------------------------------------
  // Navegação entre etapas
  // ---------------------------------------------------------------------
  function atualizarListaEtapas() {
    estado.etapas = Array.from(appShell.querySelectorAll('.etapa'));
  }

  function totalPerguntas() {
    return estado.perguntas.length;
  }

  function irPara(indice) {
    estado.etapas.forEach((etapa, i) => etapa.classList.toggle('ativa', i === indice));
    estado.indiceAtual = indice;
    atualizarBarraProgresso();
    appShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function irParaProxima() { irPara(estado.indiceAtual + 1); }
  function irParaAnterior() { irPara(Math.max(0, estado.indiceAtual - 1)); }

  function atualizarBarraProgresso() {
    const etapaAtual = estado.etapas[estado.indiceAtual];
    const tipo = etapaAtual ? etapaAtual.dataset.etapa : '';
    const dentroDoFluxo = tipo === 'perfil' || tipo === 'pergunta';

    barraProgresso.style.display = dentroDoFluxo ? 'flex' : 'none';
    rotuloProgresso.style.display = dentroDoFluxo ? 'block' : 'none';
    if (!dentroDoFluxo) return;

    const totalPassos = 1 + totalPerguntas();
    const passoAtual =
      tipo === 'perfil'
        ? 1
        : 2 + Array.from(appShell.querySelectorAll('[data-etapa="pergunta"]')).indexOf(etapaAtual);

    barraProgresso.innerHTML = '';
    for (let i = 1; i <= totalPassos; i++) {
      const passo = el('div', { class: 'passo' + (i <= passoAtual ? ' concluido' : '') });
      barraProgresso.appendChild(passo);
    }
    rotuloProgresso.textContent = `Passo ${passoAtual} de ${totalPassos}`;
  }

  // ---------------------------------------------------------------------
  // Validação e coleta de respostas
  // ---------------------------------------------------------------------
  function validarPerfilEColetar() {
    const idadeInput = document.getElementById('campo-idade');
    const idade = Number(idadeInput.value);
    const sexo = document.querySelector('input[name="sexo"]:checked');
    const escolaridade = document.querySelector('input[name="escolaridade"]:checked');
    const erroEl = document.getElementById('erro-perfil');

    if (!idade || idade < 10 || idade > 19 || !sexo || !escolaridade) {
      erroEl.textContent = 'Preencha idade, sexo e escolaridade para continuar.';
      erroEl.classList.add('visivel');
      return false;
    }
    erroEl.classList.remove('visivel');
    estado.perfil = { idade, sexo: sexo.value, escolaridade: escolaridade.value };
    return true;
  }

  function validarPerguntaEColetar(etapaEl) {
    const campo = etapaEl.dataset.campo;
    const selecionado = etapaEl.querySelector(`input[name="pergunta-${campo}"]:checked`);
    const erroEl = etapaEl.querySelector('#erro-pergunta');
    if (!selecionado) {
      erroEl.classList.add('visivel');
      return false;
    }
    erroEl.classList.remove('visivel');
    estado.respostas[campo] = Number(selecionado.value);
    return true;
  }

  // ---------------------------------------------------------------------
  // Envio ao Supabase
  // ---------------------------------------------------------------------
  async function enviarRespostas() {
    irParaEtapaPorTipo('enviando');
    try {
      const clienteSupabase = obterClienteSupabase();

      const registro = {
        idade: estado.perfil.idade,
        sexo: estado.perfil.sexo,
        escolaridade: estado.perfil.escolaridade,
        horas_uso: estado.respostas.horas_uso,
        ansiedade: estado.respostas.ansiedade,
        procrastinacao: estado.respostas.procrastinacao,
        distracao: estado.respostas.distracao,
        sono: estado.respostas.sono,
        bem_estar: estado.respostas.bem_estar,
        horas_uso_rotulo: window.IDD_rotuloDaOpcao('horas_uso', estado.respostas.horas_uso),
        sono_horas_est: window.IDD_horasEstimadasSono(estado.respostas.sono),
      };

      // Insere no Supabase e já pede de volta a linha inserida — o
      // idd/nivel_id/nivel_label vêm calculados pelo gatilho do banco,
      // não pelo que enviamos aqui.
      const { data, error } = await clienteSupabase
        .from('respostas')
        .insert(registro)
        .select()
        .single();

      if (error) throw new Error(error.message || 'Não foi possível calcular o resultado.');

      const faixa = window.IDD_FAIXAS[data.nivel_id];
      mostrarResultado({ idd: data.idd, nivel: faixa });
    } catch (erro) {
      console.error('Erro ao enviar respostas:', erro);
      alert('Ops! ' + erro.message + '\nVerifique sua conexão e tente novamente.');
      irParaEtapaPorTipo('pergunta', estado.perguntas.length - 1);
    }
  }

  function irParaEtapaPorTipo(tipo, ocorrencia = 0) {
    atualizarListaEtapas();
    const candidatas = estado.etapas.filter((e) => e.dataset.etapa === tipo);
    const alvo = candidatas[ocorrencia] || candidatas[0];
    const indice = estado.etapas.indexOf(alvo);
    irPara(indice);
  }

  function mostrarResultado(dados) {
    const { idd, nivel } = dados;
    const card = document.getElementById('resultado-card');
    card.style.background = nivel.corClara;
    card.style.color = nivel.cor;
    document.getElementById('resultado-valor').textContent = formatarIDD(idd);
    document.getElementById('resultado-valor').style.color = nivel.cor;

    const badge = el('span', { class: 'resultado-badge' }, []);
    badge.style.background = nivel.cor;
    badge.style.color = '#fff';
    badge.textContent = `${nivel.emoji} ${nivel.label}`;
    const nivelEl = document.getElementById('resultado-nivel');
    nivelEl.innerHTML = '';
    nivelEl.appendChild(badge);

    const feedbackCard = document.getElementById('feedback-card');
    feedbackCard.style.background = nivel.corClara;
    document.getElementById('feedback-titulo').textContent = `${nivel.emoji} ${nivel.titulo}`;
    document.getElementById('feedback-mensagem').textContent = nivel.mensagem;

    const dicasEl = document.getElementById('feedback-dicas');
    dicasEl.innerHTML = '';
    (nivel.dicas || []).forEach((dica) => {
      dicasEl.appendChild(el('li', { html: dica }));
    });

    irParaEtapaPorTipo('resultado');
  }

  function reiniciarFluxo() {
    estado.respostas = {};
    estado.perfil = { idade: null, sexo: null, escolaridade: null };
    document.getElementById('campo-idade').value = '';
    appShell.querySelectorAll('input[type="radio"]').forEach((r) => (r.checked = false));
    irPara(0);
  }

  // ---------------------------------------------------------------------
  // Inicialização
  // ---------------------------------------------------------------------
  function iniciar() {
    // Aviso amigável no console (F12) se o arquivo de configuração ainda
    // não foi personalizado — não impede o app de abrir e navegar.
    try {
      obterClienteSupabase();
      console.log('✅ Configuração do Supabase OK.');
    } catch (erroConfig) {
      console.warn('⚠️ ' + erroConfig.message);
    }

    construirEtapaPerfil();
    construirEtapasPerguntas();
    atualizarListaEtapas();
    irPara(0);

    appShell.addEventListener('click', (ev) => {
      const botao = ev.target.closest('[data-acao]');
      if (!botao) return;
      const acao = botao.dataset.acao;
      const etapaAtualEl = estado.etapas[estado.indiceAtual];

      if (acao === 'iniciar') irParaProxima();
      else if (acao === 'voltar') irParaAnterior();
      else if (acao === 'ir-questionario') {
        if (validarPerfilEColetar()) irParaProxima();
      } else if (acao === 'proxima-pergunta') {
        if (!validarPerguntaEColetar(etapaAtualEl)) return;
        const proximaEtapa = estado.etapas[estado.indiceAtual + 1];
        const ehUltima = proximaEtapa && proximaEtapa.dataset.etapa === 'enviando';
        if (ehUltima) enviarRespostas();
        else irParaProxima();
      } else if (acao === 'reiniciar') {
        reiniciarFluxo();
      }
    });
  }

  iniciar();
})();
