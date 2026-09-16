/**
 * js/questions.js
 * -----------------------------------------------------------------------
 * Fonte única da verdade para as perguntas do questionário IDD — versão
 * para navegador (sem servidor). Antes esse arquivo vivia em server/ e era
 * servido por uma rota da API; agora ele é carregado direto como um
 * <script> no index.html e no admin.html.
 *
 * Cada pergunta tem `campo` (nome usado nas colunas do banco Supabase) e
 * uma lista de `opcoes`, cada uma com `rotulo` (texto que o adolescente vê)
 * e `valor` (o número de 1 a 5 realmente enviado ao banco). O formulário
 * nunca deixa o usuário digitar um número livremente — ele sempre escolhe
 * uma descrição, e o valor numérico vai "por trás".
 * -----------------------------------------------------------------------
 */

window.IDD_PERGUNTAS = [
  {
    campo: 'horas_uso',
    tipo: 'risco',
    titulo: 'Horas diárias de uso de redes sociais',
    pergunta:
      'Em média, quantas horas por dia você utiliza redes sociais (Instagram, TikTok, WhatsApp, Facebook, X, etc.) para fins não escolares?',
    opcoes: [
      { rotulo: 'Até 1 hora', valor: 1, horasEstimadas: null },
      { rotulo: 'Mais de 1 até 2 horas', valor: 2, horasEstimadas: null },
      { rotulo: 'Mais de 2 até 4 horas', valor: 3, horasEstimadas: null },
      { rotulo: 'Mais de 4 até 6 horas', valor: 4, horasEstimadas: null },
      { rotulo: 'Mais de 6 horas', valor: 5, horasEstimadas: null },
    ],
  },
  {
    campo: 'ansiedade',
    tipo: 'risco',
    titulo: 'Ansiedade',
    pergunta: 'Como você se sente quando fica sem acesso ao celular ou às redes sociais?',
    opcoes: [
      { rotulo: 'Não sinto falta', valor: 1 },
      { rotulo: 'Sinto pouca falta', valor: 2 },
      { rotulo: 'Sinto um pouco de ansiedade', valor: 3 },
      { rotulo: 'Fico bastante ansioso(a)', valor: 4 },
      { rotulo: 'Fico muito ansioso(a) ou irritado(a)', valor: 5 },
    ],
  },
  {
    campo: 'procrastinacao',
    tipo: 'risco',
    titulo: 'Procrastinação',
    pergunta:
      'Com que frequência você interrompe uma atividade importante (estudo, leitura ou trabalho escolar) para acessar redes sociais?',
    opcoes: [
      { rotulo: 'Nunca', valor: 1 },
      { rotulo: 'Raramente (1 ou 2 vezes por semana)', valor: 2 },
      { rotulo: 'Às vezes (3 ou 4 vezes por semana)', valor: 3 },
      { rotulo: 'Frequentemente (todos os dias)', valor: 4 },
      { rotulo: 'Quase o tempo todo (várias vezes ao dia)', valor: 5 },
    ],
  },
  {
    campo: 'distracao',
    tipo: 'risco',
    titulo: 'Distração durante os estudos',
    pergunta: 'Durante os estudos, quantas vezes você pega o celular sem necessidade?',
    opcoes: [
      { rotulo: 'Nunca', valor: 1 },
      { rotulo: '1 a 2 vezes', valor: 2 },
      { rotulo: '3 a 5 vezes', valor: 3 },
      { rotulo: '6 a 10 vezes', valor: 4 },
      { rotulo: 'Mais de 10 vezes', valor: 5 },
    ],
  },
  {
    campo: 'sono',
    tipo: 'protecao',
    titulo: 'Qualidade do sono',
    pergunta: 'Em média, quantas horas você dorme por noite?',
    // Fator de proteção: quanto melhor o sono, maior a pontuação.
    opcoes: [
      { rotulo: 'Menos de 5 horas', valor: 1, horasEstimadas: 4.5 },
      { rotulo: 'Entre 5 e 6 horas', valor: 2, horasEstimadas: 5.5 },
      { rotulo: 'Entre 6 e 7 horas', valor: 3, horasEstimadas: 6.5 },
      { rotulo: 'Entre 7 e 8 horas', valor: 4, horasEstimadas: 7.5 },
      { rotulo: 'Mais de 8 horas', valor: 5, horasEstimadas: 8.5 },
    ],
  },
  {
    campo: 'bem_estar',
    tipo: 'protecao',
    titulo: 'Bem-estar emocional',
    pergunta: 'Como você avalia seu bem-estar emocional na maior parte dos dias?',
    // Fator de proteção: quanto melhor o bem-estar, maior a pontuação.
    opcoes: [
      { rotulo: 'Muito ruim', valor: 1 },
      { rotulo: 'Ruim', valor: 2 },
      { rotulo: 'Regular', valor: 3 },
      { rotulo: 'Bom', valor: 4 },
      { rotulo: 'Excelente', valor: 5 },
    ],
  },
];

window.IDD_OPCOES_ESCOLARIDADE = [
  { rotulo: 'Ensino Fundamental', valor: 'fundamental' },
  { rotulo: 'Ensino Médio', valor: 'medio' },
];

window.IDD_OPCOES_SEXO = [
  { rotulo: 'Feminino', valor: 'feminino' },
  { rotulo: 'Masculino', valor: 'masculino' },
  { rotulo: 'Prefiro não informar', valor: 'nao_informado' },
];

/** Dado o campo e o valor (1-5) escolhidos, devolve o rótulo textual da opção. */
window.IDD_rotuloDaOpcao = function (campo, valor) {
  const pergunta = window.IDD_PERGUNTAS.find((p) => p.campo === campo);
  if (!pergunta) return null;
  const opcao = pergunta.opcoes.find((o) => o.valor === Number(valor));
  return opcao ? opcao.rotulo : null;
};

/** Dado o valor (1-5) de sono, devolve a estimativa de horas de sono (para gráficos). */
window.IDD_horasEstimadasSono = function (valor) {
  const pergunta = window.IDD_PERGUNTAS.find((p) => p.campo === 'sono');
  const opcao = pergunta.opcoes.find((o) => o.valor === Number(valor));
  return opcao ? opcao.horasEstimadas : null;
};
