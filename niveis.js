/**
 * js/niveis.js
 * -----------------------------------------------------------------------
 * Textos, cores e dicas de cada nível de IDD — usados só para exibição.
 *
 * IMPORTANTE: o CÁLCULO do IDD (a fórmula em si) não vive mais aqui nem em
 * nenhum arquivo JavaScript. Ele foi movido para dentro do banco de dados
 * (Supabase/Postgres), num gatilho (trigger) que recalcula o índice sempre
 * que uma resposta é inserida — veja supabase/schema.sql.
 *
 * Isso é proposital: como não existe mais um servidor nosso no meio do
 * caminho, um aluno mal-intencionado poderia alterar o JavaScript no
 * próprio navegador e tentar enviar um IDD "fake". Calculando dentro do
 * banco, o valor salvo é sempre o valor correto, não importa o que o
 * navegador tenha enviado.
 *
 * Este arquivo só faz o "de-para" entre o nivel_id que o banco devolve
 * (ex.: "baixo") e o que mostrar na tela (cor, emoji, texto, dicas).
 * -----------------------------------------------------------------------
 */

window.IDD_FAIXAS = {
  baixo: {
    id: 'baixo',
    label: 'Baixo risco',
    cor: '#22c55e',
    corClara: '#dcfce7',
    emoji: '🟢',
    titulo: 'Tudo certo por aqui!',
    mensagem:
      'Seu uso de telas parece equilibrado com sua rotina de estudos, sono e bem-estar. Continue assim!',
    dicas: [
      'Mantenha sua rotina atual de sono — ela está te ajudando bastante.',
      'Use as redes sociais com intenção: escolha o que assistir, em vez de rolar sem pensar.',
      'Compartilhe com um amigo o que funciona bem pra você equilibrar tela e estudo.',
    ],
  },
  atencao: {
    id: 'atencao',
    label: 'Atenção',
    cor: '#eab308',
    corClara: '#fef9c3',
    emoji: '🟡',
    titulo: 'Fique de olho',
    mensagem:
      'Alguns sinais mostram que o uso de telas já está pedindo um pouco mais de atenção na sua rotina.',
    dicas: [
      'Experimente deixar o celular fora do quarto pelo menos 30 minutos antes de dormir.',
      'Perceba os momentos em que troca o estudo pelas redes sociais — só perceber já ajuda.',
      'Se sentir ansiedade ao ficar sem o celular, respire fundo e lembre que é passageiro.',
    ],
  },
  moderado: {
    id: 'moderado',
    label: 'Risco moderado',
    cor: '#f97316',
    corClara: '#ffedd5',
    emoji: '🟠',
    titulo: 'Hora de ajustar a rota',
    mensagem:
      'O uso de redes, a ansiedade e a procrastinação já estão impactando moderadamente seus estudos e seu bem-estar.',
    dicas: [
      'Crie blocos de estudo com o celular em outro cômodo ou no modo avião.',
      'Troque uma rolagem de feed por uma pausa ativa: alongar, beber água, olhar pela janela.',
      'Converse com um professor, orientador ou familiar sobre como está se sentindo.',
    ],
  },
  alto: {
    id: 'alto',
    label: 'Alto risco',
    cor: '#ef4444',
    corClara: '#fee2e2',
    emoji: '🔴',
    titulo: 'Seu uso digital está pedindo atenção',
    mensagem:
      'O uso do digital está impactando de forma significativa seu sono, sua ansiedade e/ou sua rotina de estudos.',
    dicas: [
      'Comece reduzindo o tempo de tela aos poucos — metas pequenas funcionam melhor que cortes bruscos.',
      'Priorize o sono: ele é o fator que mais te protege nesse índice.',
      'Busque uma pessoa adulta de confiança (família, orientador escolar) para conversar sobre o que está sentindo.',
    ],
  },
  elevado: {
    id: 'elevado',
    label: 'Dependência digital elevada',
    cor: '#b91c1c',
    corClara: '#fecaca',
    emoji: '🆘',
    titulo: 'Vamos cuidar disso juntos',
    mensagem:
      'Os sinais indicam um nível elevado de dependência digital, com impacto relevante no sono, na ansiedade e na rotina.',
    dicas: [
      'Procure conversar com um psicólogo, orientador escolar ou pessoa adulta de confiança o quanto antes.',
      'Desative notificações à noite e crie horários fixos sem tela, com apoio da família.',
      'Você não precisa resolver isso sozinho(a) — pedir ajuda é um passo importante e corajoso.',
    ],
  },
};

/** Lista das faixas em ordem (do menor para o maior risco) — útil para os gráficos do admin. */
window.IDD_FAIXAS_ORDEM = ['baixo', 'atencao', 'moderado', 'alto', 'elevado'];
