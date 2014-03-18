/*
 * Hacker News Reader
 * Website: https://addons.mozilla.org/en-US/firefox/addon/hacker-news-reader/
 * Source: https://github.com/pragmatictester/hnreader
 *
 * Copyright (c) 2014+ pragmatictester
 * Licensed under the Mozilla Public License, version 1.1
 */

/* Prevent Javascript namespace pollution */
var hnreader_submitter = {

  /**
	 * Display the submitter's profile in a yellow Post-It style tooltip
   * when a submitter name is clicked
   *
   * @return void
   **/
	onSubmitterViewClick : function (e) {
		e.preventDefault();
		if (e.target.href == null) {
			return;
		}

		hnreader_submitter.onSubmitterViewClose(e);

		var username = e.target.href.substring(e.target.href.indexOf('=') + 1); // 'https://news.ycombinator.com/user?id=username'

		var searchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["user-profile"].algoliaSearchQuery + username;
		// http://hn.algolia.com/api/v1/users/pg

		this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);

		this.request.onload = function(aEvent) {
			let text = aEvent.target.responseText;

			let jsObject = JSON.parse(text);

			var tip = e.target.ownerDocument.createElement("div");
			tip.id = "hnreader-tooltip";
			tip.style.display = "none";
			e.target.parentNode.appendChild(tip);

			var tipClose = e.target.ownerDocument.createElement("span");
			tipClose.className = "popup-close";
			tipClose.innerHTML = "[x]";
			tipClose.addEventListener('click', hnreader_submitter.onSubmitterViewClose, false);
			tip.appendChild(tipClose);

			var tipHeader = e.target.ownerDocument.createElement("h4");
			tipHeader.className = "profile-header";
			tipHeader.innerHTML = jsObject.username;
			tip.appendChild(tipHeader);

			var tipSummary = e.target.ownerDocument.createElement("p");
			tipSummary.className = "profile-summary";
			tip.appendChild(tipSummary);

			var tipSummaryKarma = e.target.ownerDocument.createElement("span");
			tipSummaryKarma.className = "profile-summary-karma";
			tipSummaryKarma.innerHTML = jsObject.karma;
			tipSummary.appendChild(tipSummaryKarma);

			var tipSummaryMembership = e.target.ownerDocument.createElement("span");
			tipSummaryMembership.className = "profile-summary-membership";
			tipSummaryMembership.innerHTML = hnreader.readableTime(jsObject.created_at);
			tipSummary.appendChild(tipSummaryMembership);

			var tipSummarySubmissions = e.target.ownerDocument.createElement("a");
			tipSummarySubmissions.className = "profile-summary-submissions";
			tipSummarySubmissions.href = "https://news.ycombinator.com/submitted?id=" + jsObject.username;
			tipSummarySubmissions.addEventListener('click', hnreader_submitter.onSubmitterStoriesClick, false);
			tipSummarySubmissions.removeEventListener('click', hnreader_submitter.onSubmitterViewClick, false);
			tipSummarySubmissions.title= jsObject.submission_count + ' submission' + (jsObject.submission_count > 1 ? 's' : '');
			tipSummarySubmissions.innerHTML = jsObject.submission_count;
			tipSummary.appendChild(tipSummarySubmissions);

			var tipSummaryComments = e.target.ownerDocument.createElement("a");
			tipSummaryComments.className = "profile-summary-comments";
			tipSummaryComments.href = "https://news.ycombinator.com/threads?id=" + jsObject.username;
			tipSummaryComments.addEventListener('click', hnreader_submitter.onSubmitterCommentsClick, false);
			tipSummarySubmissions.removeEventListener('click', hnreader_submitter.onSubmitterViewClick, false);
			tipSummaryComments.title = jsObject.comment_count + ' comment' + (jsObject.comment_count > 1 ? 's' : '');
			tipSummaryComments.innerHTML = jsObject.comment_count;
			tipSummary.appendChild(tipSummaryComments);

			var tipDetails = e.target.ownerDocument.createElement("p");
			tipDetails.className = "profile-details";
			var profileDetails = jsObject.about != null ? jsObject.about : '';
			tipDetails.innerHTML = hnreader.readableText(profileDetails);
			tip.appendChild(tipDetails);

			tip.style.left = e.pageX + 'px';
			tip.style.top = e.pageY + 'px';

			tip.style.display = "block";
			hnreader_submitter.setTooltipDisplay(tip, e.target.ownerDocument.documentElement.clientHeight, e.clientY, e.pageY, e.pageX);
		};

		this.request.onerror = function (aEvent) {
			e.target.ownerDocument.getElementById("profile-details").innerHTML =
				'Error requesting ' + username + '\'s profile.' + aEvent.target.status;
			hnreader_submitter.setTooltipDisplay(e.target.ownerDocument.getElementById("hnreader-tooltip"),
							                             e.target.ownerDocument.documentElement.clientHeight, e.clientY, e.pageY, e.pageX);
		};

		this.request.open("GET", searchUrl, true);
		this.request.send(null);
	},

  /**
	 * Close the Post-It style tooltip
   *
   * @return void
   **/
	onSubmitterViewClose : function (e) {
		e.preventDefault();

		var tip = e.target.ownerDocument.getElementById('hnreader-tooltip');
		if (tip) {
			tip.style.display = "none";
			tip.parentNode.removeChild(tip);
		}
	},

  /**
	 * Adjust the size and position of the Post-It style tooltip
   *
   * @return void
   **/
	setTooltipDisplay : function (tooltip, viewportHeight, clientY, pageY, pageX) {
		//if the tooltip's height exceeds 50% of the viewport's height,
		//cut the tooltip's height to 40% of viewport height
		if (tooltip.clientHeight > Math.floor(viewportHeight * 0.5)) {
			tooltip.style.height = Math.floor(viewportHeight * 0.4) + 'px';
		}

		//if there is no vertical space below the link, show it above the link
		var verticalSpace = viewportHeight - clientY;
		if (verticalSpace < tooltip.clientHeight) {
			tooltip.style.top = (pageY - tooltip.clientHeight - 10) + 'px';
		} else {
			tooltip.style.top = pageY + 'px';
		}

		//if the tooltip's width exceeds the viewport's width,
		//move it to the left
		if(window.innerWidth < (pageX + tooltip.clientWidth)) {
			tooltip.style.left = (pageX - tooltip.clientWidth) + 'px';
		}

	},

  /**
	 * Display the last 30 stories submitted by the submitter
   *
   * @return void
   **/
	onSubmitterStoriesClick : function(e) {
		/* create the HN Submitter's Stories page */
    e.preventDefault();

		var username;
		if(e.target.href) {
			username = e.target.href.substring(e.target.href.indexOf('=') + 1); // 'https://news.ycombinator.com/submitted?id=username'
		} else {
			var hnpage = window.top.getBrowser().selectedBrowser.contentWindow.location.href;
			username = hnpage.substring(hnpage.indexOf('-') + 1); // 'chrome://hnreader/content/hackernews.html#submissions-username'
		}

    /* Request the submitter's 30 last submitted stories */
    var searchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["user-submissions"].algoliaSearchQuery + username;


    this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
							      .createInstance(Components.interfaces.nsIXMLHttpRequest);

    this.request.onload = function (aEvent) {
	    let jsObject = JSON.parse(aEvent.target.responseText);
			hnreader.createPage(hnreader["pages"]["user-submissions"].hnpage + username, username + hnreader["pages"]["user-submissions"].title,
			          hnreader["pages"]["user-submissions"].handler, jsObject, "stories");

    };

		this.request.onError = hnreader.requestErrorHandler;

		this.request.open("GET", searchUrl, true);
		this.request.send(null);
	},


  /**
	 * Display the last 30 comments made by the submitter
   *
   * @return void
   **/
	onSubmitterCommentsClick : function(e) {
		/* create the HN Submitter's Comments page */
		e.preventDefault();

		var username;
		if(e.target.href) {
			username = e.target.href.substring(e.target.href.indexOf('=') + 1); // 'https://news.ycombinator.com/threads?id=username'
		} else {
			var hnpage = window.top.getBrowser().selectedBrowser.contentWindow.location.href;
			username = hnpage.substring(hnpage.indexOf('-') + 1); // 'chrome://hnreader/content/hackernews.html#comments-username'
		}

    /* Request the submitter's 30 last submitted comments */
    var searchUrl = hnreader.algoliaApiUrl + hnreader["pages"]["user-comments"].algoliaSearchQuery + username;


    this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
							      .createInstance(Components.interfaces.nsIXMLHttpRequest);

    this.request.onload = function (aEvent) {
	    let jsObject = JSON.parse(aEvent.target.responseText);
			hnreader.createPage(hnreader["pages"]["user-comments"].hnpage + username, username + hnreader["pages"]["user-comments"].title,
			          hnreader["pages"]["user-comments"].handler, jsObject, "comments");

    };

		this.request.onError = hnreader.requestErrorHandler;

		this.request.open("GET", searchUrl, true);
		this.request.send(null);
	},

  /**
	 * Parse the JSON object returned by the API and create DOM
	 * to display the comments made by the submitter
   *
   * @return void
   **/
	parseHnApiCommentResponse : function (parentElement, jsObject) {
		var hnBrowser = gBrowser.contentDocument;

		for (var key in jsObject.hits) {
			if (jsObject.hits.hasOwnProperty(key)) {
				var hnListItem = hnBrowser.createElement('li');
				var hnListItemContent = hnBrowser.createElement('p');
				hnListItemContent.className = 'hnreader-story-item';

				/* Comment Submitter and its profile link */
				var hnCommentSubmitter = hnBrowser.createElement('a');
				hnCommentSubmitter.href = 'https://news.ycombinator.com/user?id=' + jsObject.hits[key].author;
				hnCommentSubmitter.text = jsObject.hits[key].author;
				hnCommentSubmitter.className = 'hnreader-comment-submitter';
				hnCommentSubmitter.target = '_blank';
				hnCommentSubmitter.addEventListener('click', hnreader_submitter.onSubmitterViewClick, false);
				hnListItemContent.appendChild(hnCommentSubmitter);

				/*Comment Timestamp */
				var hnCommentTime = hnBrowser.createElement('span');
				hnCommentTime.textContent =  hnreader.readableTime(jsObject.hits[key].created_at);
				hnCommentTime.className = 'hnreader-comment-time';
				hnListItemContent.appendChild(hnCommentTime);

				/* Comment link */
				var hnCommentLink = hnBrowser.createElement('a');
				hnCommentLink.href = 'http://news.ycombinator.com/item?id=' + jsObject.hits[key].objectID;
				hnCommentLink.className = 'hnreader-comment-link';
				hnCommentLink.target = '_blank';
				hnCommentLink.text = 'link';
				hnListItemContent.appendChild(hnCommentLink);

				/* Comment Points */
				var hnCommentPoints = hnBrowser.createElement('span');
				hnCommentPoints.className = 'hnreader-story-points';
				hnCommentPoints.textContent = jsObject.hits[key].points;
				//hnCommentPoints.textContent = jsObject.hits[key].points + ' points';
				hnListItemContent.appendChild(hnCommentPoints);

				/* Separator */
				var hnSeparator = hnBrowser.createElement('span');
				hnSeparator.textContent = " | ";
				hnListItemContent.appendChild(hnSeparator);

				/* Story Title and its link */
				var hnListItemContentStoryLink = hnBrowser.createElement('a');
				hnListItemContentStoryLink.className = 'hnreader-story-link';
				hnListItemContentStoryLink.target = '_blank';
				hnListItemContentStoryLink.href = jsObject.hits[key].story_url;
				hnListItemContentStoryLink.text = jsObject.hits[key].story_title;
				hnListItemContentStoryLink.addEventListener('click', hnreader.onStoryViewClick, false);
				hnListItemContent.appendChild(hnListItemContentStoryLink);

				/* Story Domain and its link */
				var hnListItemContentStoryLinkDomain = hnBrowser.createElement('a');
				hnListItemContentStoryLinkDomain.className = 'hnreader-story-link-domain';
				hnListItemContentStoryLinkDomain.target = '_blank';
				hnListItemContentStoryLinkDomain.href = 'http://' + hnListItemContentStoryLink.hostname + '/';
				hnListItemContentStoryLinkDomain.text = hnListItemContentStoryLink.hostname;
				hnListItemContent.appendChild(hnListItemContentStoryLinkDomain);

				/* Story Comments and its link */
				var hnListItemContentCommentLink = hnBrowser.createElement('a');
				hnListItemContentCommentLink.className = 'hnreader-story-comments';
				hnListItemContentCommentLink.id = jsObject.hits[key].story_id;
				hnListItemContentCommentLink.target = '_blank';
				hnListItemContentCommentLink.href = 'http://news.ycombinator.com/item?id=' + jsObject.hits[key].objectID;
				hnListItemContentCommentLink.text = 'all';
				hnListItemContentCommentLink.addEventListener('click', hnreader_comments.onCommentsViewClick, false);
				hnListItemContent.appendChild(hnListItemContentCommentLink);

				/* Special handling for text-only submissions*/
				var ycUrl = 'news.ycombinator.com';
				if (jsObject.hits[key].story_url == "" || jsObject.hits[key].story_url == null) {
					hnListItemContentStoryLink.href = 'https://' + ycUrl + '/item?id=' + jsObject.hits[key].story_id;
					hnListItemContentStoryLinkDomain.href = 'http://' + ycUrl + '/';
					hnListItemContentStoryLinkDomain.text = ycUrl;

					/* Attach the text of the submission right here but keep it hidden for the meanwhile */
					if(jsObject.hits[key].story_text && jsObject.hits[key].story_text != "") {
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

				/* Comment text */
				var hnCommentText = hnBrowser.createElement('p');
				hnCommentText.innerHTML = hnreader.readableText(jsObject.hits[key].comment_text);
				hnCommentText.className = 'hnreader-comment-text';
				hnListItemContent.appendChild(hnCommentText);

				hnListItem.appendChild(hnListItemContent);
				parentElement.appendChild(hnListItem);
			}
		}
	},

}
