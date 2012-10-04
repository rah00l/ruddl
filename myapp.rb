require "sinatra/base"
require "sinatra/reloader"

class MyApp < Sinatra::Base
  configure :development do
    register Sinatra::Reloader
  end

  get "/" do
    feed = SimpleRSS.parse open('http://slashdot.org/index.rdf')
    #http://snippets.aktagon.com/snippets/164-How-to-use-Ruby-and-SimpleRSS-to-parse-RSS-and-Atom-feeds-
    erb :index
  end
end