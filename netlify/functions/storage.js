exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  };
  try {
    const key = (event.queryStringParameters && event.queryStringParameters.key) || '';
    const map = { users: 'users.json', clients: 'clients.json', config: 'config.json' };
    const filename = map[key];
    if (!filename) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid key' }) };
    }
    const token = process.env.GITHUB_TOKEN;
    const gistId = process.env.GIST_ID;
    if (!token || !gistId) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'storage not configured' }) };
    }
    const api = 'https://api.github.com';
    if (event.httpMethod === 'GET') {
      const res = await fetch(`${api}/gists/${gistId}`, {
        headers: { Authorization: `token ${token}`, 'User-Agent': 'netlify-fn' }
      });
      if (!res.ok) {
        return { statusCode: res.status, headers, body: JSON.stringify({ error: 'gist fetch failed' }) };
      }
      const data = await res.json();
      const files = data.files || {};
      const file = files[filename];
      const content = file && typeof file.content === 'string' ? file.content : (key === 'config' ? '{}' : '[]');
      return { statusCode: 200, headers, body: content };
    } else if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
      let body;
      try {
        body = event.body ? JSON.parse(event.body) : null;
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid json body' }) };
      }
      const payload = {
        files: {
          [filename]: { content: JSON.stringify(body ?? (key === 'config' ? {} : [])) }
        }
      };
      const res = await fetch(`${api}/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'netlify-fn'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { statusCode: res.status, headers, body: JSON.stringify({ error: 'gist update failed', detail: text }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } else {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'method not allowed' }) };
    }
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'server error' }) };
  }
}
