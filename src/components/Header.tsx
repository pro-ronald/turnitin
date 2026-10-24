import React from 'react';
import { History, RefreshCw, Key } from 'lucide-react';

interface HeaderProps {
  onNewAnalysis: () => void;
  onOpenHistory: () => void;
  onOpenApiKeyModal: () => void;
  historyCount: number;
  hasCustomKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNewAnalysis,
  onOpenHistory,
  onOpenApiKeyModal,
  historyCount,
  hasCustomKey
}) => {

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shadow-lg shadow-sky-950/40 border border-slate-700/80 shrink-0 font-sans tracking-tight">
            <span className="text-xl font-black text-red-600">t</span>
            <span className="text-xl font-bold text-white">in</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-100 font-sans">
                turnitin <span className="text-sky-400 font-extrabold">AI Writing Detection</span>
              </h1>
              <span className="bg-sky-950/90 text-sky-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-sky-800">
                VERSIÓN 2026.4
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Sistema Oficial de Integridad Académica</span>
              <span className="text-slate-600">•</span>
              <span className="text-sky-300 font-medium">Originality & AI Writing Report</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 self-end md:self-auto">
          {/* Custom API Key Button */}
          <button
            onClick={onOpenApiKeyModal}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              hasCustomKey
                ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-800/80'
            }`}
            title="Configurar tu Gemini API Key personal"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{hasCustomKey ? 'API Key Personal' : 'Configurar API Key'}</span>
            <span className={`w-2 h-2 rounded-full ${hasCustomKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>

          {/* History button */}
          <button
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors relative"
            title="Ver historial de análisis guardados"
          >
            <History className="w-3.5 h-3.5 text-red-400" />
            <span>Historial</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-mono font-bold">
                {historyCount}
              </span>
            )}
          </button>

          <button
            onClick={onNewAnalysis}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Nuevo Análisis</span>
          </button>
        </div>

      </div>
    </header>
  );
};
