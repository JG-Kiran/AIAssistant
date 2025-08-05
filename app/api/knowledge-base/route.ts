import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// File processing utilities
async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  try {
    if (fileType === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      // Handle plain text files
      const text = await file.text();
      return text;
    } 
    else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // Handle PDF files
      return await extractTextFromPDF(file);
    }
    else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      // Handle DOCX files
      return await extractTextFromDOCX(file);
    }
    else if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
      // Handle DOC files (legacy format)
      return await extractTextFromDOC(file);
    }
    else if (fileName.endsWith('.rtf')) {
      // Handle RTF files
      return await extractTextFromRTF(file);
    }
    else {
      throw new Error(`Unsupported file type: ${fileType || 'unknown'}`);
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    return data.text.trim();
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF file.');
  }
}

async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to extract text from DOCX file.');
  }
}

async function extractTextFromDOC(file: File): Promise<string> {
  // Legacy DOC format is more complex to parse
  // For production, you'd need a specialized library
  try {
    const text = await file.text();
    return text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    throw new Error('Failed to extract text from DOC. Consider converting to DOCX first.');
  }
}

async function extractTextFromRTF(file: File): Promise<string> {
  try {
    const text = await file.text();
    // Basic RTF parsing - remove RTF control codes
    return text
      .replace(/\{\\[^}]*\}/g, '') // Remove RTF control groups
      .replace(/\\[a-z]+\d*\s?/g, '') // Remove RTF control words
      .replace(/[{}]/g, '') // Remove remaining braces
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error) {
    throw new Error('Failed to extract text from RTF file.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const updates: Record<string, string> = {};
    
    // Process each uploaded file
    for (const [key, value] of formData.entries()) {
      if (value instanceof File && value.size > 0) {
        console.log(`Processing file for ${key}:`, value.name);
        
        try {
          const extractedText = await extractTextFromFile(value);
          updates[key] = extractedText;
          console.log(`Successfully extracted text from ${value.name} (${extractedText.length} characters)`);
        } catch (error) {
          console.error(`Failed to process file ${value.name}:`, error);
          return NextResponse.json(
            { 
              error: `Failed to process file ${value.name}`,
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 400 }
          );
        }
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid files were provided' },
        { status: 400 }
      );
    }
    
    // Update the knowledge base in Supabase
    console.log('Updating knowledge base with:', Object.keys(updates));
    
    const { data, error } = await supabase
      .from('knowledge_base')
      .update(updates)
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
      message: `Successfully updated ${Object.keys(updates).length} knowledge base entries`,
      updatedFields: Object.keys(updates),
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