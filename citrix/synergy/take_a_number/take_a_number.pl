#!/usr/bin/perl

use strict;
use warnings;

use CGI;

use CGI qw(:standard);

print header;

print header(),
      start_html(-title=>'Wow!'),
      h1('Wow!'),
      'Look Ma, no hands!',
      end_html();
