/*! finiquito — calculadora de finiquito e indemnización (España) · DataFlow Elegance · MIT
 *  Estatuto de los Trabajadores (arts. 49, 53, 56) y reforma de 2012. Orientativo.
 */
(function (g) {
  "use strict";
  var REFORMA = Date.UTC(2012, 1, 12); // 12/02/2012

  function d(s) { var p = String(s).split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function dia(t) { return new Date(t).getUTCDate(); }

  // Meses de servicio redondeando al alza la fracción de mes (práctica habitual)
  function meses(ini, fin) {
    if (fin < ini) return 0;
    var a = new Date(ini), b = new Date(fin);
    var m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    var cand = Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + m, a.getUTCDate());
    if (cand > fin) { m--; cand = Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + m, a.getUTCDate()); }
    if (fin - cand >= 86400000) m++; // fracción → mes completo
    return Math.max(m, 0);
  }

  function r2(x) { return Math.round(x * 100) / 100; }

  /**
   * p = { inicio:"YYYY-MM-DD", fin:"YYYY-MM-DD", salarioAnual (bruto, con pagas),
   *       tipo:"improcedente"|"objetivo"|"fin_temporal"|"voluntaria",
   *       vacacionesPendientes (días naturales), numPagas (12|14), pagasProrrateadas:bool }
   */
  function calcular(p) {
    var ini = d(p.inicio), fin = d(p.fin);
    if (!(fin >= ini)) return { error: "La fecha de fin debe ser posterior al inicio." };
    var anual = Number(p.salarioAnual) || 0;
    var salDia = anual / 365;
    var tipo = p.tipo || "improcedente";
    var diasIndem = 0, nota = "";

    if (tipo === "improcedente") {
      if (ini >= REFORMA) {
        diasIndem = Math.min(33 * meses(ini, fin) / 12, 720);
        nota = "33 días por año trabajado (tope 24 mensualidades).";
      } else {
        var d1 = 45 * meses(ini, REFORMA - 86400000) / 12;
        var d2 = fin >= REFORMA ? 33 * meses(REFORMA, fin) / 12 : 0;
        diasIndem = d1 > 720 ? Math.min(d1, 1260) : Math.min(d1 + d2, 720);
        nota = "45 días/año hasta el 11/02/2012 y 33 días/año después (topes de la reforma laboral de 2012).";
      }
    } else if (tipo === "objetivo") {
      diasIndem = Math.min(20 * meses(ini, fin) / 12, 360);
      nota = "20 días por año trabajado (tope 12 mensualidades).";
    } else if (tipo === "fin_temporal") {
      diasIndem = 12 * meses(ini, fin) / 12;
      nota = "12 días por año trabajado (fin de contrato temporal).";
    } else {
      nota = "Baja voluntaria: sin indemnización, solo finiquito.";
    }
    var indemnizacion = diasIndem * salDia;

    var numPagas = Number(p.numPagas) || 14;
    var prorr = !!p.pagasProrrateadas || numPagas === 12;
    var mensual = anual / (prorr ? 12 : numPagas);
    var salarioMes = mensual / 30 * Math.min(dia(fin), 30);
    var vacaciones = salDia * (Number(p.vacacionesPendientes) || 0);

    var pagaExtra = 0;
    if (!prorr && numPagas === 14) {
      var f = new Date(fin);
      var semIni = f.getUTCMonth() < 6 ? Date.UTC(f.getUTCFullYear(), 0, 1) : Date.UTC(f.getUTCFullYear(), 6, 1);
      var diasSem = (fin - semIni) / 86400000 + 1;
      pagaExtra = (anual / 14) * Math.min(diasSem / 181, 1);
    }

    var finiquito = salarioMes + vacaciones + pagaExtra;
    return {
      meses_servicio: meses(ini, fin),
      salario_dia: r2(salDia),
      dias_indemnizacion: r2(diasIndem),
      indemnizacion: r2(indemnizacion),
      nota_indemnizacion: nota,
      finiquito: { salario_mes: r2(salarioMes), vacaciones: r2(vacaciones), paga_extra_prorrata: r2(pagaExtra), total: r2(finiquito) },
      total: r2(indemnizacion + finiquito)
    };
  }

  g.Finiquito = { calcular: calcular, meses: meses };
})(typeof window !== "undefined" ? window : globalThis);
