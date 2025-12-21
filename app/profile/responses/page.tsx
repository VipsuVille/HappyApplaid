'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trash2, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface SavedResponse {
  id: string;
  question_text: string;
  answer: string;
  question_category: string;
  created_at: string;
  updated_at: string;
}

export default function ResponsesPage() {
  const [responses, setResponses] = useState<SavedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
        r.id === id ? { ...r, answer: editValue } : r
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
      case 'skills': return 'bg-blue-100 text-blue-800';
      case 'experience': return 'bg-green-100 text-green-800';
      case 'personality': return 'bg-purple-100 text-purple-800';
      case 'education': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Tallennetut Vastaukset
            </h1>
            <p className="text-gray-600">
              Muokkaa tai poista AI:n kysymiä kysymyksiä
            </p>
          </div>

          {responses.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-12 text-center border-2 border-white/60 shadow-xl">
              <p className="text-gray-600 text-lg">
                Ei vielä tallennettuja vastauksia. AI kysyy kysymyksiä hakukirjeitä luodessa.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {responses.map(response => (
                <div
                  key={response.id}
                  className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border-2 border-white/60 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(response.question_category)}`}>
                        {response.question_category.toUpperCase()}
                        täällä pitäisi olla teskti
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 mt-3">
                        {response.question_text}
                        täällä kysymys
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      {editingId === response.id ? (
                        <>
                          <button
                            onClick={() => handleSave(response.id)}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(response)}
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(response.id)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingId === response.id ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full p-4 border-2 border-indigo-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                      rows={4}
                    />
                  ) : (
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-xl">
                      {response.answer}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mt-3">
                    Tallennettu: {new Date(response.created_at).toLocaleDateString('fi-FI')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}