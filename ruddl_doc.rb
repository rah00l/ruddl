class RuddlDoc
  attr_accessor :title, :images, :content

  def initialize(title, images, content)
    @title = title
    @images = images
    @content = content
  end

  def marshal_dump
    [@title, @images, @content]
  end

  def marshal_load array
    @title, @images, @content = array
  end
end