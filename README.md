# Hacker News Reader

[Hacker News Reader](https://github.com/pragmatictester/hnreader) is a [Mozilla Firefox browser add-on](https://addons.mozilla.org/en-US/firefox/addon/hacker-news-reader/). It has a radically new interface that combines visual density with a clean design. The interface is completely powered by the [Algolia HN Search API](https://hn.algolia.io/api).

## Features

* After installing the add-on, customize your browser's navigation bar by dragging the add-on's icon on to it.
* Click on the icon in your browser's navigation bar to get the latest top stories.
* Each submitted story opens on the right-hand side of your screen in readbility mode.
* All the comments for the story open on the right-hand side of your screen with expand / collapse functionality.
* See each user's profile in a yellow Post-it style tooltip. Browse the user's latest submissions and comments in a new tab.
* The menu at the top of the page also lets you read all of these in new, separate tabs: 
    * the newest stories
    * the top stories over the last 7 days 
    * the top stories over the last 30 days
    * Show HN posts
    * Ask HN posts
    * Who is hiring? posts
    * Polls
* Poll results are displayed as horizontal bar graphs, sorted by the most popular choice at the top.
* For screenshots, please see the [add-on's page](https://addons.mozilla.org/en-US/firefox/addon/hacker-news-reader/).


## Algolia HN Search API Calls

### Top Stories for the past 24 hours

```
http://hn.algolia.com/api/v1/search_by_date?hitsPerPage=1000&tags=(story,poll)
&numericFilters=points>=5,created_at_i >= // (NOW-24 hrs)
```

Each story in the API response is assigned a Hotness Rank and then sorted by hotness to get an approximation of the listing on the [Hacker News home page](https://news.ycombinator.com/).

```javascript
hotness = Math.round( (num_points) * ((num_comments + 1)/5) / Math.pow(((recency + 2)),4) );
```


### Comments for each story

```
http://hn.algolia.com/api/v1/items/ // + storyId
```


### Newest Stories

```
http://hn.algolia.com/api/v1/search_by_date?hitsPerPage=30&tags=(story,poll)
```


### Top Stories over the last 7 days
The top 10 stories (by points) for each day are requested by calling this API in a loop, decrementing the days past each time. 

```
http://hn.algolia.com/api/v1/search?hitsPerPage=10&tags=(story,poll)&numericFilters
=created_at_i > // (NOW-7 days)
,created_at_i < // (NOW-6 days)
```


### Top 30 Stories over the last 30 days

```
http://hn.algolia.com/api/v1/search?hitsPerPage=30&tags=(story,poll)
&numericFilters=created_at_i >= // (NOW-30 days)
```


### Show HN posts

```
http://hn.algolia.com/api/v1/search_by_date?hitsPerPage=30&tags=show_hn
```


### Ask HN posts

```
http://hn.algolia.com/api/v1/search_by_date?hitsPerPage=30&tags=ask_hn
```


### Who is hiring? posts

```
http://hn.algolia.com/api/v1/search_by_date?hitsPerPage=1000&tags=story,author_whoishiring
```


### Polls

```
http://hn.algolia.com/api/v1/search_by_date?hitsPerPage=30&tags=poll
```

Each individual poll can be accessed by calling this API, which contains poll options and votes in the JSON response object:

```
http://hn.algolia.com/api/v1/items/ // + storyId
```

Poll results are displayed as horizontal bar graphs, sorted by the most popular choice at the top. For screenshots, please see the [add-on's page](https://addons.mozilla.org/en-US/firefox/addon/hacker-news-reader/).


### User's profile

```javascript
http://hn.algolia.com/api/v1/users/ // + username
```


### User's past story submissions

```
http://hn.algolia.com/api/v1/search_by_date?hitsPerPage=30&tags=(story,poll),author_ // + username
```


### User's past comments

```
http://hn.algolia.com/api/v1/search_by_date?hitsPerPage=30&tags=comment,author_ // + username
```

# Credits
    
* [Algolia HN Search API](https://hn.algolia.io/api). Several other [cool apps](https://hn.algolia.io/cool_apps) are built on top of this API. 
* [Dortmund Icon Set](http://pc.de/icons/#Dortmund) used under [CC-BY-3.0 license](https://creativecommons.org/licenses/by/3.0/).


# License

Code released under [Mozilla Public License, version 2.0](http://www.mozilla.org/MPL/2.0/).    
