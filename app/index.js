const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const OpenAI = require("openai");

// Importa os “silos” SAFEX
const { handleSafexMessage, mensagemSomenteTexto } = require("./safex/core/orchestrator");
const SYSTEM_PROMPT = require("./safex/config/systemPrompt");

const app = express();
app.use(bodyParser.json());

// Cliente OpenAI para rota de teste /test-safex
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -----------------------------------------------------------------------------
// Rotas básicas de teste
// -----------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.status(200).send("SAFEX raiz OK");
});

app.get("/health", (req, res) => {
  res.status(200).send("SAFEX OK");
});

// Rota de teste direto do SAFEX (sem WhatsApp)
app.get("/test-safex", async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
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

    const answer = completion.choices[0].message.content;
    res.status(200).send(answer);
  } catch (err) {
    console.error("Erro na rota /test-safex:", err.response?.data || err.message);
    res.status(500).send(err.response?.data || err.message);
  }
});

// -----------------------------------------------------------------------------
// ROTA GET PARA VERIFICAÇÃO DO WEBHOOK (META/WHATSAPP)
// -----------------------------------------------------------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso.");
    res.status(200).send(challenge);
  } else {
    console.log("Falha na verificação do webhook.");
    res.sendStatus(403);
  }
});

// -----------------------------------------------------------------------------
// ROTA POST PARA RECEBER MENSAGENS DO WHATSAPP
// -----------------------------------------------------------------------------
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (
      body.object &&
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;                 // telefone do usuário
      const text = message.text?.body || "";     // texto (se houver)

      console.log("Mensagem recebida do WhatsApp:", text || "[não texto]");

      let reply;
      if (!text) {
        // Qualquer coisa que não seja texto (imagem, PDF, etc.)
        reply = mensagemSomenteTexto();
      } else {
        // Fluxo SAFEX completo (máquina de estados)
        reply = await handleSafexMessage(from, text);
      }

      console.log("Resposta SAFEX:", reply);

      try {
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

        console.log("Mensagem enviada ao WhatsApp com sucesso.");
      } catch (waErr) {
        console.error(
          "Erro ao enviar mensagem ao WhatsApp:",
          waErr.response?.status,
          JSON.stringify(waErr.response?.data, null, 2) || waErr.message
        );
      }
    } else {
      console.log("Webhook recebido sem mensagem de texto válida.");
    }

    res.sendStatus(200);
  } catch (err) {
    if (err.response) {
      console.error(
        "Erro no webhook POST:",
        err.response.status,
        JSON.stringify(err.response.data, null, 2)
      );
    } else {
      console.error("Erro no webhook POST:", err.message);
    }
    res.sendStatus(500);
  }
});

// -----------------------------------------------------------------------------
// INICIAR SERVIDOR
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`SAFEX vivo na porta ${PORT}`);
});
