require 'rubygems'
require 'bundler'
require 'simple-rss'
require 'open-uri'
require 'readability'
require 'redis'
require 'base64'

Bundler.require

require './ruddl_doc'
require './myapp'
run MyApp