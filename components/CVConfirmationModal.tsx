// components/CVConfirmationModal.tsx
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
      case 'skill': return 'bg-blue-50 border-blue-200';
      case 'education': return 'bg-yellow-50 border-yellow-200';
      case 'experience': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
        
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  🤔 Tarkista nämä ehdotukset
                </h2>
                <p className="text-sm text-gray-600">
                  AI lisäsi CV:hen tietoja, joita ei löytynyt profiilista. Voimmeko käyttää näitä?
                </p>
              </div>
            </div>
            <button
              onClick={handleRejectClick}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {violationItems.map((item, index) => (
              <div
                key={index}
                className={`p-4 border-2 rounded-lg ${getTypeColor(item.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-gray-700 border-2 border-gray-300">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold">
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="text-xs text-gray-500 italic">
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
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[80px]"
                        placeholder="Korjaa tämä tieto..."
                      />
                    ) : (
                      <p className="text-gray-800 font-medium bg-white p-3 rounded border border-gray-200">
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
          <div className="px-6 py-4 bg-red-50 border-t border-b border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-1">
                  ⚠️ Varoitus: CV:stä tulee suppea
                </h3>
                <p className="text-sm text-red-800 mb-3">
                  Jos hylkäät nämä tiedot, ne poistetaan CV:stä. CV voi olla lyhyempi ja vähemmän yksityiskohtainen.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmReject}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                  >
                    Ymmärrän - Hylkää silti
                  </button>
                  <button
                    onClick={cancelReject}
                    className="px-4 py-2 bg-white border border-red-300 rounded-lg hover:bg-red-50 font-medium text-sm text-red-900"
                  >
                    Peruuta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-3">
          
          {mode === 'review' ? (
            <>
              <button
                onClick={handleRejectClick}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium text-gray-700 transition-colors"
              >
                ❌ Ei, poista nämä
              </button>
              
              <button
                onClick={() => setMode('edit')}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                ✏️ Korjaa tiedot
              </button>
              
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
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
                className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium text-gray-700"
              >
                Peruuta
              </button>
              
              <button
                onClick={handleSaveEdits}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 shadow-sm"
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Miksi tämä kysytään?</strong><br />
              AI yritti luoda kattavan CV:n, mutta lisäsi tietoja joita ei löytynyt profiilista. 
              {mode === 'review' 
                ? ' Voit hyväksyä ne sellaisenaan, korjata ne oikeiksi, tai hylätä kokonaan.'
                : ' Korjaa tiedot vastaamaan totuutta, niin ne tallennetaan profiiliisi.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}