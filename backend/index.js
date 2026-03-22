require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');

const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DB_ID;

app.use(cors());
app.use(express.json());

// ── Helpers ──────────────────────────────────────────────────────────────────

function pageToTask(page) {
  const p = page.properties;
  return {
    id: page.id,
    title: p.Name?.title?.[0]?.plain_text || '',
    category: p.Category?.select?.name || 'Uncategorized',
    status: p.Status?.select?.name || 'To Do',
    priority: p.Priority?.select?.name || '🟡 Medium',
    recurrence: p.Recurrence?.select?.name || 'None',
    recurrenceDay: p['Recurrence Day']?.select?.name || null,
    dueDate: p['Due Date']?.date?.start || null,
    sortOrder: p['Sort Order']?.number ?? 999,
    lastCompleted: p['Last Completed']?.date?.start || null,
    notes: p.Notes?.rich_text?.[0]?.plain_text || '',
  };
}

function taskToProperties(task) {
  const props = {};
  if (task.title !== undefined)
    props.Name = { title: [{ text: { content: task.title } }] };
  if (task.category !== undefined)
    props.Category = { select: { name: task.category } };
  if (task.status !== undefined)
    props.Status = { select: { name: task.status } };
  if (task.priority !== undefined)
    props.Priority = { select: { name: task.priority } };
  if (task.recurrence !== undefined)
    props.Recurrence = { select: { name: task.recurrence } };
  if (task.recurrenceDay !== undefined)
    props['Recurrence Day'] = task.recurrenceDay
      ? { select: { name: task.recurrenceDay } }
      : { select: null };
  if (task.dueDate !== undefined)
    props['Due Date'] = task.dueDate ? { date: { start: task.dueDate } } : { date: null };
  if (task.sortOrder !== undefined)
    props['Sort Order'] = { number: task.sortOrder };
  if (task.lastCompleted !== undefined)
    props['Last Completed'] = task.lastCompleted
      ? { date: { start: task.lastCompleted } }
      : { date: null };
  if (task.notes !== undefined)
    props.Notes = { rich_text: [{ text: { content: task.notes } }] };
  return props;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /tasks
app.get('/tasks', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: DB_ID,
      sorts: [{ property: 'Sort Order', direction: 'ascending' }],
    });
    res.json(response.results.map(pageToTask));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /tasks
app.post('/tasks', async (req, res) => {
  try {
    const page = await notion.pages.create({
      parent: { database_id: DB_ID },
      properties: taskToProperties(req.body),
    });
    res.status(201).json(pageToTask(page));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /tasks/:id
app.patch('/tasks/:id', async (req, res) => {
  try {
    const page = await notion.pages.update({
      page_id: req.params.id,
      properties: taskToProperties(req.body),
    });
    res.json(pageToTask(page));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /tasks/:id
app.delete('/tasks/:id', async (req, res) => {
  try {
    await notion.pages.update({
      page_id: req.params.id,
      archived: true,
    });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /tasks/reorder
app.post('/tasks/reorder', async (req, res) => {
  try {
    const { taskIds } = req.body;
    await Promise.all(
      taskIds.map((id, index) =>
        notion.pages.update({
          page_id: id,
          properties: { 'Sort Order': { number: index } },
        })
      )
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
