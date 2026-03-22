const http = require('http');

const mockTasks = [
  { id: '1', title: 'Clean the kitchen', category: 'Kitchen stuff', status: 'To Do', priority: '🔴 High', recurrence: 'Weekly', recurrenceDay: 'Sunday', sortOrder: 0 },
  { id: '2', title: 'Wipe down counters', category: 'Kitchen stuff', status: 'To Do', priority: '🟡 Medium', recurrence: 'Daily', sortOrder: 1 },
  { id: '3', title: 'Update laptop', category: 'Computer stuff', status: 'To Do', priority: '🟡 Medium', recurrence: 'None', sortOrder: 0 },
  { id: '4', title: 'Clear downloads folder', category: 'Computer stuff', status: 'To Do', priority: '🟢 Low', recurrence: 'Weekly', recurrenceDay: 'Sunday', sortOrder: 1 },
  { id: '5', title: 'Vacuum living room', category: 'House stuff', status: 'To Do', priority: '🔴 High', recurrence: 'Weekly', recurrenceDay: 'Sunday', sortOrder: 0 },
];

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/tasks') {
    res.writeHead(200);
    res.end(JSON.stringify(mockTasks));
    return;
  }

  if (req.method === 'POST' && req.url === '/tasks') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const task = { ...JSON.parse(body), id: Date.now().toString() };
      mockTasks.push(task);
      res.writeHead(201);
      res.end(JSON.stringify(task));
    });
    return;
  }

  if (req.method === 'PATCH' && req.url.startsWith('/tasks/')) {
    const id = req.url.split('/')[2];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const idx = mockTasks.findIndex(t => t.id === id);
      if (idx !== -1) Object.assign(mockTasks[idx], JSON.parse(body));
      res.writeHead(200);
      res.end(JSON.stringify(mockTasks[idx] || {}));
    });
    return;
  }

  if (req.method === 'DELETE' && req.url.startsWith('/tasks/')) {
    const id = req.url.split('/')[2];
    const idx = mockTasks.findIndex(t => t.id === id);
    if (idx !== -1) mockTasks.splice(idx, 1);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/tasks/reorder') {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(3001, () => console.log('Mock server running on port 3001'));
