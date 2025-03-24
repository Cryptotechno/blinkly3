# Ad Generator with Groq API

A simple web application that generates ad headlines and descriptions using the Groq API.

## Features

- Clean, modern UI
- Secure API key handling via Netlify environment variables
- Netlify Functions for backend
- Responsive design

## Prerequisites

- A Netlify account
- A Groq API key

## Local Development

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

1. Push your code to GitHub
2. Connect your repository to Netlify
3. In your Netlify dashboard:
   - Go to Site settings > Build & deploy > Environment
   - Add the following environment variable:
     - `GROQ_API_KEY`: Your Groq API key

## Security Notes

- API keys are managed securely through Netlify's environment variables
- The API key is only used in the Netlify Function and is never exposed to the frontend
- All API calls are made server-side
- The application will fail explicitly if required environment variables are missing

## Project Structure

```
├── netlify/
│   └── functions/
│       └── generateAd.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── netlify.toml
└── README.md
``` 