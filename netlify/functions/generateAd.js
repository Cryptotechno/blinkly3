const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Check for required environment variable
  if (!process.env.GROQ_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GROQ_API_KEY environment variable is not set' })
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { input } = JSON.parse(event.body);

    if (!input) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Input is required' })
      };
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are an advertising copywriter. Generate a headline and description for the given input.'
          },
          {
            role: 'user',
            content: input
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the response to extract headline and description
    const lines = content.split('\n');
    const headline = lines[0].replace(/^Headline:\s*/i, '');
    const description = lines.slice(1).join('\n').replace(/^Description:\s*/i, '').trim();

    return {
      statusCode: 200,
      body: JSON.stringify({ headline, description })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate ad content' })
    };
  }
}; 