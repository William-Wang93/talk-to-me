export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'DEEPGRAM_API_KEY not configured' });

  try {
    // Request body should be raw audio as base64 with content type
    const { audio, mimeType } = req.body;
    if (!audio) return res.status(400).json({ error: 'No audio data provided' });

    // Decode base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');

    // Call Deepgram Nova-2 (Nova-2 is more reliable for filler word detection than Nova-3)
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=false&filler_words=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': mimeType || 'audio/webm'
      },
      body: audioBuffer
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Deepgram error:', response.status, errText);
      return res.status(response.status).json({ error: 'Deepgram transcription failed', details: errText });
    }

    const data = await response.json();
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    return res.status(200).json({ transcript });
  } catch (error) {
    console.error('Transcribe error:', error);
    return res.status(500).json({ error: 'Transcription failed' });
  }
}
