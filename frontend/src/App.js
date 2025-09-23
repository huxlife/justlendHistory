import React, { useState } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";

function App() {
  const [selectedMarkets, setSelectedMarkets] = useState([]);
  const [days, setDays] = useState(1);
  const [results, setResults] = useState([]);

  const markets = {
    TRX: "TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP",
    USDD: "TKFRELGGoRgiayhwJTNNLqCNjFoLBh3Mnf",
    USDT: "TXJgMdjVX5dKiQaUi9QobwNxtSQaFqccvd",
    wstUSDT: "TD5SdLw5scR6mXgyMK2xKrFJpauDjpKqrW",
    sTRX: "TJQ9rbVe9ei3nNtyGgBL22Fuu2xYjZaLAQ",
    SUN: "TPXDpkg9e3eZzxqxAUyke9S4z4pGJBJw9e",
    BTT: "TUaUHU9Dy8x5yNi1pKnFYqHWojot61Jfto",
    NFT: "TFpPyDCKvNFgos3g3WVsAqMrdqhB81JXHE",
    JST: "TWQhCXaWz4eHK4Kd1ErSDHjMFPoPc9czts",
    WIN: "TRg6MnpsFXc82ymUPgf5qbj59ibxiEDWvv",
    USD1: "TBEKggwqFkrc4KckQVR9BLucAmQugafEZf",
    TUSD: "TSXv71Fy5XdL3Rh2QfBoUu3NAaM4sMif8R",
    BTC: "TLeEu311Cbw63BcmMHDgDLu7fnk9fqGcqT",
    ETH: "TR7BUFRQeq1w5jAZf1FKx85SHuX6PfMqsV",
    ETHB: "TWBxQMb6RD3qmkXUXpNwVCYbL8SHNreru6",
    USDDOLD: "TX7kybeP6UwTBRHLNPYmswFESHfyjm9bAS",
    USDJ: "TL5x9MtSnDy537FXKx53yAaHRRNdg9TkkA",
    WBTT: "TUY54PVeH6WCcYCd6ZXXoBDsHytN9V5PXt",
    BUSDOLD: "TLHASseQymmpGQdfAyNjkMXFTJh8nzR2x2",
    SUNOLD: "TGBr8uh9jBVHJhhkwSJvQN2ZAKzVkxDmno",
    USDCOLD: "TNSBA6KvSvMoTqQcEgpVK7VhHT3z7wifxy",
  };

  const toggleMarket = (m) => {
    if (selectedMarkets.includes(m)) {
      setSelectedMarkets(selectedMarkets.filter((x) => x !== m));
    } else {
      setSelectedMarkets([...selectedMarkets, m]);
    }
  };

  const selectAll = () => {
    if (selectedMarkets.length === Object.keys(markets).length) {
      setSelectedMarkets([]);
    } else {
      setSelectedMarkets(Object.keys(markets));
    }
  };

  const handleQuery = async () => {
    const now = Date.now();
    const minTimestamp = now - days * 24 * 3600 * 1000;
    let allResults = [];

    for (const m of selectedMarkets) {
      const { data } = await axios.get("http://localhost:5001/api/liquidations", {
        params: {
          ctoken: markets[m],
          minTimestamp,
          maxTimestamp: now,
        },
      });

      const formatted = data.map((r) => ({
        transaction_id: r.transaction_id,
        block_number: r.block_number,
        local_time: new Date(r.block_timestamp).toLocaleString(),
        liquidator: r.result?.liquidator || "",
        borrower: r.result?.borrower || "",
        repayAmount: r.result?.repayAmount || "",
        seizeTokens: r.result?.seizeTokens || "",
        market: m,
      }));

      allResults = allResults.concat(formatted);
    }

    setResults(allResults);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">JustLend Liquidations</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={selectAll}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          {selectedMarkets.length === Object.keys(markets).length
            ? "取消全选"
            : "全选"}
        </button>

        {Object.keys(markets).map((m) => (
          <button
            key={m}
            onClick={() => toggleMarket(m)}
            className={`px-3 py-1 rounded border ${
              selectedMarkets.includes(m)
                ? "bg-blue-500 text-white"
                : "bg-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="number"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="border p-2"
        />
        <button
          onClick={handleQuery}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          查询
        </button>

        {results.length > 0 && (
          <CSVLink
            data={results}
            headers={[
              { label: "transaction_id", key: "transaction_id" },
              { label: "block_number", key: "block_number" },
              { label: "local_time", key: "local_time" },
              { label: "liquidator", key: "liquidator" },
              { label: "borrower", key: "borrower" },
              { label: "repayAmount", key: "repayAmount" },
              { label: "seizeTokens", key: "seizeTokens" },
              { label: "market", key: "market" },
            ]}
            filename={`liquidations_selected_last${days}days.csv`}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            导出CSV
          </CSVLink>
        )}
      </div>

      <table className="border w-full text-sm">
        <thead>
          <tr>
            <th>transaction_id</th>
            <th>block_number</th>
            <th>local_time</th>
            <th>liquidator</th>
            <th>borrower</th>
            <th>repayAmount</th>
            <th>seizeTokens</th>
            <th>market</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, idx) => (
            <tr key={idx}>
              <td>{r.transaction_id}</td>
              <td>{r.block_number}</td>
              <td>{r.local_time}</td>
              <td>{r.liquidator}</td>
              <td>{r.borrower}</td>
              <td>{r.repayAmount}</td>
              <td>{r.seizeTokens}</td>
              <td>{r.market}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
