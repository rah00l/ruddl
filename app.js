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
            'click #load-more': 'loadMore'
        },
        initialize: function() {
            _.bindAll(this, 'changeSubreddit', 'changeSection', 'loadMore', 'checkUpdates', 'unsubAllChannels', 'calcCols', 'initPusher', 'resize', 'getStories');
            this.appModel = new App.Models.Main();
            this.container = $('#container');
            this.loadMoreBtn = $('#load-more');
            this.storyTemplate = Handlebars.compile($("#ruddl-story-template").html());
            this.commentTemplate = Handlebars.compile($("#ruddl-comment-template").html());
            this.collection = new App.Collections.Stories();

            $(window).on('resize', this.resize);

            this.pusher = new Pusher(this.appModel.get('key'));
            this.pusher.connection.bind('connected', this.initPusher);
            /*Pusher.log = function(message) {
                if (window.console && window.console.log) window.console.log(message);
            };*/
        },
        changeSubreddit: function(e) {
            this.collection.reset();
            var subreddit = $(e.target).find(":selected").val();
            this.container.empty();
            this.appModel.set({currentSubreddit: subreddit, currentAfter: '0', isRefresh: false});
            this.getStories();
            $("html, body").animate({ scrollTop: 0 }, "slow");
            $(e.target).blur();
            return false;
        },
        changeSection: function(e) {
            this.collection.reset();
            var section = $(e.currentTarget).find('a').attr('data-section');
            $(e.currentTarget.parentElement.children).removeClass('active');
            $(e.currentTarget).addClass('active');
            this.container.empty();
            this.appModel.set({currentSection: section, currentAfter: '0', isRefresh: false});
            this.getStories();
            $("html, body").animate({ scrollTop: 0 }, "slow");
            return false;
        },
        loadMore: function(e) {
            this.appModel.set({isRefresh: false});
            this.getStories();
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
            this.getStories();
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
                stack: {"dir1": "up", "dir2": "left", "firstpos1": 25, "firstpos2": 25},
                opacity: .8,
                nonblock: true,
                nonblock_opacity: .2,
                delay: 3000,
                history: false,
                animate_speed: 'fast',
                width: '150px'
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
                        notice.pnotify({hide: false, text: refresh ? 'Adding '+count+' new items...' : Math.floor((count/total)*100) + "% complete."});
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
            _.bindAll(this, 'render');
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
                $.ajax({
                    type:'GET',
                    url: '/comments/'+key.split('_')[1],
                    success:function (data) {
                        $.each(data, function(index, item){
                            var newComment = $(self.parent.commentTemplate(item));
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
        }
    });
})(jQuery);


$(function() {
    var ruddl = new App.Views.Main();
    Handlebars.registerHelper('date_format', function(context, block) {
        return $.timeago(new Date(context*1000));
    });
    Handlebars.registerHelper('image_url', function(context, block) {
        if (context.indexOf('pagepeeker') == -1 && context.indexOf('gif') == -1) {
            return 'http://images.weserv.nl/?url='+encodeURIComponent(context.substr(context.indexOf('://')+3))+'&w='+ruddl.appModel.get('colWidth');
        } else {
            return context;
        }
    });
});