require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get('/', (req, res) => {
  res.send('Party Barn AI Receptionist is running! Twilio should point to /incoming');
});

// ─── STORE KNOWLEDGE ────────────────────────────────────────────────────────
const STORE_INFO = `
You are the friendly AI receptionist for Party Barn, a party and beer store in Austin, TX.

STORE DETAILS:
- Name: Party Barn
- Address: 3300 Guadalupe St, Austin, TX 78705
- Neighborhood: Near UT campus on The Drag
- Phone: (your number here)

HOURS:
- Monday–Thursday: 10am – 10pm
- Friday–Saturday: 10am – Midnight
- Sunday: 11am – 9pm

INVENTORY (common questions):
- Beer: Domestic (Bud Light, Coors Light, Miller Lite), Import (Corona, Modelo, Heineken, Dos Equis), Craft (local Austin beers, IPAs, seltzers)
- Sizes: Singles, 6-packs, 12-packs, 18-packs, 24-packs, 30-racks, kegs (call ahead for keg availability)
- Liquor: Full selection — vodka, tequila, whiskey, rum, gin
- Wine: Red, white, rosé, sparkling
- Party supplies: Cups, plates, napkins, decorations, balloons, ice
- Non-alcoholic: Sodas, mixers, energy drinks, water

CURRENT DEALS & PRICING (examples — update weekly):
- Bud Light 30-rack: $24.99
- Modelo 12-pack: $16.99
- Corona 12-pack: $15.99
- Weekly special: White Claw 12-pack $13.99 (this week only)
- Student discount: 5% off with valid UT ID

WEEKLY SPECIALS:
- Always mention the White Claw deal when relevant
- Friday/Saturday: Case specials on domestic beer

UPSELL RULES:
- After answering any question, mention ONE relevant deal or special
- Keep it casual and friendly — like a helpful store employee, not a robot
- Example: "Oh by the way, we've got White Claw 12-packs on special this week for $13.99 — great deal if you're grabbing those!"

TRANSFER:
- If the caller has a complaint, wants to place a large order (keg, event), or asks something you can't answer, say you'll transfer them to a team member.

TONE:
- Casual, friendly, fast. This is Austin — keep it chill.
- Short answers. Don't over-explain.
- Always end with something helpful like "Anything else?" or "See you soon!"
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
    <Say voice="Polly.Joanna">Hey! Thanks for calling Party Barn — how can I help you today?</Say>
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      messages: [
        { role: 'system', content: STORE_INFO },
        ...conversations[callSid]
      ]
    });

    replyText = response.choices[0].message.content.trim();

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
    console.error('OpenAI error:', err.message);
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
