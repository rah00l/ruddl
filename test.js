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
            pusher: null,
            colWidth: 0,
            updateInterval: null,
            isLoading: false,
            currentURL: null,
            currentSection: 'hot',
            currentSubreddit: 'front',
            currentAfter: '0'
        },
        initialize: function() {
            this.set({pusher: new Pusher(this.get('key'))});
            this.on('change:socketId', function(e) {
                this.updateCurrentURL();
            });
            this.on('change:currentSection', function(e) {
                this.updateCurrentURL();
            });
            this.on('change:currentSubreddit', function(e) {
                this.updateCurrentURL();
            });
            this.on('change:currentAfter', function(e) {
                this.updateCurrentURL();
            });
            this.on('change:isLoading', function(e) {

            });
        },
        updateCurrentURL: function() {
            this.set({currentURL: '/feed/'+this.get('currentSubreddit')+'/'+this.get('currentSection')+'/'+this.get('currentAfter')+'/'+this.get('socketId')});
            console.log(this.get('currentURL'));
        }
    });

    App.Views.Main = Backbone.View.extend({
        el: $('body'),
        events: {
            'change #selSubreddit': 'changeSubreddit',
            'click .sub-nav dd': 'changeSection',
            'click #load-more': 'changeAfter'
        },
        initialize: function() {
            _.bindAll(this, 'changeSubreddit', 'changeSection', 'changeAfter', 'calcCols', 'initPusher', 'resize');
            this.appModel = new App.Models.Main();
            this.container = $('#container');
            this.loadMoreBtn = $('#load-more');

            $(window).on('resize', this.resize);
            this.appModel.attributes.pusher.connection.bind('connected', this.initPusher);
        },
        changeSubreddit: function(e) {
            var subreddit = $(e.target).find(":selected").val();
            this.appModel.set({currentSubreddit: subreddit});
        },
        changeSection: function(e) {
            var section = $(e.currentTarget).find('a').attr('data-section');
            $(e.currentTarget.parentElement.children).removeClass('active');
            $(e.currentTarget).addClass('active');
            this.appModel.set({currentSection: section});
        },
        changeAfter: function(e) {
            var uri = new URI($(e.currentTarget).attr('href').replace('#',''));
            var after = uri.segment(3);
            this.appModel.set({currentAfter: after});
            return false;
        },
        calcCols: function(reloadMasonry) {
            $('div.box').css('width', function(index) {
                var winWidth = $(window).width()-50;
                var cols = winWidth > 800 ? (winWidth > 1600 ? 4 : 3) : (winWidth > 600 ? 2 : 1);
                this.appModel.colWidth = winWidth/cols;
                return Math.floor(this.appModel.colWidth);
            });

            if(reloadMasonry)
                this.container.masonry('reload');
        },
        initPusher: function(e) {
            this.appModel.set({socketId: this.appModel.attributes.pusher.connection.socket_id});
            this.calcCols(false);
            this.container.masonry({
                itemSelector : '.box',
                isAnimated: false
            });
        },
        resize: function(e) {
            this.calcCols(true);
        }
    });

    App.Models.Story = Backbone.Model.extend({

    });

    App.Collections.Stories = Backbone.Collection.extend({
        model: App.Models.Story
    });

    App.Views.Story = Backbone.View.extend({
        events: {
            'click .premalink': 'toggleDone'
        },
        initialize: function() {
            this.template = Handlebars.compile($("#ruddl-template")).html();
        },
        render: function() {
            $(this.el).html(this.template(this.model.toJSON()));
            return this;
        }
    });
})(jQuery);


$(function() {
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

    new App.Views.Main();
});