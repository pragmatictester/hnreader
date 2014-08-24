/*
 * Hacker News Reader
 * Website: https://addons.mozilla.org/en-US/firefox/addon/hacker-news-reader/
 * Source: https://github.com/pragmatictester/hnreader
 *
 * Copyright (c) 2014+ pragmatictester
 * Licensed under the Mozilla Public License, version 1.1
 */

/* Prevent Javascript namespace pollution */
var hnreader_poll = {

	/**
	* Handle the event triggered when the 'polls' menu option is clicked
	* Display the latest 30 polls created on Hacker News
	*
	* @return void
	**/
  last30Polls : function (aEvent) {
		/* create the HN Last 30 Polls page */

		var searchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["last30Polls"].algoliaSearchQuery;

		
		this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		
		this.request.onload = function (aEvent) {
			let jsObject = JSON.parse(aEvent.target.responseText);
			hnreader.createPage(hnreader["pages"]["last30Polls"].hnpage, hnreader["pages"]["last30Polls"].title,
					hnreader["pages"]["last30Polls"].handler, jsObject, "stories");
		};
		
		this.request.onError = hnreader.requestErrorHandler;
		
		this.request.open("GET", searchUrl, true);
		this.request.send(null);
	},
	
  /**
		* Display the poll's candidates and votes in a visual manner 
    *
    * @return void
    **/
	showPoll : function (hnBrowser, jsObject) {

		var totalVotes = 0;
		var pollCandidates = new Array();
		for (i = 0; i < jsObject.options.length; i++) {
			pollCandidates[i] = {};
			pollCandidates[i]["option"] = jsObject.options[i].text; //this is an option
			pollCandidates[i]["votes"] = jsObject.options[i].points; //these are the points of the option
			totalVotes += pollCandidates[i].votes; 
		}
		/* sort the votes to get the candidates with highest vote first and lowest last */
		pollCandidates.sort(function(a,b) {
			return parseInt(b.votes) - parseInt(a.votes);
		});						

		/* create DOM to show the poll results */
		var pollDiv = hnBrowser.createElement("div");
		pollDiv.className = 'hnreader-poll';
		
		var pollTotalVotes = hnBrowser.createElement("p");
		pollTotalVotes.className = 'hnreader-poll-total-votes';
		pollTotalVotes.textContent = "Total Votes: " + totalVotes;
		pollDiv.appendChild(pollTotalVotes);
			
		var pollCandidatesList = hnBrowser.createElement("ul");
		pollCandidatesList.className = 'hnreader-poll-list';
		pollDiv.appendChild(pollCandidatesList);

		var parser = Components.classes["@mozilla.org/parserutils;1"].getService(Components.interfaces.nsIParserUtils);
			
		for (i = 0; i < pollCandidates.length; i++) {
			var pollCandidatesListItem = hnBrowser.createElement("li");
			pollCandidatesList.appendChild(pollCandidatesListItem);
			
			var pollCandidatesListItemName = hnBrowser.createElement("p");
			pollCandidatesListItemName.className = 'hnreader-poll-candidate';
			pollCandidatesListItemName.appendChild(parser.parseFragment(pollCandidates[i]["option"], 
						parser.SanitizerDropForms, false, null, pollCandidatesListItemName));
			pollCandidatesListItem.appendChild(pollCandidatesListItemName);
			
			var pollCandidatesListItemHorizBar = hnBrowser.createElement("span");
			pollCandidatesListItemHorizBar.className = 'hnreader-poll-candidate-votes-horizbar hnreader-poll-candidate-votes-' + i;
			pollCandidatesListItem.appendChild(pollCandidatesListItemHorizBar);
			pollCandidates[i]["percent_votes"] = Math.floor(pollCandidates[i]["votes"]*100/parseInt(totalVotes)) 
			pollCandidatesListItemHorizBar.style.width = pollCandidates[i]["percent_votes"] + '%';
			/* ensure a slim slice is visible if zero votes */
			if (parseInt(pollCandidates[i]["percent_votes"]) == 0) {
				pollCandidatesListItemHorizBar.style.width = '0.5%';
			}
			
			var pollCandidatesListItemVotes = hnBrowser.createElement("span");
			pollCandidatesListItemVotes.className = 'hnreader-poll-candidate-vote-count';
			pollCandidatesListItemVotes.textContent = pollCandidates[i]["votes"];
			/* if more than zero percent, display the percent vote */
			if ((parseInt(pollCandidates[i]["percent_votes"])) > 0) {
				pollCandidatesListItemVotes.textContent += " (" + pollCandidates[i]["percent_votes"] + "%)";
			}
			pollCandidatesListItem.appendChild(pollCandidatesListItemVotes);
		}				
		
		var containerDiv = hnBrowser.getElementById('hnreader-viewpane').getElementsByClassName('hnreader-story-item')[0];
		if(containerDiv) {
			containerDiv.appendChild(pollDiv);
		}
	}
}
