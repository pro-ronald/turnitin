import React, { useState, useEffect } from 'react';
import { Key, Check, Trash2, ExternalLink, ShieldCheck, X } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const existingKey = localStorage.getItem('user_gemini_api_key') || '';
    setSavedKey(existingKey);
    setApiKey(existingKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (cleanKey) {
      localStorage.setItem('user_gemini_api_key', cleanKey);
      setSavedKey(cleanKey);
      setIsSaved(true);
      onKeySaved(cleanKey);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('user_gemini_api_key');
    setSavedKey('');
    setApiKey('');
    onKeySaved('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950 flex items-center justify-center border border-sky-700/60 text-sky-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Configurar Gemini API Key</h3>
              <p className="text-xs text-slate-400">Usa tus propios tokens personales</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 text-xs text-sky-900 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-sky-950">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Privacidad & Seguridad Garantizada</span>
            </div>
            <p>
              Tu API Key se almacena <strong>únicamente en tu navegador local (localStorage)</strong> y se transmite de forma encriptada a través del backend para procesar el análisis de Turnitin.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tu Gemini API Key (Google AI Studio)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono text-sm bg-slate-50 focus:bg-white transition-all"
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:text-sky-800 font-semibold inline-flex items-center gap-1 hover:underline"
            >
              <span>Obtener API Key Gratis en Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {savedKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-semibold text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Clave</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                {isSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Guardado!</span>
                  </>
                ) : (
                  <span>Guardar Clave</span>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
