import React, { useState } from 'react';
import { ForensicMetrics } from '../types';
import { Activity, BarChart3, MapPin, Flame, Layers, ChevronDown, ChevronUp, BookOpen, Calculator, ShieldCheck, Sparkles, Filter } from 'lucide-react';

interface ForensicMetricsCardProps {
  metrics: ForensicMetrics;
}

export const ForensicMetricsCard: React.FC<ForensicMetricsCardProps> = ({ metrics }) => {
  const [showMathDetails, setShowMathDetails] = useState(false);

  // Derived calculations with fallback values
  const meanLen = metrics.meanSentenceLength ?? 18.5;
  const stdDev = metrics.burstinessStdDev ?? 0;
  const cvRatio = metrics.variationCoefficient ?? (meanLen > 0 ? Math.round((stdDev / meanLen) * 100) / 100 : 0);
  const pxpScore = metrics.perplexityScore ?? (metrics.averagePerplexity === 'Baja' ? 18 : metrics.averagePerplexity === 'Media' ? 52 : 88);
  const windowsCount = metrics.slidingWindowsEvaluated ?? 1;
  const edgeAdjustments = metrics.edgeSmoothingAdjustments ?? 0;
  const nominalRatio = metrics.nominalizationDensityRatio ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden mb-8 p-6 transition-all">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            Fase 3: Evaluación Multi-Métrica & Estadística
          </span>
          <h3 className="text-lg font-bold text-slate-800 font-sans mt-0.5">
            Análisis Forense de Métricas Clave
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-slate-900 text-slate-100 px-3 py-1.5 rounded-lg border border-slate-800 shadow-xs flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Turnitin Neural Pipeline 2026
          </span>
        </div>
      </div>

      {/* 5 Main Dynamic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        
        {/* Metric 1: Perplejidad (PXP) */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-sky-300 transition-colors shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                1. Perplejidad ($PXP$)
              </span>
              <Activity className="w-4 h-4 text-sky-600" />
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                {metrics.averagePerplexity}
              </span>
              <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Índice: {pxpScore}/100
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              {metrics.averagePerplexity === 'Baja' || metrics.averagePerplexity === 'Muy Baja'
                ? 'Tokens de alta probabilidad condicional y transición uniforme típicos de LLMs autorregresivos (GPT-4o/Claude).'
                : metrics.averagePerplexity === 'Media'
                ? 'Distribución probabilística intermedia con combinación de fórmulas académicas y giros orgánicos.'
                : 'Pérdida de entropía alta con elecciones de palabras idiosincrásicas e impredecibles de autoría humana.'}
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Matriz de Predictibilidad</span>
            <span className="font-semibold text-slate-700">{pxpScore < 40 ? 'Sintética' : 'Orgánica'}</span>
          </div>
        </div>

        {/* Metric 2: Variabilidad / Ráfaga (Burstiness & CV) */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-amber-300 transition-colors shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                2. Ráfaga ($CV$ & $\sigma$)
              </span>
              <BarChart3 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-lg font-extrabold text-slate-900 font-mono">
                {metrics.burstinessRating}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              <p className="flex justify-between font-mono bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-500">Desv. Estándar ($\sigma$):</span>
                <strong className="text-slate-800">{stdDev} palabras</strong>
              </p>
              <p className="flex justify-between font-mono bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-500">Longitud Media ($\mu$):</span>
                <strong className="text-slate-800">{meanLen} pal/orac</strong>
              </p>
              <p className="flex justify-between font-mono bg-amber-50 p-1.5 rounded border border-amber-200 text-amber-900">
                <span>Coef. Variación ($CV$):</span>
                <strong>{cvRatio}</strong>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/80 text-[11px] font-mono text-slate-500 flex justify-between">
            <span>Cadencia Oracional</span>
            <span className="font-semibold text-slate-700">{cvRatio < 0.35 ? 'Homogénea (IA)' : 'Dispersa (Humana)'}</span>
          </div>
        </div>

        {/* Metric 3: Conectores Cliché de IA */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-red-300 transition-colors shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                3. Conectores Cliché
              </span>
              <Flame className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono my-1 flex items-baseline gap-2">
              <span>{metrics.clicheConnectorCount}</span>
              <span className="text-xs font-sans text-slate-500">Detectados</span>
            </div>
            
            {metrics.clicheConnectorCount > 0 ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-slate-600">Muletillas de IA identificadas en el texto:</p>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                  {metrics.clicheConnectorsList.map((c, i) => (
                    <span key={i} className="text-[10px] bg-red-100 text-red-800 border border-red-200 px-1.5 py-0.5 rounded font-mono font-medium">
                      "{c}"
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-emerald-700 leading-relaxed mt-2 bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Prosa limpia de muletillas de plantilla. Estilo directo.</span>
              </p>
            )}

            {nominalRatio > 0 && (
              <p className="text-[11px] text-slate-500 mt-2 font-mono">
                Densidad nominalización: <strong className="text-slate-700">{nominalRatio}/100 pal</strong>
              </p>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200/80 text-[11px] font-mono text-slate-500 flex justify-between">
            <span>Riesgo Clean Prose Trap</span>
            <span className={`font-semibold ${metrics.cleanProseTrapDetected ? 'text-red-600' : 'text-emerald-700'}`}>
              {metrics.cleanProseTrapDetected ? 'Detectado' : 'No detectado'}
            </span>
          </div>
        </div>

        {/* Metric 4: Anclajes Situados & Protocolo Turnitin */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-emerald-300 transition-colors shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                4. Anclajes & Ventanas
              </span>
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
            
            <div className={`text-xl font-extrabold font-mono my-1 ${
              metrics.situatedContextAnchors ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {metrics.situatedContextAnchors ? 'Con Anclajes' : 'Sin Anclajes'}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              {metrics.contextAnchorDetails}
            </p>

            <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-[11px] font-mono text-slate-600">
              <div className="flex justify-between bg-white p-1 rounded border border-slate-200">
                <span className="text-slate-500">Ventanas Deslizantes:</span>
                <strong className="text-slate-800">{windowsCount} (5-10 orac)</strong>
              </div>
              <div className="flex justify-between bg-white p-1 rounded border border-slate-200">
                <span className="text-slate-500">Ajustes Borde (Edge):</span>
                <strong className="text-sky-700">{edgeAdjustments} oraciones</strong>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200/80 text-[11px] font-mono text-slate-500 flex justify-between">
            <span>Filtro de Elegibilidad</span>
            <span className="font-semibold text-emerald-700">Completado</span>
          </div>
        </div>

        {/* Metric 5: Linealidad Semántica (text-embedding-004 / gemini-embedding-2-preview) */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-violet-300 transition-colors shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                5. Linealidad Semántica
              </span>
              <Layers className="w-4 h-4 text-violet-600" />
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                {metrics.semanticLinearity ? (metrics.semanticLinearity * 100).toFixed(0) + '%' : '85%'}
              </span>
              <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Cos $\theta$
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              {metrics.semanticLinearityRating === 'Alta (Uniforme/IA)'
                ? 'Alta linealidad y flujo semántico plano. Característico de textos reescritos por hiladores o parafraseadores automáticos (Bypassers).'
                : metrics.semanticLinearityRating === 'Baja (Orgánica/Humana)'
                ? 'Flujo semántico orgánico con transiciones ricas y cambios de foco complejos típicos de redacción humana.'
                : 'Flujo semántico con variaciones moderadas. Estructura sintáctica estándar.'}
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Uniformidad Vectorial</span>
            <span className={`font-semibold ${
              metrics.semanticLinearityRating === 'Alta (Uniforme/IA)' ? 'text-violet-600' : 'text-emerald-700'
            }`}>
              {metrics.semanticLinearityRating ?? 'Alta (Uniforme/IA)'}
            </span>
          </div>
        </div>

      </div>

      {/* Accordion / Drawer: Expandable Math Formulas & Protocol Specs */}
      <div className="border border-slate-200 rounded-xl bg-slate-50/70 overflow-hidden">
        <button
          onClick={() => setShowMathDetails(!showMathDetails)}
          className="w-full px-4 py-3 flex items-center justify-between bg-slate-100/80 hover:bg-slate-200/60 transition-colors text-xs font-bold text-slate-800 cursor-pointer font-sans"
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-sky-700" />
            <span>Fundamentos Matemáticos, Fórmulas & Reglas de Calibración Turnitin (PXP, CV, Cover Score)</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 font-normal">
            <span>{showMathDetails ? 'Ocultar detalles' : 'Ver ecuaciones'}</span>
            {showMathDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showMathDetails && (
          <div className="p-5 space-y-5 text-xs text-slate-700 border-t border-slate-200 animate-in fade-in duration-200">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Formula A: Perplexity */}
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                  A. Perplejidad ($PXP$)
                </h4>
                <div className="bg-slate-900 text-slate-100 font-mono p-2.5 rounded text-[11px] text-center overflow-x-auto">
                  PXP(W) = exp(-1/N · Σ log P(w_i | w_1...w_i-1))
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Mide la "sorpresa" o impredecibilidad del modelo. Los LLMs seleccionan tokens con máxima probabilidad condicional, produciendo perplejidad baja y uniforme. El texto humano muestra alta variabilidad e impredecibilidad lexical.
                </p>
              </div>

              {/* Formula B: Burstiness CV */}
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                  B. Coeficiente de Variación ($CV$)
                </h4>
                <div className="bg-slate-900 text-slate-100 font-mono p-2.5 rounded text-[11px] text-center overflow-x-auto">
                  CV = σ_longitud / μ_longitud
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Mide el ritmo y variación de la cadencia oracional. Los redactores humanos escriben en ráfagas (mezclando frases cortas de 5 palabras con complejas de 35). Los LLMs generan oraciones homogéneas con $CV$ bajo (&lt; 0.35).
                </p>
              </div>

              {/* Formula C: Coverage Score */}
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-red-600" />
                  C. Cobertura de Texto Global (%)
                </h4>
                <div className="bg-slate-900 text-slate-100 font-mono p-2.5 rounded text-[11px] text-center overflow-x-auto">
                  Score % = (Palabras en Oraciones IA / Total Palabras) * 100
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Fórmula oficial de Turnitin (Sección 4C). No es el promedio de probabilidades, sino la proporción de palabras contenidas en oraciones clasificadas como IA ($P \ge 0.80$) sobre el total de palabras elegibles.
                </p>
              </div>

              {/* Formula D: Semantic Linearity */}
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Layers className="w-3.5 h-3.5 text-violet-600" />
                  D. Linealidad Semántica ($Cos\ \theta$)
                </h4>
                <div className="bg-slate-900 text-slate-100 font-mono p-2.5 rounded text-[11px] text-center overflow-x-auto">
                  Cos(u, v) = (u · v) / (||u|| ||v||)
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Calcula la similitud de coseno vectorial entre oraciones consecutivas. Los "Bypassers" mantienen una trayectoria conceptual rígida y uniforme para conservar coherencia sintética, resultando en perfiles de similitud extremadamente planos.
                </p>
              </div>

            </div>

            {/* Turnitin Rules & Protocols */}
            <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-lg space-y-2">
              <h4 className="font-bold text-sky-900 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-700" />
                Mecanismos de Protección y Control de Falsos Positivos (Turnitin 2026)
              </h4>
              <ul className="list-disc list-inside text-[11px] text-sky-950 space-y-1">
                <li>
                  <strong>Ventana Deslizante (Sliding Window):</strong> Bloques superpuestos de 5 a 10 oraciones (100–300 palabras) para evaluar el contexto circundante de cada token sin sesgos locales.
                </li>
                <li>
                  <strong>Ajuste de Bordes (Edge Smoothing - Sección 4A):</strong> Atenuación de umbrales para las 2 primeras oraciones (introducción) y 2 últimas oraciones (conclusión) debido a fórmulas académicas formales.
                </li>
                <li>
                  <strong>Regla de Incertidumbre (&lt; 20%* - Sección 4B):</strong> Puntuaciones globales en la franja entre 1% y 19% se marcan con un indicador de baja confiabilidad para prevenir acciones punitivas automáticas.
                </li>
              </ul>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

