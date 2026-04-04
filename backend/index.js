import crypto from "node:crypto";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { body, validationResult } from "express-validator";
import admin from "firebase-admin";
import jwt from "jsonwebtoken";
import pg from "pg";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "";
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || 30);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "";
const DATABASE_URL = process.env.DATABASE_URL || "";
const SETUP_API_KEY = process.env.SETUP_API_KEY || "";

// Load Firebase credentials from env or file
let FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "";
let FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || "";
let FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || "";

// Try to load Firebase key from file if FIREBASE_KEY_FILE is specified
if (process.env.FIREBASE_KEY_FILE && !FIREBASE_PRIVATE_KEY) {
  try {
    const keyFilePath = path.resolve(process.env.FIREBASE_KEY_FILE);
    if (fs.existsSync(keyFilePath)) {
      const keyData = JSON.parse(fs.readFileSync(keyFilePath, "utf-8"));
      FIREBASE_PROJECT_ID = keyData.project_id || FIREBASE_PROJECT_ID;
      FIREBASE_CLIENT_EMAIL = keyData.client_email || FIREBASE_CLIENT_EMAIL;
      FIREBASE_PRIVATE_KEY = keyData.private_key || FIREBASE_PRIVATE_KEY;
      console.log("[Firebase] ✅ Loaded credentials from file:", keyFilePath);
    }
  } catch (error) {
    console.warn("[Firebase] ⚠️  Could not load key file:", error.message);
  }
}

const missingFirebaseEnv = [
  !FIREBASE_PROJECT_ID ? "FIREBASE_PROJECT_ID" : null,
  !FIREBASE_CLIENT_EMAIL ? "FIREBASE_CLIENT_EMAIL" : null,
  !FIREBASE_PRIVATE_KEY ? "FIREBASE_PRIVATE_KEY" : null,
].filter(Boolean);

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET || !DATABASE_URL) {
  console.error("Missing required environment values. Check backend/.env.example");
  process.exit(1);
}

const hasFirebaseServiceAccount = Boolean(
  FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY
);

if (!hasFirebaseServiceAccount) {
  console.warn(
    `Firebase auth disabled. Missing env: ${missingFirebaseEnv.join(", ")}`
  );
}

if (hasFirebaseServiceAccount && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
    console.log("[Firebase] ✅ Firebase Admin SDK initialized.");
  } catch (error) {
    console.error("[Firebase] ❌ Failed to initialize Firebase Admin SDK. Auth will be disabled.", error.message);
  }
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://typingwork24.com",
  "https://www.typingwork24.com",
  "https://typingwork24.in",
  "https://www.typingwork24.in",
  "capacitor://localhost",
  "http://localhost"
];

const configuredOrigins = CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients and same-origin calls.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use((_req, res, next) => {
  // Allow Google popup messaging flows in browsers that enforce COOP checks.
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

const createAccessToken = (user) => {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

const hashRefreshToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const createRefreshToken = () => crypto.randomBytes(64).toString("hex");

const getRefreshExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);
  return expiresAt;
};

const sendValidationError = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing bearer token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};

const issueSession = async (userId, username, role) => {
  const accessToken = createAccessToken({ id: userId, username, role });
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = getRefreshExpiry();

  await pool.query(
    `INSERT INTO auth_refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, refreshTokenHash, refreshTokenExpiresAt]
  );

  return { accessToken, refreshToken };
};

const logUserActivity = async (user, eventType, source = "backend") => {
  if (!user?.id) return;

  const eventData = {
    id: user.id,
    username: user.username,
    email: user.email,
    google_id: user.google_id || null,
    whatsapp_number: user.whatsapp_number || null,
    is_premium: user.is_premium || false,
    wallet_balance: Number(user.wallet_balance || 0),
    referral_wallet: Number(user.referral_wallet || 0),
    min_withdrawal: Number(user.min_withdrawal || 0)
  };

  await pool.query(
    `INSERT INTO user_activities (user_id, event_type, event_source, event_data)
     VALUES ($1, $2, $3, $4)`,
    [user.id, eventType, source, eventData]
  );
};

// Best-effort extraction of user from bearer token without enforcing auth
const tryGetUserFromAuthHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    return payload; // { sub, username, role }
  } catch {
    return null;
  }
};

const runSchemaSql = async () => {
  const fs = await import("fs");
  const schema = fs.readFileSync("./schema.sql", "utf8");
  await pool.query(schema);
};

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

app.post("/api/setup/init", async (req, res) => {
  if (!SETUP_API_KEY) {
    return res.status(503).json({ message: "Setup key not configured on server" });
  }

  if (req.headers["x-setup-key"] !== SETUP_API_KEY) {
    return res.status(401).json({ message: "Invalid setup key" });
  }

  try {
    await runSchemaSql();
    return res.json({ message: "Database initialized successfully" });
  } catch (error) {
    console.error("Setup init error:", error);
    return res.status(500).json({ message: "Failed to initialize database", error: error.message });
  }
});

app.post("/api/admin/init-db", requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    await runSchemaSql();
    res.json({ message: "Database initialized successfully" });
  } catch (error) {
    console.error("DB init error:", error);
    res.status(500).json({ message: "Failed to initialize database", error: error.message });
  }
});

app.post(
  "/api/auth/register",
  body("username").isString().trim().isLength({ min: 3, max: 30 }),
  body("email").isEmail().normalizeEmail(),
  body("password").optional().isString().isLength({ min: 8, max: 64 }),
  async (req, res) => {
    if (sendValidationError(req, res)) return;

    const username = req.body.username.trim();
    const email = String(req.body.email).toLowerCase().trim();
    const password = req.body.password;

    try {
      const existing = await pool.query(
        "SELECT id FROM auth_users WHERE username = $1 OR email = $2 LIMIT 1",
        [username, email]
      );
      if (existing.rowCount) {
        return res.status(409).json({ message: "Username or email already exists" });
      }

      let passwordHash = null;
      if (password) {
        passwordHash = await bcrypt.hash(password, 12);
      }

      const created = await pool.query(
        `INSERT INTO auth_users (username, email, password_hash, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING id, username, email, role, google_id, whatsapp_number, is_premium, wallet_balance, referral_wallet, min_withdrawal`,
        [username, email, passwordHash]
      );

      const user = created.rows[0];
      const session = await issueSession(user.id, user.username, user.role);
      return res.status(201).json({ user, ...session });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Failed to register user" });
    }
  }
);

app.post(
  "/api/auth/login",
  body("identifier").isString().trim().isLength({ min: 3 }),
  body("password").optional().isString().isLength({ min: 8, max: 64 }),
  async (req, res) => {
    if (sendValidationError(req, res)) return;

    const identifier = req.body.identifier.trim().toLowerCase();
    const password = req.body.password;

    try {
      const result = await pool.query(
        `SELECT id, username, email, password_hash, role, google_id, whatsapp_number, is_premium, wallet_balance, referral_wallet, min_withdrawal
         FROM auth_users
         WHERE LOWER(username) = $1 OR LOWER(email) = $1
         LIMIT 1`,
        [identifier]
      );

      if (!result.rowCount) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const user = result.rows[0];

      // If user has Google ID and no password provided, or password provided but no hash
      if (user.google_id && !password) {
        // Allow login without password for Google users
      } else if (password && user.password_hash) {
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
      } else {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const session = await issueSession(user.id, user.username, user.role);
      await logUserActivity(user, "login", "password");
      return res.json({
        user: { id: user.id, username: user.username, email: user.email, role: user.role, google_id: user.google_id, whatsapp_number: user.whatsapp_number, is_premium: user.is_premium, wallet_balance: user.wallet_balance, referral_wallet: user.referral_wallet, min_withdrawal: user.min_withdrawal },
        ...session
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Failed to login" });
    }
  }
);

app.post(
  "/api/auth/refresh",
  body("refreshToken").isString().isLength({ min: 32 }),
  async (req, res) => {
    if (sendValidationError(req, res)) return;

    const refreshToken = req.body.refreshToken;
    const refreshTokenHash = hashRefreshToken(refreshToken);

    try {
      const tokenResult = await pool.query(
        `SELECT rt.id, rt.user_id, rt.expires_at, u.username, u.role
         FROM auth_refresh_tokens rt
         JOIN auth_users u ON u.id = rt.user_id
         WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL
         LIMIT 1`,
        [refreshTokenHash]
      );

      if (!tokenResult.rowCount) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const tokenRow = tokenResult.rows[0];
      if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
        await pool.query("UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE id = $1", [tokenRow.id]);
        return res.status(401).json({ message: "Refresh token expired" });
      }

      await pool.query("UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE id = $1", [tokenRow.id]);
      const session = await issueSession(tokenRow.user_id, tokenRow.username, tokenRow.role);
      return res.json(session);
    } catch (error) {
      console.error("Refresh error:", error);
      return res.status(500).json({ message: "Failed to refresh token" });
    }
  }
);

app.post(
  "/api/auth/logout",
  body("refreshToken").isString().isLength({ min: 32 }),
  async (req, res) => {
    if (sendValidationError(req, res)) return;

    try {
      const refreshTokenHash = hashRefreshToken(req.body.refreshToken);
      await pool.query(
        "UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL",
        [refreshTokenHash]
      );
      return res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      return res.status(500).json({ message: "Failed to logout" });
    }
  }
);

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, role, google_id, whatsapp_number, is_premium, wallet_balance, referral_wallet, min_withdrawal, created_at FROM auth_users WHERE id = $1 LIMIT 1",
      [req.user.sub]
    );
    if (!result.rowCount) return res.status(404).json({ message: "User not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Profile error:", error);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
});

app.get("/api/auth/activity", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, event_type, event_source, event_data, created_at FROM user_activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
      [req.user.sub]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Activity fetch error:", error);
    return res.status(500).json({ message: "Failed to fetch user activity" });
  }
});

app.post(
  "/api/auth/google",
  body("idToken").optional().isString().notEmpty(),
  body("token").optional().isString().notEmpty(),
  async (req, res) => {
    if (sendValidationError(req, res)) return;
    if (!hasFirebaseServiceAccount) {
      return res.status(503).json({
        message: "Firebase authentication is not configured",
        missingEnv: missingFirebaseEnv,
      });
    }

    const idToken = req.body.idToken || req.body.token;
    if (!idToken) {
      return res.status(400).json({ message: "Google id token is required" });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const googleId = decodedToken.uid;
      const email = decodedToken.email;
      if (!googleId || !email) {
        return res.status(400).json({ message: "Google account email is required" });
      }

      // Check if user exists
      let userResult = await pool.query(
        "SELECT id, username, email, role, google_id, whatsapp_number, is_premium, wallet_balance, referral_wallet, min_withdrawal FROM auth_users WHERE google_id = $1 OR email = $2 LIMIT 1",
        [googleId, email]
      );

      let user;
      if (userResult.rowCount) {
        user = userResult.rows[0];
        // Update Google ID if not set
        if (!user.google_id) {
          await pool.query("UPDATE auth_users SET google_id = $1 WHERE id = $2", [googleId, user.id]);
          user.google_id = googleId;
        }
      } else {
        // Create new user
        const username = email.split('@')[0] + Math.random().toString(36).substring(2, 8);
        const created = await pool.query(
          `INSERT INTO auth_users (username, email, google_id, role)
           VALUES ($1, $2, $3, 'user')
           RETURNING id, username, email, role, google_id, whatsapp_number, is_premium, wallet_balance, referral_wallet, min_withdrawal`,
          [username, email, googleId]
        );
        user = created.rows[0];
      }

      const session = await issueSession(user.id, user.username, user.role);
      await logUserActivity(user, "login", "google");
      return res.json({ user, ...session });
    } catch (error) {
      console.error("Google auth error:", error);
      const status = error.code?.startsWith("auth/")
        || error.message?.includes("Firebase ID token")
        ? 401
        : 500;
      return res.status(status).json({ message: "Failed to authenticate with Google" });
    }
  }
);

app.put(
  "/api/user/profile",
  requireAuth,
  body("whatsapp_number").optional().isString().trim().isLength({ max: 20 }),
  async (req, res) => {
    if (sendValidationError(req, res)) return;

    const userId = req.user.sub;
    const whatsappNumber = req.body.whatsapp_number?.trim();

    try {
      const result = await pool.query(
        `UPDATE auth_users
         SET whatsapp_number = $1
         WHERE id = $2
         RETURNING id, username, email, google_id, whatsapp_number, is_premium, wallet_balance, referral_wallet, min_withdrawal`,
        [whatsappNumber, userId]
      );

      if (!result.rowCount) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = result.rows[0];
      await logUserActivity(updatedUser, "profile_update", "user");
      return res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      return res.status(500).json({ message: "Failed to update profile" });
    }
  }
);

app.post(
  "/api/admin/premium",
  requireAuth,
  body("userId").isInt(),
  body("isPremium").isBoolean(),
  async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (sendValidationError(req, res)) return;

    const targetUserId = req.body.userId;
    const isPremium = req.body.isPremium;

    try {
      const result = await pool.query(
        "UPDATE auth_users SET is_premium = $1 WHERE id = $2 RETURNING id, username, email, is_premium",
        [isPremium, targetUserId]
      );

      if (!result.rowCount) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = result.rows[0];
      await logUserActivity(updatedUser, "premium_update", "admin");
      return res.json({ message: "Premium status updated", user: updatedUser });
    } catch (error) {
      console.error("Premium update error:", error);
      return res.status(500).json({ message: "Failed to update premium status" });
    }
  }
);

app.post(
  "/api/admin/make-admin",
  requireAuth,
  body("userId").isInt(),
  async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (sendValidationError(req, res)) return;

    const targetUserId = req.body.userId;

    try {
      const result = await pool.query(
        "UPDATE auth_users SET role = 'admin' WHERE id = $1 RETURNING id, username, email, role",
        [targetUserId]
      );

      if (!result.rowCount) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json({ message: "User promoted to admin", user: result.rows[0] });
    } catch (error) {
      console.error("Make admin error:", error);
      return res.status(500).json({ message: "Failed to promote user" });
    }
  }
);

app.post(
  "/api/wallet/withdraw",
  requireAuth,
  body("amount").isFloat({ min: 0 }),
  async (req, res) => {
    if (sendValidationError(req, res)) return;

      const userId = req.user.sub;
      const amount = parseFloat(req.body.amount);
      const walletType = req.body.walletType || 'main'; // 'main' or 'referral'

      try {
        // Get user wallet info
        const userResult = await pool.query(
          "SELECT wallet_balance, referral_wallet, min_withdrawal FROM auth_users WHERE id = $1",
          [userId]
        );

        if (!userResult.rowCount) {
          return res.status(404).json({ message: "User not found" });
        }

        const user = userResult.rows[0];
        const balance = walletType === 'referral' ? Number(user.referral_wallet) : Number(user.wallet_balance);
        const minWithdrawal = walletType === 'referral' ? 50 : Number(user.min_withdrawal || 100);

        if (amount < minWithdrawal) {
          return res.status(400).json({ message: `Minimum withdrawal amount is ${minWithdrawal}` });
        }

        if (amount > balance) {
          return res.status(400).json({ message: "Insufficient wallet balance" });
        }

        // Create withdrawal request
        await pool.query(
          "INSERT INTO withdrawals (user_id, amount, status) VALUES ($1, $2, 'Pending')",
          [userId, amount]
        );

        // Deduct from the correct wallet
        const updateQuery = walletType === 'referral' 
          ? "UPDATE auth_users SET referral_wallet = referral_wallet - $1 WHERE id = $2"
          : "UPDATE auth_users SET wallet_balance = wallet_balance - $1 WHERE id = $2";

        await pool.query(updateQuery, [amount, userId]);

        const userResultAfter = await pool.query(
          "SELECT id, username, email, google_id, whatsapp_number, is_premium, wallet_balance, referral_wallet, min_withdrawal FROM auth_users WHERE id = $1",
          [userId]
        );
        if (userResultAfter.rowCount) {
          await logUserActivity(userResultAfter.rows[0], `withdrawal_${walletType}`, "user");
        }

      return res.json({ message: "Withdrawal request submitted successfully" });
    } catch (error) {
      console.error("Withdrawal error:", error);
      return res.status(500).json({ message: "Failed to process withdrawal" });
    }
  }
);

app.get("/api/plans", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, amount, description FROM plans WHERE is_active = true ORDER BY amount"
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Plans fetch error:", error);
    return res.status(500).json({ message: "Failed to fetch plans" });
  }
});

app.post(
  "/api/referral",
  requireAuth,
  body("referralCode").isString().trim(),
  async (req, res) => {
    if (sendValidationError(req, res)) return;

    const userId = req.user.sub;
    const referralCode = req.body.referralCode.trim();

    try {
      // Find referrer by username or some code (assuming referral code is username for now)
      const referrerResult = await pool.query(
        "SELECT id FROM auth_users WHERE username = $1 LIMIT 1",
        [referralCode]
      );

      if (!referrerResult.rowCount) {
        return res.status(400).json({ message: "Invalid referral code" });
      }

      const referrerId = referrerResult.rows[0].id;

      if (referrerId === userId) {
        return res.status(400).json({ message: "Cannot refer yourself" });
      }

      // Check if already referred
      const existingReferral = await pool.query(
        "SELECT id FROM referrals WHERE referrer_id = $1 AND referred_id = $2 LIMIT 1",
        [referrerId, userId]
      );

      if (existingReferral.rowCount) {
        return res.status(400).json({ message: "Already referred" });
      }

      // Add referral
      await pool.query(
        "INSERT INTO referrals (referrer_id, referred_id, reward_amount) VALUES ($1, $2, $3)",
        [referrerId, userId, 5.00] // Assuming 5 reward
      );

      // Add to referrer's referral wallet
      await pool.query(
        "UPDATE auth_users SET referral_wallet = referral_wallet + $1 WHERE id = $2",
        [5.00, referrerId]
      );

      const currentUser = await pool.query(
        "SELECT id, username, email, google_id, whatsapp_number, is_premium, wallet_balance, referral_wallet, min_withdrawal FROM auth_users WHERE id = $1",
        [userId]
      );
      if (currentUser.rowCount) {
        await logUserActivity(currentUser.rows[0], "referral_added", "user");
      }

      return res.json({ message: "Referral added successfully" });
    } catch (error) {
      console.error("Referral error:", error);
      return res.status(500).json({ message: "Failed to process referral" });
    }
  }
);

// Payment endpoints
// WatchPay doesn't need session management - signature-based auth
// Create order: India only configuration
app.post('/api/payment/create-order', async (req, res) => {
  const {
    amount,
    currency = 'INR',
    country = 'india',
    payType,
    paymentMethod,
    description,
    merchantId,
    callbackUrl,
    returnUrl
  } = req.body;
  
  // Extract user ID from bearer token if provided
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
      userId = payload.sub;
    } catch (e) {
      // Token validation failed, continue without user ID
    }
  }

  try {
    // Validate required fields
    if (!amount) {
      return res.status(400).json({ message: 'Missing required field: amount' });
    }

    if (!payType) {
      return res.status(400).json({ message: 'Missing required field: payType' });
    }

    // For India, use the merchant ID from env or request
    const finalMerchantId = merchantId || process.env.WATCHPAY_MERCHANT_ID || '100528114';
    if (!finalMerchantId) {
      return res.status(400).json({ message: 'Merchant ID not configured' });
    }

    // Generate order ID
    const orderId = `P24_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Construct callback URLs (frontend can override returnUrl)
    const finalCallbackUrl = callbackUrl || `${req.protocol}://${req.get('host')}/api/payment/callback`;
    const finalReturnUrl = returnUrl || `${req.protocol}://${req.get('host')}/payment/success`;
    const watchpayBaseUrl = process.env.WATCHPAY_BASE_URL || 'https://merchant.watchglb.com';

    // Create order from backend server-to-server
    const normalizedAmount = (Math.round(Number(amount) * 100) / 100).toFixed(2);
    const normalizedCurrency = String(currency).toUpperCase();

    // Check for development/mock mode
    const enableMockPayments = process.env.ENABLE_MOCK_PAYMENTS === 'true' || process.env.NODE_ENV === 'development';

    if (enableMockPayments) {
      // DEVELOPMENT MODE: Mock payment gateway response
      console.log('[payment] *** MOCK MODE ENABLED - Development Payment ***');
      
      const mockPaymentUrl = `${finalReturnUrl || 'http://localhost:5173/payment/success'}?order_id=${orderId}&status=success&pay_status=success`;
      
      // Store order in DB if possible, but DO NOT block the payment flow if DB is slow/down
      pool.query(
        `INSERT INTO payment_orders 
         (order_id, user_id, amount, currency, country, pay_type, payment_method, description, status, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)`,
        [orderId, userId, normalizedAmount, normalizedCurrency, country, payType, paymentMethod || '', description || 'Premium24 Payment (MOCK)',
          req.ip || req.connection.remoteAddress, req.get('user-agent')]
      ).catch(dbError => {
        console.warn('[payment] DB Error (non-blocking):', dbError.message);
      });

      console.log('[payment] Mock order created:', { orderId, amount: normalizedAmount, currency: normalizedCurrency, payType, userId });

      return res.json({
        orderId,
        paymentUrl: mockPaymentUrl,
        status: 'pending',
        message: '*** DEVELOPMENT MODE - Mock Payment ***',
        merchantId: finalMerchantId
      });
    }

    // PRODUCTION MODE: Real WatchPay API
    // India Payment Key (provided by WatchPay after IP bind)
    const paymentKey = process.env.WATCHPAY_API_KEY || process.env.WATCHPAY_PAYMENT_KEY || '';
    if (!paymentKey) {
      return res.status(500).json({
        message: 'WatchPay payment key is not configured. Set ENABLE_MOCK_PAYMENTS=true for development or contact merchant support for your payment key.',
        hint: 'After IP binding with WatchPay, you will receive a Payment Key. Update WATCHPAY_API_KEY in your .env file with this key.'
      });
    }

    const watchpayPayload = {
      merchant_id: finalMerchantId,
      order_id: orderId,
      amount: normalizedAmount,
      currency: normalizedCurrency,
      pay_type: String(payType),
      callback_url: finalCallbackUrl,
      return_url: finalReturnUrl,
      sign_type: 'MD5',
    };

    // WatchPay signature: md5(merchant_id + order_id + amount + currency + payment_key)
    const signBase = `${watchpayPayload.merchant_id}${watchpayPayload.order_id}${watchpayPayload.amount}${watchpayPayload.currency}${paymentKey}`;
    watchpayPayload.sign = crypto.createHash('md5').update(signBase).digest('hex');

    console.log('[payment] WatchPay request:', {
      url: `${watchpayBaseUrl}/api/pay/create`,
      payload: watchpayPayload,
      timestamp: new Date().toISOString()
    });

    const wpResponse = await fetch(`${watchpayBaseUrl}/api/pay/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(watchpayPayload)
    });
    const wpText = await wpResponse.text();
    let wpData = {};
    try { wpData = JSON.parse(wpText); } catch (_e) {}

    console.log('[payment] WatchPay response:', {
      status: wpResponse.status,
      headers: Object.fromEntries(wpResponse.headers.entries()),
      body: wpText,
      parsed: wpData,
      timestamp: new Date().toISOString()
    });

    if (!wpResponse.ok) {
      return res.status(502).json({
        message: 'WatchPay create request failed',
        status: wpResponse.status,
        response: wpText
      });
    }

    if (wpData.respcode && wpData.respcode !== '0') {
      console.warn('[payment] WatchPay rejected order:', wpData);
      return res.status(502).json({
        message: wpData.respMsg || 'WatchPay rejected create-order',
        response: wpData
      });
    }

    const paymentUrl = wpData.payment_url || wpData.url || wpData.pay_url || wpData.payUrl;
    if (!paymentUrl) {
      return res.status(502).json({
        message: 'WatchPay did not return payment URL',
        response: wpData
      });
    }

    // Store order in DB if possible, but DO NOT block the payment flow 2
    pool.query(
      `INSERT INTO payment_orders 
       (order_id, user_id, amount, currency, country, pay_type, payment_method, description, status, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)`,
      [orderId, userId, amount, currency, country, payType, paymentMethod || '', description || 'Premium24 Payment',
        req.ip || req.connection.remoteAddress, req.get('user-agent')]
    ).catch(dbError => {
      console.warn('[payment] Production DB Error (non-blocking):', dbError.message);
    });

    console.log('[payment] Order created:', { orderId, amount, currency, payType, userId });

    res.json({
      orderId,
      paymentUrl,
      status: 'pending',
      currency: currency,
      amount: amount
    });

  } catch (error) {
    console.error('[payment] Create order error:', error);
    res.status(500).json({ message: 'Failed to create payment order', error: error.message });
  }
});

// Get payment status
app.get('/api/payment/status/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    // Try to get user ID from token
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
        userId = payload.sub;
      } catch (e) {
        // Token validation failed, continue without user ID
      }
    }

    // Query payment order
    const result = await pool.query(
      `SELECT id, order_id, user_id, amount, currency, country, pay_type, payment_method, 
              description, status, transaction_id, created_at, updated_at
       FROM payment_orders 
       WHERE order_id = $1`,
      [orderId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Payment order not found' });
    }

    const order = result.rows[0];

    // If user is authenticated, verify they own this order
    if (userId && order.user_id && order.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.json({
      success: true,
      orderId: order.order_id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      paymentMethod: order.payment_method,
      transactionId: order.transaction_id,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    });

  } catch (error) {
    console.error('[payment] Status check error:', error);
    res.status(500).json({ success: false, message: 'Failed to get payment status', error: error.message });
  }
});

// Payment callback from WatchPay
app.post('/api/payment/callback', async (req, res) => {
  const { order_id, status, transaction_id, amount, currency, pay_type, pay_status } = req.body;

  console.log('[payment] Callback received:', { order_id, status, pay_status, transaction_id, amount });

  try {
    if (!order_id) {
      console.warn('[payment] Callback missing order_id');
      return res.status(400).json({ code: '1001', msg: 'Missing order_id' });
    }

    // Log the callback request
    await pool.query(
      `INSERT INTO payment_callbacks (order_id, callback_type, payload, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [order_id, 'watchpay_callback', JSON.stringify(req.body), req.ip || req.connection.remoteAddress]
    );

    // Determine payment status - WatchPay might use different status values
    const paymentSuccess = status === 'success' || status === '0' || pay_status === 'success' || pay_status === '0';
    const finalStatus = paymentSuccess ? 'success' : (status === 'failed' || status === '-1' ? 'failed' : 'pending');

    // Update order status
    const result = await pool.query(
      `UPDATE payment_orders 
       SET status = $1, transaction_id = $2, updated_at = NOW()
       WHERE order_id = $3
       RETURNING id, user_id, amount`,
      [finalStatus, transaction_id, order_id]
    );

    if (!result.rowCount) {
      console.warn('[payment] Order not found for callback:', order_id);
      return res.status(404).json({ code: '1002', msg: 'Order not found' });
    }

    const orderData = result.rows[0];
    const { user_id, amount: orderAmount } = orderData;

    // If payment successful, update user wallet and create transaction record
    if (paymentSuccess && user_id) {
      try {
        // Get user's current balance
        const userResult = await pool.query(
          'SELECT wallet_balance FROM auth_users WHERE id = $1',
          [user_id]
        );

        const balanceBefore = userResult.rows[0]?.wallet_balance || 0;
        const balanceAfter = balanceBefore + parseFloat(orderAmount);

        // Update user status to Premium
        const p24MinWithdrawal = parseFloat(orderAmount) >= 3000 ? 50 : 100;

        // Update user wallet and premium status
        await pool.query(
          'UPDATE auth_users SET wallet_balance = $1, is_premium = TRUE, min_withdrawal = $2, updated_at = NOW() WHERE id = $3',
          [balanceAfter, p24MinWithdrawal, user_id]
        );

        // Create transaction record
        await pool.query(
          `INSERT INTO transactions 
           (user_id, type, amount, balance_before, balance_after, payment_order_id, transaction_id, status, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [user_id, 'deposit', orderAmount, balanceBefore, balanceAfter, 
           order_id, transaction_id, 'success', `Premium Upgrade via WatchPay - ${orderAmount}`]
        );

        // Log user activity
        await logUserActivity(
          { id: user_id, username: 'user_' + user_id },
          'premium_activated',
          'watchpay'
        );

        console.log('[payment] Success: user upgraded to premium', user_id, 'Amount:', orderAmount);
      } catch (walletError) {
        console.error('[payment] Error updating user premium status:', walletError);
      }
    }

    // Return success to WatchPay
    res.json({ code: '0', msg: 'success' });

  } catch (error) {
    console.error('[payment] Callback error:', error);
    res.status(500).json({ code: '9999', msg: 'Internal server error' });
  }
});

// Webhook endpoint (alternative callback path)
app.post('/api/payment/webhook', async (req, res) => {
  // Redirect to callback handler
  req.body.pay_status = req.body.status;
  return app._router.stack
    .find(r => r.route && r.route.path === '/api/payment/callback')
    ?.route?.stack?.[0]?.handle(req, res);
});

app.get('/api/payment/orders', requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      `SELECT order_id, amount, currency, country, pay_type, description, status, transaction_id, created_at, updated_at
       FROM payment_orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Get payment orders error:', error);
    res.status(500).json({ message: 'Failed to get payment orders' });
  }
});

// (async () => {
//   try {
//     await runSchemaSql();
//     console.log('Database schema initialized');
//   } catch (error) {
//     console.error('Failed to initialize schema:', error);
//   }
// })();

app.listen(PORT, () => {
  console.log(`Premium24 backend listening on port ${PORT}`);
});
