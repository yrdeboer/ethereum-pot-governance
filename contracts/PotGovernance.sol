pragma solidity ^0.5.12;

contract PotGovernance {

  struct PotOwner {
    string name;
    address addr;
  }
  
  PotOwner[4] public potOwners;
  
  struct Proposal {
    uint8 ownerKeyProposer;
    address recipientAddr;
    uint256 valueWei;
    string description;
    
    // Vote status for each ower (by owner key as index):
    // 0: Not voted, 1: Approved, 2: Rejected
    uint8[4] ownerVoteStatus;
    
    // 0: Accepting votes, 1: Approved and closed, 2: Rejected and closed, 3: Cancelled
    uint8 status;
  }
  
  mapping (uint32 => Proposal) proposals;
  uint32 proposalCount;

  // Value in WEI reserved by pending proposals
  uint256 balanceReservedWei;

  ////////////
  // Events //
  ////////////
  
  event ProposalAdded(uint32 _proposalKey, uint256 _description);

  ///////////////////////
  // F u n c t i o n s //
  ///////////////////////
  
  constructor (uint64[4] memory _ownerNames, address[4] memory _ownerAddresses) public {
    for (uint8 i = 0; i < 4; i ++)
      {
        potOwners[i].name = _ownerNames[i];
        potOwners[i].addr = _ownerAddresses[i];
      }
  }

  function () external payable {}

  function getOwnerByKey(uint8 _ownerKey) external view returns (uint64, address) {
    require(_ownerKey >= 0 && _ownerKey <4);
    return (potOwners[_ownerKey].name, potOwners[_ownerKey].addr);
  }
  
  function callerIsOwnerGetKeyOrRevert() public view returns (uint8) {
    for (uint8 i = 0; i < 4; i ++)
      {
        if (msg.sender == potOwners[i].addr) {
	  return i;
        }
      }
    revert();
  }

  
  function addProposal(address _recipientAddr, uint256 _valueWei, uint256 _description) external {
      
    // Require caller is pot owner
    uint8 ownerKey = callerIsOwnerGetKeyOrRevert();
      
    // Require available balance suffices and not overflows
    require(_valueWei >= 0);
    uint256 availableWei = address(this).balance - balanceReservedWei;
    require(availableWei >= _valueWei);
    require(availableWei - _valueWei <= availableWei);
      
    // Update reserved balance
    balanceReservedWei += _valueWei;
      
    // Create proposal
    proposals[proposalCount].ownerKeyProposer = ownerKey;
    proposals[proposalCount].recipientAddr = _recipientAddr;
    proposals[proposalCount].valueWei = _valueWei;
    proposals[proposalCount].description = _description;
    proposalCount ++;      

    emit ProposalAdded(proposalCount, _description);
  }

        
  /* function getProposal(uint32 _proposalKey)  */
  /*   external view returns ( */
  /* 			   uint8,        // owner key */
  /* 			   address,      // recipient address */
  /* 			   uint256,      // value WEI */
  /* 			   uint256,      // description utf-8 encoded */
			   

  /*   // Require valid proposal */
  /*   require(_proposalKey > 0 && _proposalKey <= proposalCount); */

      
  
    function closeProposal(uint32 _proposalKey) external {

      // Require caller is a pot owner
      callerIsOwnerGetKeyOrRevert();
      
      // Require valid proposal
      require(_proposalKey > 0 && _proposalKey <= proposalCount);

      // Require proposal accepting votes
      require(proposals[_proposalKey].status == 0);

      // Update proposal and release reserved funds
      proposals[_proposalKey].status = 3;
      balanceReservedWei -= proposals[_proposalKey].valueWei;
    }
  
    function castVote(uint32 _proposalKey, uint8 _vote) external {

      // Require caller is a pot owner
      uint8 ownerKey = callerIsOwnerGetKeyOrRevert();
      
      // Require valid proposal
      require(_proposalKey > 0 && _proposalKey <= proposalCount);
      
      // Require proposal accepting votes
      require(proposals[_proposalKey].status == 0);
      
      // Require caller has not voted yet
      require(proposals[_proposalKey].ownerVoteStatus[ownerKey] == 0);
      
      // Require vote to be valid
      require(_vote == 1 || _vote == 2);
      
      // Update proposal
      proposals[_proposalKey].ownerVoteStatus[ownerKey] = _vote;
      
      // Update proposal status
      for (uint32 i = 0; i < proposalCount; i ++) {
          
      }
    }

  }

  // [10, 20, 30, 40], ["0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c", "0x14723A09ACff6D2A60DcdF7aA4AFf308FDDC160C", "0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB", "0x583031D1113aD414F02576BD6afaBfb302140225"]
