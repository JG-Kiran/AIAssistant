'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface KnowledgeBaseOption {
  label: string;
  key: string;
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  
  const knowledgeBaseOptions: KnowledgeBaseOption[] = [
    { label: 'Comparisons (English)', key: 'comparisons_en' },
    { label: 'Digital Teaser', key: 'digital_teaser' },
    { label: 'Introduce Our Service', key: 'introduce_our_service' },
    { label: 'Why We Are The Best', key: 'why_we_are_the_best' },
    { label: 'Objection Handling', key: 'objection_handling' },
    { label: 'Brochure', key: 'brochure' },
    { label: 'Comparisons (Vietnamese)', key: 'comparisons_vn' },
    { label: 'Price List', key: 'price_list' },
    { label: 'Test', key: 'test' },
  ];

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedOption) {
      alert('Please select both a file and a knowledge base field.');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('field', selectedOption);
      
      console.log('Uploading file to knowledge base...');
      
      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.details || result.error || 'Upload failed');
      }
      
      console.log('Upload successful:', result);
      alert(`Successfully processed and updated the ${knowledgeBaseOptions.find(opt => opt.key === selectedOption)?.label} field with AI-generated markdown content!`);
      
      // Clear the uploaded file and selection after successful upload
      setSelectedFile(null);
      setSelectedOption('');
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const canUpload = selectedFile && selectedOption && !isUploading;

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

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Knowledge Base File</h3>
          
          {/* File Upload Box */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors mb-6">
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx,.md,.rtf,.html,.xml,.csv,.ppt,.pptx,.xls,.xlsx,.odt,.ods,.odp"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {selectedFile ? (
                <div className="text-center">
                  <p className="text-lg font-medium text-green-600">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-lg text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">Any document type (PDF, DOC, DOCX, TXT, MD, RTF, HTML, PPT, XLS, etc.)</p>
                  <p className="text-xs text-gray-400">Max file size: 20MB</p>
                </div>
              )}
            </label>
          </div>

          {selectedFile && (
            <div className="flex justify-center mb-6">
              <button
                onClick={() => handleFileChange(null)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove file
              </button>
            </div>
          )}

          {/* Dropdown Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Knowledge Base Field
            </label>
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a field...</option>
              {knowledgeBaseOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Button */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-md font-medium text-gray-900">Ready to Upload</h4>
              <p className="text-sm text-gray-600">
                {selectedFile && selectedOption 
                  ? `File: ${selectedFile.name} → ${knowledgeBaseOptions.find(opt => opt.key === selectedOption)?.label}`
                  : 'Select a file and field to continue'
                }
              </p>
            </div>
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                canUpload
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
                  Processing with AI...
                </div>
              ) : (
                'Upload & Process with AI'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 