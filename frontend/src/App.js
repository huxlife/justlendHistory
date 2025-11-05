/* global BigInt */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './App.css';

// --- Base58Check Conversion Logic ---
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const hexToBytes = (hex) => {
    if (hex.startsWith('0x')) hex = hex.substring(2);
    // Handle cases where the API might return a non-hex string for some reason
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
        console.error("Invalid characters in hex string:", hex);
        return new Uint8Array();
    }
    if (hex.length % 2 !== 0) hex = '0' + hex;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
};

const base58Encode = (bytes) => {
    if (bytes.length === 0) return '';
    let hex = Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
    let bi = BigInt('0x' + hex);
    const base = BigInt(58);
    let sb = '';
    while (bi > BigInt(0)) {
        const remainder = bi % base;
        bi = bi / base;
        sb = BASE58_ALPHABET[Number(remainder)] + sb;
    }
    for (const byte of bytes) {
        if (byte === 0x00) sb = BASE58_ALPHABET[0] + sb; else break;
    }
    return sb;
};

async function hexToBase58Check(hex) {
    if (!hex || hex.length < 1) return "";
    if (hex.length === 34 && hex.startsWith('T')) return hex;

    let addrBytes = hexToBytes(hex);
    if (addrBytes.length === 0) return "<Invalid Address>";

    // If it's a 20-byte address (40 hex chars), add the 0x41 prefix.
    // This is the standard for borrower and liquidator.
    if (addrBytes.length === 20) {
        const prefixedBytes = new Uint8Array(21);
        prefixedBytes[0] = 0x41; // TRON address prefix
        prefixedBytes.set(addrBytes, 1);
        addrBytes = prefixedBytes;
    } 
    // cTokenCollateral is often a 21-byte hex address already.
    // If it's a valid address format, proceed.
    else if (addrBytes.length !== 21) {
       console.warn("Unexpected address length:", addrBytes.length, hex);
       return hex; // Return original hex if it's not a recognized format
    }

    const hash0 = await window.crypto.subtle.digest('SHA-256', addrBytes);
    const hash1 = await window.crypto.subtle.digest('SHA-256', hash0);
    const checksum = new Uint8Array(hash1).slice(0, 4);
    const addrWithCheck = new Uint8Array(addrBytes.length + 4);
    addrWithCheck.set(addrBytes);
    addrWithCheck.set(checksum, addrBytes.length);
    return base58Encode(addrWithCheck);
}
// --- End of Base58Check Conversion Logic ---

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// New Compact Results List Component
const ResultsList = ({ data }) => {
    if (data.length === 0) {
        return <p>No events to display.</p>;
    }

    const formatNumber = (numStr) => {
        if (!numStr) return 'N/A';
        try { return BigInt(numStr).toLocaleString(); } catch (e) { return numStr; }
    };

    const shortenAddress = (address) => {
        if (typeof address !== 'string' || address.length < 10) return address;
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    return (
        <div className="results-list-container">
            {data.map((event, index) => (
                <div key={`${event.transaction_id}-${index}`} className="result-item">
                    <div className="result-col col-market-time">
                        <span className="market-tag">{event.marketName}</span>
                        <span className="timestamp">{new Date(event.block_timestamp).toLocaleString()}</span>
                    </div>
                    <div className="result-col col-parties">
                        <div title={event.result.borrower}><strong>Borrower:</strong> {shortenAddress(event.result.borrower)}</div>
                        <div title={event.result.liquidator}><strong>Liquidator:</strong> {shortenAddress(event.result.liquidator)}</div>
                    </div>
                    <div className="result-col col-amounts">
                        <div><strong>Repaid:</strong> {formatNumber(event.result.repayAmount)}</div>
                        <div><strong>Seized:</strong> {formatNumber(event.result.seizeTokens)}</div>
                    </div>
                    <div className="result-col col-collateral" title={event.result.cTokenCollateral}>
                       <strong>Collateral:</strong> {shortenAddress(event.result.cTokenCollateral)}
                    </div>
                    <div className="result-col col-tx">
                        <a href={`https://tronscan.org/#/transaction/${event.transaction_id}`} target="_blank" rel="noopener noreferrer" className="tx-link">View Tx</a>
                    </div>
                </div>
            ))}
        </div>
    );
};

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMarkets, setSelectedMarkets] = useState({});
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [days, setDays] = useState(1);

  const markets = useMemo(() => ({
    TRX: "TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP", USDD: "TKFRELGGoRgiayhwJTNNLqCNjFoLBh3Mnf",
    USDT: "TXJgMdjVX5dKiQaUi9QobwNxtSQaFqccvd", wstUSDT: "TD5SdLw5scR6mXgyMK2xKrFJpauDjpKqrW",
    sTRX: "TJQ9rbVe9ei3nNtyGgBL22Fuu2xYjZaLAQ", SUN: "TPXDpkg9e3eZzxqxAUyke9S4z4pGJBJw9e",
    BTT: "TUaUHU9Dy8x5yNi1pKnFYqHWojot61Jfto", NFT: "TFpPyDCKvNFgos3g3WVsAqMrdqhB81JXHE",
    JST: "TWQhCXaWz4eHK4Kd1ErSDHjMFPoPc9czts", WIN: "TRg6MnpsFXc82ymUPgf5qbj59ibxiEDWvv",
    USD1: "TBEKggwqFkrc4KckQVR9BLucAmQugafEZf", TUSD: "TSXv71Fy5XdL3Rh2QfBoUu3NAaM4sMif8R",
    BTC: "TLeEu311Cbw63BcmMHDgDLu7fnk9fqGcqT", ETH: "TR7BUFRQeq1w5jAZf1FKx85SHuX6PfMqsV",
    ETHB: "TWBxQMb6RD3qmkXUXpNwVCYbL8SHNreru6", USDDOLD: "TX7kybeP6UwTBRHLNPYmswFESHfyjm9bAS",
    USDJ: "TL5x9MtSnDy537FXKx53yAaHRRNdg9TkkA", WBTT: "TUY54PVeH6WCcYCd6ZXXoBDsHytN9V5PXt",
    BUSDOLD: "TLHASseQymmpGQdfAyNjkMXFTJh8nzR2x2", SUNOLD: "TGBr8uh9jBVHJhhkwSJvQN2ZAKzVkxDmno",
    USDCOLD: "TNSBA6KvSvMoTqQcEgpVK7VhHT3z7wifxy",
  }), []);

  useEffect(() => {
    const initialSelection = {};
    Object.keys(markets).forEach(market => { initialSelection[market] = false; });
    setSelectedMarkets(initialSelection);
  }, [markets]);

  const handleSelectionChange = (event) => {
    const { name, checked } = event.target;
    setSelectedMarkets(prev => ({ ...prev, [name]: checked }));
  };

  const handleSelectAll = (event) => {
    const { checked } = event.target;
    const newSelection = {};
    Object.keys(markets).forEach(market => { newSelection[market] = checked; });
    setSelectedMarkets(newSelection);
  };

  const handleFetchData = async () => {
    const marketsToFetch = Object.entries(selectedMarkets)
                               .filter(([, isSelected]) => isSelected)
                               .map(([name]) => ({ name, ctoken: markets[name] }));
    if (marketsToFetch.length === 0) {
        setError("Please select at least one market to query.");
        return;
    }
    setLoading(true);
    setError(null);
    setData([]);
    setProgress({ current: 0, total: marketsToFetch.length });
    
    try {
      const API_KEY = "";
      const TRONGRID_EVENT_API = "https://api.trongrid.io/v1/contracts";
      const maxTimestamp = new Date().getTime();
      const validDays = Math.max(1, parseInt(days, 10) || 1);
      const minTimestamp = maxTimestamp - (validDays * 24 * 60 * 60 * 1000);

      const fetchMarketEvents = async (ctoken, marketName) => {
        let allResults = [];
        let fingerprint = null;
        let url = `${TRONGRID_EVENT_API}/${ctoken}/events?event_name=LiquidateBorrow&min_block_timestamp=${minTimestamp}&max_block_timestamp=${maxTimestamp}&order_by=block_timestamp,asc&limit=200`;
        do {
          let queryUrl = url;
          if (fingerprint) queryUrl += `&fingerprint=${fingerprint}`;
          const response = await axios.get(queryUrl, { headers: { "TRON-PRO-API-KEY": API_KEY } });
          const responseData = response.data.data;
          if (responseData && responseData.length > 0) {
            const processedData = await Promise.all(responseData.map(async (event) => {
                // CORRECTED: Pass the raw hex address to the conversion function.
                // The function itself will handle adding the '41' prefix for 20-byte addresses.
                const [borrower58, liquidator58, cTokenCollateral58] = await Promise.all([
                    hexToBase58Check(event.result.borrower),
                    hexToBase58Check(event.result.liquidator),
                    hexToBase58Check(event.result.cTokenCollateral)
                ]);
                return {
                    ...event,
                    marketName,
                    result: {
                        ...event.result,
                        borrower: borrower58,
                        liquidator: liquidator58,
                        cTokenCollateral: cTokenCollateral58,
                    },
                };
            }));
            allResults = allResults.concat(processedData);
          }
          fingerprint = response.data.meta?.fingerprint || null;
        } while (fingerprint);
        return allResults;
      };

      for (let i = 0; i < marketsToFetch.length; i++) {
        const market = marketsToFetch[i];
        const marketResults = await fetchMarketEvents(market.ctoken, market.name);
        setData(prevData => [...prevData, ...marketResults].sort((a, b) => b.block_timestamp - a.block_timestamp));
        setProgress({ current: i + 1, total: marketsToFetch.length });
        if(marketsToFetch.length > 1) await sleep(1000);
      }
    } catch (err) {
        console.error(err);
      if (err.response?.status === 429) {
        setError("API rate limit exceeded. Please wait and try again, or select fewer markets.");
      } else {
        setError(err.message || "An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const allSelected = Object.keys(markets).length > 0 && Object.values(selectedMarkets).every(Boolean);
  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="App">
        <h1>JustLend Liquidation History</h1>
        <div className="controls-container">
             <div className="market-selection-container">
                <h3>Select Markets</h3>
                <div className="select-all">
                    <input type="checkbox" id="select-all" onChange={handleSelectAll} checked={allSelected}/>
                    <label htmlFor="select-all">Select All</label>
                </div>
                <div className="market-grid">
                    {Object.keys(markets).map(marketName => (
                        <div className="market-item" key={marketName}>
                            <input type="checkbox" id={marketName} name={marketName} onChange={handleSelectionChange} checked={selectedMarkets[marketName] || false}/>
                            <label htmlFor={marketName}>{marketName}</label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="actions-container">
                <div className="time-parameter">
                    <label htmlFor="days-input">Days to Query:</label>
                    <input type="number" id="days-input" value={days} onChange={(e) => setDays(e.target.value)} min="1" disabled={loading}/>
                </div>
                <button onClick={handleFetchData} disabled={loading}>
                  {loading ? 'Fetching Data...' : 'Fetch Liquidation Events'}
                </button>
                {loading && (
                    <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
                        <span className="progress-text">{progress.current} / {progress.total}</span>
                    </div>
                )}
            </div>
        </div>
        
        {error && <p className="error-message">Error: {error}</p>}
        
        <div className="results-container">
          <h2>Results</h2>
          <p>Found {data.length} total events. Displaying in descending order of time.</p>
          <ResultsList data={data} />
        </div>
    </div>
  );
}

export default App;
