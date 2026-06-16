const fetch = require('node-fetch');
require('dotenv').config();

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/';
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  });
  const json = await res.json();
  console.log("JSON Keys:", Object.keys(json));
  if (json.components && json.components.schemas) {
    console.log("system_settings schema:", json.components.schemas.system_settings);
  }
}

run();
