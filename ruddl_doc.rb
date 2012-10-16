require './json_able'

class RuddlDoc < JSONable
  attr_accessor :key, :title, :image, :link

  def initialize(key, title, image, link)
    @key = key
    @title = title
    @image = image
    @link = link
  end

  def marshal_dump
    [@key, @title, @image, @link]
  end

  def marshal_load array
    @key, @title, @image, @link = array
  end
end