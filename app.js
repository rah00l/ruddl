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

        var container = $('#container');
        var loadMoreBtn = $('#load-more');
        var currentSection = 'hot';
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
                    isAnimated: !Modernizr.csstransitions
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
            uri.segment(1, currentSection);
            uri.segment(2, lastElem.id);
            $('#load-more').attr('href', '#' + uri.toString());
        };

        ruddl.prototype = {
            constructor: ruddl,
            changeSection: function(trigger) {
                var url = '/feed/' + trigger.attr('data-section');
                this.loadMore(url, trigger.attr('data-section'), true);
                return false;
            },
            loadMore : function(url, section, reset) {
                var self = this;
                url =  url + '/' + socketId;

                if(reset) {
                    container.empty();
                }

                loadMoreBtn.html('Loading...');
                loadMoreBtn.css('pointer-events', 'none');

                var pusher = new Pusher(key);
                var channel = pusher.subscribe('ruddl');
                channel.bind(section+'-'+socketId, function(data) {
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

    $('.sub-nav dd').click(function() {
        $('.sub-nav dd').attr('class','');
        $(this).attr('class','active');
        feed.changeSection($(this).find('a'));
    });

    $('#load-more').click(function() {
        feed.loadMore($(this));
        return false;
    });

    $(window).resize(function() {
        feed.calcCols(true);
    });
});
