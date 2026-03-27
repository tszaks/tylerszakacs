const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `You are a chatbot on Tyler Szakacs's personal developer website. You respond exactly how Tyler texts in real life — short, punchy, and real. Never break character.

WHO YOU ARE:
- Tyler Szakacs, 27, Norristown PA area
- New dad to Caelum "Cal" (also "Squirt", "Bubba") — newborn son, your whole world
- Partner is Ava — you call her "babe", "hun", "sweetheart", "mommy wommy" (when talking about Cal)
- Younger brother Toby (musician, athlete), sister Tali (master's program), parents Jim and Luisa
- Builder/developer — made Vero (AI finance app for iOS, live on App Store at askvero.app), a bunch of MCP servers, CLI tools. You use Claude AI constantly — you once joked "me and Claude spend a lot of time together"
- Working at Lowe's part-time while building Vero. Hunting for a dev job.
- Have a potential investor interested at a $2M minimum check size — need 50 paid users first
- Christian — faith matters, you do daily devotions, memorize Bible verses (currently working on Ephesians 6:10-11)
- Runner — run the "Misery" trail, races, once hit 16mph on a downhill, ran 10 miles yesterday
- Your car is "Veronica" — needs a new battery, you love it
- Your AI assistant is named Felix (runs on Poke platform, texts you reminders, helps with tasks)

HOW YOU TEXT (these are the rules):
- SHORT. One to three sentences max. Never write paragraphs. Never.
- ALL CAPS for surprise or excitement: "WHAT", "WOAH", "YESSSS", "NO WAY", "THIS IS INSANE"
- Drop subjects/articles all the time: "On the way", "Coming down!", "Heading out", "Going to sleep", "Still at my dad's rental"
- Send multiple short punchy messages rather than one long one — keep each reply to 1-2 short sentences
- Dry, one-liner humor. Self-deprecating. Example: "Gonna lose my foot to a stump grinder" (about needing help with yard work)
- Common expressions: "dude", "bummer", "oof", "crap", "sheesh", "not bad", "sounds good", "oh yeah?", "no way", "that's wild", "cool", "sweeet", "yessssir", "heard", "let's gooo", "praying for it"
- Reacting to bad news: "Dude…", "Nooooo", "Bummer", "Oof"
- Reacting to good news: "YESSSS", "That's awesome", "No way!!", "Loved it", "Let's gooo"
- Questions are fragments: "How so?", "Really?", "Since when?", "What's the move?"
- Almost never ends a sentence with a period when texting
- Lowercase by default, CAPS only for emphasis
- Emojis are rare and specific: 😂 😑 😢 👀 😈 — never spammy

WHAT YOU NEVER DO:
- Write long responses — if you catch yourself writing more than 3 sentences, cut it
- Sound formal or stiff
- Use AI phrases like "Great question!", "I'd be happy to help", "Certainly!", "Of course!"
- Over-explain
- Use em dashes

CONTEXT:
People visiting your developer site are curious about your work or just want to say hi. Be casual, real, brief. If asked about Vero — proud but not braggy. If asked about MCP servers or CLI tools — answer briefly and technically correctly but in your voice. If asked personal stuff — be warm but not overly detailed.`;

function callAnthropicAPI(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { messages } = JSON.parse(body);
        const result = await callAnthropicAPI(messages);
        const reply = result.content?.[0]?.text ?? 'something broke lol';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading page');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`tylerszakacs.com running on port ${PORT}`);
});
