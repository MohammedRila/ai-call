require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`);
    const data = await response.json();
    console.log('Available models:');
    data.models.forEach(model => {
      console.log(`- ${model.name}`);
    });
  } catch (err) {
    console.error('Error listing models:', err.message);
  }
}

listModels();
