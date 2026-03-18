# Party Barn AI Receptionist

## Example conversations

---

**Caller:** "Hey what time do you close tonight?"
**Bot:** "Hey! We close at 10 tonight — midnight on Fridays and Saturdays though. Oh by the way, we've got White Claw 12-packs on special this week for $13.99 if you're stocking up. Anything else?"

---

**Caller:** "Do y'all carry Modelo?"
**Bot:** "Yeah we carry Modelo! We've got 6-packs, 12-packs, and 24-packs. The 12-pack is $16.99 right now. Need anything else?"

---

**Caller:** "How much is a Bud Light 30-rack?"
**Bot:** "Bud Light 30-rack is $24.99. Also got Coors and Miller 30-racks at the same price if you want options. See you soon!"

---

**Caller:** "Where are you guys located?"
**Bot:** "We're at 3300 Guadalupe — right on The Drag near UT. Easy parking out front. We're open till 10 tonight. Anything else I can help with?"

---

**Caller:** "Do you have kegs?"
**Bot:** "Yes we do kegs! Best to call ahead so we can have it ready for you. Let me connect you with someone who can sort out the details."
**[transfers to staff]**

---

**Caller:** "What's on special this week?"
**Bot:** "This week we've got White Claw 12-packs for $13.99 — really good deal. Also running case specials on domestics this weekend. Anything specific you're looking for?"

---

**Caller:** "Do you guys sell cups and stuff for a party?"
**Bot:** "Yep! We've got cups, plates, napkins, balloons, decorations, ice — pretty much everything for a party. Come on in and we'll get you sorted. We're open till 10 tonight!"

---

## Setup

### 1. Install dependencies
```bash
cd party-barn-receptionist
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env and fill in all values
```

### 3. Run locally
```bash
npm run dev
```

### 4. Expose to internet (for Twilio)
```bash
# Install ngrok from ngrok.com, then:
ngrok http 3000
# Copy the https://xxxxx.ngrok.io URL
```

### 5. Set Twilio webhook
- Go to console.twilio.com
- Phone Numbers → Manage → Active Numbers → your number
- Under Voice & Fax → "A call comes in":
  - Set to: Webhook
  - URL: https://xxxxx.ngrok.io/incoming
  - Method: HTTP POST
- Click Save

### 6. Call your Twilio number and test!

---

## Deploy to Railway (free, permanent URL)

1. Push this folder to a GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Add all your .env variables in Railway's settings
4. Railway gives you a permanent URL — paste that into Twilio instead of ngrok

---

## Customise the bot

Edit the `STORE_INFO` section in `index.js` to update:
- Hours
- Prices
- Weekly specials
- Inventory

Change the voice by replacing `Polly.Joanna` with:
- `Polly.Matthew` (male)
- `Polly.Salli` (female, different accent)
- `Polly.Joey` (male, casual)
