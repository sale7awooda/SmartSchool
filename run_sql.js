require('dotenv').config({path: '.env.local'});
require('dotenv').config();

console.log("Available Process Env Keys:", Object.keys(process.env).filter(k => 
  k.includes("SUPABASE") || k.includes("DATABASE") || k.includes("POSTGRES") || k.includes("URL") || k.includes("KEY") || k.includes("CONN")
));
