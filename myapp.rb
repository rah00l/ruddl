require "sinatra/base"
require "sinatra/reloader"

class MyApp < Sinatra::Base
  redis = Redis.new

  configure :development do
    enable :logging, :dump_errors, :raise_errors
    register Sinatra::Reloader
  end

  get "/" do
    #http://tomazkovacic.com/blog/56/list-of-resources-article-text-extraction-from-html-documents/
    @feed = SimpleRSS.parse open('http://news.ycombinator.com/rss')
    @docs = []
    @feed.items.each do |item|
      begin
        key = Base64.encode64(item.link)
        if(redis.exists(key))
          doc = Marshal.load(redis.get(key))
        elsif
          source = open(item.link).read
          rdoc = Readability::Document.new(source)
          doc = RuddlDoc.new(rdoc.title, rdoc.images, rdoc.content)
          redis.set(key, Marshal.dump(doc))
        end
        @docs.push(doc)
      rescue Exception => e
        puts e.message
      end
    end
    erb :index
  end
end