require "sinatra/base"
require "sinatra/reloader"
require "sinatra/multi_route"

class MyApp < Sinatra::Base

  @@redis = Redis.new

  register Sinatra::Synchrony
  register Sinatra::MultiRoute

  configure :development, :test do
    Pusher.app_id = '31874'
    Pusher.key    = '5521578d0346d88fe734'
    Pusher.secret = 'd3b3be3d1db365f4b9e1'

    enable :logging, :dump_errors, :raise_errors
    register Sinatra::Reloader
  end

  configure :production do
    uri = URI.parse(URI.encode(ENV["REDISTOGO_URL"]))
    @@redis = Redis.new(:host => uri.host, :port => uri.port, :password => uri.password)
  end

  set :sockets, []

  get '/' do
    erb :index
  end

  get '/app.js' do
    headers \
      "Content-Type" => "text/javascript"

    ERB.new(File.read('app.js')).result
  end

  get '/feed/*/*/:after/:socket_id', '/feed/*/*/:socket_id' do
    @subreddit = params[:splat][0]
    @section = params[:splat][1]
    @section.empty? ? @section = 'hot' : @section
    @after = params[:after];
    @after.empty? ? @after = '0' : params[:after]
    if (['hot', 'new', 'controversial', 'top'].include?(@section))
        if @subreddit == 'front'
          url = @after.nil? ? "http://www.reddit.com/#{@section}.json" : "http://www.reddit.com/#{@section}.json?after=#{@after}"
        else
          url = @after.nil? ? "http://www.reddit.com/r/#{@subreddit}/#{@section}.json" : "http://www.reddit.com/r/#{@subreddit}/#{@section}.json?after=#{@after}"
        end

        if (@@redis.exists(url))
          puts "loading from cache => #{url}"
          @feed = Marshal.load(@@redis.get(url))
        else
          puts "requesting => #{url}"
          @feed = JSON.parse(open(url, "User-Agent" => "ruddl by /u/jesalg").read)
          @@redis.set(url, Marshal.dump(@feed))
          @@redis.expire(url, 30)
        end

        if @feed['data']['children']
          ruddl = Ruddl.new
          @feed['data']['children'].each_with_index do |item, index|
            doc_key = item['data']['name']
            puts "#{index} => #{doc_key}"
            if (@@redis.exists(doc_key))
              puts "#{doc_key} found in cache"
              rdoc = Marshal.load(@@redis.get(doc_key))
            else
              rdoc = ruddl.parse_feed_item(item)
            end
            @@redis.set(doc_key, Marshal.dump(rdoc))
            @@redis.expire(doc_key, 28800)
            Pusher['ruddl'].trigger("#{@subreddit}-#{@section}-#{@after}-#{params[:socket_id]}", rdoc.to_json)
          end
        end
        status 200
    end
  end

  get '/comments/:id' do
    content_type :json
    @id = params[:id]
    puts @id
    data = JSON.parse(open("http://www.reddit.com/comments/#{@id}.json?depth=1&limit=10&sort=best", "User-Agent" => "ruddl by /u/jesalg").read)
    comments = Array.new
    data[1]['data']['children'].each_with_index do |item, index|
      if (item['data']['body'])
        comments.push(item['data']['body'])
      end
    end
    comments.to_json
  end
end