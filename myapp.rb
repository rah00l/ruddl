require "sinatra/base"
require "sinatra/reloader"
require "sinatra/multi_route"

class MyApp < Sinatra::Base

  @@redis = Redis.new

  register Sinatra::Synchrony
  register Sinatra::MultiRoute

  configure :development, :test do
    enable :logging, :dump_errors, :raise_errors
    register Sinatra::Reloader
  end

  configure :production do
    uri = URI.parse(URI.encode(ENV["REDISTOGO_URL"]))
    @@redis = Redis.new(:host => uri.host, :port => uri.port, :password => uri.password)
  end

  def parse_video(item)
    puts 'parsing video'
    begin
      rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], item['data']['media']['oembed']['thumbnail_url'], nil, item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink']))
    rescue => exception
      puts exception
    end
    rdoc
  end

  def parse_imgur(item)
    puts 'parsing imgur'
    host = "http://i.imgur.com"
    image = URI(item['data']['url']).path
    if (item['data']['url'].include? 'imgur.com/a/')
      album_json = JSON.parse(open("http://api.imgur.com/2/album/"+image.gsub('/a/', '')+".json").read)
      image = album_json['album']['images'][0]['image']['hash']
    end
    ext = (File.extname(image).length == 0) ? '.jpg' : ''
    rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], URI.join(host, image+ext), nil, item['data']['url'],URI.join('http://reddit.com/', item['data']['permalink']))
    rdoc
  end

  def parse_quickmeme(item)
    puts 'parsing quickmeme'
    host = "http://i.qkme.me"
    image = URI(item['data']['url'])
    ext = '.jpg'
    rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], URI.join(host, image.path.gsub("/meme/", "").gsub("/", "")+ext), nil, item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink']))
    rdoc
  end

  def parse_wikipedia(item)
    puts 'parsing wikipedia'
    title = URI(item['data']['url']).path.gsub('/wiki/','')
    wiki_json = JSON.parse(open("http://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&format=json&iiprop=url&iilimit=1&generator=images&titles=#{title}&gimlimit=1").read)
    begin
      rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], wiki_json['query']['pages']['-1']['imageinfo'][0]['url'], nil, item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink']))
      rdoc
    rescue => exception
      puts exception
    end
  end

  def parse_misc(item)
    puts "parsing misc => #{item['data']['url']}"
    begin
      uri = URI(item['data']['url'])
      images = Nokogiri::HTML(open(uri)).css('//img/@src').to_a
      best_image = nil
      #sized_images = Hash.new
      images.each do |image|
        image = image.to_s
        if not (['analytics','button','icon','loader.gif','spacer.gif','clear.gif','blank.gif','gravatar','doubleclick'].any? { |s| image.include?(s) })
          if not (image =~ /^http:/)
            image = uri.scheme+'://'+uri.host+image
          end
          puts "getting the size of => #{image}"
          dimensions = FastImage.size(URI.encode(image))
          #sized_images[image] = dimensions
          if not dimensions.nil?
            if(dimensions[0] >= 450 and dimensions[0]/dimensions[1] <= 2)
              best_image = image.to_s
              break
            end
          end
        end
      end
    rescue => exception
      puts exception
    end

    if best_image.nil?
      best_image = "http://pagepeeker.com/thumbs.php?size=x&url=#{URI::encode(item['data']['url'])}"
    end

    if not best_image.nil?
      rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], best_image, nil, item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink']))
      rdoc
    else
      nil
    end
  end

  def parse_reddit(item)
    puts 'parsing reddit'
    begin
      rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], nil, Nokogiri::HTML(item['data']['selftext_html']).text, item['data']['url'], URI.join('http://reddit.com/', URI.encode(item['data']['permalink'])))
      rdoc
    rescue => exception
      puts exception
    end
  end

  def parse_feed_item(item)
    rdoc = nil
    if (item['data']['over_18'] == false)
      if (item['data']['url'] =~ /#{['jpg', 'jpeg', 'gif', 'png'].map { |m| Regexp.escape m }.join('|')}/)
        rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], item['data']['url'], nil, item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink']))
      elsif (item['data']['domain'].include? 'imgur')
        rdoc = parse_imgur(item)
      elsif (item['data']['domain'].include? 'quickmeme' or item['data']['domain'].include? 'qkme')
        rdoc = parse_quickmeme(item)
      elsif (item['data']['domain'].include? 'youtube' or item['data']['domain'].include? 'youtu.be' or item['data']['domain'].include? 'vimeo')
        rdoc = parse_video(item)
      elsif (item['data']['domain'].include? 'wikipedia')
        rdoc = parse_wikipedia(item)
      elsif (item['data']['url'].include? 'reddit.com')
        rdoc = parse_reddit(item)
      else
        rdoc = parse_misc(item)
      end
    end
    return rdoc
  end

  def parse_feed(section, after)
    key = after.nil? ? "ruddl_#{section}" : "ruddl_#{section}_#{after}"
    puts "#{key} requested"
    ruddl = Array.new
    if (@@redis.exists(key))
      ruddl = Marshal.load(@@redis.get(key))
    else
      url = after.nil? ? "http://www.reddit.com/#{section}.json" : "http://www.reddit.com/#{section}.json?after=#{after}"
      puts "requesting => #{url}"
      @feed = JSON.parse(open(url, "User-Agent" => "ruddl by /u/jesalg").read)
      if @feed['data']['children']
        @feed['data']['children'].each_with_index do |item, index|
          doc_key = item['data']['name']
          puts "#{index} => #{doc_key}"
          if (@@redis.exists(doc_key))
            puts "#{doc_key} found in cache"
            rdoc = Marshal.load(@@redis.get(doc_key))
          else
            rdoc = parse_feed_item(item)
          end
          if not rdoc.nil?
            ruddl.push(rdoc)
          end
          @@redis.set(doc_key, Marshal.dump(rdoc))
          @@redis.expire(doc_key, 28800)
        end
        @@redis.set(key, Marshal.dump(ruddl))
        @@redis.expire(key, 30)
      end
    end
    ruddl
  end

  get '/' do
    erb :index
  end

  get '/feed/*/:after', '/feed/*' do
    @section = params[:splat].first
    @section.empty? ? @section = 'hot' : @section
    @after = params[:after]
    if(['hot','new','controversial','top'].include?(@section))
      @ruddl = parse_feed(@section, @after)
      erb :feed, :layout => false
    end
  end
end