import React, { useEffect, useMemo, useState } from "react";
import { AptosClient } from "aptos";
import "./App.css";

const NODE_URL = "https://fullnode.testnet.aptoslabs.com";
const MODULE_ACCOUNT = "0xYOUR_ACCOUNT"; // Replace with your account from Move.toml
const MODULE_NAME = "ClassroomCrowdfund";

export default function App() {
  const client = useMemo(() => new AptosClient(NODE_URL), []);
  const [hasPetra, setHasPetra] = useState(false);
  const [account, setAccount] = useState(null);
  const [goal, setGoal] = useState(0);
  const [projectOwner, setProjectOwner] = useState("");
  const [amount, setAmount] = useState(0);
  const [project, setProject] = useState(null);
  const [toast, setToast] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const entryCreate = `${MODULE_ACCOUNT}::${MODULE_NAME}::create_project`;
  const entryContrib = `${MODULE_ACCOUNT}::${MODULE_NAME}::contribute`;
  const resourceType = `${MODULE_ACCOUNT}::${MODULE_NAME}::ClassroomProject`;

  useEffect(() => {
    setHasPetra(Boolean(window.aptos));
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function connectWallet() {
    try {
      if (!window.aptos) return showToast("Install Petra wallet");
      const acc = await window.aptos.connect();
      setAccount(acc);
      showToast("Wallet connected successfully!");
    } catch (error) {
      showToast(`Error connecting wallet: ${error.message || "Unknown error"}`);
    }
  }

  async function disconnectWallet() {
    try {
      await window.aptos.disconnect();
      setAccount(null);
      showToast("Wallet disconnected");
    } catch (error) {
      showToast(`Error disconnecting wallet: ${error.message || "Unknown error"}`);
    }
  }

  async function signAndSubmit(payload) {
    setIsLoading(true);
    try {
      const txn = await window.aptos.signAndSubmitTransaction(payload);
      await client.waitForTransaction(txn.hash);
      return txn.hash;
    } catch (error) {
      showToast(`Transaction failed: ${error.message || "Unknown error"}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function createProject() {
    if (!goal || goal <= 0) {
      return showToast("Please enter a valid funding goal");
    }
    
    try {
      const payload = {
        type: "entry_function_payload",
        function: entryCreate,
        type_arguments: [],
        arguments: [goal],
      };
      const hash = await signAndSubmit(payload);
      showToast(`Project created: ${hash.slice(0, 8)}...`);
      setProjectOwner(account.address);
      fetchProject(account.address);
    } catch (error) {
      console.error("Create project error:", error);
    }
  }

  async function contribute() {
    if (!projectOwner) {
      return showToast("Please enter a project owner address");
    }
    if (!amount || amount <= 0) {
      return showToast("Please enter a valid amount");
    }
    
    try {
      const payload = {
        type: "entry_function_payload",
        function: entryContrib,
        type_arguments: [],
        arguments: [projectOwner, amount],
      };
      const hash = await signAndSubmit(payload);
      showToast(`Contribution sent: ${hash.slice(0, 8)}...`);
      fetchProject(projectOwner);
    } catch (error) {
      console.error("Contribute error:", error);
    }
  }

  async function fetchProject(ownerAddr) {
    setIsLoading(true);
    try {
      const res = await client.getAccountResource(ownerAddr, resourceType);
      setProject({ goal: res.data.goal, total_funds: res.data.total_funds });
    } catch (error) {
      console.error("Fetch project error:", error);
      setProject(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>🎒 Classroom Crowdfund</h1>
        {!account ? (
          <button className="btn connect-btn" onClick={connectWallet} disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect Petra"}
          </button>
        ) : (
          <button className="btn disconnect-btn" onClick={disconnectWallet} disabled={isLoading}>
            {isLoading ? "Processing..." : `Disconnect (${account.address.slice(0, 6)}...)`}
          </button>
        )}
      </header>

      <main className="main-content">
        <section className="card">
          <h2>Create Project (Teacher)</h2>
          <div className="form-group">
            <label htmlFor="goal">Funding Goal (APT)</label>
            <input
              id="goal"
              type="number"
              placeholder="Enter funding goal"
              onChange={(e) => setGoal(Number(e.target.value))}
              min="0"
            />
          </div>
          <button 
            className="btn primary-btn" 
            onClick={createProject} 
            disabled={!account || isLoading}
          >
            {isLoading ? "Creating..." : "Create Project"}
          </button>
        </section>

        <section className="card">
          <h2>Contribute (Students/Parents)</h2>
          <div className="form-group">
            <label htmlFor="owner">Project Owner Address</label>
            <input
              id="owner"
              type="text"
              placeholder="Enter project owner address"
              value={projectOwner}
              onChange={(e) => setProjectOwner(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="amount">Contribution Amount (APT)</label>
            <input
              id="amount"
              type="number"
              placeholder="Enter amount to contribute"
              onChange={(e) => setAmount(Number(e.target.value))}
              min="0"
            />
          </div>
          <button 
            className="btn primary-btn" 
            onClick={contribute} 
            disabled={!account || isLoading}
          >
            {isLoading ? "Processing..." : "Contribute"}
          </button>
        </section>

        <section className="card status-card">
          <h2>Project Status</h2>
          {isLoading ? (
            <div className="loading">Loading project data...</div>
          ) : project ? (
            <div className="project-info">
              <div className="info-item">
                <span className="label">Goal:</span>
                <span className="value">{project.goal} APT</span>
              </div>
              <div className="info-item">
                <span className="label">Total Funds:</span>
                <span className="value">{project.total_funds} APT</span>
              </div>
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${Math.min(100, (project.total_funds / project.goal) * 100)}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {Math.round((project.total_funds / project.goal) * 100)}% funded
              </div>
            </div>
          ) : (
            <p className="no-project">No project found yet</p>
          )}
        </section>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

