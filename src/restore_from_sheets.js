import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env file
const envPath = '.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const gasUrl = env.VITE_GAS_URL;
console.log('Fetching from Google Apps Script URL:', gasUrl);

async function testFetch() {
  try {
    const response = await fetch(`${gasUrl}?action=get_all`);
    const json = await response.json();
    if (json.status === 'success') {
      console.log('✅ Successfully retrieved backup from Google Sheets!');
      console.log('Tables found in Sheets:');
      for (const key in json.data) {
        console.log(`- ${key}: ${Array.isArray(json.data[key]) ? json.data[key].length : 'Object'} rows`);
      }
      
      // Save backup file locally just in case
      fs.writeFileSync('sheets_backup.json', JSON.stringify(json.data, null, 2));
      console.log('💾 Saved backup to sheets_backup.json');
    } else {
      console.log('❌ Google Sheets returned error:', json.message);
    }
  } catch (err) {
    console.log('❌ Failed to fetch from Google Sheets:', err.message);
  }
}

testFetch();
