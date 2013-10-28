# encoding: utf-8

require "sinatra/base"
require "sinatra/reloader"
require "sinatra/multi_route"
require "sinatra-websocket"

class Ruddl < Sinatra::Base

  @@redis = Redis.new

  register Sinatra::Synchrony
  register Sinatra::MultiRoute

  configure :development, :test do
    enable :logging, :dump_errors, :raise_errors
    register Sinatra::Reloader
  end

  configure :production do
    uri = URI.parse(ENV["REDISTOGO_URL"])
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

  get '/feed/*/*/:after' do
    if request.websocket?
      @subreddit = params[:splat][0]
      @section = params[:splat][1]
      @section.empty? ? @section = 'hot' : @section
      @after = params[:after];
      @feed = RuddlFactory.get_feed_items(@subreddit, @section, @after, @@redis)
      @channel = "#{@subreddit}-#{@section}-#{@after}"

      request.websocket do |ws|

        @con = {channel: @channel, socket: ws}

        ws.onopen do
          if @feed['data']['children']
            adshown = false
            rand_pos = rand(0..@feed['data']['children'].length-1)
            ws.send({:type => 'notification', :data => @feed['data']['children'].length}.to_json)
            @feed['data']['children'].each_with_index do |item, index|
              if index == rand_pos && !adshown
                ws.send({:type => 'ad', :data => {'key' => 'ad','ad' => true}.to_json}.to_json)
                adshown = true
              end
              rdoc = RuddlFactory.parse_feed_item(item, @@redis)
              ws.send({:type => 'story', :data => rdoc.to_json}.to_json)
            end
            ws.send({:type => 'notification', :data => -1}.to_json)
          end
          settings.sockets << @con
        end

        ws.onmessage do |msg|
          return_array = []
          settings.sockets.each do |hash|
            if hash[:channel] == @channel
              return_array << hash
            end
          end
          EM.next_tick { return_array.each{|s| s[:socket].send(msg) } }
        end

        ws.onclose do
          settings.sockets.each do |hash|
            if hash[:socket] == ws
              settings.sockets.delete(hash)
            end
          end
        end
      end
    end
  end

  get '/comments/:id' do
    content_type :json
    @id = params[:id]
    puts @id
    @data = JSON.parse(open("http://www.reddit.com/comments/#{@id}.json?depth=1&limit=10&sort=best", "User-Agent" => "ruddl by /u/jesalg").read)
    comments = Array.new
    @data[1]['data']['children'].each_with_index do |item, index|
      if (item['data']['body'])
        item['data']['body_html'] = Nokogiri::HTML(item['data']['body_html']).text
        item['data']['points'] = item['data']['ups'] - item['data']['downs']
        item['data']['permalink'] = "http://www.reddit.com#{@data[0]['data']['children'][0]['data']['permalink']}#{item['data']['id']}"
        comments.push(item['data'])
      end
    end
    comments.to_json
  end
end