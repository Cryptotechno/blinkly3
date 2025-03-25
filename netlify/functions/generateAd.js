const fetch = require('node-fetch');

// Helper function for delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    // Parse input and add validation
    let input;
    try {
      const parsedBody = JSON.parse(event.body);
      input = parsedBody.input?.trim();
      
      if (!input) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Input is required' })
        };
      }
      
      // For very short inputs (1-2 words), enhance the prompt to encourage creativity
      const wordCount = input.split(/\s+/).filter(word => word.length > 0).length;
      if (wordCount <= 2) {
        console.log('Short input detected, enhancing prompt');
        input = `Be creative with this minimal input: ${input}`;
      }
    } catch (parseError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request format' })
      };
    }

    // Retry logic with exponential backoff
    const maxRetries = 3;
    let retryCount = 0;
    let lastError;

    while (retryCount < maxRetries) {
      try {
        // Prepare the system message with improved structure
        const systemMessage = `Create compelling and concise ad copy that strictly follows Google Ads format requirements:

REQUIREMENTS:
• Headline: 1-30 characters
• Description: 1-90 characters
• Both must be meaningful, grammatically correct marketing text
• No introductions, explanations or meta-information

IMPORTANT:
• ALWAYS follow the character limits exactly
• End with proper punctuation
• Don't use labels like "Headline:" or "Description:"
• Don't return placeholder text like "." or empty text
• BE CREATIVE with minimal input - even a single word should produce good ad copy

FORMAT YOUR RESPONSE EXACTLY AS:
<headline>Your headline here</headline>
<description>Your description here</description>

The ad copy should be persuasive and optimized for clicks.`;

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
                content: systemMessage
              },
              {
                role: 'user',
                content: `Create ad copy for: ${input}`
              }
            ],
            temperature: 0.8, // Slightly higher temperature for more creativity
            max_tokens: 150
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Groq API error: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
          throw new Error('Invalid response structure from Groq API');
        }
        
        const content = data.choices[0].message.content;
        console.log('Raw API response:', content);
        
        // Parse the response using XML-like tags
        let headline = '', description = '';
        
        // Extract headline
        const headlineMatch = content.match(/<headline>(.*?)<\/headline>/is);
        if (headlineMatch && headlineMatch[1]) {
          headline = headlineMatch[1].trim();
        }
        
        // Extract description
        const descriptionMatch = content.match(/<description>(.*?)<\/description>/is);
        if (descriptionMatch && descriptionMatch[1]) {
          description = descriptionMatch[1].trim();
        }
        
        // Fallback to line-based parsing if tag parsing fails
        if (!headline || !description) {
          console.log('Tag parsing failed, falling back to line-based parsing');
          const lines = content.split('\n').filter(line => line.trim());
          if (lines.length >= 1) headline = lines[0].trim();
          if (lines.length >= 2) description = lines[1].trim();
        }
        
        // Generate fallback content if parsing fails
        if (!headline || !description) {
          console.log('Parsing failed, generating fallback content');
          
          // Create a simple fallback based on the input
          const inputWords = input.split(/\s+/).filter(word => word.length > 0);
          const cleanInput = inputWords.length > 0 ? 
                            inputWords[0].replace(/[^\w\s]/gi, '') : 'product';
          
          headline = `Discover ${cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1)}`;
          
          if (headline.length > 30) {
            headline = headline.substring(0, 30);
          }
          
          description = `Learn more about our ${cleanInput} options. Explore the possibilities today.`;
          
          if (description.length > 90) {
            description = description.substring(0, 90);
          }
        }

        // Enforce character limits
        if (headline.length > 30) headline = headline.substring(0, 30);
        if (description.length > 90) description = description.substring(0, 90);

        return {
          statusCode: 200,
          body: JSON.stringify({ headline, description })
        };
      } catch (error) {
        lastError = error;
        retryCount++;
        
        // Only retry on network or server errors, not on client errors
        if (error.message.includes('429') || error.message.includes('500') || error.message.includes('503') || error.message.includes('timeout')) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryCount - 1) * 1000;
          console.log(`Retry attempt ${retryCount}/${maxRetries} after ${delay}ms delay. Error: ${error.message}`);
          await sleep(delay);
        } else {
          // Don't retry on other errors
          break;
        }
      }
    }

    // If we got here, all retries failed
    console.error('Error after all retries:', lastError);
    
    // Provide a fallback response even if all API attempts fail
    const fallbackInput = input.split(/\s+/)[0] || 'product';
    const cleanInput = fallbackInput.replace(/[^\w\s]/gi, '');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        headline: `${cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1).substring(0, 29)}`,
        description: `Discover more about our ${cleanInput} options today.`.substring(0, 90)
      })
    };

  } catch (error) {
    console.error('Error:', error);
    
    // Even for unexpected errors, try to return something useful
    let fallbackInput = 'product';
    try {
      const parsedBody = JSON.parse(event.body);
      if (parsedBody.input) {
        fallbackInput = parsedBody.input.split(/\s+/)[0] || 'product';
      }
    } catch (e) {
      // If we can't parse the input, use the default
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        headline: `${fallbackInput.charAt(0).toUpperCase() + fallbackInput.slice(1).substring(0, 29)}`,
        description: `Learn more about our ${fallbackInput} today.`.substring(0, 90)
      })
    };
  }
}; 