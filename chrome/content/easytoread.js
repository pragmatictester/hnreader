/*
 * Hacker News Reader
 * Website: https://addons.mozilla.org/en-US/firefox/addon/hacker-news-reader/
 * Source: https://github.com/pragmatictester/hnreader
 *
 * Copyright (c) 2014+ pragmatictester
 * Licensed under the Mozilla Public License, version 1.1
 */

/* Prevent Javascript namepsace pollution */
var hnreader_easytoread = {

  /**
   * Display the website's favicon
   *
   * @return void
   **/
	getSiteFavicon : function (hnBrowser, webPage, target) {
		var faviconHref = null;

		var doc = Components.classes["@mozilla.org/xmlextras/domparser;1"]
								.createInstance(Components.interfaces.nsIDOMParser)
						    .parseFromString(webPage, "text/html");

		// See if the favicon has been specified as a <link> tag
		var links = doc.getElementsByTagName("link");

		for (i = 0; i < links.length; i++) {
			if (links[i].rel.indexOf("icon") != -1) {
				//favicon found
				faviconHref = links[i].href;
				// check if the link is a relative URL 
				if (faviconHref.indexOf('://') == -1) {
					// if the link is a relative URL starting with /, construct an absolute URL 
					if (faviconHref.indexOf('//') == 0) {
						faviconHref = target.protocol + faviconHref;
					} else if (faviconHref.indexOf('/') == 0 ) {
						faviconHref = target.protocol + "//" + target.host + faviconHref;
					} else {
					// relative URL starting with something other than / 
						faviconHref = target.protocol + "//" + target.host + '/' + faviconHref;
					}
				}	
				break;
			}
		}

		var articleFavicon = hnBrowser.createElement("div");
		articleFavicon.id = "favicon";
		var hrefFavicon = hnBrowser.createElement("a");
		hrefFavicon.href = target.protocol + "//" + target.hostname + "/";
		hrefFavicon.target = '_blank';
		hrefFavicon.title = target.host;

		if(faviconHref) {
			var imgFavicon = hnBrowser.createElement("img");
			imgFavicon.src = faviconHref;
			hrefFavicon.appendChild(imgFavicon);
			articleFavicon.appendChild(hrefFavicon);
		}


		return articleFavicon;
	},

  /**
   * Display the submitted story for maximum reading ease
	 * by removing unwanted page elements
   *
   * @return Cleaned-up HTML of the submitted story
   **/
	easyToRead : function (existingPage, pageUrl) {

		//Delete unwanted tags
		var delTags = ["noscript", "NOSCRIPT", "script", "SCRIPT", "meta", "iframe", "select", "input", "textarea", "fieldset", "nav", "footer"];
		for (var i = 0; i < delTags.length; i++) {
			hnreader_easytoread.removeTag(existingPage, delTags[i]);
		}

		//Delete hidden images
		var imgs = existingPage.getElementsByTagName("img");
		for (var im = imgs.length - 1; im >= 0; im--) {
			if ((imgs[im].style.visibility != undefined) && (imgs[im].style.visibility == 'hidden')) {
				imgs[im].parentNode.removeChild(imgs[im]);
			}
		}

		//Delete whitespace and comments
		hnreader_easytoread.removeWhiteSpaceComments(existingPage);

		//Delete elements that might be advertizements
		var pruneAdsTagList = ["ul", "div", "article", "section", "header", "form"];
		var totalSize = hnreader_easytoread.computeSize(existingPage);
		for (var p = 0; p < pruneAdsTagList.length; p++) {
			hnreader_easytoread.pruneAdsTag(existingPage, pageUrl, pruneAdsTagList[p], 0.7, totalSize);
		}

		//Delete select tags that have content length smaller than minSize
		//First, call with minSize ZERO
		var pruneTagList = ["li", "div", "ol", "ul", "form", "table", "article", "section", "header", "form"];
		var minSize = 0;
		totalSize = hnreader_easytoread.computeSize(existingPage);
		for (var p = 0; p < pruneTagList.length; p++) {
			hnreader_easytoread.pruneTag(existingPage, pruneTagList[p], 0.0, minSize, totalSize);
		}

		//Next, call with minsize 25 for a reduced subset of the tags
		pruneTagList = ["form", "div", "article", "section", "form"];
		minSize = 25;
		totalSize = hnreader_easytoread.computeSize(existingPage);
		for (var p = 0; p < pruneTagList.length; p++) {
			hnreader_easytoread.pruneTag(existingPage, pruneTagList[p], 0.0, minSize, totalSize);
		}

		//Change URLs from relative to absolute
		hnreader_easytoread.changeUrlsToAbsolute(existingPage, pageUrl);

		return existingPage;
	},

  /**
	 * Delete elements that represent white spaces and comments
   *
   * @return void
   **/
	removeWhiteSpaceComments : function (cdoc) {
		var cnodes = cdoc.childNodes;
		for (var i = cnodes.length - 1; i > -1; i--) {
			if (cnodes[i].nodeType == 1) {
				hnreader_easytoread.removeWhiteSpaceComments(cnodes[i]);
			}
			if (cnodes[i].nodeType == 3) {
				var allText = cnodes[i].data;
				cnodes[i].data = allText.replace(/\s{2,}/g, ' ');
			}
			if (cnodes[i].nodeType == 8) {
				cnodes[i].parentNode.removeChild(cnodes[i]);
			}
		}
	},

  /**
	 * Delete elements passed as arguments to the function
   *
   * @return void
   **/
	removeTag : function (cdoc, tagString) {
		var c = cdoc.getElementsByTagName(tagString);
		var len = c.length;
		var tElem;
		for (var dt = 0; dt < len; dt++) {
			tElem = c[len - dt - 1];
			// Do not delete iframes with links to youtube videos
			if ((tagString == "iframe") && (tElem.src.search(/youtube/) != -1)) {
					continue;
			} else {
				tElem.parentNode.removeChild(tElem);
			}
		}
	},

  /**
	 * Determine the size of the element passed as argument to the function
	 * Delete whitespace to get a better size estimate
   *
   * @return Size of the element passed as argument to the function
   **/
	computeSize : function (dElem) {
		if (dElem.innerHTML) {
			if (dElem.textContent) {
				return dElem.textContent.replace(/\s/g, '').length;
			} else if (dElem.innerText) {
				return dElem.innerText.replace(/\s/g, '').length;
			} else {
				return 0;
			}
		} else {
			return 0;
		}
	},

  /**
	 * Delete elements whose size is greater than a certain threshold
   *
   * @return void
   **/
	pruneAdsTag : function (cdoc, url, tagString, thresholdPctg, totalSize) {
		var c = cdoc.getElementsByTagName(tagString);
		var len = c.length;
		var tElem;
		for (var i = 0; i < len; i++) {
			tElem = c[len - i - 1];

			// If the div has a h1 child, do not delete it.
			var h1elems = tElem.getElementsByTagName("h1");
			if (h1elems.count > 0)
				continue;

			var h2elems = tElem.getElementsByTagName("h2");
			if (h2elems.count > 0)
				continue;

			var cLength = hnreader_easytoread.computeSize(tElem);
			var pctg = cLength / totalSize;
			// If the div/section/article is empty, delete it
			if (cLength == 0) {
				tElem.parentNode.removeChild(tElem);
			}
			// If the div does not contain a significant portion of the web content
			// and the div contain mainly list elements then delete it
			else if (pctg < 0.8) {
				var anchorNodes = tElem.getElementsByTagName("a");
				var anchorLength = 0;
				var num_words = 0;
				for (var j = 0; j < anchorNodes.length; j++) {
					// Ignore links that are # tags in the same document
					if (anchorNodes[j].href.split("#")[0] == url.split("#")[0])
						continue;
					anchorLength += hnreader_easytoread.computeSize(anchorNodes[j]);
					num_words += anchorNodes[j].textContent.split(/\s+/).length;
				}
				var avg_words_per_anchor = num_words / anchorNodes.length;
				var inner_div_pctg = anchorLength / cLength;
				// If the div has > thresholdPctg of its content within anchor nodes, delete it
				if (inner_div_pctg >= thresholdPctg) {
					tElem.parentNode.removeChild(tElem);
				}
			} else {
				// Do nothing
			}
		}
	},

  /**
	 * Delete elements whose size is greater than a certain threshold
	 * and a minimum size
   *
   * @return void
   **/
	pruneTag : function (cdoc, tagString, thresholdPctg, minSize, totalSize) {
		var c = cdoc.getElementsByTagName(tagString);
		var len = c.length;
		var tElem;
		for (var i = 0; i < len; i++) {
			tElem = c[len - i - 1];

			// If the div has a h1 child, do not delete it.
			var h1elems = tElem.getElementsByTagName("h1");
			if (h1elems.count > 0)
				continue;

			var h2elems = tElem.getElementsByTagName("h2");
			if (h2elems.count > 0)
				continue;

			var cLength = hnreader_easytoread.computeSize(tElem);
			var pctg = cLength / totalSize;
			// If the text content is > threshold of innerHTML, do not delete it.
			var ilength = tElem.innerHTML.replace('/\s/g', '').length + 1;
			var inner_html_pctg = cLength / ilength;
			if (((inner_html_pctg < 0.5) && (pctg < thresholdPctg)) || (cLength <= minSize)) {
				tElem.parentNode.removeChild(tElem);
			}
		}
	},

  /**
	 * Detect and change URLs and images from relative path to absolute path
   *
   * @return void
   **/
	changeUrlsToAbsolute : function (existingPage, pageUrl) {

		/* remove trailing slash from pageUrl */
		pageUrl = pageUrl.replace(/\/$/, "");

		var links = existingPage.getElementsByTagName("a");
		for (var i = 0; i < links.length; i++) {

			/* ensure that all links within the definition open in a new window */
			links[i].setAttribute("target", "_blank");

			/* check if the link is a relative URL */
			if (links[i].getAttribute("href") &&
				links[i].getAttribute("href").indexOf('://') == -1 &&
				links[i].getAttribute("href").indexOf('javascript') == -1) {

				var oldHref = links[i].getAttribute("href");
				var newHref = '';

				/* if the link is a relative URL starting with /, # or ?, construct an absolute URL */
				if (links[i].getAttribute("href").indexOf('/') == 0) {
					newHref = pageUrl + oldHref;
				} else if (links[i].getAttribute("href").indexOf('#') == 0 ||
					links[i].getAttribute("href").indexOf('?') == 0) {
					newHref = pageUrl + oldHref;
				} else {
					/* relative URL starting with something other than /, # or ? */
					newHref = pageUrl + '/' + oldHref;
				}

				/* convert to absolute URL */
				links[i].setAttribute("href", newHref);
			}
		}

		//now process images with relative urls
		var links = existingPage.getElementsByTagName("img");
		for (var i = 0; i < links.length; i++) {
			/* check if the link is a relative URL */
			if (links[i].getAttribute("src") && links[i].getAttribute("src").indexOf('://') == -1) {

				var oldHref = links[i].getAttribute("src");
				var newHref = '';

				/* if the link is a relative URL starting with /, construct an absolute URL */
				if (links[i].getAttribute("src").indexOf('/') == 0) {
					newHref = pageUrl + oldHref;
				} else if (links[i].getAttribute("src").indexOf('#') == 0 ||
					links[i].getAttribute("src").indexOf('?') == 0) {
					newHref = pageUrl + oldHref;
				} else {
					/* relative URL starting with something other than /, # or ? */
					newHref = pageUrl + '/' + oldHref;
				}
				/* convert to absolute URL */
				links[i].setAttribute("src", newHref);
			}
		}

	}
}
