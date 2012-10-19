;(function ($, window, undefined) {
  'use strict';

  var $doc = $(document),
      Modernizr = window.Modernizr;

  
  $.fn.foundationAlerts           ? $doc.foundationAlerts() : null;
  $.fn.foundationAccordion        ? $doc.foundationAccordion() : null;
  $.fn.foundationTooltips         ? $doc.foundationTooltips() : null;
  $('input, textarea').placeholder();
  
  
  $.fn.foundationButtons          ? $doc.foundationButtons() : null;
  
  
  $.fn.foundationNavigation       ? $doc.foundationNavigation() : null;
  
  
  $.fn.foundationTopBar           ? $doc.foundationTopBar() : null;
  
  $.fn.foundationCustomForms      ? $doc.foundationCustomForms() : null;
  $.fn.foundationMediaQueryViewer ? $doc.foundationMediaQueryViewer() : null;
  
    
    $.fn.foundationTabs             ? $doc.foundationTabs() : null;
    
  
  
    $("#featured").orbit();
  

  // UNCOMMENT THE LINE YOU WANT BELOW IF YOU WANT IE8 SUPPORT AND ARE USING .block-grids
  // $('.block-grid.two-up>li:nth-child(2n+1)').css({clear: 'both'});
  // $('.block-grid.three-up>li:nth-child(3n+1)').css({clear: 'both'});
  // $('.block-grid.four-up>li:nth-child(4n+1)').css({clear: 'both'});
  // $('.block-grid.five-up>li:nth-child(5n+1)').css({clear: 'both'});

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
    var $container = $('#container');

    calcCols();

    $container.imagesLoaded( function() {
        $container.masonry({
            itemSelector : '.box'
        });
    });

    function getUpdate(section) {
        $container.load("/" + section, function() {
           $container.imagesLoaded( function() {
                $container.masonry('reload');
            });
        });
    }

    function autoUpdate() {
        getUpdate($('.sub-nav dd.active').find('a').attr('href').replace('#/',''));
    }

    function calcCols() {
        var width = Math.floor(($(window).width()-70)/3);
        console.log(width);
        $('.box').css('width',width+'px');
        $container.masonry('reload');
    }

    $('.sub-nav dd').click(function() {
        $('.sub-nav dd').attr('class','');
        $(this).attr('class','active');
        getUpdate($(this).find('a').attr('href').replace('#/',''));
        return false;
    });

    window.setInterval(function() {
        autoUpdate();
    }, 60000);

    $(window).resize(function() {
        calcCols();
    });
});
