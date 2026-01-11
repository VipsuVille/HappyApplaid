// app/profile/responses/page.tsx - TUMMA ORANSSI TEEMA
'use client';

import { useState, useEffect } from 'react';
import { 
  Loader2, Trash2, Edit2, Save, X, Briefcase, FileText, Calendar, Tag,
  Grid3x3, List, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

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

type ViewMode = 'compact' | 'detailed';

export default function ResponsesPage() {
  const [responses, setResponses] = useState<SavedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    try {
      const res = await fetch('/api/user-responses?limit=1000');
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

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'skills': return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      case 'experience': return 'bg-green-500/20 text-green-300 border-green-400/30';
      case 'personality': return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      case 'education': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      case 'cover_letter': return 'bg-pink-500/20 text-pink-300 border-pink-400/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  const getContextLabel = (context: string) => {
    switch (context) {
      case 'cover_letter_v1': return 'Hakukirje V1';
      case 'cover_letter_v2': return 'Hakukirje V2';
      case 'cover_letter_general': return 'Yleinen Esittely';
      case 'cv_generation': return 'CV';
      default: return context || 'Tuntematon';
    }
  };

  const filteredResponses = responses
    .filter(r => filterCategory === 'all' || r.question_category === filterCategory)
    .filter(r => 
      searchQuery === '' || 
      r.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const categories = ['all', ...Array.from(new Set(responses.map(r => r.question_category)))];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-slate-100 to-gray-200">
        <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 shadow-2xl border-2 border-white/60">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-gray-900 font-medium">Ladataan vastauksia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-100 to-gray-200 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent mb-2">
            📚 Tallennetut Vastaukset
          </h1>
          <p className="text-gray-700 font-medium">
            AI:n kysymät kysymykset ja sinun vastauksesi
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {responses.length} {responses.length === 1 ? 'vastaus' : 'vastausta'} • 
            Näytetään {filteredResponses.length}
          </p>
        </div>

        {/* TOOLBAR: Haku + Näkymävaihto */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Hae kysymyksistä tai vastauksista..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/90 backdrop-blur-sm border-2 border-white/60 text-gray-900 placeholder-gray-500 focus:border-orange-400 focus:ring-4 focus:ring-orange-200 outline-none transition-all shadow-sm"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 bg-white/90 backdrop-blur-sm rounded-xl p-1 border-2 border-white/60 shadow-sm">
            <button
              onClick={() => setViewMode('compact')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                viewMode === 'compact'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-white/80'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              Kompakti
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                viewMode === 'detailed'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-white/80'
              }`}
            >
              <List className="w-4 h-4" />
              Yksityiskohdat
            </button>
          </div>
        </div>

        {/* FILTER BUTTONS */}
        {responses.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2 justify-center">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  filterCategory === cat
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
                    : 'bg-white/90 backdrop-blur-sm text-gray-700 border-2 border-white/60 hover:bg-white hover:shadow-md'
                }`}
              >
                {cat === 'all' ? 'Kaikki' : cat.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* RESPONSES */}
        {filteredResponses.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-12 text-center border-2 border-white/60 shadow-xl">
            <div className="text-6xl mb-4">💭</div>
            <p className="text-gray-700 text-lg mb-2">
              {searchQuery 
                ? `Ei tuloksia haulle: "${searchQuery}"`
                : filterCategory === 'all' 
                  ? 'Ei vielä tallennettuja vastauksia'
                  : `Ei vastauksia kategoriassa: ${filterCategory}`
              }
            </p>
          </div>
        ) : viewMode === 'compact' ? (
          /* KOMPAKTI NÄKYMÄ */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResponses.map(response => {
              const isExpanded = expandedIds.has(response.id);
              const isEditing = editingId === response.id;

              return (
                <div
                  key={response.id}
                  className="bg-white/90 backdrop-blur-xl rounded-xl p-4 border-2 border-white/60 shadow-lg hover:shadow-xl hover:border-orange-400/50 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border backdrop-blur-md ${getCategoryColor(response.question_category)}`}>
                      <Tag className="w-3 h-3" />
                      {response.question_category}
                    </span>
                    
                    <div className="flex gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleSave(response.id)} className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors" title="Tallenna">
                            <Save className="w-3 h-3" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors" title="Peruuta">
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(response)} className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors" title="Muokkaa">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(response.id)} className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors" title="Poista">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Question */}
                  <h3 className="text-sm font-bold text-gray-900 mb-2 leading-tight line-clamp-2">
                    {response.question_text}
                  </h3>

                  {/* Answer */}
                  {isEditing ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full p-2 text-sm bg-white border-2 border-orange-400 rounded-lg text-gray-900 focus:ring-4 focus:ring-orange-200 outline-none"
                      rows={3}
                    />
                  ) : (
                    <div className="bg-gray-50/80 backdrop-blur-sm p-2 rounded-lg border border-gray-200 mb-2">
                      <p className={`text-xs text-gray-700 leading-relaxed ${!isExpanded && 'line-clamp-2'}`}>
                        {response.answer}
                      </p>
                    </div>
                  )}

                  {/* Expand/Collapse */}
                  {response.answer.length > 100 && !isEditing && (
                    <button
                      onClick={() => toggleExpand(response.id)}
                      className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 mb-2 transition-colors"
                    >
                      {isExpanded ? (
                        <>Näytä vähemmän <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Näytä enemmän <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  )}

                  {/* Metadata */}
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {getContextLabel(response.asked_in_context)}
                    </div>
                    {response.job_title_context && (
                      <div className="flex items-center gap-1 truncate">
                        <Briefcase className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{response.job_title_context}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(response.created_at).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* YKSITYISKOHTAINEN NÄKYMÄ */
          <div className="space-y-6">
            {filteredResponses.map(response => {
              const wasUpdated = response.updated_at !== response.created_at;
              
              return (
                <div
                  key={response.id}
                  className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-white/60 shadow-xl hover:shadow-2xl hover:border-orange-400/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${getCategoryColor(response.question_category)}`}>
                        <Tag className="w-3 h-3" />
                        {response.question_category.toUpperCase()}
                      </span>
                      
                      <h3 className="text-lg font-bold text-gray-900 mt-3 leading-tight">
                        {response.question_text}
                      </h3>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {editingId === response.id ? (
                        <>
                          <button onClick={() => handleSave(response.id)} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors" title="Tallenna">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors" title="Peruuta">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(response)} className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors" title="Muokkaa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(response.id)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors" title="Poista">
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
                      className="w-full p-4 bg-white border-2 border-orange-400 rounded-xl text-gray-900 focus:ring-4 focus:ring-orange-200 outline-none"
                      rows={4}
                    />
                  ) : (
                    <div className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {response.answer}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span className="font-medium">Konteksti:</span>
                      <span className="text-gray-800">{getContextLabel(response.asked_in_context)}</span>
                    </div>

                    {response.job_title_context && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        <span className="font-medium">Työpaikka:</span>
                        <span className="text-gray-800">{response.job_title_context}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span className="font-medium">Luotu:</span>
                      <span className="text-gray-800">
                        {new Date(response.created_at).toLocaleDateString('fi-FI', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {wasUpdated && (
                      <div className="flex items-center gap-1 text-orange-600">
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
        <div className="mt-8 bg-orange-50/80 backdrop-blur-sm border-2 border-orange-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
            <span className="text-xl">💡</span>
            Miten tämä toimii?
          </h3>
          <ul className="text-sm text-orange-800 space-y-2 ml-6">
            <li className="list-disc">AI kysyy kysymyksiä kun luot hakukirjeitä tai CV:itä</li>
            <li className="list-disc">Vastaukset tallentuvat automaattisesti</li>
            <li className="list-disc">Seuraavalla kerralla AI <strong className="text-orange-900">ei kysy samaa uudelleen</strong></li>
            <li className="list-disc">Voit muokata vastauksia milloin tahansa</li>
            <li className="list-disc">Vaihda <strong className="text-orange-900">Kompakti</strong>-näkymään nähdäksesi enemmän kerralla</li>
          </ul>
        </div>
      </div>
    </div>
  );
}