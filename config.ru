require 'sinatra/base'
require 'sinatra/synchrony'

require 'rubygems'
require 'bundler'
require 'open-uri'
require 'readability'
require 'redis'
require 'digest'
require 'yajl/json_gem'
require 'fastimage'
require 'oembed'

Bundler.require

Dir[File.dirname(__FILE__) + '/lib/*.rb'].each {|file| require file }

require './ruddl'
run Ruddl