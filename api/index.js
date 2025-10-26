import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

//Use dotenv for local developement only 
dotenv.config();

//Initialize the Express app
const app = express();

//Initialize the GoogleGenAI client 
//It usess process.env.GEMINI_API_KEY from Vercel's envirolment (or local .env)
const ai = new GoogleGenAI({ apikey: process.env.GEMINI_API_KEY });

//Middleware setup
app.use(express.json({ limit: '10mb'})); //Necessary to handle the large Base64 image payload

// Helper function to construct the prompt based on user selection
function getSystemInstruction(style) {
    switch (style) {
        case 'stylized':
            return "You are an expert prompt engineer for text-to-image models (like Midjourney or Stable Diffusion. Analyze the image and produce a single coprehensive,and highly artistic prompt.";
        case 'simple':
            return "You are a concise image describer. Provide a brief, straightforward and accurate description of the image subject and natter in a single sentence.Do not include artistic detailes like lighting and style"
        case 'detailes':
            return "You are a expert AI prompt engineer. Your task is to analyze an image and produce a single, comprehensive, highly detailed text prompt suitable for use in advaced text-to-image tools"
    }
}

// The API Route for Prompt Generation
app.post('/generate-prompt', async (req, res) =>{
    const { image, mimeType, style } = req.body;

    if(!image || !mimeType) {
        return res.status(400).json({ error:'Missing image data or MIME type.' });
    }

    if(!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error:'Server configuration error: GEMINI_API_KEY not set.' });
    }

    try {
        const systemInstruction = getSystemInstruction(style);

        //Call the Gemini API
        const response = await ai.models.generateContent({
            model:"gemini-2.5-flash",
            contents: [
                {
                    parts: [
                        {
                            text: systemInstruction // Use the instruction as the primary prompt
                        },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: image, // Base64 data
                            },
                        },
                    ],
                },
            ],
            config : {
                // The system instruction is provided above in the content array.
                temperature: 0.8,
                maxOutputTokens: 2048,
                systemInstruction: systemInstruction, // Vercel deployment often benefits from the instructions here too.
            },
        });

        const generatedPrompt = response.text;

        res.json({ prompt: generatedPrompt });

    } catch (error) {
        console.error('Gemini API Error:', error.message)
        res.status(500).json({ error: `Internal Server Error: ${error.message}`});
    }
});

// *** CRITICAL STEP FOR VERCEL: Export the Express app ***
export default app;
// NOTE: The app.listen() call is intenionally removed for Vercel Serverless Deployment.