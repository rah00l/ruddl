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
        var updateInterval = 30000;

        var ruddl = function () {
            this.calcCols(false);
            container.imagesLoaded(function() {
                container.masonry({
                    itemSelector : '.box',
                    isAnimated: !Modernizr.csstransitions
                });
            });
            //this.startTimer();
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
            var uri = new URI($('#page-nav a').attr('href'));
            uri.segment(uri.segment.length-1, parseInt(uri.segment(uri.segment.length-1)) + 1);
            uri.segment(uri.segment.length-2, lastElem.id);
            $('#load-more').attr('href', uri.toString())
        };

        ruddl.prototype = {
            constructor: ruddl,
            getUpdate : function (section) {
                container.load("/" + section, function() {
                    container.imagesLoaded( function() {
                        container.masonry('reload');
                    });
                });
            },
            loadMore : function(trigger) {
                var url = trigger.attr('href').replace('#','');
                trigger.html('Loading...');
                $.get(url, function(newElements) {
                    var newElems = $(newElements);
                    newElems.imagesLoaded(function() {
                        container.append(newElems).masonry('appended', newElems, true);
                        trigger.html('Load More');
                    });
                    updateNextURL(newElems);
                });
            },
            refreshFeed : function () {
                this.getUpdate($('.sub-nav dd.active').find('a').attr('href').replace('#/',''));
                this.calcCols(true);
            },
            calcCols : function (reloadMasonry) {
                var width = Math.floor(($(window).width()-70)/3);
                setCols(width);
                if(reloadMasonry)
                    container.masonry('reload');
            },
            startTimer : function() {
                parent = this;
                var counter = updateInterval / 1000;

                var timer = window.setInterval(function() {
                    $('.timer').html('Next update in: '+ counter-- +'s');
                }, 1000);

                var interval = window.setInterval(function() {
                    counter = updateInterval / 1000;
                    parent.refreshFeed();
                }, updateInterval);
            }
        };

        return ruddl;
    })();

    var feed = new ruddl();

    $('.sub-nav dd').click(function() {
        $('.sub-nav dd').attr('class','');
        $(this).attr('class','active');
        feed.getUpdate($(this).find('a').attr('href').replace('#/',''));
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
