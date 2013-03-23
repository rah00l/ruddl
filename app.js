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
        var colWidth = 0;

        var container = $('#container');
        var loadMoreBtn = $('#load-more');

        var currentSection = 'hot';
        var currentSubreddit = 'front';
        var currentAfter = '0';

		var source = $("#ruddl-template").html();
		var template = Handlebars.compile(source);

        var commentSource = $("#ruddl-comment-template").html();
        var commentTemplate = Handlebars.compile(commentSource);
				
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

            $('.premalink').live('click', function() {
                var key = $(this).attr('data-id');
                var comments = $('#'+key).find('.comments');
                var content = $('#'+key).find('.content');
                var commentHeight = content.height()-20;
                if(commentHeight < 250) {
                    commentHeight = 250;
                    content.height(commentHeight+20);
                    self.calcCols(true);
                }
                comments.height(commentHeight);
                if(comments.html().length == 0) {
                    $.ajax({
                        type:'GET',
                        url: '/comments/'+key.split('_')[1],
                        success:function (data) {
                            $.each(data, function(index, item){
                                var newComment = $(commentTemplate(item));
                                comments.append(newComment);
                            });
                            comments.slideToggle();
                            content.slideToggle();
                        }
                    });
                } else {
                    comments.slideToggle();
                    content.slideToggle();
                }
                return false;
            });
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
                currentAfter = '0';
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

                if(reset) {
                    container.empty();
                }

                loadMoreBtn.html('Loading...');
                loadMoreBtn.css('pointer-events', 'none');

                pusher = new Pusher(key);
                var channel = pusher.subscribe('ruddl');

                var pagetitle = $('title').text();
                $('title').text('Loading');
                channel.bind(currentSubreddit+'-'+currentSection+'-'+currentAfter+'-'+socketId, function(data) {
                    if (data != "null") {
                        if (data == false) {
                            $('title').text(pagetitle);
                        } else {
                            $('title').text($('title').text() + '.');
                            var newElems = $(template(data));
                            container.append(newElems).masonry('appended', newElems, true);
                            newElems.imagesLoaded( function() {
                                newElems.show();
                                self.calcCols(true);
                            });
                        }
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
                $('div.box').css('width', function(index) {
                    var winWidth = $(window).width()-50;
                    var cols = winWidth > 800 ? (winWidth > 1600 ? 4 : 3) : (winWidth > 600 ? 2 : 1);
                    colWidth = winWidth/cols;
                    return Math.floor(colWidth);
                });

                if(reloadMasonry)
                    container.masonry('reload');
            },
            getColWidth : function() {
                if (colWidth == 0) {
                    this.calcCols(false);
                }
                return Math.round(colWidth);
            }
        };

        return ruddl;
    })();

    var feed = new ruddl();

    Handlebars.registerHelper('date_format', function(context, block) {
        return $.timeago(new Date(context*1000));
    });
    Handlebars.registerHelper('image_url', function(context, block) {
        if (context.indexOf('pagepeeker') == -1 && context.indexOf('gif') == -1) {
            return 'http://images.weserv.nl/?url='+context.substr(context.indexOf('://')+3)+'&w='+feed.getColWidth();
        } else {
            return context;
        }
    });

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
