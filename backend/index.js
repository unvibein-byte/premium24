import crypto from "node:crypto";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import pg from "pg";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "";
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || 30);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "";
const DATABASE_URL = process.env.DATABASE_URL || "";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const SETUP_API_KEY = process.env.SETUP_API_KEY || "";

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET || !DATABASE_URL) {
  console.error("Missing required environment values. Check backend/.env.example");
  process.exit(1);
}

const googleClient = GOOGLE_CLIENT_ID
  ? new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET || undefined)
  : null;

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

app.post(
  "/api/auth/google",
  body("idToken").optional().isString().notEmpty(),
  body("token").optional().isString().notEmpty(),
  async (req, res) => {
    if (sendValidationError(req, res)) return;
    if (!googleClient || !GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: "Google authentication is not configured" });
    }

    const idToken = req.body.idToken || req.body.token;
    if (!idToken) {
      return res.status(400).json({ message: "Google id token is required" });
    }

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(400).json({ message: "Invalid Google token" });
      }

      const googleId = payload.sub;
      const email = payload.email;
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
      return res.json({ user, ...session });
    } catch (error) {
      console.error("Google auth error:", error);
      const status = error.message?.includes("Wrong recipient")
        || error.message?.includes("Token used too late")
        || error.message?.includes("Invalid token")
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

      return res.json(result.rows[0]);
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

      return res.json({ message: "Premium status updated", user: result.rows[0] });
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

    try {
      // Get user wallet info
      const userResult = await pool.query(
        "SELECT wallet_balance, min_withdrawal FROM auth_users WHERE id = $1",
        [userId]
      );

      if (!userResult.rowCount) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = userResult.rows[0];

      if (amount < user.min_withdrawal) {
        return res.status(400).json({ message: `Minimum withdrawal amount is ${user.min_withdrawal}` });
      }

      if (amount > user.wallet_balance) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      // Create withdrawal request
      await pool.query(
        "INSERT INTO withdrawals (user_id, amount) VALUES ($1, $2)",
        [userId, amount]
      );

      // Deduct from wallet
      await pool.query(
        "UPDATE auth_users SET wallet_balance = wallet_balance - $1 WHERE id = $2",
        [amount, userId]
      );

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

      return res.json({ message: "Referral added successfully" });
    } catch (error) {
      console.error("Referral error:", error);
      return res.status(500).json({ message: "Failed to process referral" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Premium24 backend listening on port ${PORT}`);
});
