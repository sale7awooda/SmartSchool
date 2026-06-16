import { runPublicationsMigration } from './app/actions/academics';
require('dotenv').config();

async function run() {
  console.log("Running runPublicationsMigration...");
  const result = await runPublicationsMigration();
  console.log("Result:", result);
}

run();
