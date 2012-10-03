class MyApp < Sinatra::Base
  get "/" do
    rss = SimpleRSS.parse open('http://slashdot.org/index.rdf')
    rss.channel.title
  end
end