require './json_able'

class RuddlDoc < JSONable
  attr_accessor :key, :title, :image, :link, :premalink

  def initialize(key, title, image, link, premalink)
    @key = key
    @title = title
    @image = image
    @link = link
    @premalink = premalink
  end

  def marshal_dump
    [@key, @title, @image, @link, @premalink]
  end

  def marshal_load array
    @key, @title, @image, @link, @premalink = array
  end
end