/*
 *  Hacker News Reader
 *  Website: https://addons.mozilla.org/en-US/firefox/addon/hacker-news-reader/
 *  Source:  https://github.com/pragmatictester/hnreader
 *
 *  Copyright (c) 2014+ pragmatictester
 *  Licensed under the Mozilla Public License, version 1.1
 */

// consistent access to JSON across versions of Firefox
if (typeof(JSON) == "undefined") {
	Components.utils["import"]("resource://gre/modules/JSON.jsm");
	JSON.parse = JSON.fromString;
	JSON.stringify = JSON.toString;
}

/* Prevent Javascript namespace pollution */
var hnreader = {

	/* define global variables */
  algoliaApiUrl : 'http://hn.algolia.com/api/v1/',

	/* List of pages generated through Algolia HN Search API calls 
		* 'page-id': {
		*		hnpage: url for the page
		*		title: title for the page
		*		handler: function to call to render the page
		*		algoliaSearchQuery: Algolia HN API parameters for search and filter 
		*	}
	*/
	"pages": {
		"topStories": {
			"hnpage": "chrome://hnreader/content/hackernews.html#topStories",
			"title": "Top Stories",
			"handler":	"",
			"algoliaSearchQuery": "search_by_date?hitsPerPage=1000&tags=(story,poll)&numericFilters=points>=5," // + created_at_i >= (NOW-24 hrs) 
		},
		"newest": {
			"hnpage": "chrome://hnreader/content/hackernews.html#newest",
			"title": "Newest Stories",
			"handler":	"",
			"algoliaSearchQuery": "search_by_date?hitsPerPage=30&tags=(story,poll)" 
		},
		"showHn": {
			"hnpage": "chrome://hnreader/content/hackernews.html#show-hn",
			"title": "Show HN",
			"handler":	"",
			"algoliaSearchQuery": "search_by_date?hitsPerPage=30&tags=show_hn" 
		},
		"askHn": {
			"hnpage": "chrome://hnreader/content/hackernews.html#ask-hn",
			"title": "Ask HN",
			"handler":	"",
			"algoliaSearchQuery": "search_by_date?hitsPerPage=30&tags=ask_hn" 
		},
		"last30Polls": {
			"hnpage": "chrome://hnreader/content/hackernews.html#polls",
			"title": "Polls",
			"handler":	"",
			"algoliaSearchQuery": "search_by_date?hitsPerPage=30&tags=poll" 
		},
		"whoIsHiring": {
			"hnpage": "chrome://hnreader/content/hackernews.html#whoishiring",
			"title": "Who is hiring?",
			"handler":	"",
			"algoliaSearchQuery": "search_by_date?hitsPerPage=1000&tags=story,author_whoishiring"
		},
		"last7Days": {
			"hnpage": "chrome://hnreader/content/hackernews.html#last7Days",
			"title": "Last 7 Days' Top Stories",
			"handler":	"",
			"algoliaSearchQuery": "search?hitsPerPage=10&tags=(story,poll)" // + numericFilters=created_at_i >= (NOW-7 days)
		},
		"last30Days": {
			"hnpage": "chrome://hnreader/content/hackernews.html#last30Days",
			"title": "Last 30 Days' Top Stories",
			"handler":	"",
			"algoliaSearchQuery": "search?hitsPerPage=30&tags=(story,poll)" // + numericFilters=created_at_i >= (NOW-30 days)
		},
		"comments": {
			"hnpage": "",
			"title": "",
			"handler": "",
			"algoliaSearchQuery": "items/" // + storyId
		},
		"user-profile": {
			"hnpage": "",
			"title": "",
			"handler": "",
			"algoliaSearchQuery": "users/" // + username
		},
		"user-submissions": {
			"hnpage": "chrome://hnreader/content/hackernews.html#submissions-", // + username
			"title": "'s submissions", // username at the start of the string
			"handler": "",
			"algoliaSearchQuery": "search_by_date?hitsPerPage=30&tags=(story,poll),author_" // + username
		},
		"user-comments": {
			"hnpage": "chrome://hnreader/content/hackernews.html#comments-", // + username
			"title": "'s comments", //username at the start of the string
			"handler": "",
			"algoliaSearchQuery": "search_by_date?hitsPerPage=30&tags=comment,author_" // + username
		},
	},

	/**
	 * Initialize the add-on when the browser page has loaded
	 *
	 * @return void
	 **/
	onLoad : function (aEvent) {
		/* load the preferences */
		hnreader.prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.hnreader.");
		hnreader.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);

		hnreader["pages"]["topStories"].handler = hnreader.topStories;
		hnreader["pages"]["newest"].handler = hnreader.newestStories;
		hnreader["pages"]["showHn"].handler = hnreader.showHnStories;
		hnreader["pages"]["askHn"].handler = hnreader.askHnStories;
		hnreader["pages"]["last30Polls"].handler = hnreader_poll.last30Polls;
		hnreader["pages"]["whoIsHiring"].handler = hnreader.whoIsHiring;
		hnreader["pages"]["last7Days"].handler = hnreader.last7Days;
		hnreader["pages"]["last30Days"].handler = hnreader.last30Days;
		hnreader["pages"]["user-submissions"].handler = hnreader_submitter.onSubmitterStoriesClick;
		hnreader["pages"]["user-comments"].handler = hnreader_submitter.onSubmitterCommentsClick;
	},
	
	/**
	 * Add the toolbar button on the navigation bar if not already there
	 * Courtesy Mozilla Developer Network and individual contributors
	 * https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Toolbar
	 *
	 * @return void
	 **/
	addToolbarButton : function () {
		// Get the current navigation bar button set and append id
		var navBar = document.getElementById("nav-bar"),
		currentSet = navBar.currentSet,
		buttonId = "hnreader-toolbarbutton",
		toolButton = document.getElementById(buttonId);
		
		// Append only if the button is not already there.
		var curSet = currentSet.split(",");
		if (curSet.indexOf("hnreader-toolbarbutton") == -1) {
			navBar.insertItem("hnreader-toolbarbutton");
			navBar.setAttribute("currentset", navBar.currentSet);
			document.persist("nav-bar", "currentset");
		}
	},

	/**
	 * Respond to the add-on button in the nav-bar being clicked
	 *
	 * @return void
	 **/
	shortcutEngaged : function (event) {
		if (event && event.button != 0)
			return;
		/* create the HN home page */
		hnreader.topStories();
	},
	
	/**
	 * Display the top stories on the front page of Hacker News
	 *
	 * @return void
	 **/
	topStories : function () {
		//get all stories submitted from (NOW-24 hrs) to NOW
		var timestamp24hr = ( Math.round((new Date()).getTime() / 1000) - (24*60*60) );
		var dateFilter = 'created_at_i>='  + timestamp24hr;

		var searchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["topStories"].algoliaSearchQuery + dateFilter;
		
		this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		
		this.request.onload = function (aEvent) {
			
			let jsObject = JSON.parse(aEvent.target.responseText);

			/* Story Hotness Rank */
			for(i = 0; i < jsObject.hits.length; i++) {
				var num_points = jsObject.hits[i].points;
				var num_comments = jsObject.hits[i].num_comments;
				var recency = ((Math.round((new Date()).getTime() / 1000)) - (jsObject.hits[i].created_at_i)) / 3600;
				jsObject.hits[i].hotness = Math.round( (num_points) * ((num_comments + 1)/5) / Math.pow(((recency + 2)),4) ); 
			}

			//sort the Stories on their Hotness Rank
			jsObject.hits.sort(function(a,b) { return parseInt(b.hotness) - parseInt(a.hotness) } );

			hnreader.createPage( hnreader["pages"]["topStories"].hnpage, hnreader["pages"]["topStories"].title,  
					hnreader["pages"]["topStories"].handler, jsObject, "stories");
				
		};
		
		this.request.onError = hnreader.requestErrorHandler;
		
		this.request.open("GET", searchUrl, true);
		this.request.send(null);
	},

	/**
	 * Display the newest stories submitted on Hacker News
	 *
	 * @return void
	 **/
	newestStories : function (event) {
		/* Request the 30 newest stories */
		var searchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["newest"].algoliaSearchQuery;

		this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		
		this.request.onload = function (aEvent) {
			let jsObject = JSON.parse(aEvent.target.responseText);
			//var pageTitle = 'Newest Stories';
			hnreader.createPage(hnreader["pages"]["newest"].hnpage, hnreader["pages"]["newest"].title, 
					hnreader["pages"]["newest"].handler, jsObject, "stories");
			
		};
		
		this.request.onError = hnreader.requestErrorHandler;
		
		this.request.open("GET", searchUrl, true);
		this.request.send(null);
	},

	/**
	 * Display the 30 newest stories tagged 'Show HN'
	 *
	 * @return void
	 **/
	showHnStories : function (event) {
		/* Request the 30 newest Show HN stories */
		var searchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["showHn"].algoliaSearchQuery;

		this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		
		this.request.onload = function (aEvent) {
			let jsObject = JSON.parse(aEvent.target.responseText);
			hnreader.createPage(hnreader["pages"]["showHn"].hnpage, hnreader["pages"]["showHn"].title, 
					hnreader["pages"]["showHn"].handler, jsObject, "stories");
			
		};
		
		this.request.onError = hnreader.requestErrorHandler;
		
		this.request.open("GET", searchUrl, true);
		this.request.send(null);
	},
		
	/**
	 * Display the 30 newest stories tagged 'Ask HN'
	 *
	 * @return void
	 **/
	askHnStories : function (event) {
		/* Request the 30 newest Ask HN stories */
		var searchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["askHn"].algoliaSearchQuery;

		this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		
		this.request.onload = function (aEvent) {
			let jsObject = JSON.parse(aEvent.target.responseText);
			hnreader.createPage(hnreader["pages"]["askHn"].hnpage, hnreader["pages"]["askHn"].title, 
					hnreader["pages"]["askHn"].handler, jsObject, "stories");
			
		};
		
		this.request.onError = hnreader.requestErrorHandler;
		
		this.request.open("GET", searchUrl, true);
		this.request.send(null);
	},
		
	/**
	 * Display all the stories tagged 'Who is hiring?'
	 *
	 * @return void
	 **/
	whoIsHiring : function (event) {
		var searchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["whoIsHiring"].algoliaSearchQuery;
		//https://hn.algolia.io/api/v1/search_by_date?tags=story,author_whoishiring

		this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		
		this.request.onload = function (aEvent) {			
			let jsObject = JSON.parse(aEvent.target.responseText);
			
			hnreader.createPage(hnreader["pages"]["whoIsHiring"].hnpage, hnreader["pages"]["whoIsHiring"].title, 
					hnreader["pages"]["whoIsHiring"].handler, jsObject, "stories");
		};
		
		this.request.onError = hnreader.requestErrorHandler;
		
		this.request.open("GET", searchUrl, true);
		this.request.send(null);		
	},

	/**
	 * Display the top 30 stories of the last 30 days
	 *
	 * @return void
	 **/
	last30Days : function (event) {
		//get stories submitted from (NOW-30 days) to NOW
		var dateFilter = '&numericFilters=created_at_i>='  + ( Math.round((new Date()).getTime() / 1000) - (30*24*60*60) );

		var searchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["last30Days"].algoliaSearchQuery +  dateFilter;

		this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		
		this.request.onload = function (aEvent) {
			let jsObject = JSON.parse(aEvent.target.responseText);

			hnreader.createPage(hnreader["pages"]["last30Days"].hnpage, hnreader["pages"]["last30Days"].title, 
					hnreader["pages"]["last30Days"].handler, jsObject, "stories");
			
		};
		
		this.request.onError = hnreader.requestErrorHandler;
		
		this.request.open("GET", searchUrl, true);
		this.request.send(null);
	},

	// Keep a track of how many days past worth of stories have been requested
	daysPast : 0,

	/**
	 * Request the top 10 stories of the last 24 hours
	 *
	 * @return void
	 **/
	last7Days : function (event) {
		hnreader.daysPast = 0;

		//get stories submitted from (NOW-7 days) to (NOW-6 days)
		var dateSearchFilter = '&numericFilters=created_at_i>'  + ( Math.round((new Date()).getTime() / 1000) - ((hnreader.daysPast+1)*24*60*60) )
								+ ',' + 'created_at_i<' + ( Math.round((new Date()).getTime() / 1000) - ((hnreader.daysPast)*24*60*60) );

		var interimSearchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["last7Days"].algoliaSearchQuery;
		var searchUrl = interimSearchUrl + dateSearchFilter;
		
		var requestObject = this;
		requestObject.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		
		requestObject.request.onload = hnreader.onLoadHandlerLast7Days.bind(this); 

		requestObject.request.onError = hnreader.requestErrorHandler;
		
		requestObject.request.open("GET", searchUrl, true);
		requestObject.request.send(null);
	},

	/**
	 * Request the top 10 stories of each of the last 7 days
	 *
	 * @return void
	 **/
	 onLoadHandlerLast7Days :	function (aEvent) {
			let jsObject = JSON.parse(aEvent.target.responseText);
			var hnStoriesDiv;
			if (hnreader.daysPast == 0) {
				hnStoriesDiv = hnreader.createPage(hnreader["pages"]["last7Days"].hnpage, hnreader["pages"]["last7Days"].title, 
					hnreader["pages"]["last7Days"].handler, jsObject, "stories");
			}
			else {
				hnreader.addToPage(hnreader["pages"]["last7Days"].hnpage, hnreader.daysPast, jsObject);
			}
			
			var interimSearchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["last7Days"].algoliaSearchQuery;

			/* Request the top 10 stories, one day at a time */
			if (hnreader.daysPast < 7) {
				hnreader.daysPast++;
        var dateSearchFilter = '&numericFilters=created_at_i>'  + ( Math.round((new Date()).getTime() / 1000) - ((hnreader.daysPast+1)*24*60*60) )
			                + ',' + 'created_at_i<' + ( Math.round((new Date()).getTime() / 1000) - ((hnreader.daysPast)*24*60*60) );
				var searchUrl = interimSearchUrl + dateSearchFilter;

				this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
					.createInstance(Components.interfaces.nsIXMLHttpRequest);
				this.request.onload = hnreader.onLoadHandlerLast7Days.bind(this); 
				this.request.onError = hnreader.requestErrorHandler;
				this.request.open('GET', searchUrl, true);
				this.request.send(null);				
			}

		},
		
	/**
	 * Create the page requested, opening a new tab if needed
	 *
	 * @return hnStoriesDiv: DOM element that is the parent node of all stories displayed 
	 **/
	createPage : function (hnpage, pageTitle, pageRefreshHandler, jsObject, pageType) {
		/* open the hnpage */
		var tabForUrl = hnreader.openAndReuseOneTabPerURL(hnpage);
		var hnBrowser = tabForUrl.hnBrowser;
		var tabFound = tabForUrl.found;
		//var hnBrowser = gBrowser.getBrowserForTab(gBrowser.addTab(hnpage));
		var hnStoriesDiv = hnBrowser.contentDocument.getElementById('hnreader-content-topStories');
		if (hnStoriesDiv) { 
			while(hnStoriesDiv.firstChild) {
				hnStoriesDiv.removeChild(hnStoriesDiv.firstChild);
			}
			hnStoriesDiv.setAttribute("style", "");
		}
		var hnCommentsDiv = hnBrowser.contentDocument.getElementById('hnreader-viewpane');
		if (hnCommentsDiv) {
			hnCommentsDiv.parentElement.removeChild(hnCommentsDiv);
		}

		var onLoadHandler = function () {

			/* create page structure */
			var hnContentDiv = hnBrowser.contentDocument.getElementById('hnreader-content');
			
			hnStoriesDiv = hnBrowser.contentDocument.getElementById('hnreader-content-topStories');
			if (!hnStoriesDiv) {
				hnStoriesDiv = hnBrowser.contentDocument.createElement('div');
				hnStoriesDiv.id = 'hnreader-content-topStories';
			}

			hnBrowser.contentDocument.title = pageTitle + ' | Hacker News Reader'; 
			/* add new div in hnpage */
			hnContentDiv.appendChild(hnStoriesDiv);
			
			var hnStoriesList = hnBrowser.contentDocument.createElement('ul');
			hnStoriesList.className = 'hnreader-content-topStories-items';			
			/* add list to hnStoriesDiv */
			hnStoriesDiv.appendChild(hnStoriesList);
			
			switch(pageType) {
				case "stories":
					hnreader.parseHnApiResponse(hnStoriesList, jsObject);		
					break;
				case "comments":
					hnreader_submitter.parseHnApiCommentResponse(hnStoriesList, jsObject);		
					break;
				default:
							;
			}	

			/* remove waiting animation in hnpage */
			var hnContentWaitingDiv = hnBrowser.contentDocument.getElementById('hnreader-content-loading');
			if (hnContentWaitingDiv) {
				hnContentWaitingDiv.parentElement.removeChild(hnContentWaitingDiv);
			}				
	
			hnBrowser.removeEventListener("load", onLoadHandler, true);
			hnBrowser.addEventListener("load", pageRefreshHandler, true);
		};
		hnBrowser.addEventListener("load", onLoadHandler, true);
		hnBrowser.removeEventListener("load", pageRefreshHandler, true);
	
		if (tabFound) {
			onLoadHandler();
		}

		return hnStoriesDiv;
	},		

	/**
	 * Add further DOM elements to the page created
	 *
	 * @return void
	 **/
	addToPage : function (hnpage, daysPast, jsObject) {
		/* open the hnpage */
		var tabForUrl = hnreader.openAndReuseOneTabPerURL(hnpage);
		var hnBrowser = tabForUrl.hnBrowser;

		/* create page structure */
		var hnStoriesDiv = hnBrowser.contentDocument.getElementById('hnreader-content-topStories');
		hnStoriesDiv = hnBrowser.contentDocument.getElementById('hnreader-content-topStories');
		if (!hnStoriesDiv) {
			hnStoriesDiv = hnBrowser.contentDocument.createElement('div');
			hnStoriesDiv.id = 'hnreader-content-topStories';
		}

		var hnStoriesList = hnBrowser.contentDocument.getElementById('hnreader-content-day' + daysPast);
		while(!hnStoriesList) {
			for(i = 1; i <= 7; i++) {	
				// add a horizontal rule 
				var hnHorizontalRule = hnBrowser.contentDocument.createElement('hr');
				hnStoriesDiv.appendChild(hnHorizontalRule);
		
				// add the day count 
				var hnDayCount = hnBrowser.contentDocument.createElement('p');
				hnDayCount.className = 'separator';
				hnDayCount.textContent = i + ' day' + (i > 1 ? 's' : '') + ' ago';
				hnStoriesDiv.appendChild(hnDayCount);
		
				hnStoriesList = hnBrowser.contentDocument.createElement('ul');
				hnStoriesList.className = 'hnreader-content-topStories-items';			
				hnStoriesList.id = 'hnreader-content-day' + i;
				// add list to hnStoriesDiv 
				hnStoriesDiv.appendChild(hnStoriesList);
			}
			hnStoriesList = hnBrowser.contentDocument.getElementById('hnreader-content-day' + daysPast);
		}
		
		hnreader.parseHnApiResponse(hnStoriesList, jsObject);		

	},		

	/**
	 * Parse the JSON response of the API and create DOM for the page
	 *
	 * @return void
	 **/
	parseHnApiResponse : function (parentElement, jsObject) {
		var hnBrowser = gBrowser.contentDocument;
		
		for (var key in jsObject.hits) {
			if (jsObject.hits.hasOwnProperty(key)) {
				var hnListItem = hnBrowser.createElement('li');
				var hnListItemContent = hnBrowser.createElement('p');
				hnListItemContent.className = 'hnreader-story-item';
				var separator = hnBrowser.createTextNode(" ");
				
				/* Story Title and its link */
				var hnListItemContentStoryLink = hnBrowser.createElement('a');
				hnListItemContentStoryLink.className = 'hnreader-story-link';
				hnListItemContentStoryLink.target = '_blank';
				hnListItemContentStoryLink.href = jsObject.hits[key].url;
				hnListItemContentStoryLink.text = jsObject.hits[key].title;
				hnListItemContentStoryLink.addEventListener('click', hnreader.onStoryViewClick, false);
				hnListItemContent.appendChild(hnListItemContentStoryLink);
				
				/* Story Domain and its link */
				var hnListItemContentStoryLinkDomain = hnBrowser.createElement('a');
				hnListItemContentStoryLinkDomain.className = 'hnreader-story-link-domain';
				hnListItemContentStoryLinkDomain.target = '_blank';
				hnListItemContentStoryLinkDomain.href = 'http://' + hnListItemContentStoryLink.hostname + '/';
				hnListItemContentStoryLinkDomain.text = hnListItemContentStoryLink.hostname;
				hnListItemContent.appendChild(hnListItemContentStoryLinkDomain);
				
				/* Story Points */
				var hnListItemContentStoryPoints = hnBrowser.createElement('span');
				hnListItemContentStoryPoints.className = 'hnreader-story-points';
				hnListItemContentStoryPoints.textContent = jsObject.hits[key].points;
				hnListItemContent.appendChild(hnListItemContentStoryPoints);
										
				/* Story Comments and its link */
				var hnListItemContentCommentLink = hnBrowser.createElement('a');
				hnListItemContentCommentLink.className = 'hnreader-story-comments';
				hnListItemContentCommentLink.id = jsObject.hits[key].objectID;
				hnListItemContentCommentLink.target = '_blank';
				hnListItemContentCommentLink.href = 'http://news.ycombinator.com/item?id=' + jsObject.hits[key].objectID;
				hnListItemContentCommentLink.text = jsObject.hits[key].num_comments;
				hnListItemContentCommentLink.title = jsObject.hits[key].num_comments
					 + ' comment' + (jsObject.hits[key].num_comments > 1 ? 's' : '');
				hnListItemContentCommentLink.addEventListener('click', hnreader_comments.onCommentsViewClick, false);
				hnListItemContent.appendChild(hnListItemContentCommentLink);
				
				/*Story Timestamp */
				var hnListItemContentStoryTime = hnBrowser.createElement('span');
				hnListItemContentStoryTime.className = 'hnreader-story-time';
				hnListItemContentStoryTime.textContent = hnreader.readableTime(jsObject.hits[key].created_at);
				hnListItemContent.appendChild(hnListItemContentStoryTime);
				
				/* Story Submitter and its profile link */
				var hnListItemContentStorySubmitter = hnBrowser.createElement('a');
				hnListItemContentStorySubmitter.className = 'hnreader-story-submitter';
				hnListItemContentStorySubmitter.target = '_blank';
				hnListItemContentStorySubmitter.href = 'https://news.ycombinator.com/user?id=' + jsObject.hits[key].author;
				hnListItemContentStorySubmitter.text = jsObject.hits[key].author;
				hnListItemContentStorySubmitter.addEventListener('click', hnreader_submitter.onSubmitterViewClick, false);
				hnListItemContent.appendChild(hnListItemContentStorySubmitter);
				
				/* Special handling for text-only submissions*/
				var ycUrl = 'news.ycombinator.com';
				if (jsObject.hits[key].url == "" || jsObject.hits[key].url == null) {
					hnListItemContentStoryLink.href = 'https://' + ycUrl + '/item?id=' + jsObject.hits[key].objectID;
					hnListItemContentStoryLinkDomain.href = 'http://' + ycUrl + '/';
					hnListItemContentStoryLinkDomain.text = ycUrl;
					
					/* Attach the text of the submission right here but keep it hidden for the meanwhile */
					if(jsObject.hits[key].story_text != "") {
						var submissionText = hnBrowser.createElement('p');
						submissionText.className = 'yc-submission-text';
						submissionText.innerHTML = jsObject.hits[key].story_text;
						submissionText.style.display = 'none';
						hnListItemContent.appendChild(submissionText);
					}
					
					/* check if it is a poll */
					if (jsObject.hits[key]._tags[0] == "poll") {
						hnListItemContentStoryLink.dataset.tag = "poll";
					}
				}
				
				hnListItem.appendChild(hnListItemContent);
				parentElement.appendChild(hnListItem);
			}
		}
	},		
	
	/**
	 * Handle the event triggered when a story link is clicked
	 *
	 * @return void
	 **/
	onStoryViewClick : function (e) {
		e.preventDefault();
		var hnBrowser = e.target.ownerDocument;
		
		/* hide the pane on the right, if any*/
		var viewpaneDiv = hnBrowser.getElementById("hnreader-viewpane");
		if (viewpaneDiv)
			viewpaneDiv.innerHTML = "";
		else {
			viewpaneDiv = hnBrowser.createElement('div');
			viewpaneDiv.id = 'hnreader-viewpane';
			
			var t = hnBrowser.getElementById('hnreader-content-topStories');
			t.style.width = "49.5%";
			t.style.cssFloat = "left";
			t.parentNode.appendChild(viewpaneDiv);
		}

		/* Add the story item info */
		var headingNode = e.target.parentNode.cloneNode(true);
		headingNode.dataset.position = 'first';
		var linkNode = headingNode.getElementsByClassName('hnreader-story-submitter')[0];
		if(linkNode) {
			linkNode.addEventListener('click', hnreader_submitter.onSubmitterViewClick, false);
		}
		linkNode = headingNode.getElementsByClassName('hnreader-story-link')[0];
		if(linkNode) {
			linkNode.addEventListener('click', hnreader.onStoryViewClick, false);
		}
		linkNode = headingNode.getElementsByClassName('hnreader-story-comments')[0];
		if(linkNode) {
			linkNode.addEventListener('click', hnreader_comments.onCommentsViewClick, false);
		}
		linkNode = headingNode.getElementsByClassName('hnreader-comment-text')[0];
		if(linkNode) {
			linkNode.style.display = 'none';
		}
		viewpaneDiv.appendChild(headingNode);
	
		/* add waiting animation in hnpage */
		var hnContentWaitingDiv = hnBrowser.getElementById('hnreader-content-loading');
		
		if (!hnContentWaitingDiv) {
			hnContentWaitingDiv = hnBrowser.createElement('div');
			hnContentWaitingDiv.id = 'hnreader-content-loading';
		}
		viewpaneDiv.appendChild(hnContentWaitingDiv);
		
		/* notify when the page has finished loading */
		
		/* Check to see if it is a ycUrl */
		var ycUrl = 'news.ycombinator.com';
		if (e.target.href.indexOf(ycUrl) == -1) {
			/* not a ycUrl */
			this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance(Components.interfaces.nsIXMLHttpRequest);
			
			var responseContentType;

			this.request.onreadystatechange = function () { 
				if (this.readyState == 2) {
					if (this.getResponseHeader('Content-Type').indexOf('pdf') != -1) {
						//response Content-Type is pdf
						responseContentType = 'pdf';
					} else if (this.getResponseHeader('Content-Type').indexOf('plain') != -1) {
            //response Content-Type is text
            responseContentType = 'text';
          } else if (this.getResponseHeader('Content-Type').indexOf('html') != -1) {
					  //response Content-Type is html
						responseContentType = 'html';
					}
				}
			};

			this.request.onload = function (aEvent) {
				
				let text = aEvent.target.responseText;
				
				var frameHtml = document.implementation.createDocument("http://www.w3.org/1999/xhtml", "html", null),
				frameBody = document.createElementNS("http://www.w3.org/1999/xhtml", "body");
				frameHtml.documentElement.appendChild(frameBody);
				
				//Handle a PDF document by displaying it in an iframe
				if (responseContentType == 'pdf') {
					var pdfContentDiv = hnBrowser.createElement('iframe');	
					pdfContentDiv.src = e.target.href;
					pdfContentDiv.style.width = '100%';
					pdfContentDiv.style.height = (e.target.ownerDocument.documentElement.clientHeight - 50) + 'px';
					frameBody.appendChild(pdfContentDiv);
				}
				//Handle a plain text file by displaying it in <pre></pre> tags
				else if (responseContentType == 'text') {
					var textContentDiv = hnBrowser.createElement('pre');	
					textContentDiv.innerHTML = aEvent.target.responseText; 
					frameBody.appendChild(textContentDiv);
				}
				//Handle an HTML file by stripping it off all Javascript and displaying it in <body></body> tags
				else { // if(responseContentType == 'html') 
					frameBody.appendChild(Components.classes["@mozilla.org/feed-unescapehtml;1"]
						.getService(Components.interfaces.nsIScriptableUnescapeHTML)
						.parseFragment(text, false, null, frameBody));
				
				
					//Get the favicon of the website
					var faviconDiv = hnreader_easytoread.getSiteFavicon(hnBrowser, text, e.target);
					//viewpaneDiv.appendChild(faviconDiv);

					//Create an easy-to-read version of the URL that has been passed in
					frameBody = hnreader_easytoread.easyToRead(frameBody, e.target.href);
					frameBody.insertBefore(faviconDiv, frameBody.firstChild);
				} 
				
				/* remove waiting animation in hnpage */
				var hnContentWaitingDiv = hnBrowser.getElementById('hnreader-content-loading');
				
				if (hnContentWaitingDiv) {
					hnContentWaitingDiv.parentNode.removeChild(hnContentWaitingDiv);
				}
				viewpaneDiv.appendChild(frameBody);

				/* Add the story item info */
				var headingNode = e.target.parentNode.cloneNode(true);
				headingNode.dataset.position = 'last';
				var linkNode = headingNode.getElementsByClassName('hnreader-story-submitter')[0];
				linkNode.addEventListener('click', hnreader_submitter.onSubmitterViewClick, false);
				linkNode = headingNode.getElementsByClassName('hnreader-story-link')[0];
				linkNode.addEventListener('click', hnreader.onStoryViewClick, false);
				linkNode = headingNode.getElementsByClassName('hnreader-story-comments')[0];
				linkNode.addEventListener('click', hnreader_comments.onCommentsViewClick, false);
				linkNode = headingNode.getElementsByClassName('hnreader-comment-text')[0];
				if(linkNode) {
					linkNode.style.display = 'none';
				}
				viewpaneDiv.appendChild(headingNode);
			};
			
			this.request.onerror = hnreader.requestErrorHandler;
			
			this.request.open("GET", e.target.href, true);
			this.request.setRequestHeader("Referer", e.target.protocol + '//' + e.target.hostname + '/');
			this.request.send(null);
			
		} else { /* it's a ycUrl */
			/* remove waiting animation in hnpage */
			var hnContentWaitingDiv = hnBrowser.getElementById('hnreader-content-loading');
			
			if (hnContentWaitingDiv) {
				hnContentWaitingDiv.parentNode.removeChild(hnContentWaitingDiv);
			}

			//set the text block to display; it was hidden earlier
			var hiddenNode = hnBrowser.getElementById('hnreader-viewpane').getElementsByClassName('yc-submission-text')[0];
			if(hiddenNode) {
				hiddenNode.style.display = 'block';
			}
			//display the comments
			e.target.parentElement.getElementsByClassName('hnreader-story-comments')[0].click();
			
		}
		hnBrowser.documentElement.scrollTop = 0;
	},
	
	/**
	 * Open a new tab when needed, and re-use existing when already opened
	 * Courtesy Mozilla Developer Network and individual contributors
	 * https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Tabbed_browser#Reusing_tabs
	 *
	 * @return An array containing the browser for the tab, and a flag for whether the tab exists
	 **/
	openAndReuseOneTabPerURL : function (url) {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
			.getService(Components.interfaces.nsIWindowMediator);
		var browserEnumerator = wm.getEnumerator("navigator:browser");
		var hnBrowser;
		
		// Check each browser instance for our URL
		var found = false;
		while (!found && browserEnumerator.hasMoreElements()) {
			var browserWin = browserEnumerator.getNext();
			var tabbrowser = browserWin.gBrowser;
			
			// Check each tab of this browser instance
			var numTabs = tabbrowser.browsers.length;
			for (var index = 0; index < numTabs; index++) {
				var currentBrowser = tabbrowser.getBrowserAtIndex(index);
				if (url == currentBrowser.currentURI.spec) {
					
					// The URL is already opened. Select this tab.
					tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];
					
					// Focus *this* browser-window
					browserWin.focus();
					
					found = true;
					hnBrowser = currentBrowser;
					break;
				}
			}
		}
		
		// Our URL isn't open. Open it now.
		if (!found) {
			hnBrowser = gBrowser.getBrowserForTab(gBrowser.addTab(url));
		}
		gBrowser.selectedTab = hnBrowser;
		return { hnBrowser: hnBrowser, found: found };
	},
	
	/**
	 * Handle the response when an API call returns an error
	 *
	 * @return void
	 **/
	requestErrorHandler : function (aEvent) {
		var hnpage = window.top.getBrowser().selectedBrowser.contentWindow.location.href;
		var tabForUrl = hnreader.openAndReuseOneTabPerURL(hnpage);
		var hnBrowser = tabForUrl.hnBrowser;
		var errorDiv = hnBrowser.contentDocument.createElement("p");
		errorDiv.id = "hnreader-error";
		errorDiv.innerHTML = 'Connection timed out or network error. Request status: ' + aEvent.target.status + ' ' +  aEvent.target.statusText;
		var hnContentWaitingDiv = hnBrowser.contentDocument.getElementById('hnreader-content-loading');
		if (hnContentWaitingDiv) {
			hnContentWaitingDiv.parentNode.appendChild(errorDiv);
			hnContentWaitingDiv.parentNode.removeChild(hnContentWaitingDiv);
		} else {
			var headerDiv = hnBrowser.contentDocument.getElementById('hnreader-header');
			if(headerDiv) {
				headerDiv.appendChild(errorDiv);
			}
		}
	},

	/**
	 * Detect and remove newline characters from text returned by API
	 *
	 * @return Cleaned-up text
	 **/
	readableText : function(text) {
	 if(text.indexOf("\\n") != -1) {
     var str = text.toString();
     //search and replace all newlines with <br> tag
     str = str.replace(/(\\?\\n)/g, function($1) { return ($1 == "\\n" ?  "<br>" : $1) });
     //search and replace all escaped newlines with newlines
     str = str.replace(/(\\\\n)/g, "\\n");
     //text = str;
		 text = str;
   }
	 return text;
	},

	/**
	 * Display time elapsed in a human readable format 
	 *
	 * @return Number of minutes or hours or days or months or years elapsed
	 **/
	readableTime : function (timestamp) {
		var displayString = '';
		var timePeriods = {
			' minute' : 60,
			' hour' : 60,
			' day' : 24,
			' month' : 30,
			' year' : 12
		};
		
		var timeElapsed = Math.floor(Math.abs(new Date() - new Date(timestamp)) / (1000)); //in seconds
		
		for (var t in timePeriods) {
			timeElapsed = Math.floor(timeElapsed / timePeriods[t]);
			if (timeElapsed >= 1) {
				displayString = timeElapsed + t + (timeElapsed > 1 ? 's' : '');
			}
		}
		return displayString;
	},
	
	/**
	 * Show debug statements in the browser console log
	 *
	 * @return void
	 **/
	jsdump : function (str) {
		Components.classes['@mozilla.org/consoleservice;1']
		.getService(Components.interfaces.nsIConsoleService)
		.logStringMessage("HNReader: " + str);
	},

};
window.addEventListener("load", window.hnreader.onLoad, false);

window.document.addEventListener("onTopStoriesClick", function(e) { 
	hnreader.topStories(e); 
}, false, true);

window.document.addEventListener("onNewestStoriesClick", function(e) { 
	hnreader.newestStories(e); 
}, false, true);

window.document.addEventListener("onLast7DaysClick", function(e) { 
	hnreader.last7Days(e); 
}, false, true);

window.document.addEventListener("onLast30DaysClick", function(e) { 
	hnreader.last30Days(e); 
}, false, true);

window.document.addEventListener("onPollsClick", function(e) { 
	hnreader_poll.last30Polls(e);
}, false, true);

window.document.addEventListener("onWhoIsHiringClick", function(e) { 
	hnreader.whoIsHiring(e); 
}, false, true);

window.document.addEventListener("onShowHnClick", function(e) { 
	hnreader.showHnStories(e); 
}, false, true);

window.document.addEventListener("onAskHnClick", function(e) { 
	hnreader.askHnStories(e); 
}, false, true);

