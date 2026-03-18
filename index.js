require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.get('/', (req, res) => {
  res.send('Party Barn AI Receptionist is running! Twilio should point to /incoming');
});

// ─── STORE KNOWLEDGE ────────────────────────────────────────────────────────
const STORE_INFO = `
You are the friendly AI receptionist for Party Barn, Austin’s drive-thru beer and keg store.

BUSINESS DETAILS:
- Name: Party Barn
- Address: 3300 Guadalupe Street, Austin, TX 78705 (near 33rd Street)
- Phone: (512) 451-8508
- Type: Drive-thru beer, wine, and keg store

HOURS:
- Monday–Saturday: 10:30 AM – 9:00 PM
- Sunday: 12:00 PM – 5:00 PM

PRODUCTS & SERVICES:
- Alcohol: Domestic, Craft, and Imported beer; Wine; Champagne; Hard seltzers; Ciders.
- Specialty: Large keg selection (about 50 types normally stocked). Special orders available for certain keg products.
- Keg Equipment: Included with a refundable deposit. Use typically allowed for 3 days. CO2 tanks available.
- Other: Ice, Soda, Juice, Non-alcoholic drinks, Party supplies.
- Note: We do NOT sell hard liquor. We sell beer and wine only.

DRIVE-THRU:
- Yes, we have a drive-thru. Customers can drive directly into the barn and employees assist them.

AI BEHAVIOR & TONE:
- Tone: Friendly, fast, casual Austin tone. Not robotic.
- Answers: Keep them short unless asked for more.
- Delivery: If asked, say: "Let me check with the team about delivery options for you." (Pending confirmation).
- Upsell: "We currently have a large selection of craft beer and kegs available if you’re planning an event."

ESCALATION RULES (Transfer if):
- Customer asks about pricing.
- Customer wants bulk orders.
- Customer has complaints.
- Customer requests a manager.
- Inventory questions (specific availability).
- Delivery requests.

DATA COLLECTION (If customer wants help/callback):
- Name
- Phone number
- Request type
- Product interest
`;

// ─── CONVERSATION STORE (in-memory, resets on server restart) ────────────────
const conversations = {};

// ─── INCOMING CALL ───────────────────────────────────────────────────────────
app.post('/incoming', (req, res) => {
  const callSid = req.body.CallSid;
  conversations[callSid] = []; // start fresh conversation

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/handle-speech" method="POST" speechTimeout="auto" language="en-US">
    <Say voice="Polly.Joanna">Thank you for calling Party Barn, Austin’s drive-thru beer and keg store. How can I help you today?</Say>
  </Gather>
  <Redirect>/incoming</Redirect>
</Response>`;

  res.type('text/xml').send(twiml);
});

// ─── HANDLE SPEECH ───────────────────────────────────────────────────────────
app.post('/handle-speech', async (req, res) => {
  const callSid = req.body.CallSid;
  const userSpeech = req.body.SpeechResult || '';

  console.log(`[${callSid}] Customer said: "${userSpeech}"`);

  if (!conversations[callSid]) conversations[callSid] = [];

  // Add customer message to history
  conversations[callSid].push({ role: 'user', content: userSpeech });

  let replyText = '';
  let shouldTransfer = false;

  try {
    // Format history for Gemini
    const history = conversations[callSid].slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: history,
      systemInstruction: STORE_INFO,
    });

    const result = await chat.sendMessage(userSpeech);
    replyText = result.response.text().trim();

    // Check if AI wants to transfer
    if (
      replyText.toLowerCase().includes('transfer') ||
      replyText.toLowerCase().includes('team member') ||
      replyText.toLowerCase().includes('connect you')
    ) {
      shouldTransfer = true;
    }

    // Save assistant reply to history
    conversations[callSid].push({ role: 'assistant', content: replyText });

    console.log(`[${callSid}] Bot replied: "${replyText}"`);
  } catch (err) {
    console.error('Gemini error:', err.message);
    replyText = "Sorry, give me just one second — let me grab someone to help you.";
    shouldTransfer = true;
  }

  // Clean reply for TTS (remove asterisks, quotes, etc.)
  const cleanReply = replyText.replace(/[*"]/g, '');

  let twiml;

  if (shouldTransfer) {
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${cleanReply}</Say>
  <Dial>${process.env.TRANSFER_NUMBER}</Dial>
</Response>`;
  } else {
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/handle-speech" method="POST" speechTimeout="auto" language="en-US">
    <Say voice="Polly.Joanna">${cleanReply}</Say>
  </Gather>
  <Redirect>/incoming</Redirect>
</Response>`;
  }

  res.type('text/xml').send(twiml);
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Party Barn receptionist running on port ${PORT}`));
