class RuddlDoc
  attr_accessor :key, :title, :images, :content, :snippet

  def initialize(key, title, images, content, snippet)
    @key = key
    @title = title
    @images = images
    @content = content
    @snippet = snippet
  end

  def marshal_dump
    [@key, @title, @images, @content, @snippet]
  end

  def marshal_load array
    @key, @title, @images, @content, @snippet = array
  end
end