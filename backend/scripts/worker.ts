import "dotenv/config";
import { runJobs } from "../src/lib/jobs";
import { close } from "../src/lib/db";
let stop = false;
process.on("SIGTERM", () => {
  stop = true;
});
process.on("SIGINT", () => {
  stop = true;
});
while (!stop) {
  try {
    const result = await runJobs();
    if (result.processed)
      console.log(`Created ${result.processed} recurring transactions`);
  } catch {
    console.error("Recurring worker failed; retrying on next interval");
  }
  await new Promise((r) => setTimeout(r, 60000));
}
await close();
