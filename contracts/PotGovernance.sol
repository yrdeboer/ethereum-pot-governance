pragma solidity ^0.5.12;

contract PotGovernance {

  // An owner is allowed to govern the pot.
  struct PotOwner {
    string name;
    address addr;
  }
  
  // The owners are set at contract construction.
  PotOwner[4] public potOwners;

  // A proposal to transfer ether from the pot to some address.
  struct Proposal {
    uint8 ownerKeyProposer;
    address payable recipientAddr;
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
  
  event ProposalAdded(uint32 _proposalKey);
  event VoteCast(uint32 _proposalKey);
  event ProposalApproved(uint32 _proposalKey);
  event ProposalRejected(uint32 _proposalKey);
  event ProposalCancelled(uint32 _proposalKey);

  ///////////////////////
  // F u n c t i o n s //
  ///////////////////////
  
  constructor (string memory _name1, address _addr1,
	       string memory _name2, address _addr2,
	       string memory _name3, address _addr3,
	       string memory _name4, address _addr4) public {

    potOwners[0].name = _name1;
    potOwners[0].addr = _addr1;
    potOwners[1].name = _name2;
    potOwners[1].addr = _addr2;
    potOwners[2].name = _name3;
    potOwners[2].addr = _addr3;
    potOwners[3].name = _name4;
    potOwners[3].addr = _addr4;
  }

  
  // This is the function that receives pot deposits
  function () external payable {}


  function getBalanceReservedWei () external view returns (uint256) {
    return balanceReservedWei;
  }


  function getProposalCount () external view returns (uint32) {
    return proposalCount;
  }
  
  
  function getOwnerByKey(uint8 _ownerKey) external view returns (string memory, address) {
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

  
  function addProposal(address payable _recipientAddr,
		       uint256 _valueWei,
		       string calldata _description) external {
      
    // Require caller is pot owner
    uint8 ownerKey = callerIsOwnerGetKeyOrRevert();
      
    // Require available balance suffices
    require(_valueWei >= 0);
    uint256 availableWei = address(this).balance - balanceReservedWei;
    require(availableWei >= _valueWei);

    // Require absece of overflows
    require(availableWei - _valueWei <= availableWei);
    require(balanceReservedWei + _valueWei >= balanceReservedWei);
    
    // Update reserved balance
    balanceReservedWei += _valueWei;
      
    // Create proposal
    Proposal storage proposal = proposals[proposalCount];
    proposal.ownerKeyProposer = ownerKey;
    proposal.recipientAddr = _recipientAddr;
    proposal.valueWei = _valueWei;
    proposal.description = _description;
    
    emit ProposalAdded(proposalCount);

    proposalCount ++;
  }

        
  function getProposal(uint32 _proposalKey)
    external view returns (uint8,               // owner key
  			   address,             // recipient address
  			   uint256,             // value WEI
  			   string memory,       // description
			   uint8[4] memory,     // owner vote status
			   uint8) {             // proposal status

    // Require valid proposal
    require(_proposalKey >= 0 && _proposalKey < proposalCount);

    Proposal memory p = proposals[_proposalKey];

    return (p.ownerKeyProposer,
	    p.recipientAddr,
	    p.valueWei,
	    p.description,
	    p.ownerVoteStatus,
	    p.status);
  }
  
  function cancelProposal(uint32 _proposalKey) external {

    // Require caller is a pot owner
    callerIsOwnerGetKeyOrRevert();
      
    // Require valid proposal
    require(_proposalKey >= 0 && _proposalKey < proposalCount);

    // Require proposal accepting votes
    require(proposals[_proposalKey].status == 0);

    // Update proposal and release reserved funds
    proposals[_proposalKey].status = 3;
    balanceReservedWei -= proposals[_proposalKey].valueWei;

    emit ProposalCancelled(_proposalKey);
  }
  
  function castVote(uint32 _proposalKey, uint8 _vote) external {

    // Require caller is a pot owner
    uint8 ownerKey = callerIsOwnerGetKeyOrRevert();
      
    // Require valid proposal
    require(_proposalKey >= 0 && _proposalKey < proposalCount);
      
    // Require proposal accepting votes
    Proposal storage proposal = proposals[_proposalKey];
    require(proposal.status == 0);
      
    // Require caller has not voted yet
    require(proposal.ownerVoteStatus[ownerKey] == 0);
      
    // Require vote to be valid
    require(_vote == 1 || _vote == 2);
      
    // Update proposal
    proposal.ownerVoteStatus[ownerKey] = _vote;

    emit VoteCast(_proposalKey);
    
    // Get updated score on proposal
    uint8 proCount;
    uint8 conCount;
    for (uint8 i = 0; i < 4; i ++) {
      uint8 vote = proposal.ownerVoteStatus[i];
      if (vote == 1) {
	proCount += 1;
      } else if (vote == 2) {
	conCount += 1;
      }
    }

    // Update proposal status
    if (proCount >= 3) {

      proposal.status = 1;
      balanceReservedWei -= proposal.valueWei;
      proposal.recipientAddr.transfer(proposal.valueWei);
      emit ProposalApproved(_proposalKey);
      
    } else if (conCount >= 3) {

      proposal.status = 2;
      balanceReservedWei -= proposal.valueWei;
      emit ProposalRejected(_proposalKey);

    } else if (proCount + conCount == 4) {

      proposal.status = 3;
      balanceReservedWei -= proposal.valueWei;
      emit ProposalCancelled(_proposalKey);
    }
  }
}
