const fs = require('fs');
const BIP39 = require('bip39');
var HDKey = require('ethereumjs-wallet/hdkey');
const PotGovernance = artifacts.require("PotGovernance");


function mnemonicToAddress (mnemonic, index) {

    if (!BIP39.validateMnemonic(mnemonic)) {
	throw("Invalid mnemonic: " + mnemonic);
    }

    const seed = BIP39.mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);

    var wallet = hdKey.derivePath("m/44'/60'/0'/0/" + index.toString(10)).getWallet();
    var addr = wallet.getAddress();
    return "0x" + addr.toString("hex");
}


module.exports = (deployer, network, accounts) => {

    const ownerNames = ['d0d', 'jrk', 'bloctite', 'thedarkness'];
    var ownerAddrs = [];

    if (accounts.length >= 5) {
	ownerAddrs = [accounts[1],
		      accounts[2], 
    		      accounts[3],
    		      accounts[4]];
    } else {

	// Initialise mnemonic wit development 
	var mnemonic = "similar thrive hungry curious parrot health ";
	mnemonic += "sing deliver rack tape mimic sing";

	// But if network is public, read it from disk (not to have them in repo)
	if (network == "rinkeby") {
	    mnemonic = fs.readFileSync(
		"/ntfs/projects/ethereum-pot-governance/mnemonicRinkeby.txt").toString().trim();
	} else if (network == "mainnet")  {
	    mnemonic = fs.readFileSync(
		"/ntfs/projects/ethereum-pot-governance/mnemonicMain.txt").toString().trim();
	}

	for (var i = 1; i < 5; i ++) {
	    ownerAddrs.push(mnemonicToAddress(mnemonic, i));
	}
    }
    
    console.log("Pot governour accounts: " + ownerAddrs);
    if (ownerAddrs.length != 4) {
    	throw("Not enough accounts readily available. Bailing.");
    }
    
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
