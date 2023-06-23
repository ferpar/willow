import { useEffect, useState } from "react";
import { ethers } from "ethers";

// Components
import Navigation from "./components/Navigation";
import Search from "./components/Search";
import Home from "./components/Home";

// ABIs
import RealEstate from "./abis/RealEstate.json";
import Escrow from "./abis/Escrow.json";

// Config
import config from "./config.json";

function App() {
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [homes, setHomes] = useState([]);
  const [highlightedHome, setHighlightedHome] = useState(null);
  const [isPopOpen, setIsPopOpen] = useState(false);

  const loadBlockchainData = async () => {
    const newProvider = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(newProvider);

    const network = await newProvider.getNetwork();

    const realEstate = new ethers.Contract(
      config[network.chainId].realEstate.address,
      RealEstate,
      newProvider
    );
    const totalSupply = await realEstate.totalSupply();
    const newHomes = [];
    for (let i = 1; i <= totalSupply; i++) {
      const uri = await realEstate.tokenURI(i);
      const response = await fetch(uri);
      const metadata = await response.json();
      newHomes.push(metadata);
    }

    setHomes(newHomes);

    const newEscrow = new ethers.Contract(
      config[network.chainId].escrow.address,
      Escrow,
      newProvider
    );
    setEscrow(newEscrow);
  };

  const setAccountChangeListener = async () => {
    window.ethereum.on("accountsChanged", async () => {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const newAccount = ethers.utils.getAddress(accounts[0]);
      setAccount(newAccount);
    });
  };

  const toggleProperty = async (selectedHome) => {
    setHighlightedHome(selectedHome)
    isPopOpen ? setIsPopOpen(false) : setIsPopOpen(true);
  }


  useEffect(() => {
    loadBlockchainData();
    setAccountChangeListener();
  }, []);

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Search />
      <div className="cards__section">
        <h3>Homes For you</h3>
        <hr />
        <div className="cards">
          {homes.map((home, index) => {
            return (
            <div 
              key={home?.id} 
              className="card"
              onClick={() => toggleProperty(home)}
            >
              <div className="card__image">
                <img src={home?.image} alt="Home" />
              </div>
              <div className="card__info">
                <h4>{home.attributes[0].value} ETH</h4>
                <p>
                  <strong>{home.attributes[2].value}</strong> bds|
                  <strong>{home.attributes[3].value}</strong> ba|
                  <strong>{home.attributes[4].value}</strong> sqft
                </p>
                <p>{home.address}</p>
              </div>
            </div>
            )
          })}
        </div>
      </div>
      {isPopOpen && <Home home={highlightedHome} provider={provider} account={account} escrow={escrow} toggleProp={toggleProperty}/>}
    </div>
  );
}

export default App;
