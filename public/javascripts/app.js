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

        var ruddl = function () {
            this.calcCols(false);
            container.imagesLoaded( function() {
                container.masonry({
                    itemSelector : '.box'
                });
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

        ruddl.prototype = {
            constructor: ruddl,
            getUpdate : function (section) {
                container.load("/" + section, function() {
                    container.imagesLoaded( function() {
                        container.masonry('reload');
                    });
                });
            },
            autoUpdate : function () {
                this.getUpdate($('.sub-nav dd.active').find('a').attr('href').replace('#/',''));
            },
            calcCols : function (reloadMasonry) {
                var width = Math.floor(($(window).width()-70)/3);
                //$('.box').css('width',width+'px');
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
        feed.getUpdate($(this).find('a').attr('href').replace('#/',''));
        return false;
    });

    window.setInterval(function() {
        feed.autoUpdate();
    }, 60000);

    $(window).resize(function() {
        feed.calcCols(true);
    });

});
