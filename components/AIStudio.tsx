import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_AI_PROMPT, TRYON_MODES } from '../constants';
import { generateTryOn, editImage } from '../services/geminiService';
import { saveGeneratedImage } from '../services/supabaseService';
import { Wand2, Image as ImageIcon, Sparkles, Upload, Zap, Star } from 'lucide-react';
import { Customer, Garment } from '../types';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type Mode = 'tryon' | 'editor';
type TryOnMode = 'normal' | 'pro';

export default function AIStudio() {
  const [mode, setMode] = useState<Mode>('tryon');
  const [tryOnMode, setTryOnMode] = useState<TryOnMode>('normal');
  
  // Data for Selectors
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  
  // Try On State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_AI_PROMPT);
  
  // Editor State
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  
  // Shared State
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchSystemPrompt();
  }, []);

  const fetchData = async () => {
    const { data: cData } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    const { data: gData } = await supabase.from('garments').select('*').order('created_at', { ascending: false });
    if (cData) setCustomers(cData);
    if (gData) setGarments(gData);
  };

  const fetchSystemPrompt = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'ai_system_prompt').single();
    if (data) setSystemPrompt(data.value);
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditImageFile(file);
      setEditImagePreview(URL.createObjectURL(file));
      setResultImage(null); // Clear previous result
    }
  };

  const handleGenerateTryOn = async () => {
    if (!selectedCustomer || !selectedGarment) return;
    setLoading(true);
    setError(null);
    setResultImage(null);

    try {
      // 1. Generate with Gemini
      const { base64 } = await generateTryOn(
        selectedCustomer.image_url,
        selectedGarment.image_url,
        systemPrompt,
        tryOnMode
      );

      const resultBase64 = `data:image/jpeg;base64,${base64}`;
      setResultImage(resultBase64);

      // 2. Save to Supabase Storage & History
      const publicUrl = await saveGeneratedImage(base64, selectedCustomer.id);
      
      if (publicUrl) {
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
             await supabase.from('tryon_history').insert({
                 user_id: user.id,
                 customer_id: selectedCustomer.id,
                 garment_id: selectedGarment.id,
                 output_image_url: publicUrl,
                 prompt_used: `${TRYON_MODES[tryOnMode].label} - ${TRYON_MODES[tryOnMode].prompt}`,
                 created_at: new Date().toISOString()
             });
         }
      }

    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEditImage = async () => {
    if (!editImageFile || !editPrompt) return;
    setLoading(true);
    setError(null);
    setResultImage(null);

    try {
        const sourceUrl = editImagePreview!; 
        const { base64 } = await editImage(sourceUrl, editPrompt);
        const resultBase64 = `data:image/jpeg;base64,${base64}`;
        setResultImage(resultBase64);
        
    } catch (err: any) {
        setError(err.message || 'Editing failed');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      {/* Configuration Panel */}
      <div className="w-full md:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brand-900">AI Studio</h2>
          <p className="text-brand-600 text-sm">Powered by Gemini 2.5 Flash</p>
        </div>

        {/* Functionality Switcher */}
        <div className="flex bg-brand-100 p-1 rounded-lg">
            <button 
                onClick={() => { setMode('tryon'); setResultImage(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${mode === 'tryon' ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-600 hover:text-brand-800'}`}
            >
                <Wand2 size={16} /> Virtual Try-On
            </button>
            <button 
                onClick={() => { setMode('editor'); setResultImage(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${mode === 'editor' ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-600 hover:text-brand-800'}`}
            >
                <Sparkles size={16} /> Magic Editor
            </button>
        </div>

        {mode === 'tryon' ? (
            <div className="space-y-6">
                
                {/* Mode Selector */}
                <div className="space-y-2">
                   <label className="block text-sm font-bold text-brand-800">Generation Mode</label>
                   <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setTryOnMode('normal')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                          tryOnMode === 'normal' 
                            ? 'border-brand-600 bg-brand-50 text-brand-900' 
                            : 'border-brand-200 bg-white text-brand-500 hover:border-brand-300'
                        }`}
                      >
                         <Zap size={24} className={`mb-1 ${tryOnMode === 'normal' ? 'text-brand-600' : 'text-brand-400'}`} />
                         <span className="font-bold text-sm">Fast</span>
                         <span className="text-xs opacity-70">~8 seconds</span>
                      </button>

                      <button
                        onClick={() => setTryOnMode('pro')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                          tryOnMode === 'pro' 
                            ? 'border-brand-600 bg-brand-50 text-brand-900' 
                            : 'border-brand-200 bg-white text-brand-500 hover:border-brand-300'
                        }`}
                      >
                         <Star size={24} className={`mb-1 ${tryOnMode === 'pro' ? 'text-brand-600' : 'text-brand-400'}`} />
                         <span className="font-bold text-sm">Pro Quality</span>
                         <span className="text-xs opacity-70">High Detail</span>
                      </button>
                   </div>
                </div>

                {/* Customer Selection */}
                <div>
                <label className="block text-sm font-bold text-brand-800 mb-2">1. Select Client</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {customers.map(c => (
                    <div 
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${selectedCustomer?.id === c.id ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-brand-200 hover:border-brand-400'}`}
                    >
                        <img src={c.image_url} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                        <span className="text-sm font-medium truncate">{c.name}</span>
                    </div>
                    ))}
                </div>
                </div>

                {/* Garment Selection */}
                <div>
                <label className="block text-sm font-bold text-brand-800 mb-2">2. Select Garment</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {garments.map(g => (
                    <div 
                        key={g.id}
                        onClick={() => setSelectedGarment(g)}
                        className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${selectedGarment?.id === g.id ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-brand-200 hover:border-brand-400'}`}
                    >
                        <img src={g.image_url} alt="" className="w-10 h-10 rounded object-cover bg-gray-200" />
                        <span className="text-sm font-medium truncate">{g.name}</span>
                    </div>
                    ))}
                </div>
                </div>

                <button
                    onClick={handleGenerateTryOn}
                    disabled={!selectedCustomer || !selectedGarment || loading}
                    className={`w-full text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${
                      tryOnMode === 'pro' ? 'bg-gradient-to-r from-brand-800 to-brand-600 hover:from-brand-900 hover:to-brand-700' : 'bg-brand-800 hover:bg-brand-900'
                    }`}
                >
                    {loading ? (
                        <>Generating...</>
                    ) : (
                        <>
                            <Wand2 size={20} />
                            Generate {tryOnMode === 'pro' ? 'Pro' : ''} Try-On
                        </>
                    )}
                </button>
            </div>
        ) : (
            <div className="space-y-6">
                {/* Editor Mode */}
                <div>
                    <label className="block text-sm font-bold text-brand-800 mb-2">1. Upload Image to Edit</label>
                    <div className="border-2 border-dashed border-brand-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-brand-50 transition-colors cursor-pointer relative h-40 bg-brand-50/50">
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleEditImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {editImagePreview ? (
                            <img src={editImagePreview} alt="Preview" className="h-full object-contain rounded-lg" />
                        ) : (
                            <>
                                <Upload className="text-brand-400 mb-2" size={24} />
                                <span className="text-sm text-brand-600">Upload Photo</span>
                            </>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-brand-800 mb-2">2. How should we change it?</label>
                    <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="e.g., 'Add a vintage filter', 'Remove the chair in background', 'Make the dress blue'"
                        className="w-full p-3 border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500 min-h-[100px] text-sm"
                    />
                </div>

                <button
                    onClick={handleEditImage}
                    disabled={!editImageFile || !editPrompt || loading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                    {loading ? (
                         <>Processing...</>
                    ) : (
                        <>
                            <Sparkles size={20} />
                            Magic Edit
                        </>
                    )}
                </button>
            </div>
        )}
      </div>

      {/* Preview Panel */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-brand-200 p-6 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-600 mb-4"></div>
            <p className="text-brand-800 font-medium animate-pulse">
                {mode === 'tryon' 
                  ? (tryOnMode === 'pro' ? 'Crafting high-fidelity fit...' : 'Tailoring the outfit...') 
                  : 'Applying magic edits...'}
            </p>
          </div>
        )}

        {error && (
          <div className="text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-200 mb-4">
            {error}
          </div>
        )}

        {resultImage ? (
          <div className="w-full h-full flex items-center justify-center">
             <img src={resultImage} alt="Result" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
          </div>
        ) : (
          <div className="text-center text-brand-400">
            <ImageIcon size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">Select inputs to generate preview</p>
          </div>
        )}
      </div>
    </div>
  );
}