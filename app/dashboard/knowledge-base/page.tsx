'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FileUpload {
  label: string;
  key: string;
  file: File | null;
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  
  const [uploads, setUploads] = useState<FileUpload[]>([
    { label: 'Comparisons (English)', key: 'comparisons_en', file: null },
    { label: 'Digital Teaser', key: 'digital_teaser', file: null },
    { label: 'Introduce Our Service', key: 'introduce_our_service', file: null },
    { label: 'Why We Are The Best', key: 'why_we_are_the_best', file: null },
    { label: 'Objection Handling', key: 'objection_handling', file: null },
    { label: 'Brochure', key: 'brochure', file: null },
    { label: 'Comparisons (Vietnamese)', key: 'comparisons_vn', file: null },
    { label: 'Price List', key: 'price_list', file: null },
    { label: 'Test', key: 'test', file: null },
  ]);

  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (index: number, file: File | null) => {
    setUploads(prev => prev.map((upload, i) => 
      i === index ? { ...upload, file } : upload
    ));
  };

  const handleUpload = async () => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      
      // Add each file to the FormData with its corresponding key
      uploads.forEach(upload => {
        if (upload.file) {
          formData.append(upload.key, upload.file);
        }
      });
      
      console.log('Uploading files to knowledge base...');
      
      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.details || result.error || 'Upload failed');
      }
      
      console.log('Upload successful:', result);
      alert(`Successfully updated ${result.updatedFields?.length || 0} knowledge base entries!`);
      
      // Clear the uploaded files after successful upload
      setUploads(prev => prev.map(upload => ({ ...upload, file: null })));
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const hasFilesToUpload = uploads.some(upload => upload.file);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Knowledge Base Management</h1>
              <p className="text-gray-600 mt-1">Upload and manage your knowledge base files</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* File Uploads Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {uploads.map((upload, index) => (
            <div key={upload.key} className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {upload.label}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".txt,.pdf,.doc,.docx,.md,.rtf"
                  onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                  className="hidden"
                  id={`file-${index}`}
                />
                <label
                  htmlFor={`file-${index}`}
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {upload.file ? (
                    <div className="text-center">
                      <p className="text-sm font-medium text-green-600">{upload.file.name}</p>
                      <p className="text-xs text-gray-500">{(upload.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500">PDF, TXT, DOC, DOCX, MD, RTF</p>
                    </div>
                  )}
                </label>
              </div>
              {upload.file && (
                <button
                  onClick={() => handleFileChange(index, null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove file
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Upload Button */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Ready to Upload</h3>
              <p className="text-sm text-gray-600">
                {uploads.filter(upload => upload.file).length} file(s) selected
              </p>
            </div>
            <button
              onClick={handleUpload}
              disabled={!hasFilesToUpload || isUploading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                hasFilesToUpload && !isUploading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isUploading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </div>
              ) : (
                'Upload Files'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 