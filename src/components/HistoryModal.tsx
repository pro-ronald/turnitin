import React, { useState } from 'react';
import { AnalysisHistoryItem } from '../utils/historyStorage';
import { TurnitinReport } from '../types';
import { 
  History, 
  Search, 
  Trash2, 
  ExternalLink, 
  X, 
  FileText, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  history: AnalysisHistoryItem[];
  onClose: () => void;
  onSelectReport: (report: TurnitinReport) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  history,
  onClose,
  onSelectReport,
  onDeleteItem,
  onClearAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const filteredHistory = history.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.documentTitle.toLowerCase().includes(term) ||
      item.sampleSnippet.toLowerCase().includes(term) ||
      item.unirRiskLevel.toLowerCase().includes(term)
    );
  });

  const getRiskBadge = (level: TurnitinReport['unirRiskLevel']) => {
    if (level.includes('Bajo')) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          {level}
        </span>
      );
    }
    if (level.includes('Moderado')) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-yellow-100 text-yellow-900 border border-yellow-300 text-xs font-bold flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-yellow-700" />
          {level}
        </span>
      );
    }
    if (level.includes('Alto')) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
          {level}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
        {level}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
              <History className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-sans">
                  Historial de Análisis Documentales
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                  {history.length} {history.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Consulta y recupera reportes de detección de IA previos o elimina entradas del registro local.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search & Clear All */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título, nivel de riesgo o contenido..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {history.length > 0 && (
            <div>
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-700 font-semibold">¿Vaciar todo?</span>
                  <button
                    onClick={() => {
                      onClearAll();
                      setConfirmClear(false);
                    }}
                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                  >
                    Sí, Vaciar
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1 rounded bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Vaciar Historial</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* History Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredHistory.length > 0 ? (
            filteredHistory.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                      {item.documentTitle}
                    </h4>
                    {getRiskBadge(item.unirRiskLevel)}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {item.formattedDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {item.wordCount} palabras
                    </span>
                    <span className="font-semibold text-slate-700">
                      Índice IA: <strong className="text-slate-900">{item.globalAiPercentage}%</strong>
                    </span>
                  </div>

                  {item.sampleSnippet && (
                    <p className="text-xs text-slate-600 line-clamp-1 italic font-serif bg-slate-50 px-2.5 py-1 rounded border border-slate-100 mt-1">
                      "{item.sampleSnippet}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => {
                      onSelectReport(item.report);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Cargar Reporte</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                  </button>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                    title="Eliminar este análisis"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <History className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {searchTerm ? 'No se encontraron resultados para la búsqueda' : 'No hay análisis almacenados en el historial'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm 
                  ? 'Prueba a cambiar el término de búsqueda o limpia el filtro.' 
                  : 'Los documentos procesados se guardarán automáticamente en este panel para su posterior consulta.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Almacenamiento local persistente en navegador
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
