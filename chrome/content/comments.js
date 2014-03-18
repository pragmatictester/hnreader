/*
 * Hacker News Reader
 * Website: https://addons.mozilla.org/en-US/firefox/addon/hacker-news-reader/
 * Source: https://github.com/pragmatictester/hnreader
 *
 * Copyright (c) 2014 pragmatictester
 * Licensed under the Mozilla Public License, version 1.1
 */

/* Prevent Javascript namespace pollution */
var hnreader_comments = {

  /**
   * Handle the event triggered when the comments on a story are clicked
   *
   * @return void
   **/
	onCommentsViewClick : function (e) {
		e.preventDefault();
		var storyId = e.target.id;
			/* if the story view is open, close it */
			var hnBrowser = e.target.ownerDocument;
			var topStoriesDiv = hnBrowser.getElementById("hnreader-content-topStories");
			var viewpaneDiv = hnBrowser.getElementById('hnreader-viewpane');
			if (viewpaneDiv) {
				viewpaneDiv.innerHTML = "";
			} else {
				viewpaneDiv = hnBrowser.createElement('div');
				viewpaneDiv.id = 'hnreader-viewpane';
				
				/* position the story div to the left and with half the screen width */
				topStoriesDiv.style.width = "49.5%";
				topStoriesDiv.style.cssFloat = "left";
				topStoriesDiv.parentNode.appendChild(viewpaneDiv);
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

			var hiddenNode = headingNode.getElementsByClassName('yc-submission-text')[0];
			if(hiddenNode) { 
			  //set the text block to display; it was hidden earlier
			  hiddenNode.style.display = 'block';
			}

			/* add waiting animation in hnpage */
			var hnContentWaitingDiv = hnBrowser.getElementById('hnreader-content-loading');
			
			if (!hnContentWaitingDiv) {
				hnContentWaitingDiv = hnBrowser.createElement('div');
				hnContentWaitingDiv.id = 'hnreader-content-loading';
			}
			viewpaneDiv.appendChild(hnContentWaitingDiv);
			
			hnBrowser.documentElement.scrollTop = 0;
			
			/* get div to display the comments */
			/* add comment div in hnpage */
			var hnContentDiv = hnBrowser.getElementById('hnreader-content');
			var hnCommentsDiv = hnBrowser.createElement('div');
			hnCommentsDiv.id = 'hnreader-comments';
			
			var hnStoryTitle = hnBrowser.createElement('h1');
			hnStoryTitle.id = 'hnreader-comments-storytitle';
			//hnStoryTitle.innerHTML = jsObject.children[0].item.discussion.title;
			hnCommentsDiv.appendChild(hnStoryTitle);
			
			var hnCommentsListDiv = hnBrowser.createElement('div');
			hnCommentsListDiv.id = 'hnreader-comments-list';
			hnCommentsDiv.appendChild(hnCommentsListDiv);
			//var hnTopStoriesList = hnBrowser.contentDocument.createTextNode(JSON.stringify(jsObject));
			//
			var hnCommentsList = hnBrowser.createElement('ul');
			hnCommentsList.className = 'hnreader-comment-items';
			hnCommentsListDiv.appendChild(hnCommentsList);

			hnreader_comments.getComments(e, hnBrowser, storyId, hnCommentsList, viewpaneDiv, hnContentWaitingDiv, hnCommentsListDiv);
		
			viewpaneDiv.appendChild(hnCommentsListDiv);
	},
	
  /**
   * Request for all the comments on a given story
   *
   * @return void
   **/
	getComments : function (e, hnBrowser, storyId, hnCommentsList, viewpaneDiv, hnContentWaitingDiv, hnCommentsListDiv) {
		var algoliaApiUrl = 'http://hn.algolia.com/api/';
		var algoliaApiVersion = 'v1';
		var algoliaSearchQuery = 'items';
		var searchFilter = storyId;
		var searchUrl = algoliaApiUrl + algoliaApiVersion + '/' + algoliaSearchQuery + '/' + searchFilter;

		var commentsobject = this;
		this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance(Components.interfaces.nsIXMLHttpRequest);
		
		this.request.onload = function (aevent) {
			
			let text = aevent.target.responseText;
			
			let jsObject = JSON.parse(text);
			
			/* add comments to the page */
			hnreader_comments.addComments(hnBrowser, hnCommentsList, jsObject, true);

			/* remove waiting animation in hnpage */
			var hnContentWaitingDiv = hnBrowser.getElementById('hnreader-content-loading');
			
			if (hnContentWaitingDiv) {
				hnContentWaitingDiv.parentNode.removeChild(hnContentWaitingDiv);
			}
			
			/* Add the story item info */
			var headingNode = e.target.parentNode.cloneNode(true);
			headingNode.dataset.position = 'last';

			var linkNode = headingNode.getElementsByClassName('hnreader-story-submitter')[0];
			linkNode.addEventListener('click', hnreader_submitter.onSubmitterViewClick, false);
			linkNode = headingNode.getElementsByClassName('hnreader-story-comments')[0];
			linkNode.addEventListener('click', hnreader_comments.onCommentsViewClick, false);
			linkNode = headingNode.getElementsByClassName('hnreader-story-link')[0];
			linkNode.addEventListener('click', hnreader.onStoryViewClick, false);
      linkNode = headingNode.getElementsByClassName('hnreader-comment-text')[0];
      if(linkNode) {
        linkNode.style.display = 'none';
      }
			viewpaneDiv.appendChild(headingNode);
	  
			//check if it is a poll
			linkNode = headingNode.getElementsByClassName('hnreader-story-link')[0];
			if(linkNode.dataset.tag == "poll") {
				hnreader_poll.showPoll(hnBrowser, jsObject);
			}
		};
		
		this.request.onerror = function (aEvent) {
		};
		
		this.request.open('GET', searchUrl, true);
		this.request.send(null);
	},

  /**
   * Create the page DOM from the comments received as a JSON object
   *
   * @return void
   **/
	addComments : function (hnBrowser, parentItem, hnChildCommentsArray, topLevelComments) {
		//Sort the comments by points (desc), number of child comments (desc), created_at_i (asc)
		hnChildCommentsArray.children.sort(function(a,b) { 
			//sort by points (desc)
			if( parseInt(b.points) != parseInt(a.points) ) {
				return parseInt(b.points) - parseInt(a.points);
			}	
			//sort by number of child comments (desc)
			if( parseInt(b.children.length) != parseInt(a.children.length) ) {
				return parseInt(b.children.length) - parseInt(a.children.length);
			}	
			//sort by recently created (asc)
			var atimeElapsed = Math.floor(Math.abs(new Date() - new Date(a.created_at)) / 1000 ); //in seconds
			var btimeElapsed = Math.floor(Math.abs(new Date() - new Date(b.created_at)) / 1000 ); //in seconds
			if( btimeElapsed != atimeElapsed ) {
				return atimeElapsed - btimeElapsed;
			}	
		} );

		//add comments to the DOM
		for (var key in hnChildCommentsArray.children) {
			if (hnChildCommentsArray.children.hasOwnProperty(key)) {

				//Check if comment exists and has not been deleted
				if( hnChildCommentsArray.children[key].author) {
					var hnCommentsListItem = hnreader_comments.createCommentNode(hnBrowser, hnChildCommentsArray.id, hnChildCommentsArray.children[key].id, 
							hnChildCommentsArray.children[key].author, hnChildCommentsArray.children[key].created_at, hnChildCommentsArray.children[key].text,
							hnChildCommentsArray.children[key].children.length);
					parentItem.appendChild(hnCommentsListItem);

					/* If the comment is not top-level don't display it just now */
					if (!topLevelComments) {
						hnCommentsListItem.style.display = 'none';
						hnCommentsListItem.dataset.parent_set = 'no';
					}
					else {
						hnCommentsListItem.style.display = 'block';
						hnCommentsListItem.dataset.parent_set = 'yes';
					}

					/* Comment Replies for parent */
					if( hnChildCommentsArray.children[key].children.length > 0 ) {
						var childCommentsList = hnBrowser.createElement('ul');
						childCommentsList.className = 'hnreader-comment-items';
						hnCommentsListItem.appendChild(childCommentsList);
			
						hnreader_comments.addComments(hnBrowser, childCommentsList, hnChildCommentsArray.children[key], false);
					}

				}
			}
		}
	},

  /**
   * Create the DOM for an individual comment
   *
   * @return void
   **/
	createCommentNode : function (hnBrowser, parentId, commentId, commentAuthor, commentCreateDate, commentText, numChildren) {
		
		var hnCommentsListItem = hnBrowser.createElement('li');
		hnCommentsListItem.id = commentId;
    hnCommentsListItem.dataset.parent_sigid = parentId;
					
		var hnCommentsListItemContent = hnBrowser.createElement('p');
		hnCommentsListItemContent.className = 'hnreader-comment-item';
		hnCommentsListItem.appendChild(hnCommentsListItemContent);
					
		/* Comment thread expand / collapse */
		var hnCommentThread = hnBrowser.createElement('a');
		hnCommentThread.id = 'thread-' + commentId;
		hnCommentThread.className = 'hnreader-comment-expand';
		hnCommentThread.href = '#';
		hnCommentThread.style.display = 'none';
		hnCommentThread.innerHTML = '[+]';
		hnCommentThread.addEventListener('click', hnreader_comments.onCommentThreadClick, false);
		hnCommentsListItemContent.appendChild(hnCommentThread);
					
		/* Comment Submitter and its profile link */
		var hnCommentSubmitter = hnBrowser.createElement('a');
		hnCommentSubmitter.href = 'https://news.ycombinator.com/user?id=' + commentAuthor;
		hnCommentSubmitter.text = commentAuthor;
		hnCommentSubmitter.className = 'hnreader-comment-submitter';
		hnCommentSubmitter.target = '_blank';
		hnCommentSubmitter.addEventListener('click', hnreader_submitter.onSubmitterViewClick, false);
		hnCommentsListItemContent.appendChild(hnCommentSubmitter);
					
		/*Comment Timestamp */
		var hnCommentTime = hnBrowser.createElement('span');
		hnCommentTime.textContent =  hnreader.readableTime(commentCreateDate);
		hnCommentTime.className = 'hnreader-comment-time';
		hnCommentsListItemContent.appendChild(hnCommentTime);
					
		/* Comment link */
		var hnCommentLink = hnBrowser.createElement('a');
		hnCommentLink.href = 'http://news.ycombinator.com/item?id=' + commentId;
		hnCommentLink.className = 'hnreader-comment-link';
		hnCommentLink.target = '_blank';
		hnCommentLink.text = 'link';
		hnCommentsListItemContent.appendChild(hnCommentLink);
					
		/* Comment Replies */
		var hnCommentReplies = hnBrowser.createElement('a');
		hnCommentReplies.className = 'hnreader-comment-replies';
		hnCommentReplies.href = '';
		hnCommentReplies.text = '0 ';
		hnCommentReplies.style.display = 'none';
		hnCommentReplies.text = numChildren + (numChildren == 1 ? ' reply' : ' replies');
		
		hnCommentsListItemContent.appendChild(hnCommentReplies);
		hnCommentReplies.addEventListener('click', hnreader.onCommentExpandClick, false);
	
		if( numChildren > 0 ) {
			hnCommentReplies.text = numChildren + (numChildren == 1 ? ' reply' : ' replies');
			hnCommentReplies.style.display = "inline";
			/* Show thread expand / collapse */
			hnCommentThread.style.display = "inline";
		}
					
		/* Comment text */
		var hnCommentText = hnBrowser.createElement('p');
		hnCommentText.innerHTML = hnreader.readableText(commentText);
		hnCommentText.className = 'hnreader-comment-text';
		hnCommentsListItem.appendChild(hnCommentText);
				

		return hnCommentsListItem;
	},

  /**
   * Make comments expand or collapse as needed
   *
   * @return void
   **/
	onCommentThreadClick : function (e) {
		e.preventDefault();
		var expandSymbol = e.target.ownerDocument.getElementById(e.target.id);
		var thread = e.target.ownerDocument.getElementById(e.target.id.substring(7)); //thread-id
		var childThreads = thread.getElementsByClassName('hnreader-comment-items')[0].childNodes;

		if (expandSymbol.innerHTML == '[+]') {
			expandSymbol.innerHTML = '[-]';
			for (var index = 0; index < childThreads.length; index++) {
				childThreads[index].style.display = "list-item";
				if (childThreads[index].getElementsByClassName('hnreader-comment-items').childElementCount == 0)
					childThreads[index].getElementById('thread-' + childThreads[index].id).style.display = "none";
			}
		} 
		else {
			expandSymbol.innerHTML = '[+]';
			for (var index = 0; index < childThreads.length; index++) {
				childThreads[index].style.display = "none";
			}
		}
	}
}
