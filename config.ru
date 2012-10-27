require 'sinatra/base'
require 'sinatra/synchrony'

require 'rubygems'
require 'bundler'
require 'open-uri'
require 'readability'
require 'redis'
require 'digest'
require 'json'
require 'fastimage'

Bundler.require

require './ruddl_doc'
require './myapp'
run MyApp