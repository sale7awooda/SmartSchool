console.log("Env keys related to Supabase:");
Object.keys(process.env)
  .filter(key => key.includes("SUPABASE") || key.includes("URL") || key.includes("KEY"))
  .forEach(key => {
    console.log(key, typeof process.env[key], process.env[key] ? process.env[key].substring(0, 10) + "..." : "empty");
  });
