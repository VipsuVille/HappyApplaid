// components/CVConfirmationModal.tsx - DARK THEME
'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, X, Edit2, Save, Loader2, AlertTriangle } from 'lucide-react';

interface ViolationItem {
  type: 'skill' | 'education' | 'experience';
  content: string;
  reason: string;
}

interface CVConfirmationModalProps {
  violations: {
    fabricatedSkills?: string[];
    fabricatedEducation?: string[];
    fabricatedExperience?: string[];
  };
  onApprove: (items: ViolationItem[]) => Promise<void>;
  onReject: () => void;
  onEdit: (items: Array<{ original: string; corrected: string; type: string }>) => Promise<void>;
}

export default function CVConfirmationModal({
  violations,
  onApprove,
  onReject,
  onEdit
}: CVConfirmationModalProps) {
  const [mode, setMode] = useState<'review' | 'edit'>('review');
  const [editedItems, setEditedItems] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectWarning, setShowRejectWarning] = useState(false);

  // Muunna violations listaksi
  const violationItems: ViolationItem[] = [
    ...(violations.fabricatedSkills || []).map(skill => ({
      type: 'skill' as const,
      content: skill,
      reason: 'Tämä taito ei ollut profiilissasi'
    })),
    ...(violations.fabricatedEducation || []).map(edu => ({
      type: 'education' as const,
      content: edu,
      reason: 'Tämä koulutus ei ollut profiilissasi'
    })),
    ...(violations.fabricatedExperience || []).map(exp => ({
      type: 'experience' as const,
      content: exp,
      reason: 'Tämä kokemus ei ollut profiilissasi'
    }))
  ];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'skill': return '🎯 Taito';
      case 'education': return '🎓 Koulutus';
      case 'experience': return '💼 Kokemus';
      default: return '📝 Sisältö';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'skill': return 'bg-blue-500/10 border-blue-400/30';
      case 'education': return 'bg-yellow-500/10 border-yellow-400/30';
      case 'experience': return 'bg-green-500/10 border-green-400/30';
      default: return 'bg-gray-500/10 border-gray-400/30';
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(violationItems);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdits = async () => {
    setIsSubmitting(true);
    try {
      const corrections = Object.entries(editedItems)
        .filter(([_, corrected]) => corrected.trim().length > 0)
        .map(([original, corrected]) => {
          const item = violationItems.find(v => v.content === original);
          return {
            original,
            corrected,
            type: item?.type || 'other'
          };
        });
      
      if (corrections.length === 0) {
        setIsSubmitting(false);
        return;
      }
      
      await onEdit(corrections);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClick = () => {
    setShowRejectWarning(true);
  };

  const confirmReject = () => {
    onReject();
  };

  const cancelReject = () => {
    setShowRejectWarning(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900/95 via-slate-900/95 to-gray-900/95 backdrop-blur-2xl rounded-3xl border-2 border-orange-400/30 shadow-2xl max-w-3xl w-full my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-orange-500/20 to-red-500/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-8 h-8 text-orange-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  🤔 Tarkista nämä ehdotukset
                </h2>
                <p className="text-sm text-gray-300">
                  AI lisäsi CV:hen tietoja, joita ei löytynyt profiilista. Voimmeko käyttää näitä?
                </p>
              </div>
            </div>
            <button
              onClick={handleRejectClick}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            {violationItems.map((item, index) => (
              <div
                key={index}
                className={`p-4 border-2 rounded-xl ${getTypeColor(item.type)} transition-all hover:shadow-lg hover:shadow-orange-500/10`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-orange-300">
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="text-xs text-gray-400 italic">
                        {item.reason}
                      </span>
                    </div>

                    {mode === 'edit' ? (
                      <textarea
                        value={editedItems[item.content] ?? item.content}
                        onChange={(e) => setEditedItems(prev => ({
                          ...prev,
                          [item.content]: e.target.value
                        }))}
                        className="w-full p-3 bg-black/40 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 text-sm min-h-[80px] text-white placeholder-gray-500 transition-all"
                        placeholder="Korjaa tämä tieto..."
                      />
                    ) : (
                      <p className="text-gray-200 font-medium bg-black/30 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                        {item.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reject Warning */}
        {showRejectWarning && (
          <div className="px-6 py-4 bg-red-500/10 border-t border-b border-red-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-300 mb-1">
                  ⚠️ Varoitus: CV:stä tulee suppea
                </h3>
                <p className="text-sm text-red-200 mb-3">
                  Jos hylkäät nämä tiedot, ne poistetaan CV:stä. CV voi olla lyhyempi ja vähemmän yksityiskohtainen.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmReject}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors shadow-lg"
                  >
                    Ymmärrän - Hylkää silti
                  </button>
                  <button
                    onClick={cancelReject}
                    className="px-4 py-2 bg-white/10 border border-red-400/30 rounded-lg hover:bg-white/20 font-medium text-sm text-red-200 transition-colors"
                  >
                    Peruuta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/20 flex flex-col sm:flex-row gap-3">
          
          {mode === 'review' ? (
            <>
              <button
                onClick={handleRejectClick}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-white/5 border-2 border-gray-600 rounded-xl hover:bg-white/10 disabled:opacity-50 font-medium text-gray-300 transition-colors"
              >
                ❌ Ei, poista nämä
              </button>
              
              <button
                onClick={() => setMode('edit')}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <Edit2 className="w-4 h-4" />
                ✏️ Korjaa tiedot
              </button>
              
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-green-500/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Tallennetaan...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    ✅ Kyllä, käytä näitä
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setMode('review');
                  setEditedItems({});
                }}
                disabled={isSubmitting}
                className="px-4 py-3 bg-white/5 border-2 border-gray-600 rounded-xl hover:bg-white/10 disabled:opacity-50 font-medium text-gray-300 transition-colors"
              >
                Peruuta
              </button>
              
              <button
                onClick={handleSaveEdits}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/20 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Tallennetaan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Tallenna korjaukset
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Info */}
        <div className="px-6 pb-6">
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-sm text-blue-200">
              <strong className="text-blue-300">💡 Miksi tämä kysytään?</strong><br />
              AI yritti luoda kattavan CV:n, mutta lisäsi tietoja joita ei löytynyt profiilista. 
              {mode === 'review' 
                ? ' Voit hyväksyä ne sellaisenaan, korjata ne oikeiksi, tai hylätä kokonaan.'
                : ' Korjaa tiedot vastaamaan totuutta, niin ne tallennetaan profiiliisi.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.5);
        }
      `}</style>
    </div>
  );
}