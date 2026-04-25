const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function makeKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((word, index, arr) => word.length > 2 && arr.indexOf(word) === index);
}

async function importCsv() {
  const rows = [];

  fs.createReadStream("activities.csv")
    .pipe(csv())
    .on("data", (row) => {
      rows.push(row);
    })
    .on("end", async () => {
      console.log(`Found ${rows.length} rows`);

      let batch = db.batch();
      let count = 0;

      for (const row of rows) {
        const activityCode = String(row.activity_code || `activity_${count}`);

        const activityClean = row.activity_clean || "";
        const activityDescription = row.activity_description || "";
        const category = row.category || "";
        const source = row.source || "";

        const activityData = {
          category: category,
          activity_code: activityCode,
          met: Number(row.met) || 0,
          suggested_spoons: Number(row.suggested_spoons) || 0,
          activity_clean: activityClean,
          activity_description: activityDescription,
          source: source,
          keywords: makeKeywords(
            `${category} ${activityClean} ${activityDescription}`
          ),
        };

        const docRef = db.collection("activities").doc(activityCode);
        batch.set(docRef, activityData);

        count++;

        if (count % 450 === 0) {
          await batch.commit();
          console.log(`Imported ${count} documents`);
          batch = db.batch();
        }
      }

      await batch.commit();
      console.log("Import finished!");
      process.exit();
    })
    .on("error", (error) => {
      console.error("CSV import error:", error);
      process.exit(1);
    });
}

importCsv();