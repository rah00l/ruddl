require './json_able'

class RuddlDoc

  attr_accessor :key, :title, :image, :embed, :text, :link, :premalink

  def initialize(key, title, image, embed, text, link, premalink)
    @key = key
    @title = title
    @image = image
    @embed = embed
    @text = text
    @link = link
    @premalink = premalink
  end

  def marshal_dump
    [@key, @title, @image, @embed, @text, @link, @premalink]
  end

  def marshal_load array
    @key, @title, @image, @embed, @text, @link, @premalink = array
  end
  
  def to_json
    {'key' => @key, 'title' => @title, 'image' => @image, 'embed' => @embed, 'text' => @text, 'link' => @link, 'premalink' => @premalink}.to_json
  end
end