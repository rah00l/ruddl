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
require 'sinatra-websocket'
require 'pusher'

Bundler.require

require './ruddl_doc'
require './ruddl'
require './myapp'
run MyApp