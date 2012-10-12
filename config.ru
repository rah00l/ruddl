require 'rubygems'
require 'bundler'
require 'open-uri'
require 'readability'
require 'redis'
require 'digest'
require 'json'
require 'siren'

Bundler.require

require './ruddl_doc'
require './myapp'
run MyApp