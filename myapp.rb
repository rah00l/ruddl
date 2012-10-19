require "sinatra/base"
require "sinatra/reloader"

class MyApp < Sinatra::Base

  @@redis = Redis.new

  configure :development, :test do
    enable :logging, :dump_errors, :raise_errors
    register Sinatra::Reloader
  end

  configure :production do
    uri = URI.parse(URI.encode(ENV["REDISTOGO_URL"]))
    @@redis = Redis.new(:host => uri.host, :port => uri.port, :password => uri.password)
  end

  def parse_imgur(item)
    puts 'parsing imgur'
    key = item['data']['id']
    if (@@redis.exists(key))
      Marshal.load(@@redis.get(key))
    else
      host = "http://i.imgur.com"
      image = URI(item['data']['url']).path
      if (item['data']['url'].include? 'imgur.com/a/')
        album_json = JSON.parse(open("http://api.imgur.com/2/album/"+image.gsub('/a/', '')+".json").read)
        image = album_json['album']['images'][0]['image']['hash']
      end
      ext = (File.extname(image).length == 0) ? '.jpg' : ''
      rdoc = RuddlDoc.new(key, item['data']['title'], URI.join(host, image+ext), item['data']['url'],URI.join('http://reddit.com/', item['data']['permalink']))
      @@redis.set(key, Marshal.dump(rdoc))
      rdoc
    end
  end

  def parse_quickmeme(item)
    puts 'parsing quickmeme'
    key = item['data']['id']
    if (@@redis.exists(key))
      Marshal.load(@@redis.get(key))
    else
      host = "http://i.qkme.me"
      image = URI(item['data']['url'])
      ext = '.jpg'
      rdoc = RuddlDoc.new(key, item['data']['title'], URI.join(host, image.path.gsub("/meme/", "").gsub("/", "")+ext), item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink']))
      @@redis.set(key, Marshal.dump(rdoc))
      rdoc
    end
  end

  def parse_wikipedia(item)
    puts 'parsing wikipedia'
    key = item['data']['id']
    if (@@redis.exists(key))
      Marshal.load(@@redis.get(key))
    else
      title = URI(item['data']['url']).path.gsub('/wiki/','')
      wiki_json = JSON.parse(open("http://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&format=json&iiprop=url&iilimit=1&generator=images&titles=#{title}&gimlimit=1").read)
      begin
        rdoc = RuddlDoc.new(item['data']['id'], item['data']['title'], wiki_json['query']['pages']['-1']['imageinfo'][0]['url'], item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink']))
        @@redis.set(key, Marshal.dump(rdoc))
        rdoc
      rescue => exception
        puts exception
      end
    end
  end

  def parse_misc(item)
    puts "parsing misc => #{item['data']['url']}"
    key = item['data']['id']
    if (@@redis.exists(key))
      Marshal.load(@@redis.get(key))
    else
      begin
        uri = URI(item['data']['url'])
        source = open(uri).read
        doc = Readability::Document.new(source, :min_image_height => 0, :min_image_width => 0, :tags => %w[img], :attributes => %w[src], :remove_empty_nodes => false)
        best_image = nil
        doc.images.each do |image|
          if not (image =~ /^http:/)
            image = uri.scheme+'://'+uri.host+image
          end
          dimensions = FastImage.size(image)
          if(dimensions[0] >= 500 and dimensions[0]/dimensions[1] <= 2)
            best_image = image
            break
          end
        end
      rescue => exception
        puts exception
      end
      if not best_image.nil?
        rdoc = RuddlDoc.new(item['data']['id'], item['data']['title'], best_image, item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink']))
        @@redis.set(key, Marshal.dump(rdoc))
        rdoc
      else
        nil
      end
    end
  end

  def parse_feed(section)
    puts "#{section} requested"
    key = "ruddl_#{section}"
    ruddl = Array.new
    if (@@redis.exists(key))
      ruddl = Marshal.load(@@redis.get(key))
    else
      media_ext = ['jpg', 'jpeg', 'gif']
      @feed = JSON.parse(open("http://www.reddit.com/#{section}.json", "User-Agent" => "ruddl by /u/jesalg").read)
      @feed['data']['children'].each_with_index do |item, index|
        puts index
        if (item['data']['over_18'] == false)
          if (item['data']['url'] =~ /#{media_ext.map { |m| Regexp.escape m }.join('|')}/)
            ruddl.push(RuddlDoc.new(item['data']['id'], item['data']['title'], item['data']['url'], item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink'])))
          elsif (item['data']['domain'].include? 'imgur')
            ruddl.push(parse_imgur(item))
          elsif (item['data']['domain'].include? 'quickmeme' or item['data']['domain'].include? 'qkme')
            ruddl.push(parse_quickmeme(item))
          elsif (item['data']['domain'].include? 'youtube' or item['data']['domain'].include? 'youtu.be')
            ruddl.push(RuddlDoc.new(item['data']['id'], item['data']['title'], item['data']['media']['oembed']['thumbnail_url'], item['data']['url'], URI.join('http://reddit.com/', item['data']['permalink'])))
          elsif (item['data']['domain'].include? 'wikipedia')
            rdoc = parse_wikipedia(item)
            if not rdoc.nil?
              ruddl.push(rdoc)
            end
          else
            if not (item['data']['domain'].downcase.include? 'reddit')
              rdoc = parse_misc(item)
              if not rdoc.nil?
                ruddl.push(parse_misc(item))
              end
            end
          end
        end
      end
      @@redis.set(key, Marshal.dump(ruddl))
      @@redis.expire(key, 60)
    end
    ruddl
  end

  get "/*" do
    section = params[:splat].first
    section.empty? ? section = 'hot' : section
    if(['hot','new','controversial','top'].include?(section))
      @ruddl = parse_feed(section)
      erb :index, :layout => (request.xhr? ? false : :layout)
    end
  end
end