# Be sure to restart your server when you modify this file.

# Ruddl::Application.config.session_store :active_record_store   
# >rake db:sessions:create  >rake db:migrate
Ruddl::Application.config.session_store :cookie_store

# Use the database for sessions instead of the cookie-based default,
# which shouldn't be used to store highly confidential information
# (create the session table with "rails generate session_migration")
# Ruddl::Application.config.session_store :active_record_store

Ruddl::Application.config.session = {
  :key          => '_ruddl_session',     		# name of cookie that stores the data
  :domain       => nil,                         # you can share between subdomains here: '.communityguides.eu'
  :expire_after => 1.month,                     # expire cookie
  :secure       => false,                       # fore https if true
  :httponly     => true,                        # a measure against XSS attacks, prevent client side scripts from accessing the cookie
  :secret      => '903f2edab4dba35ea4711030d23d032c6ed572a29bccc4cb8cc359996e8eced694e1bc01b75092ed84ce30989e431d8076dfcca8915791507d5ae4461391c906'
}