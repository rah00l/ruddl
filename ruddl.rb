class Ruddl

  def parse_feed_item(item)
    rdoc = nil
    if (item['data']['over_18'] == false)
      if (item['data']['url'] =~ /#{['jpg', 'jpeg', 'gif', 'png'].map { |m| Regexp.escape m }.join('|')}/)
        rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], item['data']['url'], nil, item['data']['url'], URI.join('http://reddit.com/', URI.encode(item['data']['permalink'])))
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

  private

  def parse_video(item)
    puts 'parsing video'
    begin
      rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], item['data']['media']['oembed']['thumbnail_url'], nil, item['data']['url'], URI.join('http://reddit.com/', URI.encode(item['data']['permalink'])))
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
    rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], URI.join(host, image+ext), nil, item['data']['url'], URI.join('http://reddit.com/', URI.join('http://reddit.com/',  URI.encode(item['data']['permalink']))))
    rdoc
  end

  def parse_quickmeme(item)
    puts 'parsing quickmeme'
    host = "http://i.qkme.me"
    image = URI(item['data']['url'])
    ext = '.jpg'
    rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], URI.join(host, image.path.gsub("/meme/", "").gsub("/", "")+ext), nil, item['data']['url'], URI.join('http://reddit.com/', URI.encode(item['data']['permalink'])))
    rdoc
  end

  def parse_wikipedia(item)
    puts 'parsing wikipedia'
    title = URI(item['data']['url']).path.gsub('/wiki/', '')
    wiki_json = JSON.parse(open("http://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&format=json&iiprop=url&iilimit=1&generator=images&titles=#{title}&gimlimit=1").read)
    begin
      rdoc = RuddlDoc.new(item['data']['name'], item['data']['title'], wiki_json['query']['pages']['-1']['imageinfo'][0]['url'], nil, item['data']['url'], URI.join('http://reddit.com/', URI.encode(item['data']['permalink'])))
      rdoc
    rescue => exception
      puts exception
    end
  end

  def parse_misc(item)
    max_attempts = 10
    puts "parsing misc => #{item['data']['url']}"
    begin
      uri = URI(item['data']['url'])
      images = Nokogiri::HTML(open(uri)).css('//img/@src').to_a
      best_image = nil
      #sized_images = Hash.new
      images.each do |image|
        image = image.to_s
        if not (['analytics', 'button', 'icon', 'loading', 'loader.gif', 'spacer.gif', 'clear.gif', 'transparent.gif', 'blank.gif', 'trans.gif', 'spinner.gif', 'gravatar', 'doubleclick', 'adserver'].any? { |s| image.include?(s) })
          if not (image =~ /^http:/)
            image = URI::join(uri.scheme+'://'+uri.host, image)
          end
          image = URI.parse(URI.encode(image.to_s, "[]")).to_s
          unless (image =~ URI::regexp).nil?
            puts "getting the size of => #{image}"
            dimensions = FastImage.size(image)
            #sized_images[image] = dimensions
            if not dimensions.nil?
              if (dimensions[0] >= 350 and dimensions[0]/dimensions[1] <= 2)
                best_image = image.to_s
                break
              end
            end
          end
        end
      end
    rescue => exception
      puts exception
      attempts = attempts + 1
      retry if(attempts < max_attempts)
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

end