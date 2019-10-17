export function statusToString(statusInt) {

    // Expects status to be an integer.
    // Returns status as a string like so:
    // 
    //   0: Accepting votes
    //   1: Accepted and closed
    //   2: Rejected and closed
    //   3: Cancelled (and closed)
    //
    // Returns "Unknown" if it has some other value.

    var statusStr = "Unknown";

    if (statusInt == 0) {
	statusStr = "Accepting votes";
    } else if (statusInt == 1) {
	statusStr = "Accepted";
    } else if (statusInt == 2) {
	statusStr = "Rejected";	
    } else if (statusInt == 3) {
	statusStr = "Rejected";
    }

    return statusStr;
}


export function voteToString(voteInt) {

    var ownerVote = "Unknown";

    if (voteInt == 0) {
	ownerVote = "Not voted";
    } else if (voteInt == 1) {
	ownerVote = "Approved";
    } else if (voteInt == 2) {
	ownerVote = "Rejected";
    }
    
    return ownerVote;
}


export function createRowNode(dataList) {

    // The first element in dataList is the header,
    // the rest are to be added as column values

    var tr = document.createElement("tr");
    var td = document.createElement("td");
    td.innerHTML = "<b>" + dataList[0] + "</b>";
    tr.appendChild(td);
    
    for (var i = 1; i < dataList.length; i ++) {
	var tdi = document.createElement("td");
	tdi.innerHTML = dataList[i];
	tr.appendChild(tdi);
    }

    return tr;
}
