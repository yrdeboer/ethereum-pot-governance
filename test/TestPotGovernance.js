var BigNumber = require("bignumber.js");
const truffleAssert = require('truffle-assertions');
var potGovernanceArtefact = artifacts.require("contracts/PotGovernance.sol");


contract("Test contract deploys properly", function(accounts) {
    
    const deployerAccount = accounts[0];
    const ownerNames = ['d0d', 'jrk', 'bloctite', 'darkness'];
    const ownerAddrs = [accounts[1],
			accounts[2], 
			accounts[3],
			accounts[4]];
    const someUserAccount = accounts[5];
    const firstDepositWei = 10000000;

    const prop1OwnerKey = 3;
    const prop1RecipientAccount = accounts[6];
    const prop1ValueWei = 2000000;
    const prop1Description = "Reimbursement user 8940 (user@mail.com)";
    
    // Added for all tests
    var potGovernance;    

    async function getTransactionGasCost (receipt) {
	let tx = await web3.eth.getTransaction(receipt.tx);
	let gasPrice = new bigInt(tx.gasPrice);
	let gasUsed = new bigInt(receipt.receipt.cumulativeGasUsed);
	return gasPrice.times(gasUsed);
    };

    beforeEach("deploy, add funds, add proposal", async function () {

	// Get contract
	potGovernance = await potGovernanceArtefact.new(
	    ownerNames[0],
	    ownerAddrs[0],
	    ownerNames[1],
	    ownerAddrs[1],
	    ownerNames[2],
	    ownerAddrs[2],
	    ownerNames[3],
	    ownerAddrs[3],
	    {"from": deployerAccount});

	await potGovernance.sendTransaction(
	    {"from": someUserAccount,
	     "value": firstDepositWei});

	let balAfter = new BigNumber(await web3.eth.getBalance(potGovernance.address));
	assert(balAfter.isEqualTo(BigNumber(firstDepositWei)));

	let receipt = await potGovernance.addProposal(
	    prop1RecipientAccount,
	    prop1ValueWei,
	    prop1Description,
	    {"from": ownerAddrs[prop1OwnerKey]});
	
	assert.equal(receipt.logs[0].event, "ProposalAdded");

    });

    it("should return proper owners by key", async function () {

	for (var i = 0; i < ownerNames.length; i ++) {
	    var nameAddr = await potGovernance.getOwnerByKey.call(
		i,
		{"from": someUserAccount});

	    assert.equal(nameAddr[0], ownerNames[i]);
	    assert.equal(nameAddr[1], ownerAddrs[i]);
	}
    });

    it("should revert on wrong owner key", async function () {

	await truffleAssert.reverts(
	    potGovernance.getOwnerByKey.call(
		5,
		{"from": someUserAccount})
	);
    });    

    it("should get caller owner key for owners calling", async function () {

	for (var i = 0; i < ownerNames.length; i ++) {
	    var ownerKey = await potGovernance.callerIsOwnerGetKeyOrRevert.call(
		{"from": ownerAddrs[i]});

	    assert.equal(ownerKey, i);
	}
    });

    it("should revert if caller is no owner and wants owner key", async function () {

	await truffleAssert.reverts(
	    potGovernance.callerIsOwnerGetKeyOrRevert.call(
		{"from": someUserAccount})
	);

	await truffleAssert.reverts(
	    potGovernance.callerIsOwnerGetKeyOrRevert.call(
		{"from": deployerAccount})
	);	
    });


    it("accepts further payment from other user", async function () {

	var depositWei = 12345;
	var balBefore = new BigNumber(await web3.eth.getBalance(potGovernance.address));

	await potGovernance.sendTransaction(
	    {"from": deployerAccount,
	     "value": depositWei});

	let balAfter = new BigNumber(await web3.eth.getBalance(potGovernance.address));
	assert(balAfter.minus(balBefore).isEqualTo(BigNumber(depositWei)));
    });


    it ("should have proper reserved balance", async function () {

	var balReserved = new BigNumber(
	    await potGovernance.getBalanceReservedWei.call(
		{"from": someUserAccount}));

	assert(balReserved.isEqualTo(BigNumber(prop1ValueWei)));
    });	
    
    it("should return new proposal", async function () {

	var p = await potGovernance.getProposal.call(0, {"from": someUserAccount});
	assert.equal(p[0], prop1OwnerKey);
	assert.equal(p[1], prop1RecipientAccount);
	assert.equal(p[2], prop1ValueWei);
	assert.equal(p[3], prop1Description);

	for (var i =  0; i < ownerNames.length; i ++) {
	    assert(p[4][i].isZero());
	}
	assert(p[5].isZero());
    });

    it("should not cancel proposal from non-owner", async function () {

	await truffleAssert.reverts(
	    potGovernance.cancelProposal(0, {"from": someUserAccount})
	);
    });

    it("should properly cancel proposal from some owner", async function () {

	await potGovernance.cancelProposal(0, {"from": ownerAddrs[1]});
	var p = await potGovernance.getProposal.call(0, {"from": someUserAccount});
	assert(BigNumber(p[5]).isEqualTo(BigNumber(3)));
    });    
    
    it("should properly accept (votes and) proposal", async function () {

	var balContractBefore = await web3.eth.getBalance(potGovernance.address);
	
	for (var i = 0; i < 3; i ++ ) {

	    // Vote to accept for owner i
	    await potGovernance.castVote(0, 1, {"from": ownerAddrs[i]});

	    // Get proposal
	    var p = await potGovernance.getProposal.call(0, {"from": someUserAccount});

	    // Check just cast vote
	    assert(BigNumber(p[4][i]).isEqualTo(BigNumber(1)));

	    // Check status and reserved funds
	    var reserved = await potGovernance.getBalanceReservedWei({"from": someUserAccount});
	    var balance = await web3.eth.getBalance(potGovernance.address);
	    if (i < 2) {
		assert(BigNumber(p[5]).isZero());
		assert(BigNumber(reserved).isEqualTo(BigNumber(prop1ValueWei)));
		assert(BigNumber(balance).minus(balContractBefore).isZero());
	    } else {
		assert(BigNumber(p[5]).isEqualTo(BigNumber(1)));
		assert(reserved.isZero());
		assert(BigNumber(balContractBefore).minus(balance).minus(prop1ValueWei).isZero());
	    }
	}
    });    
    
    it("should properly reject (votes and) proposal", async function () {

	for (var i = 0; i < 3; i ++ ) {

	    // Vote to accept for owner i
	    await potGovernance.castVote(0, 2, {"from": ownerAddrs[i]});

	    // Get proposal
	    var p = await potGovernance.getProposal.call(0, {"from": someUserAccount});

	    // Check just cast vote
	    assert(BigNumber(p[4][i]).isEqualTo(BigNumber(2)));

	    // Check status and reserved funds
	    var reserved = await potGovernance.getBalanceReservedWei({"from": someUserAccount});
	    if (i < 2) {
		assert(BigNumber(p[5]).isZero());
		assert(BigNumber(reserved).isEqualTo(BigNumber(prop1ValueWei)));
	    } else {
		assert(BigNumber(p[5]).isEqualTo(BigNumber(2)));
		assert(reserved.isZero());
	    }
	}
    });    
    
    it("should properly reach tie", async function () {

	for (var i = 0; i < 4; i ++ ) {

	    var vote = i % 2 + 1;
	    
	    // Vote to accept for owner i
	    await potGovernance.castVote(0, vote, {"from": ownerAddrs[i]});

	    // Get proposal
	    var p = await potGovernance.getProposal.call(0, {"from": someUserAccount});

	    // Check just cast vote
	    assert(BigNumber(p[4][i]).isEqualTo(BigNumber(vote)));

	    // Check status and reserved funds
	    var reserved = await potGovernance.getBalanceReservedWei({"from": someUserAccount});
	    if (i < 3) {
		assert(BigNumber(p[5]).isZero());
		assert(BigNumber(reserved).isEqualTo(BigNumber(prop1ValueWei)));
	    } else {
		assert(BigNumber(p[5]).isEqualTo(BigNumber(3)));
		assert(reserved.isZero());
	    }
	}
    });    
    
});


