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

    const firstDepositWei = 12345678;

    // Added for all tests
    var potGovernance;    

    async function getTransactionGasCost (receipt) {
	let tx = await web3.eth.getTransaction(receipt.tx);
	let gasPrice = new bigInt(tx.gasPrice);
	let gasUsed = new bigInt(receipt.receipt.cumulativeGasUsed);
	return gasPrice.times(gasUsed);
    };

    beforeEach("deploy contract and send some funds", async function () {

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
    
});


