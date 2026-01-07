/* global BigInt */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css'; // Re-use the main CSS for a consistent look

// --- Base58Check Conversion Logic ---
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const hexToBytes = (hex) => {
    if (hex.startsWith('0x')) hex = hex.substring(2);
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
    if (hex.startsWith('0x')) hex = hex.substring(2);

    let addrBytes = hexToBytes('41' + hex);
    const hash0 = await window.crypto.subtle.digest('SHA-256', addrBytes);
    const hash1 = await window.crypto.subtle.digest('SHA-256', hash0);
    const checksum = new Uint8Array(hash1).slice(0, 4);
    const addrWithCheck = new Uint8Array(addrBytes.length + 4);
    addrWithCheck.set(addrBytes);
    addrWithCheck.set(checksum, addrBytes.length);
    return base58Encode(addrWithCheck);
}
// --- End of Base58Check Conversion Logic ---


const ResultsList = ({ data }) => {
    if (data.length === 0) return <p>No events to display.</p>;

    const formatNumber = (numStr) => {
        if (!numStr) return '0';
        try { return BigInt(numStr).toLocaleString(); } catch (e) { return numStr; }
    };

    const shortenAddress = (address) => {
        if (typeof address !== 'string' || address.length < 10) return address;
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    const getResourceType = (type) => {
        if (type === '0') return 'Bandwidth';
        if (type === '1') return 'Energy';
        return 'Unknown';
    };

    return (
        <div className="results-list-container energy-results">
            {data.map((event, index) => (
                <div key={`${event.transaction_id}-${index}`} className="result-item">
                    <div className="result-col col-market-time">
                        <span className={`market-tag resource-${getResourceType(event.result.resourceType).toLowerCase()}`}>
                            {getResourceType(event.result.resourceType)}
                        </span>
                        <span className="timestamp">{new Date(event.block_timestamp).toLocaleString()}</span>
                    </div>
                    <div className="result-col col-parties">
                        <div title={event.result.liquidator}><strong>Liquidator:</strong> {shortenAddress(event.result.liquidator)}</div>
                        <div title={event.result.renter}><strong>Renter:</strong> {shortenAddress(event.result.renter)}</div>
                        <div title={event.result.receiver}><strong>Receiver:</strong> {shortenAddress(event.result.receiver)}</div>
                    </div>
                    <div className="result-col col-amounts">
                         <div><strong>Amount:</strong> {formatNumber(event.result.amount)}</div>
                         <div><strong>Fee:</strong> {formatNumber(event.result.liquidateFee)}</div>
                    </div>
                    <div className="result-col col-tx">
                        <a href={`https://tronscan.org/#/transaction/${event.transaction_id}`} target="_blank" rel="noopener noreferrer" className="tx-link" title={event.transaction_id}>
                            {shortenAddress(event.transaction_id)}
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
};

function EnergyLiquidations() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchEnergyData = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    const API_KEY = "";
    const API_URL = "https://api.trongrid.io/v1/contracts/TU2MJ5Veik1LRAgjeSzEdvmDYx7mefJZvd/events?event_name=Liquidate&order_by=block_timestamp,desc&limit=50";
    let queryUrl = API_URL;
    if (fingerprint) {
        queryUrl += `&fingerprint=${fingerprint}`;
    }
      
    try {
      const response = await axios.get(queryUrl, {
          headers: {
              "TRON-PRO-API-KEY": API_KEY
          }
      });
      const responseData = response.data.data;
      const newFingerprint = response.data.meta?.fingerprint;

      if (responseData && responseData.length > 0) {
        const processedData = await Promise.all(responseData.map(async (event) => {
            const [liquidator58, renter58, receiver58] = await Promise.all([
                hexToBase58Check(event.result.liquidator),
                hexToBase58Check(event.result.renter),
                hexToBase58Check(event.result.receiver),
            ]);
            return {
                ...event,
                result: {
                    ...event.result,
                    liquidator: liquidator58,
                    renter: renter58,
                    receiver: receiver58,
                },
            };
        }));
        setData(prevData => [...prevData, ...processedData]);
      }

      if (newFingerprint) {
        setFingerprint(newFingerprint);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "An unknown error occurred while fetching energy liquidations.");
    } finally {
      setLoading(false);
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }, [loading, hasMore, fingerprint, isInitialLoad]);

  // Initial data fetch
  useEffect(() => {
    fetchEnergyData();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
        if (window.innerHeight + document.documentElement.scrollTop < document.documentElement.offsetHeight - 200 || loading) {
            return;
        }
        fetchEnergyData();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, fetchEnergyData]);


  return (
    <div className="energy-liquidations-container">
      {isInitialLoad && loading && <p>Loading latest energy liquidations...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      <div className="results-container">
        <h2>Results</h2>
        <p>Found {data.length} total events. Displaying latest first.</p>
        <ResultsList data={data} />
        {loading && !isInitialLoad && <p className="loading-more">Loading more...</p>}
        {!loading && !hasMore && data.length > 0 && <p className="loading-more">All events loaded.</p>}
      </div>
    </div>
  );
}

export default EnergyLiquidations;
