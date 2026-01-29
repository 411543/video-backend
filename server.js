const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = process.env.META_REDIRECT_URI;
const GRAPH_VERSION = process.env.GRAPH_VERSION || "v21.0";

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

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

app.get("/auth/callback", async (req, res) => {
  try {
    if (!APP_ID || !APP_SECRET || !REDIRECT_URI) {
      return res
        .status(500)
        .send("Missing META_APP_ID or META_APP_SECRET or META_REDIRECT_URI");
    }

    if (req.query.error) {
      return res.status(400).send(`OAuth error: ${req.query.error}`);
    }

    const code = req.query.code;
    if (!code) return res.status(400).send("Missing ?code");

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

    const access_token = tokenRes.data.access_token;

    const meRes = await axios.get(
      `https://graph.facebook.com/${GRAPH_VERSION}/me`,
      { params: { access_token, fields: "id,name" } }
    );

    return res.json({
      ok: true,
      me: meRes.data,
      access_token,
    });
  } catch (e) {
    const msg = e?.response?.data || e?.message || String(e);
    return res.status(500).json({ ok: false, error: msg });
  }
});

app.listen(PORT, () => console.log("Server running on port " + PORT));
