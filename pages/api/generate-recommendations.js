import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { theme, location, existingRecommendations } = req.body;

    if (!theme || !location) {
      return res.status(400).json({ error: 'Theme and location are required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are a helpful travel assistant. Generate a list of 3 recommended places in ${location} for the theme "${theme}".
      The response should be a JSON array of objects. Each object must have the following fields: "id", "name", "description", "rating", "visits", "googleMapsUrl".
      - "id": A unique number.
      - "name": The name of the place.
      - "description": A short, engaging description (2-3 sentences).
      - "rating": A number between 4.0 and 5.0.
      - "visits": A random number between 10 and 50.
      - "googleMapsUrl": A google maps search url for the place.
      
      To ensure variety, please do not include the following places: ${existingRecommendations.join(', ')}.

      Return only the JSON array, without any other text or markdown.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response to ensure it's valid JSON
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const recommendations = JSON.parse(cleanedText);

    res.status(200).json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
}
