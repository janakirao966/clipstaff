const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('.env file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

if (!urlMatch || !keyMatch) {
  console.error('Supabase credentials not found in .env');
  process.exit(1);
}

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

async function getSwagger() {
  try {
    const fetchUrl = `${url}/rest/v1/`;
    console.log('Fetching from URL:', fetchUrl);
    console.log('Key start:', key.substring(0, 15));
    console.log('Key end:', key.substring(key.length - 15));
    const res = await fetch(fetchUrl, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch schema: ${res.status} ${res.statusText}`);
    }
    const schema = await res.json();
    const profilesTable = schema.definitions && schema.definitions.profiles;
    if (profilesTable) {
      console.log('Profiles table columns:', Object.keys(profilesTable.properties));
    } else {
      console.log('profiles table not found in Swagger definitions.');
    }
  } catch (error) {
    console.error('Error fetching schema:', error);
  }
}

getSwagger();
