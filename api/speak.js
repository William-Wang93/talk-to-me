export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'DEEPGRAM_API_KEY not configured' });

  try {
    const { text, model } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    // Default to aura-2-thalia-en if no model specified
    const voiceModel = model || 'aura-2-thalia-en';

    const response = await fetch(`https://api.deepgram.com/v1/speak?model=${voiceModel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: text })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Deepgram TTS error:', response.status, errText);
      return res.status(response.status).json({ error: 'TTS failed', details: errText });
    }

    // Stream the audio back as mp3
    res.setHeader('Content-Type', 'audio/mpeg');
    const arrayBuffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Speak error:', error);
    return res.status(500).json({ error: 'TTS failed' });
  }
}
