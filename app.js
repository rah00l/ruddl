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
        var updateInterval = null;
        var isLoading = false;
        var currentURL = null;

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
                self.loadMore(loadMoreBtn.attr('href').replace('#',''), loadMoreBtn.attr('data-section'), false, false);
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
                currentSection = section;
                var url = '/feed/' + currentSubreddit + '/' + currentSection + '/' + currentAfter;
                this.loadMore(url, true, false);
                $("html, body").animate({ scrollTop: 0 }, "slow");
                return false;
            },
            changeSubreddit: function(subreddit) {
                currentSubreddit = subreddit;
                currentAfter = '0';
                var url = '/feed/' + currentSubreddit + '/' + currentSection + '/' + currentAfter;
                this.loadMore(url, true, false);
                $("html, body").animate({ scrollTop: 0 }, "slow");
                return false;
            },
            changeAfter: function(after) {
                currentAfter = after;
                var url = '/feed/' + currentSubreddit + '/' + currentSection + '/' + currentAfter;
                this.loadMore(url, false, false);
                return false;
            },
            loadMore : function(url, reset, prepend) {
                var self = this;
                var count = 0;
                var refresh = (url == currentURL) ? true : false;
                var stack_bottomright = {"dir1": "up", "dir2": "left", "firstpos1": 25, "firstpos2": 25};
                $.pnotify_remove_all();
                clearInterval(updateInterval);
                var notice = $.pnotify({
                    text: refresh ? 'Checking for updates...' : 'Loading...',
                    hide: false,
                    closer: false,
                    sticker: false,
                    shadow: false,
                    addclass: 'stack-bottomright custom',
                    stack: stack_bottomright,
                    opacity: .8,
                    nonblock: true,
                    nonblock_opacity: .2,
                    delay: 3000,
                    history: false,
                    animate_speed: 'fast',
                    width: '150px'
                });

                currentURL = url;
                url =  url + '/' + socketId;

                if(reset) {
                    container.empty();
                }

                loadMoreBtn.html('Loading...');
                loadMoreBtn.css('pointer-events', 'none');

                if (pusher)
                    pusher.disconnect();

                pusher = new Pusher(key);
                var channel = pusher.subscribe('ruddl');

                channel.bind(currentSubreddit+'-'+currentSection+'-'+currentAfter+'-'+socketId, function(data) {
                    if (data == false) {
                        isLoading = false;
                        var options = {hide: true};
                        updateInterval = setInterval(function(){
                            self.checkUpdates()
                        }, 60000);
                        loadMoreBtn.html('Load More');
                        loadMoreBtn.css('pointer-events', 'auto');
                        updateNextURL();
                    } else if (data != null && data.hasOwnProperty('key')) {
                        isLoading = true;
                        if($('#'+data['key']).length == 0) {
                            count++;
                            var options = {hide: false, text: refresh ? 'Adding '+count+' new items...' : Math.floor((count/25)*100) + "% complete."};
                            var newElems = $(template(data));
                            if(prepend) {
                                container.prepend(newElems).masonry();
                            } else {
                                container.append(newElems).masonry('appended', newElems, true);
                            }
                            newElems.imagesLoaded( function() {
                                newElems.show();
                                self.calcCols(true);
                            });
                        } else {
                            var options = {hide: true};
                        }
                    }
                    notice.pnotify(options);
                });

                channel.bind('pusher:subscription_succeeded', function() {
                    $.ajax({
                        type: 'get',
                        url: url
                    });
                });
            },
            checkUpdates : function() {
                if(!isLoading) {
                    this.loadMore(currentURL, false, true);
                }
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
            return 'http://images.weserv.nl/?url='+encodeURIComponent(context.substr(context.indexOf('://')+3))+'&w='+feed.getColWidth();
        } else {
            return context;
        }
    });

    $("#selSubreddit").change(function() {
        var subreddit = $(this).find(":selected").val();
        feed.changeSubreddit(subreddit);
    });

    $('.sub-nav dd').click(function() {
        $('.sub-nav dd').removeClass('active');
        $(this).addClass('active');
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
