import { ethers } from "ethers";
import { useEffect, useState, useCallback } from "react";

import close from "../assets/close.svg";

const Home = ({ home, provider, account, escrow, toggleProp }) => {
  const [hasBought, setHasBought] = useState(false);
  const [hasLended, setHasLended] = useState(false);
  const [hasInspected, setHasInspected] = useState(false);
  const [hasSold, setHasSold] = useState(false);

  const [buyer, setBuyer] = useState(null);
  const [seller, setSeller] = useState(null);
  const [inspector, setInspector] = useState(null);
  const [lender, setLender] = useState(null);

  const [owner, setOwner] = useState(null);

  const fetchDetails = useCallback(async () => {
    // -- Buyer
    const currentBuyer = await escrow.buyer(home.id);
    setBuyer(currentBuyer);

    const hasBoughtQuery = await escrow.approval(home.id, currentBuyer);
    setHasBought(hasBoughtQuery);

    // -- Seller
    const currentSeller = await escrow.seller();
    setSeller(currentSeller);

    const hasSoldQuery = await escrow.approval(home.id, currentSeller);
    setHasSold(hasSoldQuery);

    // -- Inspector
    const currentInspector = await escrow.inspector();
    setInspector(currentInspector);

    const hasInspectedQuery = await escrow.inspectionPassed(home.id);
    setHasInspected(hasInspectedQuery);

    // -- Lender
    const currentLender = await escrow.lender();
    setLender(currentLender);

    const hasLendedQuery = await escrow.approval(home.id, currentLender);
    setHasLended(hasLendedQuery);
  }, [escrow, home.id]);

  const fetchOwner = useCallback(async () => {
    if (await escrow.isListed(home.id)) return;
    const owner = await escrow.buyer(home.id);
    setOwner(owner);
  }, [escrow, home.id]);

  const buyHandler = async () => {
    const escrowAmount = await escrow.escrowAmount(home.id);
    const signer = await provider.getSigner();

    // Buyer deposit earnest
    const depositTransaction = await escrow
      .connect(signer)
      .depositEarnest(home.id, { value: escrowAmount });
    await depositTransaction.wait();

    // Buyer approves ...
    const approvalTransaction = await escrow
      .connect(signer)
      .approveSale(home.id);
    await approvalTransaction.wait();

    setHasBought(true);
  };
  const inspectHandler = async () => {
    const signer = await provider.getSigner();

    // Inspector updates status
    const statusUpdateTX = await escrow
      .connect(signer)
      .updateInspectionStatus(home.id, true);
    await statusUpdateTX.wait();

    setHasInspected(true);
  };
  const lendHandler = async () => {
    const signer = await provider.getSigner();

    // Lender approves ...
    const approvalTransaction = await escrow.connect(signer).approveSale(home.id);
    await approvalTransaction.wait();

    // Lender sends funds to contract ...

    const lendAmount = (await escrow.purchasePrice(home.id) - await escrow.escrowAmount(home.id));
    await signer.sendTransaction({ to: escrow.address, value: lendAmount.toString(), gasLimit: 60000})

    setHasLended(true);
  };
  const sellHandler = async () => {
    const signer = await provider.getSigner();

    // Seller approves ...
    const approvalTransaction = await escrow.connect(signer).approveSale(home.id);
    await approvalTransaction.wait();
    
    // Seller finalizes sale ...
    const finalizationTransaction = await escrow.connect(signer).finalizeSale(home.id);
    await finalizationTransaction.wait();

    setHasSold(true);
  };

  useEffect(() => {
    fetchDetails();
    fetchOwner();
  }, [fetchDetails, fetchOwner, hasSold]);
  return (
    <div className="home">
      <div className="home__details">
        <div className="home__image">
          <img src={home?.image} alt="Home" />
        </div>

        <div className="home__overview">
          <h1>{home.name}</h1>
          <p>
            <strong>{home.attributes[2].value}</strong> bds |
            <strong>{home.attributes[3].value}</strong> ba |
            <strong>{home.attributes[4].value}</strong> sqft
          </p>
          <p>{home.address}</p>
          <h2>{home.attributes[0].value} ETH</h2>

          {owner ? (
            <div className="home__owned">
              Owned by{" "}
              {owner.slice(0, 6) +
                "..." +
                owner.slice(owner.length - 4, owner.length)}
            </div>
          ) : (
            <div>
              {account === inspector ? (
                <button
                  className="home__buy"
                  onClick={inspectHandler}
                  disabled={hasInspected}
                >
                  Approve Inspection
                </button>
              ) : account === lender ? (
                <button
                  className="home__buy"
                  onClick={lendHandler}
                  disabled={hasLended}
                >
                  Approve & Lend
                </button>
              ) : account === seller ? (
                <button
                  className="home__buy"
                  onClick={sellHandler}
                  disabled={hasSold}
                >
                  Approve & Sell
                </button>
              ) : (
                <button
                  className="home__buy"
                  onClick={buyHandler}
                  disabled={hasBought}
                >
                  Buy
                </button>
              )}
              <button className="home__contact">Contact Agent</button>
            </div>
          )}

          <hr />

          <h2>Overview</h2>
          <p>{home.description}</p>
          <hr />

          <h2>Facts and Features</h2>
          <ul>
            {home.attributes.map((attribute, index) => (
              <li key={index}>
                <strong>{attribute.trait_type}</strong> : {attribute.value}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={toggleProp} className="home__close">
          <img src={close} alt="Close" />
        </button>
      </div>
    </div>
  );
};

export default Home;
