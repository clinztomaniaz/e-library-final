'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { Upload, Search, Download, Trash2, FileText, File, Loader2 } from 'lucide-react';

type Material = {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  file_size: number;
  upload_date: string;
};

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint'
];

export default function Home() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  async function fetchMaterials() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('upload_date', { ascending: false });

      if (!error && data) {
        setMaterials(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Invalid file type. Only PDF, DOCX, and PPTX are allowed.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB limit.');
      return;
    }

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('library')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('library')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('materials').insert({
        title: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size
      });

      if (dbError) throw dbError;

      await fetchMaterials();
    } catch (error) {
      alert('Error uploading file. Please try again.');
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const pathArray = fileUrl.split('/');
      const filePath = `uploads/${pathArray[pathArray.length - 1]}`;

      await supabase.storage.from('library').remove([filePath]);
      await supabase.from('materials').delete().eq('id', id);

      setMaterials(materials.filter(m => m.id !== id));
    } catch (error) {
      alert('Error deleting file.');
      console.error(error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          E-Library
        </h1>
        
        <div className="flex w-full sm:w-auto gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-700 bg-gray-800 focus:ring-2 focus:ring-blue-500 text-white outline-none"
            />
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.docx,.pptx,.ppt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 w-full sm:w-auto"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-20 bg-gray-800/50 rounded-xl border border-gray-800">
          <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-gray-300">No documents found</h3>
          <p className="text-gray-500 mt-2">Upload your first PDF, DOCX, or PPTX file to begin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((material) => (
            <div key={material.id} className="bg-gray-800/40 border border-gray-800 p-5 rounded-xl hover:border-gray-700 transition-all flex flex-col justify-between">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-3 bg-blue-950/50 text-blue-400 rounded-lg border border-blue-900/50">
                  <File className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate text-gray-200" title={material.title}>
                    {material.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(material.upload_date).toLocaleDateString()} • {formatSize(material.file_size)}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-1 border-t border-gray-800/60 pt-3 mt-2">
                <a
                  href={material.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button
                  onClick={() => handleDelete(material.id, material.file_url)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
