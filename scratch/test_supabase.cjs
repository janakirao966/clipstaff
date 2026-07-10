const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

const supabase = createClient(url, key);

async function testInsert() {
  console.log('Testing insert on profiles with non-existent column...');
  const fakeUserId = '00000000-0000-0000-0000-000000000000';
  
  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        user_id: fakeUserId,
        name: 'Test Name',
        non_existent_column_abc: 'xyz'
      }
    ])
    .select();

  if (error) {
    console.log('Insert Error Status:', error.code, error.message);
  } else {
    console.log('Insert Succeeded! Data:', data);
  }
}

testInsert();
