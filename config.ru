require 'rubygems'
require 'bundler'
require 'simple-rss'
require 'open-uri'
require 'readability'
require 'redis'
require 'digest'

Bundler.require

require './ruddl_doc'
require './myapp'
run MyApp