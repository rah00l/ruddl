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
            container.imagesLoaded(function() {
                container.masonry({
                    itemSelector : '.box',
                    isAnimated: !Modernizr.csstransitions
                });
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
            var lastElem = newElems[newElems.length-1]
            var uri = new URI(loadMoreBtn.attr('href').replace('#',''));
            uri.segment(1, currentSection);
            uri.segment(2, lastElem.id);
            $('#load-more').attr('href', '#'+uri.toString());
        };

        ruddl.prototype = {
            constructor: ruddl,
            getUpdate : function (section) {
                currentSection = section.replace('/feed/','');
                container.load(section, function(data) {
                    container.imagesLoaded( function() {
                        container.masonry('reload');
                    });
                    updateNextURL($(data));
                });
            },
            loadMore : function(trigger, replace) {
			    var url = trigger.attr('href').replace('#','');
				
                trigger.html('Loading...');
                trigger.css('pointer-events', 'none');
				
				var ws = new WebSocket('ws://' + window.location.host + window.location.pathname + '/' + url);
				ws.onopen = function()  { console.log('websocket opened'); };
				ws.onclose = function()  { console.log('websocket closed'); }
				ws.onmessage = function(m) { 
					var newElems = template(m.data);
					console.log(newElems);
					if(replace) {
						container.html(newElems).masonry('reload');
					} else {
						container.append(newElems).masonry('appended', newElems, true);
					}
				};
				
                /*$.get(url, function(newElements) {
                    var newElems = $(newElements).hide();
                    newElems.imagesLoaded(function() {
                        if(replace) {
                            container.html(newElems).masonry( 'reload' )
                        } else {
                            container.append(newElems).masonry('appended', newElems, true);
                        }
                        newElems.show();
                        trigger.html('Load More');
                        trigger.css('pointer-events', 'auto');
                    });
                    updateNextURL(newElems);
                });*/
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
        feed.getUpdate($(this).find('a').attr('href').replace('#',''));
        return false;
    });

    $('#load-more').click(function() {
        feed.loadMore($(this), false);
        return false;
    });

    $(window).resize(function() {
        feed.calcCols(true);
    });
});
