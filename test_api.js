
const axios = require('axios');

async function testApiCall() {
  try {
    console.log("Attempting to fetch data from TronGrid API with a valid ctoken...");

    const API_KEY = "2";
    // Using a valid ctoken from the list you provided
    const ctoken = "TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP"; // TRX Market
    const minTimestamp = new Date('2023-01-01').getTime();
    const maxTimestamp = new Date().getTime();

    const TRONGRID_EVENT_API = "https://api.trongrid.io/v1/contracts";
    let url = `${TRONGRID_EVENT_API}/${ctoken}/events?event_name=LiquidateBorrow&min_block_timestamp=${minTimestamp}&max_block_timestamp=${maxTimestamp}&order_by=block_timestamp,asc&limit=1`; // Limit to 1 for a quick test

    const response = await axios.get(url, {
      headers: {
        "TRON-PRO-API-KEY": API_KEY
      },
    });

    console.log("API call successful!");
    console.log("Response data:", JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.data && response.data.data.length > 0) {
        console.log("\nSUCCESS: The API call returned data successfully.");
    } else if (response.data && response.data.success === true) {
        console.log("\nSUCCESS: The API call worked, but returned no events for the given parameters (this is expected if no events occurred).");
    } else {
        console.log("\nWARNING: The API call seemed to succeed but the response format was not as expected.", response.data);
    }

  } catch (error) {
    console.error("\nERROR: The API call failed.");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

testApiCall();
