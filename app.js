(function($){
    window.App = {
        Models: {},
        Collections: {},
        Views: {},
        Router: {}
    };

    App.Models.Main = Backbone.Model.extend({
        defaults: {
            key: '<%= Pusher.key %>',
            socketId: null,
            colWidth: 0,
            updateInterval: null,
            isLoading: false,
            isRefresh: false,
            currentURL: null,
            currentChannel: null,
            currentSection: 'hot',
            currentSubreddit: 'front',
            currentAfter: '0'
        },
        initialize: function() {
            this.on('change:socketId', function(e) {
                this.updateCurrentState();
            });
            this.on('change:currentSection', function(e) {
                this.updateCurrentState();
            });
            this.on('change:currentSubreddit', function(e) {
                this.updateCurrentState();
            });
            this.on('change:currentAfter', function(e) {
                this.updateCurrentState();
            });
            this.on('change:isRefresh', function(e) {
                if(this.get('isRefresh')) {
                    this.set({currentAfter:'0'});
                }
            });
        },
        updateCurrentState: function() {
            this.set({currentChannel: this.get('currentSubreddit')+'-'+this.get('currentSection')+'-'+this.get('currentAfter')+'-'+this.get('socketId')});
            this.set({currentURL: '/feed/'+this.get('currentSubreddit')+'/'+this.get('currentSection')+'/'+this.get('currentAfter')+'/'+this.get('socketId')});
        }
    });

    App.Views.Main = Backbone.View.extend({
        el: $('body'),
        events: {
            'change #selSubreddit': 'changeSubreddit',
            'click .sub-nav dd': 'changeSection',
            'click #load-more': 'loadMore',
            'click #add-to-chrome': 'addToChrome',
            'click #dismiss-notification': 'dismissNotification'
        },
        initialize: function() {
            _.bindAll(this, 'changeSubreddit', 'changeSection', 'loadNew', 'loadMore', 'checkUpdates', 'unsubAllChannels', 'calcCols', 'initPusher', 'resize', 'getStories');
            var self = this;
            this.appModel = new App.Models.Main();
            this.collection = new App.Collections.Stories();

            this.container = $('#container');
            this.loadMoreBtn = $('#load-more');

            this.listenTo(this.appModel, 'change:socketId', this.loadNew);
            this.listenTo(this.appModel, 'change:currentSection', this.loadNew);
            this.listenTo(this.appModel, 'change:currentSubreddit', this.loadNew);

            Handlebars.registerHelper('date_format', function(context, block) {
                return $.timeago(new Date(context*1000));
            });
            Handlebars.registerHelper('image_url', function(context, block) {
                if (context.indexOf('pagepeeker') == -1 && context.indexOf('gif') == -1) {
                    return 'http://images.weserv.nl/?url='+encodeURIComponent(context.substr(context.indexOf('://')+3))+'&w='+self.appModel.get('colWidth');
                } else {
                    return context;
                }
            });
            this.storyTemplate = Handlebars.compile($("#ruddl-story-template").html());
            this.commentTemplate = Handlebars.compile($("#ruddl-comment-template").html());

            $(window).on('resize', this.resize);

            this.pusher = new Pusher(this.appModel.get('key'));
            this.pusher.connection.bind('connected', this.initPusher);
            /*Pusher.log = function(message) {
                if (window.console && window.console.log) window.console.log(message);
            };*/

            if (typeof chrome !== "undefined" && !chrome.app.isInstalled) {
                $('#notification').fadeIn();
            }
        },
        changeSubreddit: function(e) {
            var subreddit = $(e.target).find(":selected").val();
            this.appModel.set({currentSubreddit: subreddit, currentAfter: '0', isRefresh: false});
            $("html, body").animate({ scrollTop: 0 }, "slow");
            $(e.target).blur();
            mixpanel.track("Subreddit Changed",{'subreddit':subreddit});
            return false;
        },
        changeSection: function(e) {
            var section = $(e.currentTarget).find('a').attr('data-section');
            $(e.currentTarget.parentElement.children).removeClass('active');
            $(e.currentTarget).addClass('active');
            this.appModel.set({currentSection: section, currentAfter: '0', isRefresh: false});
            $("html, body").animate({ scrollTop: 0 }, "slow");
            mixpanel.track("Section Changed",{'section':section});
            return false;
        },
        loadNew: function(e) {
            //appRouter.navigate(this.appModel.get('currentURL'))
            this.collection.reset();
            this.container.empty();
            this.getStories();
        },
        loadMore: function(e) {
            this.appModel.set({isRefresh: false});
            this.getStories();
            mixpanel.track("Load More Clicked");
            return false;
        },
        addToChrome: function(e) {
            chrome.webstore.install("https://chrome.google.com/webstore/detail/llpknfhbmlngapjlboenfmmeminfdpil",
            function(e) {
                $('#notification').fadeOut();
            },
            function(e) {
                console.log(e);
            });
            return false;
        },
        dismissNotification: function(e) {
            $('#notification').fadeOut();
            return false;
        },
        checkUpdates: function(e) {
            if(!this.appModel.get('isLoading')) {
                this.appModel.set({isRefresh: true});
                this.appModel.trigger('change:isRefresh')
                this.getStories();
            }
        },
        unsubAllChannels: function() {
            var self = this;
            var objectKeys = $.map(this.pusher.channels.channels, function(value, key) {
                return key;
            });
            $.each(objectKeys, function(index, value) {
                self.pusher.unsubscribe(value);
            });
        },
        calcCols: function(reloadMasonry) {
            var self = this;
            $('div.box').css('width', function(index) {
                var winWidth = $(window).width()-50;
                var cols = winWidth > 800 ? (winWidth > 1600 ? 4 : 3) : (winWidth > 600 ? 2 : 1);
                self.appModel.set({colWidth: Math.floor(winWidth/cols)});
                return self.appModel.get('colWidth');
            });

            if(reloadMasonry)
                this.container.masonry('reload');
        },
        initPusher: function(e) {
            this.appModel.set({socketId: this.pusher.connection.socket_id});
            this.calcCols(false);
            this.container.masonry({
                itemSelector : '.box',
                isAnimated: false
            });
        },
        resize: function(e) {
            this.calcCols(true);
        },
        getStories: function() {
            var self = this;
            var count = 0;
            var total = 0;
            var refresh = self.appModel.get('isRefresh');
            clearInterval(self.appModel.get('updateInterval'));
            $.pnotify_remove_all();
            self.unsubAllChannels();
            var notice = $.pnotify({
                text: refresh ? 'Checking for updates...' : 'Loading...',
                hide: false,
                closer: false,
                sticker: false,
                shadow: false,
                addclass: 'stack-bottomright custom',
                stack: {"dir1": "up", "dir2": "left", "firstpos1": 50, "firstpos2": 25},
                opacity: .8,
                nonblock: true,
                nonblock_opacity: .2,
                delay: 3000,
                history: false,
                animate_speed: 'fast',
                width: '190px',
                icon: 'icon-spinner icon-spin'
            });

            var channel = this.pusher.subscribe(this.appModel.get('currentChannel'));
            channel.bind('pusher:subscription_succeeded', function() {
                $.ajax({
                    type: 'get',
                    url: self.appModel.get('currentURL')
                });
            });
            channel.bind('story', function(data) {
                if(data != null) {
                    var storyModel = new App.Models.Story(data);
                    var exists = self.collection.get(storyModel.id);
                    if(!exists) {
                        var storyView = new App.Views.Story({model: storyModel, parent: self});
                        var newElems = $(storyView.render().el);
                        self.collection.add(storyView.model);
                        if(refresh) {
                            self.container.prepend(newElems).masonry();
                        } else {
                            self.container.append(newElems).masonry('appended', newElems, true);
                        }
                        newElems.imagesLoaded(function() {
                            newElems.show();
                            self.calcCols(true);
                        });
                        count++;
                        notice.pnotify({hide: false, text: refresh ? 'Adding '+count+' new items...' : Math.floor((count/total)*100) + "% complete..."});
                    }
                }
            });
            channel.bind('notification', function(data) {
                if(data == -1) {
                    notice.pnotify({hide: true});
                    self.pusher.unsubscribe(self.appModel.get('currentChannel'));
                    self.appModel.set({
                        isLoading: false,
                        currentAfter: self.collection.last().get('key'),
                        updateInterval: setInterval(function(){
                            self.checkUpdates();
                        }, 60000)
                    });
                    self.loadMoreBtn.html('Load More');
                    self.loadMoreBtn.css('pointer-events', 'auto');
                } else {
                    total = data;
                    self.appModel.set({isLoading: true});
                    self.loadMoreBtn.html('Loading...');
                    self.loadMoreBtn.css('pointer-events', 'none');
                }
            });
        }
    });

    App.Models.Story = Backbone.Model.extend({
        idAttribute: "key"
    });

    App.Collections.Stories = Backbone.Collection.extend({
        model: App.Models.Story
    });

    App.Views.Story = Backbone.View.extend({
        events: {
            'click .premalink': 'showComments'
        },
        initialize: function(options) {
            _.bindAll(this, 'render', 'showComments');
            this.parent = options.parent;
        },
        render: function() {
            this.setElement(this.parent.storyTemplate(this.model.attributes));
            return this;
        },
        showComments: function(e) {
            var self = this;
            var key = this.model.id;
            var comments = $('#'+key).find('.comments');
            var content = $('#'+key).find('.content');
            var commentHeight = content.height()-20;
            if(commentHeight < 250) {
                commentHeight = 250;
                content.height(commentHeight+20);
                self.parent.calcCols(true);
            }
            comments.height(commentHeight);
            if(comments.html().length == 0) {
                var notice = $.pnotify({
                    text: 'Loading comments...',
                    hide: false,
                    closer: false,
                    sticker: false,
                    shadow: false,
                    addclass: 'stack-bottomright custom',
                    stack: {"dir1": "up", "dir2": "left", "firstpos1": 50, "firstpos2": 25},
                    opacity: .8,
                    nonblock: true,
                    nonblock_opacity: .2,
                    delay: 1000,
                    history: false,
                    animate_speed: 'fast',
                    width: '190px',
                    icon: 'icon-spinner icon-spin'
                });
                $.ajax({
                    type:'GET',
                    url: '/comments/'+key.split('_')[1],
                    success:function (data) {
                        var newComments = $(self.parent.commentTemplate(data));
                        comments.append(newComments);
                        comments.slideToggle();
                        content.slideToggle();
                        notice.pnotify({hide: true});
                    }
                });
            } else {
                comments.slideToggle();
                content.slideToggle();
            }
            mixpanel.track("Show Comments Clicked");
            return false;
        }
    });

    App.Router.Main = Backbone.Router.extend({
        routes: {
            "": "defaultRoute",
            "feed/:subreddit/:section/:after/:socketId": "getStories"
        },
        initialize: function(options) {
            _.bindAll(this, 'defaultRoute','getStories');
            this.app = new App.Views.Main();
        },
        defaultRoute: function() {},
        getStories: function(subreddit, section, after) {
            //this.app.appModel.set({currentSubreddit:subreddit, currentSection:section, currentAfter:after});
        }
    });
})(jQuery);


$(function() {
    window.appRouter = new App.Router.Main();
    Backbone.history.start();
});