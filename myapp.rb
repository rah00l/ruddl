require "sinatra/base"
require "sinatra/reloader"

class MyApp < Sinatra::Base
  configure :development do
    enable :logging, :dump_errors, :raise_errors
    register Sinatra::Reloader
  end

  get "/" do
    @feed = SimpleRSS.parse open('http://news.ycombinator.com/rss')
    erb :index
  end
end