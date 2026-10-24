import React from 'react';
import { TurnitinReport } from '../types';
import { 
  AlertCircle, 
  CheckCircle2, 
  Lightbulb, 
  Sparkles, 
  BookOpen, 
  PenTool, 
  Compass
} from 'lucide-react';

interface FindingsAndRemedialProps {
  report: TurnitinReport;
}

export const FindingsAndRemedial: React.FC<FindingsAndRemedialProps> = ({ report }) => {
  const detectedDomain = report.remedialPlan.detectedDomain || 'General / Académico';
  const cliches = report.findings.clicheConnectors || [];

  return (
    <div id="humanizer-section" className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8 scroll-mt-6">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950 px-2.5 py-1 rounded border border-amber-800/60 inline-block mb-1">
            Hallazgos Específicos & Orientación Académica
          </span>
          <h3 className="text-lg font-bold text-slate-100 font-sans">
            Recomendaciones de Reescritura Académica ("Humanización Genuina")
          </h3>
          <p className="text-xs text-slate-400">
            Directrices para la subsanación del manuscrito sin recurrir a herramientas de parafraseo sintético (bypassers).
          </p>
        </div>

        {/* Detected Domain Tag */}
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
          <Compass className="w-4 h-4 text-sky-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Dominio Detectado</span>
            <span className="font-bold text-sky-200">{detectedDomain}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Findings vs Remedial Plan */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-200">
        
        {/* Specific Red Flag Findings Column */}
        <div className="bg-rose-50/50 rounded-xl p-5 border border-rose-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Marcadores de IA Detectados
              </h4>
            </div>

            <ul className="space-y-3 text-xs text-slate-700">
              <li className="p-3 bg-white rounded-lg border border-rose-200 shadow-2xs">
                <strong className="text-slate-900 block mb-1 font-mono">
                  1. Conectores Retóricos Sobrecargados:
                </strong>
                {cliches.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cliches.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-rose-100 text-rose-900 rounded font-mono font-bold text-[11px]">
                        "{c}"
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic">No se identificaron conectores cliché significativos.</span>
                )}
              </li>

              <li className="p-3 bg-white rounded-lg border border-rose-200 shadow-2xs">
                <strong className="text-slate-900 block mb-1 font-mono">
                  2. Patrón de Cadencia y Ráfaga (σ_len):
                </strong>
                <p className="text-slate-600 leading-normal">
                  {report.findings.monotonousCadencePatterns}
                </p>
              </li>

              {report.findings.bypasserIndicators.length > 0 && (
                <li className="p-3 bg-white rounded-lg border border-purple-200 shadow-2xs">
                  <strong className="text-purple-900 block mb-1 font-mono">
                    3. Indicadores de Parafraseado Sintético (Bypassers):
                  </strong>
                  <p className="text-purple-800 leading-normal">
                    {report.findings.bypasserIndicators[0]}
                  </p>
                </li>
              )}
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-200 text-[11px] text-rose-800 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Evita el uso de QuillBot, Undetectable AI o reescritores automáticos.</span>
          </div>
        </div>

        {/* Actionable Humanization Remedial Plan */}
        <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Plan de Acción para Humanización Genuina
              </h4>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-2xs">
                <strong className="text-emerald-950 font-bold block mb-1 font-sans flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                  Sugerencia 1: Inyectar Anclajes Contextuales Situados
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  {report.remedialPlan.contextAnchorsSuggestion}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-2xs">
                <strong className="text-emerald-950 font-bold block mb-1 font-sans flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Sugerencia 2: Variación de Ráfaga y Cadencia (Burstiness)
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  {report.remedialPlan.cadenceBurstinessSuggestion}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-2xs">
                <strong className="text-emerald-950 font-bold block mb-1 font-sans flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Sugerencia 3: Limpieza de la Clean Prose Trap
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  {report.remedialPlan.cleanProseCleanupSuggestion}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Asegura cumplimiento completo de las normativas de integridad académica universales.</span>
          </div>
        </div>

      </div>

    </div>
  );
};

