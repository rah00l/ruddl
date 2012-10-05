require "sinatra/base"
require "sinatra/reloader"

class MyApp < Sinatra::Base
  configure :development do
    enable :logging, :dump_errors, :raise_errors
    register Sinatra::Reloader
  end

  get "/" do
    #http://ai-depot.com/articles/the-easy-way-to-extract-useful-text-from-arbitrary-html/
    @feed = SimpleRSS.parse open('http://news.ycombinator.com/rss')
    @docs = []
    @feed.items.each do |item|
      begin
        doc = Pismo::Document.new(item.link)
        @docs.push(doc)
      rescue
        puts 'I am rescued.'
      end
    end
    erb :index
  end
end