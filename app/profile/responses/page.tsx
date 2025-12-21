// app/profile/responses/page.tsx - PARANNETTU VERSIO
'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trash2, Edit2, Save, X, Briefcase, FileText, Calendar, Tag } from 'lucide-react';
import { toast } from 'sonner';
import SmartHeader from '@/components/ui/smartHeader';

interface SavedResponse {
  id: string;
  question_text: string;
  answer: string;
  question_category: string;
  asked_in_context: string;
  job_title_context: string | null;
  created_at: string;
  updated_at: string;
}

export default function ResponsesPage() {
  const [responses, setResponses] = useState<SavedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    try {
      const res = await fetch('/api/user-responses');
      const data = await res.json();
      
      if (data.success) {
        setResponses(data.responses);
      }
    } catch (error) {
      console.error('Error loading responses:', error);
      toast.error('Vastausten lataus epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (response: SavedResponse) => {
    setEditingId(response.id);
    setEditValue(response.answer);
  };

  const handleSave = async (id: string) => {
    try {
      const res = await fetch(`/api/user-responses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: editValue })
      });

      if (!res.ok) throw new Error('Update failed');

      setResponses(prev => prev.map(r => 
        r.id === id ? { ...r, answer: editValue, updated_at: new Date().toISOString() } : r
      ));
      
      setEditingId(null);
      toast.success('Vastaus päivitetty!');
    } catch (error) {
      toast.error('Päivitys epäonnistui');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Haluatko varmasti poistaa tämän vastauksen?')) return;

    try {
      const res = await fetch(`/api/user-responses/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Delete failed');

      setResponses(prev => prev.filter(r => r.id !== id));
      toast.success('Vastaus poistettu');
    } catch (error) {
      toast.error('Poisto epäonnistui');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'skills': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'experience': return 'bg-green-100 text-green-800 border-green-200';
      case 'personality': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'education': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cover_letter': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getContextLabel = (context: string) => {
    switch (context) {
      case 'cover_letter_v1': return 'Hakukirje V1';
      case 'cover_letter_v2': return 'Hakukirje V2 (ATS)';
      case 'cv_generation': return 'CV Generointi';
      default: return context || 'Tuntematon';
    }
  };

  const filteredResponses = filterCategory === 'all' 
    ? responses 
    : responses.filter(r => r.question_category === filterCategory);

  const categories = ['all', ...Array.from(new Set(responses.map(r => r.question_category)))];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 shadow-xl">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Ladataan vastauksia...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SmartHeader />
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          
          {/* HEADER */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              📚 Tallennetut Vastaukset
            </h1>
            <p className="text-gray-600 font-medium">
              AI:n kysymät kysymykset ja sinun vastauksesi
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {responses.length} {responses.length === 1 ? 'vastaus' : 'vastausta'} tallennettu
            </p>
          </div>

          {/* FILTER BUTTONS */}
          {responses.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2 justify-center">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    filterCategory === cat
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                      : 'bg-white/70 text-gray-700 hover:bg-white'
                  }`}
                >
                  {cat === 'all' ? 'Kaikki' : cat.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* RESPONSES */}
          {filteredResponses.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-12 text-center border-2 border-white/60 shadow-xl">
              <div className="text-6xl mb-4">💭</div>
              <p className="text-gray-600 text-lg mb-2">
                {filterCategory === 'all' 
                  ? 'Ei vielä tallennettuja vastauksia'
                  : `Ei vastauksia kategoriassa: ${filterCategory}`
                }
              </p>
              <p className="text-gray-500 text-sm">
                AI kysyy kysymyksiä kun luot hakukirjeitä tai CV:itä
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredResponses.map(response => {
                const wasUpdated = response.updated_at !== response.created_at;
                
                return (
                  <div
                    key={response.id}
                    className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border-2 border-white/60 shadow-lg hover:shadow-xl transition-all"
                  >
                    {/* HEADER ROW */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        {/* Category Badge */}
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getCategoryColor(response.question_category)}`}>
                          <Tag className="w-3 h-3" />
                          {response.question_category.toUpperCase()}
                        </span>
                        
                        {/* Question Text */}
                        <h3 className="text-lg font-bold text-gray-900 mt-3 leading-tight">
                          {response.question_text}
                        </h3>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 ml-4">
                        {editingId === response.id ? (
                          <>
                            <button
                              onClick={() => handleSave(response.id)}
                              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                              title="Tallenna"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                              title="Peruuta"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(response)}
                              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                              title="Muokkaa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(response.id)}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="Poista"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* ANSWER */}
                    {editingId === response.id ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full p-4 border-2 border-indigo-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 outline-none bg-white"
                        rows={4}
                      />
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {response.answer}
                        </p>
                      </div>
                    )}

                    {/* METADATA ROW */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-500">
                      
                      {/* Context */}
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span className="font-medium">Konteksti:</span>
                        <span className="text-gray-700">{getContextLabel(response.asked_in_context)}</span>
                      </div>

                      {/* Job Title (if exists) */}
                      {response.job_title_context && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          <span className="font-medium">Työpaikka:</span>
                          <span className="text-gray-700">{response.job_title_context}</span>
                        </div>
                      )}

                      {/* Created Date */}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span className="font-medium">Luotu:</span>
                        <span className="text-gray-700">
                          {new Date(response.created_at).toLocaleDateString('fi-FI', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Updated (if different) */}
                      {wasUpdated && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <span className="font-medium">Päivitetty:</span>
                          <span>
                            {new Date(response.updated_at).toLocaleDateString('fi-FI', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* INFO BOX */}
          <div className="mt-8 bg-indigo-50/80 backdrop-blur-sm border-2 border-indigo-200 rounded-2xl p-6">
            <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
              <span className="text-xl">💡</span>
              Miten tämä toimii?
            </h3>
            <ul className="text-sm text-indigo-800 space-y-2 ml-6">
              <li className="list-disc">AI kysyy kysymyksiä kun luot hakukirjeitä tai CV:itä</li>
              <li className="list-disc">Vastaukset tallentuvat automaattisesti</li>
              <li className="list-disc">Seuraavalla kerralla AI <strong>ei kysy samaa uudelleen</strong></li>
              <li className="list-disc">Voit muokata vastauksia milloin tahansa</li>
              <li className="list-disc">AI käyttää näitä vastauksia myös CV:issä ja hakukirjeissä</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}