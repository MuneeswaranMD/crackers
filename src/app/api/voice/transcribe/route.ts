import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Server-side Speech-to-Text Endpoint
 * Used as a fallback when browser SpeechRecognition is unavailable or for enhanced Tamil/Tanglish processing
 * Keeps credentials safe on the server and does not retain audio or transcripts on disk.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Check if external cloud speech keys are provided in environment
    const whisperKey = process.env.OPENAI_API_KEY;
    const googleKey = process.env.GOOGLE_SPEECH_API_KEY;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('audio') as Blob | null;
      const lang = (formData.get('language') as string) || 'ta-IN';

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No audio file provided in request.' },
          { status: 400 }
        );
      }

      // If OpenAI Whisper key is configured, invoke Whisper API securely
      if (whisperKey) {
        const whisperFormData = new FormData();
        whisperFormData.append('file', file, 'recording.webm');
        whisperFormData.append('model', 'whisper-1');
        if (lang.startsWith('ta')) {
          whisperFormData.append('language', 'ta');
        }

        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${whisperKey}`,
          },
          body: whisperFormData,
        });

        if (whisperRes.ok) {
          const wData = await whisperRes.json();
          return NextResponse.json({
            success: true,
            transcript: wData.text || '',
            provider: 'Whisper Cloud API',
            disclaimer: 'Audio processed securely and discarded immediately.',
          });
        }
      }

      // If Google Cloud Speech key is configured
      if (googleKey) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64Audio = buffer.toString('base64');

        const gRes = await fetch(
          `https://speech.googleapis.com/v1/speech:recognize?key=${googleKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: lang,
                alternativeLanguageCodes: ['en-IN', 'ta-IN'],
              },
              audio: {
                content: base64Audio,
              },
            }),
          }
        );

        if (gRes.ok) {
          const gData = await gRes.json();
          const transcript =
            gData.results?.map((r: any) => r.alternatives?.[0]?.transcript).join(' ') || '';
          return NextResponse.json({
            success: true,
            transcript,
            provider: 'Google Cloud Speech API',
            disclaimer: 'Audio processed securely and discarded immediately.',
          });
        }
      }

      // Server STT Fallback Notice:
      // When no external cloud key is provisioned, return a helpful response
      return NextResponse.json({
        success: true,
        transcript: '',
        isFallbackNotice: true,
        message:
          'No external cloud speech credentials configured on server. Please use browser speech recognition or edit text manually.',
        provider: 'Server Speech Gateway',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Expected multipart/form-data with audio' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error in /api/voice/transcribe:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
