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
        key = Digest::MD5.hexdigest(item.link)
        if(redis.exists(key))
          doc = Marshal.load(redis.get(key))
        elsif
          source = open(item.link).read
          rdoc = Readability::Document.new(source, :tags => %w[div p ul li img a h1 h2 h3 h4 h5 h6 table tbody tr th td blockquote], :attributes => %w[src href target colspan rowspan], :remove_empty_nodes => false)
          snippet = rdoc.content[0..500]
          doc = RuddlDoc.new(key, item.title, rdoc.images, rdoc.content, snippet)
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