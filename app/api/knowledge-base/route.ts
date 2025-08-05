import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// File processing using Gemini AI
async function processDocumentWithGemini(file: File): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Convert file to base64 for Gemini API
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    // Determine MIME type
    let mimeType = file.type;
    if (!mimeType) {
      // Fallback based on file extension
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (fileName.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (fileName.endsWith('.doc')) mimeType = 'application/msword';
      else if (fileName.endsWith('.txt')) mimeType = 'text/plain';
      else if (fileName.endsWith('.md')) mimeType = 'text/markdown';
      else if (fileName.endsWith('.rtf')) mimeType = 'application/rtf';
      else if (fileName.endsWith('.html')) mimeType = 'text/html';
      else if (fileName.endsWith('.xml')) mimeType = 'application/xml';
      else mimeType = 'application/octet-stream';
    }

    console.log(`Processing ${file.name} with MIME type: ${mimeType}`);

    // Create the prompt for document processing
    const prompt = `Please process this document and convert all its content to well-formatted markdown. 

Requirements:
- Extract and preserve all text content
- Convert any tables to markdown table format
- Preserve document structure with appropriate headers (# ## ### etc.)
- Include any important visual information (charts, diagrams) as descriptive text
- Maintain logical flow and organization
- Remove any irrelevant formatting artifacts
- Ensure the output is clean, readable markdown

Please provide only the markdown content without any additional explanation or commentary.`;

    // Send request to Gemini
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      },
      prompt
    ]);

    const response = await result.response;
    const markdownContent = response.text();
    
    if (!markdownContent || markdownContent.trim().length === 0) {
      throw new Error('Gemini returned empty content');
    }

    console.log(`Successfully processed ${file.name}: ${markdownContent.length} characters of markdown`);
    return markdownContent.trim();
    
  } catch (error) {
    console.error('Gemini processing error:', error);
    
    // Enhanced error messages based on common issues
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        throw new Error('API quota exceeded. Please try again later.');
      } else if (error.message.includes('size')) {
        throw new Error('File is too large for processing. Please use a smaller file.');
      } else if (error.message.includes('format')) {
        throw new Error('Unsupported file format. Please try a different file type.');
      }
    }
    
    throw new Error(`Failed to process document with Gemini AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get the file and selected field
    const file = formData.get('file') as File | null;
    const selectedField = formData.get('field') as string | null;
    
    if (!file || !selectedField) {
      return NextResponse.json(
        { error: 'Both file and field selection are required' },
        { status: 400 }
      );
    }
    
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    // Check file size limit (20MB for inline data as per Gemini docs)
    const maxFileSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: 'File is too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }
    
    console.log(`Processing file for ${selectedField}:`, file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    let markdownContent: string;
    try {
      markdownContent = await processDocumentWithGemini(file);
    } catch (error) {
      console.error(`Failed to process file ${file.name}:`, error);
      return NextResponse.json(
        { 
          error: `Failed to process file ${file.name}`,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 400 }
      );
    }
    
    // Update the specific field in the knowledge base
    console.log(`Updating knowledge base field: ${selectedField}`);
    
    const updateData: Record<string, string> = {
      [selectedField]: markdownContent
    };
    
    const { data, error } = await supabase
      .from('knowledge_base')
      .update(updateData)
      .eq('id', 1) // Assuming you have a single knowledge base record with id=1
      .select();
    
    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to update knowledge base',
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully updated the ${selectedField} field with AI-processed markdown content`,
      updatedField: selectedField,
      characterCount: markdownContent.length,
      fileProcessed: {
        name: file.name,
        size: file.size,
        type: file.type || 'unknown'
      },
      data: data?.[0] || null
    });
    
  } catch (error) {
    console.error('Knowledge base upload error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 