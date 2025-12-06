import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { TryonHistory } from '../types';
import { Download, Calendar } from 'lucide-react';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Gallery() {
  const [history, setHistory] = useState<(TryonHistory & { customers: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    // Join with customers table to get names
    const { data, error } = await supabase
      .from('tryon_history')
      .select('*, customers(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setHistory(data as any || []);
    }
    setLoading(false);
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `fitlook-tryon-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8 text-center text-brand-500">Loading gallery...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-brand-900">Gallery</h2>
        <p className="text-brand-600">History of generated fittings</p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-brand-200">
           <p className="text-brand-400">No images generated yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {history.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-brand-200 overflow-hidden group">
              <div className="relative aspect-[3/4] overflow-hidden bg-brand-100">
                <img 
                  src={item.output_image_url} 
                  alt="Try-on result" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={() => handleDownload(item.output_image_url)}
                    className="p-3 bg-white rounded-full text-brand-900 hover:bg-brand-50 shadow-lg"
                    title="Download"
                  >
                    <Download size={20} />
                  </button>
                  <a 
                    href={item.output_image_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-3 bg-white rounded-full text-brand-900 hover:bg-brand-50 shadow-lg"
                    title="View Full"
                  >
                    <Calendar size={20} />
                  </a>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-brand-900 truncate">{item.customers?.name || 'Unknown Client'}</h3>
                <p className="text-xs text-brand-400 mt-1">
                  {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}