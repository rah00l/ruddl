# encoding: utf-8

module RuddlFactory

  def self.get_feed_items(subreddit, section, after, cache)
    @feed = nil
    if (['hot', 'new', 'controversial', 'top'].include?(section))
      if subreddit == 'front'
        url = after.nil? ? "http://www.reddit.com/#{section}.json" : "http://www.reddit.com/#{section}.json?after=#{after}"
      else
        url = after.nil? ? "http://www.reddit.com/r/#{subreddit}/#{section}.json" : "http://www.reddit.com/r/#{subreddit}/#{section}.json?after=#{after}"
      end

      if (cache.exists(url))
        puts "loading from cache => #{url}"
        @feed = Marshal.load(cache.get(url))
      else
        puts "requesting => #{url}"
        @feed = JSON.parse(open(url, "User-Agent" => "ruddl by /u/jesalg").read)
        cache.set(url, Marshal.dump(@feed))
        cache.expire(url, 30)
      end
    end
    @feed
  end

  def self.parse_feed_item(item, cache)
    rdoc = nil
    doc_key = item['data']['name']
    if (cache.exists(doc_key))
      puts "#{doc_key} found in cache"
      rdoc = Marshal.load(cache.get(doc_key))
    else
      if (item['data']['over_18'] == false)
        if (item['data']['url'] =~ /#{['jpg', 'jpeg', 'gif', 'png'].map { |m| Regexp.escape m }.join('|')}/)
          rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], item['data']['url'], nil, nil, item['data']['url'], URI.join('http://reddit.com/', URI.encode(item['data']['permalink'])))
        elsif (item['data']['domain'].include? 'imgur')
          rdoc = self.parse_imgur(item)
        elsif (item['data']['domain'].include? 'quickmeme' or item['data']['domain'].include? 'qkme')
          rdoc = self.parse_quickmeme(item)
        elsif (item['data']['domain'].include? 'youtube' or item['data']['domain'].include? 'youtu.be' or item['data']['domain'].include? 'vimeo')
          rdoc = self.parse_video(item)
        elsif (item['data']['domain'].include? 'wikipedia')
          rdoc = self.parse_wikipedia(item)
        elsif (item['data']['url'].include? 'reddit.com')
          rdoc = self.parse_reddit(item)
        else
          rdoc = self.parse_misc(item)
        end
        if rdoc
          cache.set(doc_key, Marshal.dump(rdoc))
          cache.expire(doc_key, 28800)
        end
      end
    end
    rdoc
  end

  private

  def self.parse_video(item)
    puts 'parsing video'
    begin
      rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], item['data']['media']['oembed']['thumbnail_url'], Nokogiri::HTML(item['data']['media_embed']['content']).text, nil, item['data']['url'], URI.join('http://reddit.com/', URI.encode(item['data']['permalink'])))
    rescue => exception
      puts exception
    end
    rdoc
  end

  def self.parse_imgur(item)
    puts 'parsing imgur'
    host = "http://i.imgur.com"
    image = URI(item['data']['url']).path
    if (item['data']['url'].include? 'imgur.com/a/')
      album_json = JSON.parse(open("http://api.imgur.com/2/album/"+image.gsub('/a/', '')+".json").read)
      image = album_json['album']['images'][0]['image']['hash']
    end
    ext = (File.extname(image).length == 0) ? '.jpg' : ''
    rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], URI.join(host, image+ext), nil, nil, item['data']['url'], URI.join('http://reddit.com/', URI.join('http://reddit.com/',  URI.encode(item['data']['permalink']))))
    rdoc
  end

  def self.parse_quickmeme(item)
    puts 'parsing quickmeme'
    host = "http://i.qkme.me"
    image = URI(item['data']['url'])
    ext = '.jpg'
    rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], URI.join(host, image.path.gsub("/meme/", "").gsub("/", "")+ext), nil, nil, item['data']['url'], URI.join('http://reddit.com/', URI.encode(item['data']['permalink'])))
    rdoc
  end

  def self.parse_wikipedia(item)
    puts 'parsing wikipedia'
    title = URI.parse(URI.escape(item['data']['url'])).path.gsub('/wiki/', '')
    wiki_json = JSON.parse(open("http://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&format=json&iiprop=url&iilimit=1&generator=images&titles=#{title}&gimlimit=1").read)
    begin
      rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], wiki_json['query']['pages']['-1']['imageinfo'][0]['url'], nil, nil, item['data']['url'], URI.join('http://reddit.com/', URI.encode(item['data']['permalink'])))
      rdoc
    rescue => exception
      puts exception
    end
  end

  def self.parse_misc(item)
    puts "parsing misc => #{item['data']['url']}"
    rdoc = nil

    best_image = get_oembed_image(item['data']['url'])
    if best_image.nil?
      best_image = get_scraped_image(item['data']['url'])
    end

    rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], best_image, nil, nil, item['data']['url'], URI.join('http://reddit.com/', URI.encode(item['data']['permalink'])))
    rdoc
  end

  def self.get_oembed_image(url)
    begin
      resource = OEmbed::Providers.get(url)
      resource.fields['thumbnail_url'] if resource
    rescue
      nil
    end
  end

  def self.get_scraped_image(url)
    begin
      uri = URI(url)
      images = Nokogiri::HTML(open(uri)).css('//img/@src').to_a
      scraped_image = nil
      #sized_images = Hash.new
      images.each do |image|
        image = image.to_s
        if not (['analytics', 'button', 'icon', 'loading', 'loader.gif', 'spacer.gif', 'clear.gif', 'transparent.gif', 'blank.gif', 'trans.gif', 'spinner.gif', 'gravatar', 'doubleclick', 'adserver'].any? { |s| image.include?(s) })
          if not (image =~ /^http:/)
            image = URI::join(uri.scheme+'://'+uri.host, image)
          end
          image = URI.parse(URI.escape(image.to_s)).to_s
          unless (image =~ URI::regexp).nil?
            puts "getting the size of => #{image}"
            dimensions = FastImage.size(image)
            #sized_images[image] = dimensions
            if not dimensions.nil?
              if (dimensions[0] >= 350 and dimensions[0]/dimensions[1] <= 2)
                scraped_image = image.to_s
                break
              end
            end
          end
        end
      end
    rescue => exception
      puts exception
    end

    puts 'scraped_image'
    if scraped_image.nil?
      scraped_image = "http://pagepeeker.com/thumbs.php?size=x&url=#{URI::encode(item['data']['url'])}"
    end

    scraped_image
  end

  def self.parse_reddit(item)
    puts 'parsing reddit'
    begin
      rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], nil, nil, Nokogiri::HTML(item['data']['selftext_html']).text, item['data']['url'], URI.join('http://reddit.com/', URI.encode(item['data']['permalink'])))
      rdoc
    rescue => exception
      puts exception
    end
  end

end