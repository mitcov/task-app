require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── DB Init ──────────────────────────────────────────────────────────────────

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      issuer TEXT NOT NULL DEFAULT 'other',
      last_four TEXT,
      annual_fee NUMERIC(8,2) DEFAULT 0,
      color TEXT NOT NULL DEFAULT 'blue',
      card_key TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS benefits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      used_amount NUMERIC(10,2) DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      category TEXT NOT NULL DEFAULT 'other',
      period_start DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      source TEXT DEFAULT 'manual',
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS merchant_mappings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      merchant_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS ynab_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL UNIQUE,
      access_token TEXT NOT NULL,
      budget_id TEXT,
      account_mappings JSONB DEFAULT '{}',
      last_synced_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS usage_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      benefit_id UUID REFERENCES benefits(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      logged_at TIMESTAMPTZ DEFAULT now(),
      source TEXT DEFAULT 'manual',
      ynab_transaction_id TEXT,
      UNIQUE(ynab_transaction_id)
    );
  `);
  console.log('DB initialized');
}

// ─── Cards ────────────────────────────────────────────────────────────────────

app.get('/cards', async (req, res) => {
  const { userId } = req.query;
  const { rows } = await pool.query(
    `SELECT id, user_id AS "userId", name, issuer, last_four AS "lastFour",
            annual_fee AS "annualFee", color, card_key AS "cardKey",
            sort_order AS "sortOrder", is_active AS "isActive", created_at AS "createdAt"
     FROM credit_cards WHERE user_id = $1 AND is_active = true ORDER BY sort_order, created_at`,
    [userId]
  );
  res.json(rows);
});

app.post('/cards', async (req, res) => {
  const { userId, name, issuer, lastFour, annualFee, color, cardKey, sortOrder } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO credit_cards (user_id, name, issuer, last_four, annual_fee, color, card_key, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, user_id AS "userId", name, issuer, last_four AS "lastFour",
               annual_fee AS "annualFee", color, card_key AS "cardKey",
               sort_order AS "sortOrder", is_active AS "isActive", created_at AS "createdAt"`,
    [userId, name, issuer || 'other', lastFour || null, annualFee || 0, color || 'blue', cardKey || null, sortOrder || 0]
  );
  res.status(201).json(rows[0]);
});

app.patch('/cards/:id', async (req, res) => {
  const { id } = req.params;
  const { name, issuer, lastFour, annualFee, color, cardKey, sortOrder, isActive } = req.body;
  const { rows } = await pool.query(
    `UPDATE credit_cards SET
       name = COALESCE($1, name),
       issuer = COALESCE($2, issuer),
       last_four = COALESCE($3, last_four),
       annual_fee = COALESCE($4, annual_fee),
       color = COALESCE($5, color),
       card_key = COALESCE($6, card_key),
       sort_order = COALESCE($7, sort_order),
       is_active = COALESCE($8, is_active)
     WHERE id = $9
     RETURNING id, user_id AS "userId", name, issuer, last_four AS "lastFour",
               annual_fee AS "annualFee", color, card_key AS "cardKey",
               sort_order AS "sortOrder", is_active AS "isActive", created_at AS "createdAt"`,
    [name, issuer, lastFour, annualFee, color, cardKey, sortOrder, isActive, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.delete('/cards/:id', async (req, res) => {
  await pool.query(`UPDATE credit_cards SET is_active = false WHERE id = $1`, [req.params.id]);
  res.status(204).send();
});

app.post('/cards/reorder', async (req, res) => {
  const { cardIds } = req.body;
  await Promise.all(cardIds.map((id, i) =>
    pool.query(`UPDATE credit_cards SET sort_order = $1 WHERE id = $2`, [i, id])
  ));
  res.status(204).send();
});

// ─── Benefits ─────────────────────────────────────────────────────────────────

app.get('/benefits', async (req, res) => {
  const { userId, cardId } = req.query;
  let query = `SELECT id, card_id AS "cardId", user_id AS "userId", name, amount,
                      used_amount AS "usedAmount", frequency, category,
                      period_start AS "periodStart", notes, source,
                      is_active AS "isActive", sort_order AS "sortOrder", created_at AS "createdAt"
               FROM benefits WHERE user_id = $1 AND is_active = true`;
  const params = [userId];
  if (cardId) { query += ` AND card_id = $2`; params.push(cardId); }
  query += ` ORDER BY sort_order, created_at`;
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

app.post('/benefits', async (req, res) => {
  const { userId, cardId, name, amount, usedAmount, frequency, category, periodStart, notes, source, sortOrder } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO benefits (card_id, user_id, name, amount, used_amount, frequency, category, period_start, notes, source, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, card_id AS "cardId", user_id AS "userId", name, amount,
               used_amount AS "usedAmount", frequency, category,
               period_start AS "periodStart", notes, source,
               is_active AS "isActive", sort_order AS "sortOrder", created_at AS "createdAt"`,
    [cardId, userId, name, amount, usedAmount || 0, frequency || 'monthly', category || 'other',
     periodStart || new Date().toISOString().split('T')[0], notes || null, source || 'manual', sortOrder || 0]
  );
  res.status(201).json(rows[0]);
});

app.patch('/benefits/:id', async (req, res) => {
  const { id } = req.params;
  const { name, amount, usedAmount, frequency, category, periodStart, notes, isActive, sortOrder } = req.body;
  const { rows } = await pool.query(
    `UPDATE benefits SET
       name = COALESCE($1, name),
       amount = COALESCE($2, amount),
       used_amount = COALESCE($3, used_amount),
       frequency = COALESCE($4, frequency),
       category = COALESCE($5, category),
       period_start = COALESCE($6, period_start),
       notes = COALESCE($7, notes),
       is_active = COALESCE($8, is_active),
       sort_order = COALESCE($9, sort_order)
     WHERE id = $10
     RETURNING id, card_id AS "cardId", user_id AS "userId", name, amount,
               used_amount AS "usedAmount", frequency, category,
               period_start AS "periodStart", notes, source,
               is_active AS "isActive", sort_order AS "sortOrder", created_at AS "createdAt"`,
    [name, amount, usedAmount, frequency, category, periodStart, notes, isActive, sortOrder, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.delete('/benefits/:id', async (req, res) => {
  await pool.query(`UPDATE benefits SET is_active = false WHERE id = $1`, [req.params.id]);
  res.status(204).send();
});

app.post('/benefits/:id/use', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  // Log usage
  await pool.query(
    `INSERT INTO usage_log (benefit_id, user_id, amount, source)
     SELECT id, user_id, $2, 'manual' FROM benefits WHERE id = $1`,
    [id, amount]
  );
  // Update used_amount (cap at total amount)
  const { rows } = await pool.query(
    `UPDATE benefits
     SET used_amount = LEAST(amount, used_amount + $2)
     WHERE id = $1
     RETURNING id, card_id AS "cardId", user_id AS "userId", name, amount,
               used_amount AS "usedAmount", frequency, category,
               period_start AS "periodStart", notes, source,
               is_active AS "isActive", sort_order AS "sortOrder", created_at AS "createdAt"`,
    [id, amount]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/benefits/:id/reset', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE benefits
     SET used_amount = 0, period_start = CURRENT_DATE
     WHERE id = $1
     RETURNING id, card_id AS "cardId", user_id AS "userId", name, amount,
               used_amount AS "usedAmount", frequency, category,
               period_start AS "periodStart", notes, source,
               is_active AS "isActive", sort_order AS "sortOrder", created_at AS "createdAt"`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// ─── Recommendations ──────────────────────────────────────────────────────────

app.get('/recommendations', async (req, res) => {
  const { userId, q } = req.query;
  if (!q) return res.json([]);

  const query = q.toLowerCase();

  // Get all active benefits with remaining balance for this user
  const { rows: benefits } = await pool.query(
    `SELECT b.id, b.card_id AS "cardId", b.user_id AS "userId", b.name, b.amount,
            b.used_amount AS "usedAmount", b.frequency, b.category,
            b.period_start AS "periodStart", b.notes,
            c.id AS "cId", c.name AS "cName", c.issuer, c.last_four AS "cLastFour",
            c.annual_fee AS "cAnnualFee", c.color AS "cColor",
            c.sort_order AS "cSortOrder", c.is_active AS "cIsActive"
     FROM benefits b
     JOIN credit_cards c ON c.id = b.card_id
     WHERE b.user_id = $1 AND b.is_active = true AND c.is_active = true
       AND b.used_amount < b.amount`,
    [userId]
  );

  const results = benefits
    .filter(row => {
      const benefitNameMatch = row.name.toLowerCase().includes(query);
      const categoryMatch = row.category.toLowerCase().includes(query);
      const cardMatch = row.cName.toLowerCase().includes(query);
      return benefitNameMatch || categoryMatch || cardMatch;
    })
    .map(row => {
      const remaining = parseFloat(row.amount) - parseFloat(row.usedAmount);
      // Compute daysLeft server-side
      const periodStart = new Date(row.periodStart);
      let periodEnd = new Date(periodStart);
      switch (row.frequency) {
        case 'monthly':     periodEnd.setMonth(periodEnd.getMonth() + 1); break;
        case 'quarterly':   periodEnd.setMonth(periodEnd.getMonth() + 3); break;
        case 'semi-annual': periodEnd.setMonth(periodEnd.getMonth() + 6); break;
        case 'annual':      periodEnd.setFullYear(periodEnd.getFullYear() + 1); break;
        case 'one-time':    periodEnd = new Date('2099-01-01'); break;
      }
      const daysLeft = Math.floor((periodEnd - new Date()) / (1000 * 60 * 60 * 24));
      const urgencyBonus = daysLeft < 30 ? (30 - Math.max(0, daysLeft)) * 10 : 0;
      const score = remaining + urgencyBonus;

      return {
        card: {
          id: row.cId, name: row.cName, issuer: row.issuer,
          lastFour: row.cLastFour, annualFee: row.cAnnualFee,
          color: row.cColor, isActive: row.cIsActive, sortOrder: row.cSortOrder,
        },
        benefit: {
          id: row.id, cardId: row.cardId, userId: row.userId,
          name: row.name, amount: parseFloat(row.amount),
          usedAmount: parseFloat(row.usedAmount),
          frequency: row.frequency, category: row.category,
          periodStart: row.periodStart,
        },
        daysLeft,
        remaining,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  res.json(results);
});

// ─── Merchants ────────────────────────────────────────────────────────────────

app.get('/merchants', async (req, res) => {
  const { userId } = req.query;
  const { rows } = await pool.query(
    `SELECT id, user_id AS "userId", merchant_name AS "merchantName",
            category, card_id AS "cardId", notes
     FROM merchant_mappings WHERE user_id = $1 ORDER BY merchant_name`,
    [userId]
  );
  res.json(rows);
});

app.post('/merchants', async (req, res) => {
  const { userId, merchantName, category, cardId, notes } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO merchant_mappings (user_id, merchant_name, category, card_id, notes)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, user_id AS "userId", merchant_name AS "merchantName", category, card_id AS "cardId", notes`,
    [userId, merchantName, category || 'other', cardId || null, notes || null]
  );
  res.status(201).json(rows[0]);
});

app.delete('/merchants/:id', async (req, res) => {
  await pool.query(`DELETE FROM merchant_mappings WHERE id = $1`, [req.params.id]);
  res.status(204).send();
});

// ─── YNAB ─────────────────────────────────────────────────────────────────────

app.get('/ynab/status', async (req, res) => {
  const { userId } = req.query;
  const { rows } = await pool.query(
    `SELECT budget_id AS "budgetId", last_synced_at AS "lastSyncedAt"
     FROM ynab_connections WHERE user_id = $1`,
    [userId]
  );
  if (!rows[0]) return res.json({ connected: false });
  res.json({ connected: true, budgetId: rows[0].budgetId, lastSyncedAt: rows[0].lastSyncedAt });
});

app.post('/ynab/connect', async (req, res) => {
  const { userId, accessToken, budgetId } = req.body;
  await pool.query(
    `INSERT INTO ynab_connections (user_id, access_token, budget_id)
     VALUES ($1,$2,$3)
     ON CONFLICT (user_id) DO UPDATE SET access_token = $2, budget_id = $3`,
    [userId, accessToken, budgetId]
  );
  res.status(204).send();
});

app.get('/ynab/accounts', async (req, res) => {
  const { userId } = req.query;
  const { rows } = await pool.query(
    `SELECT access_token AS "accessToken", budget_id AS "budgetId"
     FROM ynab_connections WHERE user_id = $1`,
    [userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not connected' });

  try {
    const ynab = require('ynab');
    const api = new ynab.API(rows[0].accessToken);
    const { data } = await api.accounts.getAccounts(rows[0].budgetId);
    const accounts = data.accounts
      .filter(a => !a.deleted && a.type === 'creditCard')
      .map(a => ({ id: a.id, name: a.name, type: a.type }));
    res.json(accounts);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch YNAB accounts', details: e.message });
  }
});

app.post('/ynab/mapping', async (req, res) => {
  const { userId, cardId, ynabAccountId } = req.body;
  await pool.query(
    `UPDATE ynab_connections
     SET account_mappings = account_mappings || jsonb_build_object($2::text, $3::text)
     WHERE user_id = $1`,
    [userId, cardId, ynabAccountId]
  );
  res.status(204).send();
});

app.post('/ynab/sync', async (req, res) => {
  const { userId } = req.body;
  const { rows: connRows } = await pool.query(
    `SELECT access_token AS "accessToken", budget_id AS "budgetId",
            account_mappings AS "accountMappings", last_synced_at AS "lastSyncedAt"
     FROM ynab_connections WHERE user_id = $1`,
    [userId]
  );
  if (!connRows[0]) return res.status(404).json({ error: 'Not connected to YNAB' });

  const conn = connRows[0];

  try {
    const ynab = require('ynab');
    const api = new ynab.API(conn.accessToken);

    // Get benefits for this user to match against transactions
    const { rows: benefits } = await pool.query(
      `SELECT b.id, b.card_id AS "cardId", b.category, b.name, b.amount, b.used_amount AS "usedAmount"
       FROM benefits b WHERE b.user_id = $1 AND b.is_active = true`,
      [userId]
    );

    const accountMappings = conn.accountMappings || {}; // { cardId: ynabAccountId }
    const sinceDate = conn.lastSyncedAt
      ? new Date(conn.lastSyncedAt).toISOString().split('T')[0]
      : undefined;

    let synced = 0;

    // For each mapped card, pull transactions
    for (const [cardId, ynabAccountId] of Object.entries(accountMappings)) {
      const cardBenefits = benefits.filter(b => b.cardId === cardId);
      if (!cardBenefits.length) continue;

      const resp = await api.transactions.getTransactionsByAccount(
        conn.budgetId, ynabAccountId, sinceDate
      );
      const transactions = resp.data.transactions || [];

      for (const tx of transactions) {
        if (tx.deleted || tx.amount >= 0) continue; // skip income/credits

        const txAmount = Math.abs(tx.amount) / 1000; // YNAB uses milliunits
        const payeeName = (tx.payee_name || '').toLowerCase();
        const memo = (tx.memo || '').toLowerCase();

        // Find best matching benefit by payee name or category similarity
        const matchedBenefit = cardBenefits.find(b => {
          const nameMatch = b.name.toLowerCase().split(' ').some(word =>
            word.length > 3 && payeeName.includes(word)
          );
          const catMatch = payeeName.includes(b.category) || memo.includes(b.category);
          return nameMatch || catMatch;
        });

        if (!matchedBenefit) continue;

        // Deduplicated insert into usage_log
        try {
          await pool.query(
            `INSERT INTO usage_log (benefit_id, user_id, amount, source, ynab_transaction_id)
             VALUES ($1, $2, $3, 'ynab', $4)`,
            [matchedBenefit.id, userId, txAmount, tx.id]
          );
          // Update used_amount
          await pool.query(
            `UPDATE benefits SET used_amount = LEAST(amount, used_amount + $2) WHERE id = $1`,
            [matchedBenefit.id, txAmount]
          );
          synced++;
        } catch (dupErr) {
          // Unique constraint violation = already synced, skip
        }
      }
    }

    // Update last_synced_at
    await pool.query(
      `UPDATE ynab_connections SET last_synced_at = now() WHERE user_id = $1`,
      [userId]
    );

    res.json({ synced });
  } catch (e) {
    res.status(500).json({ error: 'YNAB sync failed', details: e.message });
  }
});

app.delete('/ynab/connect', async (req, res) => {
  const { userId } = req.query;
  await pool.query(`DELETE FROM ynab_connections WHERE user_id = $1`, [userId]);
  res.status(204).send();
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
initDB().then(() => {
  app.listen(PORT, () => console.log(`Credit Card Tracker backend running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});
