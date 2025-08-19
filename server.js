// server.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

// --- Endpoint to generate the main lesson ---
app.post('/generate', async (req, res) => {
    try {
        const { topic, level } = req.body;

        const prompt = `
            You are an expert English language teacher creating learning materials.
            Generate a monologue about "${topic}" for an English learner at the "${level}" level.
            The monologue should be approximately 150-200 words. Adjust vocabulary and sentence structure for the specified level.

            Your entire response MUST be ONLY a single, valid JSON object with no markdown formatting or extra text.
            The JSON object must contain two keys: "script" and "quiz".
            1.  "script": A string containing the full text of the monologue.
            2.  "quiz": An array of 4-5 exercise objects. Create a mix of exercise types: 'multiple-choice', 'fill-in-the-blank', and 'true/false'.
                - Each object must have "type", "question", "options" (an array), and "answer".
                - For 'true/false', the options array should be ["True", "False"].
                - For 'fill-in-the-blank', the options array should be empty.

            Example of required JSON output:
            {
              "script": "The monologue text goes here. It should be appropriate for a ${level} learner...",
              "quiz": [
                {
                  "type": "multiple-choice",
                  "question": "What is the main idea of the monologue?",
                  "options": ["Option A", "Option B", "Option C"],
                  "answer": "Option B"
                },
                {
                  "type": "true/false",
                  "question": "The speaker enjoyed the experience.",
                  "options": ["True", "False"],
                  "answer": "True"
                },
                {
                  "type": "fill-in-the-blank",
                  "question": "The weather was surprisingly ___.",
                  "options": [],
                  "answer": "sunny"
                }
              ]
            }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonData = extractJson(text);

        res.json(jsonData);

    } catch (error) {
        console.error("Error in /generate endpoint:", error);
        res.status(500).json({ error: error.message || 'Failed to generate content.' });
    }
});

// --- NEW Endpoint to look up a single word ---
app.post('/lookup', async (req, res) => {
    try {
        const { word } = req.body;

        const prompt = `
            You are a helpful dictionary assistant for English language learners.
            Provide details for the word: "${word}".

            Your entire response MUST be ONLY a single, valid JSON object with no markdown formatting or extra text.
            The JSON object must contain the following keys: "word", "definition", "synonyms" (array), "antonyms" (array), and "turkish".
            - The definition should be simple and easy to understand.
            - If synonyms or antonyms don't exist, provide an empty array [].

            Example of required JSON output:
            {
                "word": "happy",
                "definition": "Feeling or showing pleasure or contentment.",
                "synonyms": ["joyful", "cheerful", "pleased"],
                "antonyms": ["sad", "unhappy"],
                "turkish": "mutlu"
            }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonData = extractJson(text);
        
        res.json(jsonData);

    } catch (error) {
        console.error("Error in /lookup endpoint:", error);
        res.status(500).json({ error: error.message || 'Failed to look up word.' });
    }
});

// Helper function to robustly extract JSON from AI response
function extractJson(text) {
    const firstBracket = text.indexOf('{');
    const lastBracket = text.lastIndexOf('}');

    if (firstBracket === -1 || lastBracket === -1) {
        console.error("No JSON object found in text:", text);
        throw new Error("Valid JSON object not found in the AI response.");
    }
    const jsonString = text.substring(firstBracket, lastBracket + 1);
    try {
        return JSON.parse(jsonString);
    } catch (parseError) {
        console.error("Failed to parse JSON string:", jsonString);
        throw new Error("Failed to parse the JSON received from the AI.");
    }
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});