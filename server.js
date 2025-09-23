const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 5001;

app.use(cors());

const API_KEY = "";
const TRONGRID_EVENT_API = "https://api.trongrid.io/v1/contracts";

// 查询 LiquidateBorrow 事件
app.get("/api/liquidations", async (req, res) => {
  try {
    const { ctoken, minTimestamp, maxTimestamp } = req.query;
    let url = `${TRONGRID_EVENT_API}/${ctoken}/events?event_name=LiquidateBorrow&min_block_timestamp=${minTimestamp}&max_block_timestamp=${maxTimestamp}&order_by=block_timestamp,asc&limit=200`;

    let allResults = [];
    let fingerprint = null;

    do {
      let queryUrl = url;
      if (fingerprint) queryUrl += `&fingerprint=${fingerprint}`;

      const response = await axios.get(queryUrl, {
        headers: {
          "tron-pro-api-key": API_KEY,
          origin: "https://app.justlend.org",
        },
      });

      const data = response.data.data;
      fingerprint = response.data.fingerprint || null;

      if (!data || data.length === 0) break;

      allResults = allResults.concat(data);
    } while (fingerprint);

    res.json(allResults);
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
