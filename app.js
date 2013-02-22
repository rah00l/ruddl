;(function ($, window, undefined) {
  'use strict';

  var $doc = $(document),
      Modernizr = window.Modernizr;

  // Hide address bar on mobile devices
  if (Modernizr.touch) {
    $(window).load(function () {
      setTimeout(function () {
        window.scrollTo(0, 1);
      }, 0);
    });
  }

})(jQuery, this);

$(function() {
    var ruddl = (function () {
        /*Pusher.log = function(message) {
            if (window.console && window.console.log) window.console.log(message);
        };*/
        var key = '<%= Pusher.key %>'
        var socketId = null;
        var pusher = null;

        var container = $('#container');
        var loadMoreBtn = $('#load-more');

        var currentSection = 'hot';
        var currentSubreddit = 'front';
        var currentAfter = '0';

		var source = $("#ruddl-template").html();
		var template = Handlebars.compile(source);
				
        var ruddl = function () {
            var self = this;
            var pusher = new Pusher(key);
            pusher.connection.bind('connected', function() {
                socketId = pusher.connection.socket_id;
                console.log(socketId);
                self.calcCols(false);
                container.masonry({
                    itemSelector : '.box',
                    isAnimated: false
                });
                self.loadMore(loadMoreBtn.attr('href').replace('#',''), loadMoreBtn.attr('data-section'), false);
            });
        };

        var setCols = function(width) {
            if (!document.styleSheets) return;
            var theRules = new Array();
            if (document.styleSheets[2].cssRules)
                theRules = document.styleSheets[2].cssRules
            else if (document.styleSheets[2].rules)
                theRules = document.styleSheets[2].rules
            else return;
            theRules[0].style.width = width+'px';
        };

        var updateNextURL = function() {
			var newElems = $($('#container').html());
            var lastElem = newElems[newElems.length-1];
            var uri = new URI(loadMoreBtn.attr('href').replace('#',''));
            uri.segment(1, currentSubreddit);
            uri.segment(2, currentSection);
            uri.segment(3, lastElem.id);
            $('#load-more').attr('href', '#' + uri.toString());
        };

        ruddl.prototype = {
            constructor: ruddl,
            changeSection: function(section) {
                pusher.disconnect();
                currentSection = section;
                var url = '/feed/' + currentSubreddit + '/' + currentSection + '/' + currentAfter;
                this.loadMore(url, true);
                return false;
            },
            changeSubreddit: function(subreddit) {
                pusher.disconnect();
                currentSubreddit = subreddit;
                var url = '/feed/' + currentSubreddit + '/' + currentSection + '/' + currentAfter;
                this.loadMore(url, true);
                return false;
            },
            changeAfter: function(after) {
                pusher.disconnect();
                currentAfter = after;
                var url = '/feed/' + currentSubreddit + '/' + currentSection + '/' + currentAfter;
                this.loadMore(url, false);
                return false;
            },
            loadMore : function(url, reset) {
                var self = this;
                url =  url + '/' + socketId;
                console.log(url);

                if(reset) {
                    container.empty();
                }

                loadMoreBtn.html('Loading...');
                loadMoreBtn.css('pointer-events', 'none');

                pusher = new Pusher(key);
                var channel = pusher.subscribe('ruddl');
                channel.bind(currentSubreddit+'-'+currentSection+'-'+currentAfter+'-'+socketId, function(data) {
                    if (data != "null") {
                        var newElems = $(template(data));
                        container.append(newElems).masonry('appended', newElems, true);
                        container.imagesLoaded( function() {
                            //self.calcCols(true);
                            container.masonry('reload');
                        });
                    }
                });

                channel.bind('pusher:subscription_succeeded', function() {
                    $.ajax({
                        type: 'get',
                        url: url
                    }).complete(function() {
                        loadMoreBtn.html('Load More');
                        loadMoreBtn.css('pointer-events', 'auto');
                        updateNextURL();
                    });
                });
            },
            calcCols : function (reloadMasonry) {
                var width = Math.floor(($(window).width()-70)/3);
				setCols(width);
                if(reloadMasonry)
                    container.masonry('reload');
            }
        };

        return ruddl;
    })();

    var feed = new ruddl();

    $("#selSubreddit").change(function() {
        var subreddit = $(this).find(":selected").val();
        feed.changeSubreddit(subreddit);
    });

    $('.sub-nav dd').click(function() {
        $('.sub-nav dd').attr('class','');
        $(this).attr('class','active');
        var setion = $(this).find('a').attr('data-section');
        feed.changeSection(setion);
    });

    $('#load-more').click(function() {
        var uri = new URI($(this).attr('href').replace('#',''));
        var after = uri.segment(3);
        feed.changeAfter(after);
        return false;
    });

    $(window).resize(function() {
        feed.calcCols(true);
    });
});
