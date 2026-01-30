const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ENV =====
const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = process.env.META_REDIRECT_URI;
const GRAPH_VERSION = process.env.GRAPH_VERSION || "v21.0";

// ===== MIDDLEWARE =====
app.use(express.json());

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// ===== LOGIN =====
app.get("/auth/login", (req, res) => {
  if (!APP_ID || !REDIRECT_URI) {
    return res.status(500).send("Missing META_APP_ID or META_REDIRECT_URI");
  }

  const scope = "public_profile,email";

  const url =
    `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth` +
    `?client_id=${encodeURIComponent(APP_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}`;

  return res.redirect(url);
});

// ===== CALLBACK =====
app.get("/auth/callback", async (req, res) => {
  try {
    if (!APP_ID || !APP_SECRET || !REDIRECT_URI) {
      return res
        .status(500)
        .send("Missing META_APP_ID or META_APP_SECRET or META_REDIRECT_URI");
    }

    if (req.query.error) {
      return res
        .status(400)
        .send(`OAuth error: ${req.query.error}`);
    }

    const code = req.query.code;
    if (!code) {
      return res.status(400).send("Missing code");
    }

    // === Exchange code for access token ===
    const tokenRes = await axios.get(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
      {
        params: {
          client_id: APP_ID,
          client_secret: APP_SECRET,
          redirect_uri: REDIRECT_URI,
          code,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // === Get user info ===
    const userRes = await axios.get(
      `https://graph.facebook.com/me`,
      {
        params: {
          fields: "id,name,email",
          access_token: accessToken,
        },
      }
    );

    return res.json({
      ok: true,
      user: userRes.data,
    });
  } catch (err) {
    console.error("Callback error:", err?.response?.data || err);
    return res.status(500).send("Callback error");
  }
});

// ===== DELETE DATA (Meta required) =====
app.post("/delete-data", (req, res) => {
  return res.json({
    status: "ok",
    message: "User data deletion request received",
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
