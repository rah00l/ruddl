require "sinatra/base"
require "sinatra/reloader"

class MyApp < Sinatra::Base

  redis = Redis.new

  configure :development, :test do
    enable :logging, :dump_errors, :raise_errors
    register Sinatra::Reloader
  end

  configure :production do
    uri = URI.parse(URI.encode(ENV["REDISTOGO_URL"]))
    redis = Redis.new(:host => uri.host, :port => uri.port, :password => uri.password)
  end

  get "/" do
    @feed = JSON.parse(open("http://www.reddit.com/hot.json", "User-Agent" => "ruddl by /u/jesalg").read)
    @ruddl = Array.new
    @feed['data']['children'].each_with_index do |item, counter|
      begin
        if(item['data']['domain'].include? 'imgur')
          host = "http://i.imgur.com"
          image = URI(item['data']['url'])
          ext = (File.extname(image.path).length == 0) ? '.jpg' : ''
          @ruddl.push(RuddlDoc.new(item['data']['id'],item['data']['title'],URI.join(host,image.path+ext),item['data']['url']))
        elsif(item['data']['domain'].include? 'quickmeme')
          host = "http://i.qkme.me"
          image = URI(item['data']['url'])
          ext = '.jpg'
          @ruddl.push(RuddlDoc.new(item['data']['id'],item['data']['title'],URI.join(host,image.path.gsub("/meme/", "").gsub("/","")+ext),item['data']['url']))
        elsif(item['data']['domain'].include? 'youtube')
          @ruddl.push(RuddlDoc.new(item['data']['id'],item['data']['title'],item['data']['media']['oembed']['thumbnail_url'],item['data']['url']))
        end
      rescue Exception => e
        puts e.message
      end
    end
    erb :index
  end
end