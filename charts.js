/**
 * public/js/charts.js
 * -----------------------------------------------------------------------
 * Mini biblioteca de gráficos em <canvas> puro (sem dependências externas),
 * usada apenas no painel administrativo. Feita sob medida para os 3
 * gráficos do dashboard: pizza, barras e dispersão.
 * -----------------------------------------------------------------------
 */

(function (global) {
  'use strict';

  function prepararCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const larguraCss = canvas.clientWidth || canvas.parentElement.clientWidth;
    const alturaCss = canvas.height && canvas.getAttribute('height')
      ? Number(canvas.getAttribute('height'))
      : 220;
    canvas.width = larguraCss * dpr;
    canvas.height = alturaCss * dpr;
    canvas.style.width = larguraCss + 'px';
    canvas.style.height = alturaCss + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, largura: larguraCss, altura: alturaCss };
  }

  /** Gráfico de pizza. dados: [{label, total, cor}] */
  function graficoPizza(canvas, dados) {
    const { ctx, largura, altura } = prepararCanvas(canvas);
    ctx.clearRect(0, 0, largura, altura);

    const total = dados.reduce((s, d) => s + d.total, 0);
    const cx = largura * 0.32;
    const cy = altura / 2;
    const raio = Math.min(cx, cy) - 8;

    if (total === 0) {
      desenharTextoVazio(ctx, largura, altura);
      return;
    }

    let anguloInicial = -Math.PI / 2;
    dados.forEach((fatia) => {
      if (fatia.total <= 0) return;
      const angulo = (fatia.total / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, raio, anguloInicial, anguloInicial + angulo);
      ctx.closePath();
      ctx.fillStyle = fatia.cor;
      ctx.fill();
      anguloInicial += angulo;
    });

    // Círculo central (efeito "donut")
    ctx.beginPath();
    ctx.arc(cx, cy, raio * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 15px Poppins, sans-serif';
    ctx.fillText(String(total), cx, cy - 6);
    ctx.font = '400 10px Poppins, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('respostas', cx, cy + 10);
  }

  /** Gráfico de barras verticais. dados: [{label, total}] */
  function graficoBarras(canvas, dados, corBarra) {
    const { ctx, largura, altura } = prepararCanvas(canvas);
    ctx.clearRect(0, 0, largura, altura);

    if (!dados.length || dados.every((d) => d.total === 0)) {
      desenharTextoVazio(ctx, largura, altura);
      return;
    }

    const margemEsq = 30;
    const margemInf = 34;
    const margemSup = 12;
    const larguraUtil = largura - margemEsq - 12;
    const alturaUtil = altura - margemInf - margemSup;

    const maiorValorBruto = Math.max(...dados.map((d) => d.total), 1);
    const larguraBarra = (larguraUtil / dados.length) * 0.6;
    const espaco = (larguraUtil / dados.length) * 0.4;

    // Eixo Y (linhas guia) — usa no máximo 4 passos, mas nunca mais que o
    // próprio valor máximo (evita rótulos repetidos tipo "0, 0, 1" quando
    // há poucos dados).
    const passos = Math.max(1, Math.min(4, maiorValorBruto));
    const maiorValor = Math.ceil(maiorValorBruto / passos) * passos; // arredonda p/ múltiplo exato
    ctx.strokeStyle = '#eef2f7';
    ctx.lineWidth = 1;
    for (let i = 0; i <= passos; i++) {
      const y = margemSup + alturaUtil - (alturaUtil / passos) * i;
      ctx.beginPath();
      ctx.moveTo(margemEsq, y);
      ctx.lineTo(largura - 8, y);
      ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px Poppins, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round((maiorValor / passos) * i), margemEsq - 6, y + 3);
    }

    dados.forEach((barra, i) => {
      const x = margemEsq + i * (larguraBarra + espaco) + espaco / 2;
      const alturaBarra = (barra.total / maiorValor) * alturaUtil;
      const y = margemSup + alturaUtil - alturaBarra;

      const raio = 6;
      ctx.fillStyle = corBarra || '#3b82f6';
      desenharRetanguloArredondado(ctx, x, y, larguraBarra, alturaBarra, raio);
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.font = '700 11px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(barra.total), x + larguraBarra / 2, y - 6);

      ctx.fillStyle = '#6b7280';
      ctx.font = '9.5px Poppins, sans-serif';
      quebrarTextoEixo(ctx, barra.label, x + larguraBarra / 2, margemSup + alturaUtil + 14);
    });
  }

  /** Gráfico de dispersão. pontos: [{x, y}] */
  function graficoDispersao(canvas, pontos, cor) {
    const { ctx, largura, altura } = prepararCanvas(canvas);
    ctx.clearRect(0, 0, largura, altura);

    const validos = pontos.filter((p) => p.x != null && p.y != null);
    if (!validos.length) {
      desenharTextoVazio(ctx, largura, altura);
      return;
    }

    const margemEsq = 30;
    const margemInf = 26;
    const margemSup = 12;
    const margemDir = 12;
    const larguraUtil = largura - margemEsq - margemDir;
    const alturaUtil = altura - margemInf - margemSup;

    const xMin = 0, xMax = Math.max(10, ...validos.map((p) => p.x));
    const yMin = 0, yMax = Math.max(6, ...validos.map((p) => p.y));

    // Eixos
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margemEsq, margemSup);
    ctx.lineTo(margemEsq, margemSup + alturaUtil);
    ctx.lineTo(margemEsq + larguraUtil, margemSup + alturaUtil);
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = '9.5px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sono (h)', margemEsq + larguraUtil / 2, altura - 4);

    ctx.save();
    ctx.translate(9, margemSup + alturaUtil / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('IDD', 0, 0);
    ctx.restore();

    validos.forEach((p) => {
      const x = margemEsq + ((p.x - xMin) / (xMax - xMin || 1)) * larguraUtil;
      const y = margemSup + alturaUtil - ((p.y - yMin) / (yMax - yMin || 1)) * alturaUtil;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = (cor || '#3b82f6') + 'cc';
      ctx.fill();
    });
  }

  function desenharRetanguloArredondado(ctx, x, y, w, h, r) {
    const raio = Math.min(r, w / 2, h / 2 > 0 ? h / 2 : 0);
    ctx.beginPath();
    ctx.moveTo(x + raio, y);
    ctx.arcTo(x + w, y, x + w, y + h, raio);
    ctx.arcTo(x + w, y + h, x, y + h, raio);
    ctx.arcTo(x, y + h, x, y, raio);
    ctx.arcTo(x, y, x + w, y, raio);
    ctx.closePath();
  }

  function quebrarTextoEixo(ctx, texto, x, y) {
    ctx.textAlign = 'center';
    const max = 10;
    const curto = texto.length > max ? texto.slice(0, max - 1) + '…' : texto;
    ctx.fillText(curto, x, y);
  }

  function desenharTextoVazio(ctx, largura, altura) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Ainda sem dados suficientes', largura / 2, altura / 2);
  }

  global.IDDCharts = { graficoPizza, graficoBarras, graficoDispersao };
})(window);
