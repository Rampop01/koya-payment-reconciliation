// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");
const readline = require("readline");

async function reconcile() {
  const latestByTxn = new Map();

  const fileStream = fs.createReadStream("payments.jsonl");
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!event || typeof event !== "object") continue;
    if (!event.txn_id || !event.ts) continue;

    const existing = latestByTxn.get(event.txn_id);
    if (!existing || event.ts > existing.ts) {
      latestByTxn.set(event.txn_id, event);
    }
  }

  let total = 0;
  let count = 0;

  for (const event of latestByTxn.values()) {
    if (event.status === "success") {
      let amt = event.amount;
      if (typeof amt === "string") {
        amt = amt.replace(/,/g, "");
      }
      total += Number(amt);
      count += 1;
    }
  }

  const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

  if (count !== expected) {
    console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
    console.log("Something in the data isn't being handled the way the README describes.");
  } else {
    console.log(`Check passed: ${count} successful payments.`);
    console.log(`Your code: KOYA-${Math.round(total)}`);
  }
}

reconcile();

