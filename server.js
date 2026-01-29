const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = process.env.META_REDIRECT_URI;
const GRAPH_VERSION = process.env.GRAPH_VERSION || "v21.0";

function mustEnv(name, val) {
  if (!val) throw new Error(`Missing env: ${name}`);
}

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// 1) يبدأ تسجيل الدخول (يرسل المستخدم لصفحة فيسبوك)
app.get("/auth/login", (req, res) => {
  try {
    mustEnv("META_APP_ID", APP_ID);
    mustEnv("META_REDIRECT_URI", REDIRECT_URI);

    // ملاحظة: هذه صلاحيات مبدئية. لاحقًا نضبط حسب احتياجك (Facebook/Instagram).
    const scope = [
      "public_profile",
      "email",
    ].join(",");

    const url =
      `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth` +
      `?client_id=${encodeURIComponent(APP_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}`;

    return res.redirect(url);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// 2) صفحة الرجوع: تستقبل code وتبدله إلى access_token
app.get("/auth/callback", async (req, res) => {
  try {
    mustEnv("META_APP_ID", APP_ID);
    mustEnv("META_APP_SECRET", APP_SECRET);
    mustEnv("META_REDIRECT_URI", REDIRECT_URI);

    const code = req.query.code;
    const error = req.query.error;

    if (error) {
      return res.status(400).send(`OAuth error: ${error}`);
    }
    if (!code) {
      return res.status(400).send("Missing ?code");
    }

    const tokenUrl =
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token` +
      `?client_id=${encodeURIComponent(APP_ID)}` +
      `&client_secret=${encodeURIComponent(APP_SECRET)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&code=${encodeURIComponent(code)}`;

    const tokenRes = await axios.get(tokenUrl);
    const access_token = tokenRes.data.access_token;

    // اختبار سريع: جلب بيانات بسيطة من /me
    const meRes = await axios.get(
      `https://graph.facebook.com/${GRAPH_VERSION}/me`,
      { params: { access_token, fields: "id,name" } }
    );

    // مؤقتًا: نعرض النتيجة في صفحة (لاحقًا نخليها ترجع للتطبيق)
    return res.json({
      ok: true,
      access_token,
      me: meRes.data,
      note: "لا تشارك access_token. لاحقًا نخزنها أو نرجعها للتطبيق بطريقة آمنة.",
    });
  } catch (e) {
    const msg = e?.response?.data || e?.message || String(e);
    return res.status(500).json({ ok: false, error: msg });
  }
});

app.listen(PORT, () => console.log("Server running on port " + PORT));
const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

// ====== بيانات فيسبوك ======
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const CALLBACK_URL = "https://video-backend-dr1f.onrender.com/auth/callback";

// ====== الصفحة الرئيسية ======
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// ====== تسجيل الدخول ======
app.get("/auth/login", (req, res) => {
  const fbLoginUrl =
    `https://www.facebook.com/v18.0/dialog/oauth` +
    `?client_id=${FACEBOOK_APP_ID}` +
    `&redirect_uri=${CALLBACK_URL}` +
    `&scope=public_profile,email`;

  res.redirect(fbLoginUrl);
});

// ====== Callback ======
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.send("No code returned ❌");
  }

  try {
    const tokenRes = await axios.get(
      "https://graph.facebook.com/v18.0/oauth/access_token",
      {
        params: {
          client_id: FACEBOOK_APP_ID,
          client_secret: FACEBOOK_APP_SECRET,
          redirect_uri: CALLBACK_URL,
          code,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    res.send({
      success: true,
      accessToken,
    });
  } catch (err) {
    res.status(500).send("OAuth error ❌");
  }
});

// ====== تشغيل السيرفر ======
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
