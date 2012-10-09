class RuddlDoc
  attr_accessor :key, :images, :content

  def initialize(key, images, content)
    @key = key
    @images = images
    @content = content
  end

  def marshal_dump
    [@key, @images, @content]
  end

  def marshal_load array
    @key, @images, @content = array
  end
end