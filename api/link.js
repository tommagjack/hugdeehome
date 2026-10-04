// Dynamic Link Gateway Router & LIFF Deep Link Hub
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const env = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
          if (match) {
            env[match[1]] = match[2].trim();
          }
        });
      }
    } catch (e) {}
  }
  
  if (!env.VITE_SUPABASE_URL) {
    env.VITE_SUPABASE_URL = 'https://bmplfuzkyyuqtlfgifvm.supabase.co';
  }
  if (!env.VITE_SUPABASE_ANON_KEY) {
    env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcGxmdXpreXl1cXRsZmdpZnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTgwNjcsImV4cCI6MjA5Nzc5NDA2N30.mhegnIyPtEq9zFL70wb0W9Ivz7YP3wVU0OUR0fUR_BE';
  }
  
  return env;
}

function getLinksFilePath() {
  const primary = path.join(process.cwd(), 'public/dynamic_links.json');
  return primary;
}

function readDynamicLinks() {
  const p = getLinksFilePath();
  const tmp = path.join('/tmp', 'dynamic_links.json');

  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      return data.links || [];
    } catch (e) {}
  }

  if (fs.existsSync(tmp)) {
    try {
      const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
      return data.links || [];
    } catch (e) {}
  }

  return [];
}

function saveDynamicLinks(links) {
  const p = getLinksFilePath();
  const tmp = path.join('/tmp', 'dynamic_links.json');
  const payload = JSON.stringify({ links }, null, 2);

  try {
    fs.writeFileSync(p, payload, 'utf8');
  } catch (e) {}

  try {
    fs.writeFileSync(tmp, payload, 'utf8');
  } catch (e) {}
}

export default async function handler(req, res) {
  const { alias, id, action } = req.query || {};
  const origin = req.headers['x-forwarded-host'] 
    ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host']}` 
    : (req.headers.host ? `https://${req.headers.host}` : 'https://hugdeehome.vercel.app');

  // 1. ACTION: LIST ALL DYNAMIC LINKS
  if (action === 'list') {
    const links = readDynamicLinks();
    return res.status(200).json({ success: true, links });
  }

  // 2. ACTION: UPDATE SINGLE LINK TARGET
  if (action === 'update' && req.method === 'POST') {
    const { id: targetId, alias: targetAlias, targetUrl } = req.body || {};
    if (!targetUrl || (!targetId && !targetAlias)) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const links = readDynamicLinks();
    const idx = links.findIndex(l => (targetId && l.id === targetId) || (targetAlias && l.alias === targetAlias));

    if (idx === -1) {
      return res.status(404).json({ error: 'Link not found' });
    }

    links[idx].targetUrl = targetUrl;
    links[idx].updatedAt = new Date().toISOString();
    saveDynamicLinks(links);

    return res.status(200).json({ 
      success: true, 
      message: `อัปเดตปลายทางของ "${links[idx].title}" เรียบร้อยแล้ว`, 
      link: links[idx] 
    });
  }

  // 3. ACTION: SAVE ALL LINKS
  if (action === 'save-all' && req.method === 'POST') {
    const { links } = req.body || {};
    if (!Array.isArray(links)) {
      return res.status(400).json({ error: 'Invalid links array' });
    }

    saveDynamicLinks(links);
    return res.status(200).json({ success: true, message: 'บันทึกการตั้งค่าลิงก์ทั้งหมดเรียบร้อยแล้ว' });
  }

  // 4. ROUTING / REDIRECTION (GET /api/link?alias=... or ?id=...)
  const targetKey = (alias || id || '').trim().toLowerCase();
  if (targetKey) {
    const links = readDynamicLinks();
    const matched = links.find(l => (l.alias && l.alias.toLowerCase() === targetKey) || (l.id && l.id.toLowerCase() === targetKey));

    if (matched) {
      // Increment click count
      matched.clickCount = (matched.clickCount || 0) + 1;
      matched.lastClickedAt = new Date().toISOString();
      saveDynamicLinks(links);

      let dest = matched.targetUrl || '/';
      
      // Preserve incoming query parameters (excluding alias, id, action)
      const forwardParams = new URLSearchParams();
      Object.entries(req.query).forEach(([k, v]) => {
        if (!['alias', 'id', 'action'].includes(k)) {
          forwardParams.append(k, v);
        }
      });
      const queryStr = forwardParams.toString();

      if (queryStr) {
        dest += (dest.includes('?') ? '&' : (dest.includes('#') ? '?' : '?')) + queryStr;
      }

      // Prepend host if relative path
      let finalRedirectUrl = dest;
      if (!dest.startsWith('http://') && !dest.startsWith('https://')) {
        finalRedirectUrl = `${origin}${dest.startsWith('/') ? dest : '/' + dest}`;
      }

      // 302 Temporary Redirect (Allows destination to change dynamically without browser caching)
      res.setHeader('Location', finalRedirectUrl);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(302).end();
    }
  }

  // Fallback if no alias or link not found
  res.setHeader('Location', `${origin}/#/`);
  return res.status(302).end();
}
