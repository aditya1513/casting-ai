import { NextRequest, NextResponse } from 'next/server';
import { whisperTranscriptionService } from '../../../../../backend/src/services/whisper-transcription.service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'auto';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Get file extension for proper content type
    const filename = audioFile.name || 'audio.webm';

    // Transcribe using Whisper
    const result = await whisperTranscriptionService.transcribeForChat(
      audioBuffer,
      filename,
      'frontend-user' // TODO: Get actual user ID from auth
    );

    return NextResponse.json({
      text: result.text,
      confidence: result.confidence,
      language: result.language,
      processingTime: result.processingTime,
      provider: 'whisper',
    });

  } catch (error: any) {
    console.error('Transcription API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Transcription failed',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Whisper transcription API endpoint',
    supported_formats: ['webm', 'mp3', 'wav', 'm4a'],
    max_file_size: '25MB',
    languages: ['en', 'hi', 'auto'],
  });
}