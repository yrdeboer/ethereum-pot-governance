//import jquery and bootstrap
import 'jquery';
import 'bootstrap-loader';
// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

import { default as Web3} from 'web3';

import { default as contract } from 'truffle-contract';

import { default as BigNumber } from "bignumber.js";

import potGovernanceArtefact from '../../build/contracts/PotGovernance.json';
var potGovernanceContract = contract(potGovernanceArtefact);

import {
    statusToString,
    voteToString,
    createRowNode
} from "../javascripts/utils.js";

var potGovernance = null;
var contractBalanceWei = null;
var contractReservedWei = null;
var ownersDict = {};
var proposalsDict = {};

var allAccounts = null;
var userAccount = null;


window.App = {

    start: async function() {

	try {
	    potGovernanceContract.setProvider(window.web3.currentProvider);
	    potGovernance = await potGovernanceContract.deployed();
	    console.log("PotGovernance contract at " + potGovernance.address);

	} catch (error) {
	    alert("Could not find contract, are you connected to the right network?");
	}

	try {
	    var accounts = await window.web3.eth.getAccounts();
	} catch (error) {
	    console.error(error);
	    var msg = "There was an error fetching your accounts, please ";
	    msg += "connect a wallet (MetaMask, Mist, etc). ";
	    msg += "Also make sure to add this domain: \"" + window.location.hostname;
	    msg += "\" to your wallet's allowed connections.";
	    alert(msg);
	    return;
	}

	allAccounts = accounts;
	userAccount = accounts[0];
	console.log("Connected with account " + userAccount);

	await window.App.subscribeToEvents();
	await window.App.initIndex();
    },
    
    initIndex: async function () {

	await window.App.displayNetworkName();
	await window.App.setContractBalances();
	await window.App.setOwnerDict();
	await window.App.setProposalsDict();
	window.App.displayContractBalances();
	window.App.displayOwners();
	window.App.displayProposals();

    },

    displayNetworkName: async function () {

	var netId = await window.web3.eth.net.getId();

	var networkName = "Unknown network";
	if (netId == 1) {
	    networkName = "Connected to: Main net";
	} else if (netId == 4) {
	    networkName = "Connected to: Rinkeby test net";
	} else {
	    networkName = "Connected to network with id: " + netId.toString(10);
	}
	
	var node = document.getElementById("networkName");	
	node.innerHTML = networkName;
    },

    
    setContractBalances: async function () {

	contractBalanceWei = new BigNumber(await web3.eth.getBalance(potGovernance.address));
	contractReservedWei = new BigNumber(
	    await potGovernance.getBalanceReservedWei({"from": userAccount}));
    },

    setOwnerDict: async function () {
	for (var i = 0; i < 4; i ++) {

	    var nameAddr = await potGovernance.getOwnerByKey.call(
		i,
		{"from": userAccount});

	    ownersDict[i] = {"name": nameAddr[0], "address": nameAddr[1]};
	}
    },

    setProposalsDict: async function () {

	var propCnt = await potGovernance.getProposalCount.call({"from": userAccount});
	for (var pKey = 0; pKey < propCnt; pKey ++) {

	    var p = await potGovernance.getProposal(pKey, {"from": userAccount});

	    proposalsDict[pKey] = {
		"ownerKey": parseInt(p[0].toNumber()),
		"recipientAddress": p[1],
		"valueWei": new BigNumber(p[2]),
		"description": p[3],
		"ownerVotes": p[4],
		"status": parseInt(p[5].toNumber())
	    };

	}
    },
    
    displayContractBalances: function () {

	var tot = parseFloat(contractBalanceWei.dividedBy(1e18).toFixed(8));
	var res = parseFloat(contractReservedWei.dividedBy(1e18).toFixed(8));
	
	var totNode = document.getElementById("totalContractBalanceETH");
	totNode.innerHTML = tot.toString();
	var resNode = document.getElementById("reservedContractBalanceETH");
	resNode.innerHTML = res.toString();
    },

    displayOwners: function () {
	
	var tableNode = document.getElementById("ownersTableBody");
	tableNode.innerHTML = "";

	for (var ownerKey in ownersDict) {
	    
	    // Add row
	    var tr = document.createElement("tr");

	    // Add owner name
	    var tdName = document.createElement("td");
	    tdName.innerHTML = ownersDict[ownerKey]["name"];
	    tr.appendChild(tdName);

	    // Add owner addr
	    var tdAddr = document.createElement("td");
	    tdAddr.innerHTML = ownersDict[ownerKey]["address"];
	    tr.appendChild(tdAddr);

	    // Add "you" or "not you"
	    var tdYou = document.createElement("td");
	    var txt = "Not you";

	    if (ownersDict[ownerKey]["address"].toLowerCase() == userAccount.toLowerCase()) {
		txt = "You";
	    }
	    tdYou.innerHTML = txt;
	    tr.appendChild(tdYou);

	    // Add row to table body
	    tableNode.appendChild(tr);
	}
    },

    displayProposals: function () {

	var tableNode = document.getElementById("proposalsTableBody");
	tableNode.innerHTML = "";
	
	var pCnt = Object.keys(proposalsDict).length;
	for (var pKey = 0; pKey < pCnt; pKey ++) {

	    // Add row
	    var tr = document.createElement("tr");
	    var trId = "proposalRow" + pKey.toString(10);
	    tr.setAttribute("id", trId) ;
	    var command = "App.expandProposalRow('" + trId + "', ";
	    command += pKey.toString(10) + ");return false;";
	    tr.setAttribute("onclick", command);

	    // Add descritpion
	    var tdDescription = document.createElement("td");
	    tdDescription.innerHTML = proposalsDict[pKey]["description"];
	    tr.appendChild(tdDescription);

	    // Add value
	    var tdValue = document.createElement("td");
	    var valueETH = parseFloat(proposalsDict[pKey]["valueWei"].dividedBy(
		1e18).toFixed(10));
	    tdValue.innerHTML = valueETH;
	    tr.appendChild(tdValue);

	    // Add status
	    var tdStatus = document.createElement("td");
	    tdStatus.innerHTML = statusToString(proposalsDict[pKey]["status"]);
	    tr.appendChild(tdStatus);
	    
	    // Finally add row to table body
	    tableNode.appendChild(tr);
	}
    },

    expandProposalRow: function (trId, pKey) {

	const detailViewID = "detailView";
	
	// First delete old one, if any
	var old = document.getElementById(detailViewID);

	// Get clicked row node
	var tr = document.getElementById(trId);

	// Remove old, and if clicked row is parent of
	// old expanded view, then just collapse
	if (old != null && tr.nextSibling == old) {

	    // Just collapse, nothing more
	    old.remove();
	    
	}  else {

	    if (old != null) {
		old.remove();
	    }

	    // Create detail view table
	    var tableNode = document.createElement("table");
	    tableNode.setAttribute("class", "table");

	    tableNode.appendChild(
		createRowNode(
		    ["Proposed by:",
		     ownersDict[proposalsDict[pKey]["ownerKey"]]["name"],
		     ""]));
	    tableNode.appendChild(
		createRowNode(
		    ["Recipient address:",
		     proposalsDict[pKey]["recipientAddress"],
		     ""]));
	    tableNode.appendChild(
		createRowNode(
		    ["Vote history:",
		     "",
		     ""]));

	    for (var oKey = 0; oKey < 4; oKey ++) {

		var ownerVote = voteToString(
		    parseInt(proposalsDict[pKey]["ownerVotes"][oKey].toNumber()));
		
		tableNode.appendChild(
		    createRowNode(
			["",
			 ownersDict[oKey]["name"] + ":",
			 ownerVote]));
		
	    }

	    // Put the table in a panel body
	    var panelBody = document.createElement("div");
	    panelBody.setAttribute("class", "panel-body");
	    panelBody.appendChild(tableNode);

	    panelBody.appendChild(window.App.createButtonDiv(pKey));
	    
	    var panel = document.createElement("div");
	    panel.setAttribute("id", detailViewID);
	    panel.setAttribute("class", "panel panel-success");
	    panel.appendChild(panelBody);

	    tr.parentNode.insertBefore(panel, tr.nextSibling);
	}	
    },
	
    addProposal: async function () {
	var description = document.getElementById("inputDescription").value;
	var valueETH = document.getElementById("inputValueETH").value;
	if (valueETH == "") {
	    valueETH = 0.;
	}
	var valueWei = new BigNumber(valueETH).times(1e18);
	var valueWeiStr = valueWei.toString(10);
	var addr = document.getElementById("inputAddress").value;

	var oKey = window.App.getUserOwnerKey();
	if (oKey == null) {
	    alert("Your connected ETH account is not a governing account");
	} else if (contractBalanceWei.minus(contractReservedWei).isLessThanOrEqualTo(valueWei)) {
	    alert("Insufficient available balance on contract");
	} else {
	    
	    try {
		await potGovernance.addProposal(
		    addr,
		    valueWeiStr,
		    description,
		    {"from": userAccount});
	    } catch (error) {
		alert("Error in arguments (" + error + ")");
	    }
	}
    },


    createButtonDiv: function (pKey) {

	// Function returns a created div of type row,
	// with buttons for the user (Approve, Reject, Cancel).

	var div = document.createElement("div");
	div.setAttribute("class", "row");

	var oKey = window.App.getUserOwnerKey();
	if (oKey != null) {

	    if (proposalsDict[pKey]["status"] == 0) {
		div.appendChild(window.App.createCancelButton(pKey));

		if (! window.App.userVoted(pKey, oKey)) {
		    div.appendChild(window.App.createApproveButton(pKey));
		    div.appendChild(window.App.createRejectButton(pKey));
		}
	    }
	}

	return div;
    },

    getUserOwnerKey: function () {
	for (var i = 0; i < 4; i ++) {
	    if (ownersDict[i]["address"].toLowerCase() == userAccount.toLowerCase()) {
		return i;
	    }
	}
	return null;
    },

    userVoted: function (pKey, oKey) {

	if (proposalsDict[pKey]["ownerVotes"][oKey] == 0) {
	    return false;
	}
	return true;
    },
    
    createCancelButton: function (pKey) {

	var btn = document.createElement("button");
	btn.setAttribute("class", "btn btn-default");
	btn.setAttribute("onclick", "App.cancelProposal(" + pKey + ");return false;");
	btn.innerHTML = "Cancel proposal";
	return btn;
    },
    
    createApproveButton: function (pKey) {

	var btn = document.createElement("button");
	btn.setAttribute("class", "btn btn-default");
	btn.setAttribute("onclick", "App.approveProposal(" + pKey + ");return false;");
	btn.innerHTML = "Approve proposal";
	return btn;
    },
    
    createRejectButton: function (pKey) {

	var btn = document.createElement("button");
	btn.setAttribute("class", "btn btn-default");
	btn.setAttribute("onclick", "App.rejectProposal(" + pKey + ");return false;");
	btn.innerHTML = "Reject proposal";
	return btn;
    },

    cancelProposal: async function (pKey) {
	await potGovernance.cancelProposal(pKey, {"from": userAccount});
    },
    
    approveProposal: async function (pKey) {
	await potGovernance.castVote(pKey, 1, {"from": userAccount});
    },
    
    rejectProposal: async function (pKey) {
	await potGovernance.castVote(pKey, 2, {"from": userAccount});
    },
    
    subscribeToEvents: async function () {

	if (potGovernance !== null) {
	    await window.web3.eth.subscribe(
		'logs',
		{"address": potGovernance.address},
		window.App.processEvents);
	}	
    },
    
    processEvents: async function (error, events) {

	if (error) {
	    console.error("Error in processing events:");
	    console.error(error);
	}

	console.log(events);
	await window.App.initIndex();
    },
};

window.addEventListener('load', async function(args) {

    if (window.ethereum) {
	
	window.web3 = new Web3(window.ethereum);
	
	try {
	    await window.ethereum.enable();
	} catch (error) {
	    console.error(error);
	}
    } else if (window.web3) {

	window.web3 = new Web3(window.web3.currentProvider);
    } else {
	var msg = "Could not connect to a wallet like MetaMask, Mist, etc.";
	msg += "This dapp will not work without it.";
	alert(msg);
    }
    
    await window.App.start();
});
