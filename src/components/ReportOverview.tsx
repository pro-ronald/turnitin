import React from 'react';
import { TurnitinReport } from '../types';
import { ShieldAlert, ShieldCheck, AlertTriangle, FileCheck, Info, Cpu, Layers, Sparkles } from 'lucide-react';

interface ReportOverviewProps {
  report: TurnitinReport;
  engineName?: string;
}

export const ReportOverview: React.FC<ReportOverviewProps> = ({ report, engineName }) => {
  const getRiskBadge = () => {
    if (report.globalAiPercentage > 60) {
      return {
        label: '61-100% RIESGO MUY ALTO',
        colorClass: 'bg-rose-600 text-white border-rose-700',
        icon: <ShieldAlert className="w-5 h-5 text-white" />
      };
    }
    if (report.globalAiPercentage > 35) {
      return {
        label: '36-60% RIESGO ALTO',
        colorClass: 'bg-amber-600 text-white border-amber-700',
        icon: <AlertTriangle className="w-5 h-5 text-white" />
      };
    }
    if (report.globalAiPercentage > 15) {
      return {
        label: '16-35% RIESGO MODERADO',
        colorClass: 'bg-yellow-500 text-slate-900 border-yellow-600',
        icon: <Info className="w-5 h-5 text-slate-900" />
      };
    }
    return {
      label: '0-15% RIESGO BAJO',
      colorClass: 'bg-emerald-600 text-white border-emerald-700',
      icon: <ShieldCheck className="w-5 h-5 text-white" />
    };
  };

  const riskBadge = getRiskBadge();

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8">
      
      {/* Top Academic Metadata Bar */}
      <div className="bg-slate-900 text-slate-100 px-6 py-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 font-semibold border border-red-800/60">
              RESULTADOS FORENSES 2026
            </span>
            {engineName && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Engine: {engineName}
              </span>
            )}
          </div>
          <h3 className="text-lg font-extrabold text-white mt-1">
            {report.documentTitle}
          </h3>
          <p className="text-xs text-slate-400">
            Procesado el: {report.processedAt}
          </p>
        </div>

        {/* Quick pill stats */}
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <div className="bg-slate-800/90 px-3 py-1.5 rounded-md border border-slate-700 text-slate-300">
            Palabras Totales: <span className="font-bold text-white">{report.totalWords}</span>
          </div>
          <div className="bg-slate-800/90 px-3 py-1.5 rounded-md border border-slate-700 text-slate-300">
            Oraciones Evaluadas: <span className="font-bold text-white">{report.totalSentencesEvaluated}</span>
          </div>
          <div className={`px-3 py-1.5 rounded-md border font-semibold ${
            report.sampleSufficiency.includes('Suficiente') 
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
              : 'bg-amber-950/80 text-amber-300 border-amber-800'
          }`}>
            Muestra: {report.sampleSufficiency}
          </div>
        </div>
      </div>

      <div className="p-6">
        
        {/* Main Score Circular Gauge Box */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-red-600" />
                Resultado Global de Autenticidad (Turnitin Score)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                P_raw Threshold ≥ 0.65
              </span>
            </div>

            {/* Turnitin Box Representation */}
            <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-inner">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                
                {/* Big Score Display */}
                <div className="flex items-center gap-4">
                  <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 ${
                    report.globalAiPercentage > 35 ? 'border-rose-500 bg-rose-950/40 text-rose-400' :
                    report.globalAiPercentage > 15 ? 'border-amber-500 bg-amber-950/40 text-amber-400' :
                    'border-emerald-500 bg-emerald-950/40 text-emerald-400'
                  }`}>
                    <span className="text-3xl font-extrabold font-mono tracking-tight">
                      {report.globalAiPercentage}%
                    </span>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">
                      ÍNDICE IA
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                      Porcentaje Global de IA
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Proporción total de oraciones clasificadas como sintéticas directas o parafraseadas con IA sobre el total cualificado.
                    </p>
                  </div>
                </div>

              </div>

              {/* Breakdown Rows */}
              <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700/80 flex flex-col">
                  <span className="text-blue-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    IA Directa: {report.directAiPercentage}%
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    ({report.directAiSentenceCount} oraciones P ≥ 0.65)
                  </span>
                </div>

                <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700/80 flex flex-col">
                  <span className="text-purple-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    IA Parafraseada: {report.paraphrasedAiPercentage}%
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    ({report.paraphrasedAiSentenceCount} oraciones 0.30≤P&lt;0.65)
                  </span>
                </div>

                <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700/80 flex flex-col">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Autoría Humana: {report.humanPercentage}%
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    ({report.humanSentenceCount} oraciones P &lt; 0.30)
                  </span>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-4 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Regla de supresión conservadora aplicada (&lt;0.65 asigna 0.0)</span>
            <span>Falsos positivos estimados &lt; 1%</span>
          </div>
        </div>

      </div>

    </div>
  );
};
