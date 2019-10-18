const PotGovernance = artifacts.require("PotGovernance");


module.exports = (deployer, network, accounts) => {

    const ownerNames = ['d0d', 'jrk', 'bloctite', 'darkness'];
    const ownerAddrs = [accounts[1],
			accounts[2], 
			accounts[3],
			accounts[4]];

    deployer.deploy(
	PotGovernance,
	ownerNames[0],
	ownerAddrs[0],
	ownerNames[1],
	ownerAddrs[1],
	ownerNames[2],
	ownerAddrs[2],
	ownerNames[3],
	ownerAddrs[3]);
}
