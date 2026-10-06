const path = require('path');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Only POST requests are allowed.' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    const history = Array.isArray(data.history) ? data.history : [];

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Message is required.' })
      };
    }

    const memory = history
      .slice(-10)
      .map((item) => ({ role: item.role === 'user' ? 'user' : 'model', parts: [{ text: String(item.text || '') }] }))
      .filter((item) => item.parts[0].text);

    if (process.env.GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const payload = {
        contents: [
          ...memory,
          { role: 'user', parts: [{ text: message }] }
        ],
        systemInstruction: {
          role: 'user',
          parts: [{
            text: 'You are NEXGEN GREEN AI, a friendly Bengali and English AI assistant. Answer carefully, clearly, and professionally. Use markdown when useful.'
          }]
        },
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      const text = json?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';

      if (!text) {
        throw new Error('No response from Gemini');
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, response: text, model: 'gemini-2.5-flash' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: `আমি NEXGEN GREEN AI। এই ডেমো মোডে কাজ করছি।\n\nআপনার প্রশ্ন: "${message}"\n\nGEMINI_API_KEY সেট করলে প্রকৃত Gemini AI রেসপন্স আসবে। আপনার ডেভেলপমেন্ট পরিবেশে .env-এ কী যোগ করতে হবে:\n\n\`\`\`bash\nGEMINI_API_KEY=your_api_key_here\n\`\`\`\n\nএখন আমি আপনার প্রশ্নের ধরন বুঝে একটি সুন্দর, ব্যবহারযোগ্য উত্তর সাজিয়ে দিতে পারি।`,
        model: 'demo-mode'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'AI service could not respond. Please try again later.'
      })
    };
  }
};
