const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const OpenAI = require("openai");

// Importa os “silos” SAFEX
const { handleSafexMessage, mensagemSomenteTexto } = require("../safex/core/orchestrator");
const SYSTEM_PROMPT = require("../safex/config/systemPrompt");

const app = express();
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -----------------------------------------------------------------------------
// Rotas básicas
// -----------------------------------------------------------------------------
app.get("/", (req, res) => res.status(200).send("SAFEX raiz OK (app/index.js)"));
app.get("/health", (req, res) => res.status(200).send("SAFEX OK"));

// -----------------------------------------------------------------------------
// Rota de teste direto (sem WhatsApp)
// -----------------------------------------------------------------------------
app.get("/test-safex", async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            "Perfil do usuário: Médico. Paciente com eGFR 38 mL/min/1,73m². É seguro usar contraste iodado em TC de abdome?",
        },
      ],
      temperature: 0.1,
    });

    res.status(200).send(completion.choices[0].message.content);
  } catch (err) {
    console.error("Erro /test-safex:", err.response?.data || err.message);
    res.status(500).send(err.response?.data || err.message);
  }
});

// -----------------------------------------------------------------------------
// Webhook META (verificação)
// -----------------------------------------------------------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso.");
    res.status(200).send(challenge);
  } else {
    console.log("Falha na verificação do webhook.");
    res.sendStatus(403);
  }
});

// -----------------------------------------------------------------------------
// Webhook POST (mensagens do WhatsApp)
// -----------------------------------------------------------------------------
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) {
      console.log("Webhook recebido sem mensagem de texto válida.");
      return res.sendStatus(200);
    }

    const from = msg.from;
    const text = msg.text?.body || "";
    console.log("📩 Recebido do WhatsApp:", text || "[sem texto]");

    const reply = text
      ? await handleSafexMessage(from, text)
      : mensagemSomenteTexto();

    console.log("📤 Resposta SAFEX:", reply);

    await axios.post(
      `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: reply },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Mensagem enviada ao WhatsApp.");
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro no webhook:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// -----------------------------------------------------------------------------
// Inicialização
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 SAFEX vivo na porta ${PORT}`));
