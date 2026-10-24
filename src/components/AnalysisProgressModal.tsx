import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, CheckCircle2, Loader2, Sparkles, AlertCircle, Search } from 'lucide-react';

interface AnalysisProgressModalProps {
  isOpen: boolean;
  docTitle: string;
  wordCount?: number;
  paragraphCount?: number;
  sentenceCount?: number;
  targetDurationMs?: number;
  onFinished?: () => void;
}

interface PhaseStep {
  id: number;
  title: string;
  subtitle: string;
  detail: string;
}

export const AnalysisProgressModal: React.FC<AnalysisProgressModalProps> = ({
  isOpen,
  docTitle,
  wordCount = 0,
  paragraphCount = 0,
  sentenceCount = 0,
  targetDurationMs = 3000
}) => {
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [progressPercent, setProgressPercent] = useState<number>(10);

  const estimatedWindows = Math.max(1, Math.ceil((sentenceCount || Math.ceil(wordCount / 18)) / 5));

  const phases: PhaseStep[] = [
    {
      id: 1,
      title: 'Fase 1: Preprocesado & Filtro de Elegibilidad',
      subtitle: 'Descarte de bibliografías, tablas numéricas y metadatos institucionales',
      detail: wordCount > 0
        ? `Analizando ${wordCount.toLocaleString()} palabras en ${paragraphCount || 1} párrafos para aislar el cuerpo de texto cualificado.`
        : 'Aislando el cuerpo de texto cualificado conforme a los estándares de auditoría Turnitin 2026.'
    },
    {
      id: 2,
      title: 'Fase 2: Segmentación Oracional y Ventanas Deslizantes',
      subtitle: 'Desglose en oraciones y ventanas superpuestas de 5-10 oraciones',
      detail: sentenceCount > 0
        ? `Divididas ${sentenceCount} oraciones en ${estimatedWindows} ventanas deslizantes para medir la entropía contextual sin sesgos locales.`
        : 'Dividiendo oraciones para medir longitud ($L_i$), perplejidad relativa y distribución de cadencia.'
    },
    {
      id: 3,
      title: 'Fase 3: Evaluación Forense Multi-Métrica',
      subtitle: 'Perplejidad ($PXP$), Coeficiente de Ráfaga ($CV$) y Conectores Cliché',
      detail: `Escaneando las ${wordCount.toLocaleString() || 'todas las'} palabras en búsqueda de muletillas de LLM, monotonía sintáctica y sinónimos forzados.`
    },
    {
      id: 4,
      title: 'Fase 4: Aplicación de Regla de Supresión y Ajuste de Bordes',
      subtitle: 'Filtrado de Falsos Positivos ($P_{raw} \ge 0.65$) y suavizado en Intro/Conclusión',
      detail: 'Aplicando la Sección 4A del Protocolo Turnitin para proteger fórmulas académicas legítimas en párrafos iniciales y finales.'
    },
    {
      id: 5,
      title: 'Fase 5: Consolidación del Índice Cobertura Turnitin 2026',
      subtitle: 'Generación del Dictamen Institucional y Certificado Forense',
      detail: `Calculando el Score Global (%) = (Palabras IA / ${wordCount.toLocaleString() || 'Total'} palabras elegibles) * 100.`
    }
  ];

  useEffect(() => {
    if (!isOpen) {
      setCurrentPhase(1);
      setProgressPercent(10);
      return;
    }

    const stepMs = Math.max(400, Math.floor(targetDurationMs / 5));

    const interval = setInterval(() => {
      setCurrentPhase((prev) => {
        if (prev >= 5) {
          clearInterval(interval);
          return 5;
        }
        return prev + 1;
      });
    }, stepMs);

    const progressIntervalMs = 80;
    const increment = Math.max(1, (90 / (targetDurationMs / progressIntervalMs)));

    const progressInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 98) {
          clearInterval(progressInterval);
          return 98;
        }
        return Math.min(98, Math.round(prev + increment));
      });
    }, progressIntervalMs);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [isOpen, targetDurationMs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-sans">
                  Ejecutando Análisis Forense Turnitin 2026
                </h3>
                <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 text-[10px] font-mono font-bold border border-red-800/60">
                  PROTOCOL 5-PHASES
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-sm">
                Documento: <span className="text-slate-200 font-semibold">{docTitle || 'Documento sin título'}</span>
              </p>
              {wordCount > 0 && (
                <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-sky-400 font-bold">
                    {wordCount.toLocaleString()} palabras
                  </span>
                  <span>•</span>
                  <span>{paragraphCount} párrafos</span>
                  {sentenceCount > 0 && (
                    <>
                      <span>•</span>
                      <span>{sentenceCount} oraciones</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-extrabold text-red-500 font-mono tracking-tight">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-slate-950 h-2 relative overflow-hidden border-b border-slate-800">
          <div
            className="bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Phase Checklist Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {phases.map((phase) => {
            const isDone = phase.id < currentPhase;
            const isCurrent = phase.id === currentPhase;
            const isPending = phase.id > currentPhase;

            return (
              <div
                key={phase.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start space-x-3.5 ${
                  isCurrent
                    ? 'bg-slate-800/90 border-red-500/60 shadow-lg shadow-red-950/40 ring-1 ring-red-500/30'
                    : isDone
                    ? 'bg-slate-950/60 border-slate-800/80 opacity-90'
                    : 'bg-slate-950/30 border-slate-800/40 opacity-40'
                }`}
              >
                {/* Status Icon */}
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/50">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center border border-slate-700 text-xs font-mono font-bold">
                      {phase.id}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-bold ${isCurrent ? 'text-slate-100' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                      {phase.title}
                    </h4>
                    {isCurrent && (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50 animate-pulse">
                        Procesando...
                      </span>
                    )}
                    {isDone && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                        Completado
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                    {phase.subtitle}
                  </p>

                  {isCurrent && (
                    <p className="text-[11px] text-red-300/90 mt-1.5 font-mono leading-relaxed bg-red-950/30 p-2 rounded border border-red-900/40">
                      ▸ {phase.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-slate-400" />
            <span>Motor Forense Neuronal & Heurístico 2026</span>
          </div>
          <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Escala Institucional Turnitin</span>
          </div>
        </div>

      </div>
    </div>
  );
};
