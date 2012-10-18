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

  get "/*" do
    section = params[:splat].first
    section.empty? ? section = 'hot' : section
    if(['hot','new','controversial','top'].include?(section))
      key = "ruddl_#{section}"
      @ruddl = Array.new
      if (redis.exists(key))
        @ruddl = Marshal.load(redis.get(key))
      else
        media_ext = ['jpg', 'jpeg', 'gif']
        @feed = JSON.parse(open("http://www.reddit.com/#{section}.json", "User-Agent" => "ruddl by /u/jesalg").read)
        @feed['data']['children'].each do |item|
          begin
            if (item['data']['over_18'] == false)
              if (item['data']['url'] =~ /#{media_ext.map { |m| Regexp.escape m }.join('|')}/)
                @ruddl.push(RuddlDoc.new(item['data']['id'], item['data']['title'], item['data']['url'], item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink'])))
              elsif (item['data']['domain'].include? 'imgur')
                host = "http://i.imgur.com"
                image = URI(item['data']['url']).path
                if (item['data']['url'].include? 'imgur.com/a/')
                  album_json = JSON.parse(open("http://api.imgur.com/2/album/"+image.gsub('/a/', '')+".json").read)
                  image = album_json['album']['images'][0]['image']['hash']
                end
                ext = (File.extname(image).length == 0) ? '.jpg' : ''
                @ruddl.push(RuddlDoc.new(item['data']['id'], item['data']['title'], URI.join(host, image+ext), item['data']['url'],URI.join('http://reddit.com/', item['data']['permalink'])))
              elsif (item['data']['domain'].include? 'quickmeme' or item['data']['domain'].include? 'qkme')
                host = "http://i.qkme.me"
                image = URI(item['data']['url'])
                ext = '.jpg'
                @ruddl.push(RuddlDoc.new(item['data']['id'], item['data']['title'], URI.join(host, image.path.gsub("/meme/", "").gsub("/", "")+ext), item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink'])))
              elsif (item['data']['domain'].include? 'youtube' or item['data']['domain'].include? 'youtu.be')
                @ruddl.push(RuddlDoc.new(item['data']['id'], item['data']['title'], item['data']['media']['oembed']['thumbnail_url'], item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink'])))
              elsif (item['data']['domain'].include? 'wikipedia')
                title = URI(item['data']['url']).path.gsub('/wiki/','')
                wiki_json = JSON.parse(open("http://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&format=json&iiprop=url&iilimit=1&generator=images&titles=#{title}&gimlimit=1").read)
                @ruddl.push(RuddlDoc.new(item['data']['id'], item['data']['title'], wiki_json['query']['pages']['-1']['imageinfo'][0]['url'], item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink'])))
              end
            end
          rescue => exception
            puts exception
          end
        end
        redis.set(key, Marshal.dump(@ruddl))
        redis.expire(key, 60)
      end
      erb :index, :layout => (request.xhr? ? false : :layout)
    end
  end
end