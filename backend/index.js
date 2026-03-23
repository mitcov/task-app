require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const webpush = require('web-push');
const cron = require('node-cron');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ── VAPID Setup ───────────────────────────────────────────────────────────────
webpush.setVapidDetails(
  'mailto:' + (process.env.VAPID_EMAIL || 'admin@justdoit.app'),
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── DB Init ───────────────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Uncategorized',
      status TEXT NOT NULL DEFAULT 'To Do',
      priority TEXT NOT NULL DEFAULT '🟡 Medium',
      recurrence TEXT NOT NULL DEFAULT 'None',
      recurrence_day TEXT,
      due_date DATE,
      reminder_time TIME,
      sort_order INTEGER DEFAULT 999,
      last_completed TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'once',
      offset_minutes INTEGER,
      label TEXT,
      daily_time TIME,
      daily_start DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'Gray',
      sort_order INTEGER DEFAULT 999,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      subscription JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Add new columns if they don't exist yet (safe to run multiple times)
  await pool.query(`
    ALTER TABLE reminders ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'once';
    ALTER TABLE reminders ADD COLUMN IF NOT EXISTS daily_time TIME;
    ALTER TABLE reminders ADD COLUMN IF NOT EXISTS daily_start DATE;
  `);

  console.log('DB initialized');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToReminder(r) {
  return {
    id: r.id,
    type: r.type || 'once',
    offsetMinutes: r.offset_minutes,
    label: r.label,
    dailyTime: r.daily_time || null,
    dailyStart: r.daily_start ? r.daily_start.toISOString().split('T')[0] : null,
  };
}

function rowToTask(row, reminders = []) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    category: row.category,
    status: row.status,
    priority: row.priority,
    recurrence: row.recurrence,
    recurrenceDay: row.recurrence_day,
    dueDate: row.due_date ? row.due_date.toISOString().split('T')[0] : null,
    reminderTime: row.reminder_time || null,
    sortOrder: row.sort_order,
    lastCompleted: row.last_completed,
    notes: row.notes,
    reminders: reminders.map(rowToReminder),
  };
}

function rowToCategory(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
  };
}

async function saveReminders(taskId, reminders) {
  await pool.query('DELETE FROM reminders WHERE task_id = $1', [taskId]);
  const saved = [];
  for (const r of reminders) {
    const result = await pool.query(
      `INSERT INTO reminders (task_id, type, offset_minutes, label, daily_time, daily_start)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        taskId,
        r.type || 'once',
        r.type === 'once' ? r.offsetMinutes : null,
        r.type === 'once' ? r.label : null,
        r.type === 'daily' ? r.dailyTime : null,
        r.type === 'daily' ? r.dailyStart : null,
      ]
    );
    saved.push(result.rows[0]);
  }
  return saved;
}

// ── Task Routes ───────────────────────────────────────────────────────────────

app.get('/tasks', async (req, res) => {
  try {
    const { userId } = req.query;
    const tasks = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [userId]
    );
    const taskIds = tasks.rows.map(t => t.id);
    const reminders = taskIds.length > 0
      ? await pool.query('SELECT * FROM reminders WHERE task_id = ANY($1)', [taskIds])
      : { rows: [] };

    const reminderMap = {};
    reminders.rows.forEach(r => {
      if (!reminderMap[r.task_id]) reminderMap[r.task_id] = [];
      reminderMap[r.task_id].push(r);
    });
    res.json(tasks.rows.map(t => rowToTask(t, reminderMap[t.id] || [])));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/tasks', async (req, res) => {
  try {
    const {
      userId, title, category, status, priority, recurrence,
      recurrenceDay, dueDate, reminderTime, sortOrder, notes, reminders
    } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, category, status, priority, recurrence,
        recurrence_day, due_date, reminder_time, sort_order, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [userId, title, category, status || 'To Do', priority || '🟡 Medium',
       recurrence || 'None', recurrenceDay || null, dueDate || null,
       reminderTime || null, sortOrder ?? 999, notes || null]
    );

    const task = result.rows[0];
    const savedReminders = reminders?.length > 0
      ? await saveReminders(task.id, reminders)
      : [];

    res.status(201).json(rowToTask(task, savedReminders));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.patch('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, category, status, priority, recurrence,
      recurrenceDay, dueDate, reminderTime, sortOrder,
      lastCompleted, notes, reminders
    } = req.body;

    const result = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        category = COALESCE($2, category),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        recurrence = COALESCE($5, recurrence),
        recurrence_day = COALESCE($6, recurrence_day),
        due_date = COALESCE($7::date, due_date),
        reminder_time = COALESCE($8::time, reminder_time),
        sort_order = COALESCE($9, sort_order),
        last_completed = COALESCE($10::timestamptz, last_completed),
        notes = COALESCE($11, notes)
       WHERE id = $12 RETURNING *`,
      [title, category, status, priority, recurrence, recurrenceDay,
       dueDate || null, reminderTime || null, sortOrder,
       lastCompleted || null, notes, id]
    );

    const savedReminders = reminders !== undefined
      ? await saveReminders(id, reminders)
      : (await pool.query('SELECT * FROM reminders WHERE task_id = $1', [id])).rows;

    res.json(rowToTask(result.rows[0], savedReminders));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/tasks/reorder', async (req, res) => {
  try {
    const { taskIds } = req.body;
    await Promise.all(
      taskIds.map((id, index) =>
        pool.query('UPDATE tasks SET sort_order = $1 WHERE id = $2', [index, id])
      )
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── Category Routes ───────────────────────────────────────────────────────────

app.get('/categories', async (req, res) => {
  try {
    const { userId } = req.query;
    const result = await pool.query(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [userId]
    );
    res.json(result.rows.map(rowToCategory));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/categories', async (req, res) => {
  try {
    const { userId, name, color, sortOrder } = req.body;
    const result = await pool.query(
      `INSERT INTO categories (user_id, name, color, sort_order)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, name) DO UPDATE SET color = $3
       RETURNING *`,
      [userId, name, color || 'Gray', sortOrder ?? 999]
    );
    res.status(201).json(rowToCategory(result.rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.patch('/categories/:id', async (req, res) => {
  try {
    const { name, color, sortOrder } = req.body;
    const result = await pool.query(
      `UPDATE categories SET
        name = COALESCE($1, name),
        color = COALESCE($2, color),
        sort_order = COALESCE($3, sort_order)
       WHERE id = $4 RETURNING *`,
      [name, color, sortOrder, req.params.id]
    );
    res.json(rowToCategory(result.rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/categories/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/categories/reorder', async (req, res) => {
  try {
    const { categoryIds } = req.body;
    await Promise.all(
      categoryIds.map((id, index) =>
        pool.query('UPDATE categories SET sort_order = $1 WHERE id = $2', [index, id])
      )
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── Push Subscription Routes ──────────────────────────────────────────────────

app.post('/subscribe', async (req, res) => {
  try {
    const { userId, subscription } = req.body;
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, subscription)
       VALUES ($1, $2)`,
      [userId, JSON.stringify(subscription)]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/unsubscribe', async (req, res) => {
  try {
    const { userId } = req.body;
    await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// ── Reminder Cron ─────────────────────────────────────────────────────────────

async function sendPushToUser(userId, title, body) {
  const subs = await pool.query(
    'SELECT subscription FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );
  for (const sub of subs.rows) {
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({ title, body, icon: '/icon.svg' })
      );
    } catch (e) {
      console.error('Push failed:', e.message);
      if (e.statusCode === 410) {
        await pool.query(
          'DELETE FROM push_subscriptions WHERE subscription = $1',
          [JSON.stringify(sub.subscription)]
        );
      }
    }
  }
}

cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // ── One-time reminders ──
    const onceReminders = await pool.query(`
      SELECT t.id as task_id, t.user_id, t.title, t.due_date, t.reminder_time,
             r.id as reminder_id, r.offset_minutes, r.label
      FROM tasks t
      JOIN reminders r ON r.task_id = t.id
      WHERE r.type = 'once'
      AND t.status != 'Done'
      AND t.due_date IS NOT NULL
      AND t.reminder_time IS NOT NULL
    `);

    for (const row of onceReminders.rows) {
      const dueDate = row.due_date.toISOString().split('T')[0];
      const [hours, minutes] = row.reminder_time.split(':').map(Number);
      const taskDateTime = new Date(`${dueDate}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`);
      const reminderDateTime = new Date(taskDateTime.getTime() - row.offset_minutes * 60000);
      const diff = reminderDateTime.getTime() - now.getTime();

      if (diff >= 0 && diff < 5 * 60 * 1000) {
        await sendPushToUser(
          row.user_id,
          'Just Do It',
          `${row.label}: ${row.title}`
        );
      }
    }

    // ── Daily until done reminders ──
    const dailyReminders = await pool.query(`
      SELECT t.id as task_id, t.user_id, t.title,
             r.id as reminder_id, r.daily_time, r.daily_start
      FROM tasks t
      JOIN reminders r ON r.task_id = t.id
      WHERE r.type = 'daily'
      AND t.status != 'Done'
      AND r.daily_start <= $1::date
      AND r.daily_time IS NOT NULL
    `, [todayStr]);

    for (const row of dailyReminders.rows) {
      const [hours, minutes] = row.daily_time.split(':').map(Number);
      const fireTime = new Date(`${todayStr}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`);
      const diff = fireTime.getTime() - now.getTime();

      if (diff >= 0 && diff < 5 * 60 * 1000) {
        await sendPushToUser(
          row.user_id,
          'Just Do It — Reminder',
          `Don't forget: ${row.title}`
        );
      }
    }
  } catch (e) {
    console.error('Cron error:', e.message);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
initDB().then(() => {
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
});
