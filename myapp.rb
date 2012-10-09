require "sinatra/base"
require "sinatra/reloader"

class MyApp < Sinatra::Base
  redis = Redis.new

  configure :development do
    enable :logging, :dump_errors, :raise_errors
    register Sinatra::Reloader
  end

  get "/" do
    @feed = JSON.parse open('http://hndroidapi.appspot.com/news/format/json/page/?appid=&callback=').read
    @feed['items'].each do |item|
      begin
        key = Digest::MD5.hexdigest(item['url'])
        if(redis.exists(key))
          doc = Marshal.load(redis.get(key))
        elsif
          source = open(item['url']).read
          rdoc = Readability::Document.new(source, :tags => %w[div p ul li img a h1 h2 h3 h4 h5 h6 table tbody tr th td blockquote], :attributes => %w[src href target colspan rowspan], :remove_empty_nodes => false)
          doc = RuddlDoc.new(key, rdoc.images, rdoc.content)
          redis.set(key, Marshal.dump(doc))
        end
        item['content'] = doc.content
        item['images'] = doc.images
      rescue Exception => e
        puts e.message
      end
    end
    erb :index
  end
end