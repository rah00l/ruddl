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
        var container = $('#container');
        var loadMoreBtn = $('#load-more');
        var currentSection = 'hot';
		var source = $("#ruddl-template").html();
		var template = Handlebars.compile(source);
				
        var ruddl = function () {
		   this.calcCols(false);
		   container.masonry({
				itemSelector : '.box',
				isAnimated: !Modernizr.csstransitions
			});
            this.loadMore(loadMoreBtn, false);
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

        var updateNextURL = function(newElems) {
			var newElems = $($('#container').html());
            var lastElem = newElems[newElems.length-1];
            var uri = new URI(loadMoreBtn.attr('href').replace('#',''));
            uri.segment(1, currentSection);
            uri.segment(2, lastElem.id);
            $('#load-more').attr('href', '#'+uri.toString());
        };

        ruddl.prototype = {
            constructor: ruddl,
            loadMore : function(trigger) {
				var self = this;
				var url = trigger.attr('href').replace('#','');
				var ws = new WebSocket('ws://' + window.location.host + window.location.pathname + url);
				ws.onopen = function() {
					self.calcCols(true);
					trigger.html('Loading...');
					trigger.css('pointer-events', 'none');
				};
				ws.onclose = function() {
					trigger.html('Load More');
					trigger.css('pointer-events', 'auto');				
					updateNextURL(); 
				}
				ws.onmessage = function(m) {
					if (m.data != "null") {
						var newElems = $(template(JSON.parse(m.data)));
						container.imagesLoaded( function() {
							container.append(newElems).masonry('appended', newElems, true);
						});
					}
				};
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
        feed.loadMore($(this).find('a'));
        return false;
    });

    $('#load-more').click(function() {
        feed.loadMore($(this));
        return false;
    });

    $(window).resize(function() {
        feed.calcCols(true);
    });
});
