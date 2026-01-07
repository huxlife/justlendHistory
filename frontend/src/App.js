import React, { useState } from 'react';
import JustLendLiquidations from './JustLendLiquidations';
import EnergyLiquidations from './EnergyLiquidations';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('justlend');

  return (
    <div className="App">
      <h1>Tron Liquidation History</h1>
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'justlend' ? 'active' : ''}`}
          onClick={() => setActiveTab('justlend')}
        >
          JustLend Liquidations
        </button>
        <button 
          className={`tab-button ${activeTab === 'energy' ? 'active' : ''}`}
          onClick={() => setActiveTab('energy')}
        >
          Energy Liquidations
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'justlend' && <JustLendLiquidations />}
        {activeTab === 'energy' && <EnergyLiquidations />}
      </div>
    </div>
  );
}

export default App;
