# fetch-me

Automagically install (`{rust,go,compiled}` CLI) tools directly from their
github releases.

```
fetch-me derailed/k9s         # Install the latest version of k9s
fetch-me sharkdp/fd -t 8.6    # Install a specific version
fetch-me httpie/httpie -a .   # Match all archs
```

Take the pain out of installing/updating CLI tools.

`fetch-me` install tools directly from their releases on their Github
repositories.

Once downloaded, the asset is automagically installed using an
appropriate installation method.

```
$ fetch-me derailed/k9s

Discovering releases of derailed/k9s
  repo:    derailed/k9s (https://github.com/derailed/k9s)
  command: k9s (Existing installation detected: /home/unop/.local/bin/k9s)
  tag:     v0.26.7
  arch:    aarch64|arch64|arm64

Found candidate to install: v0.26.7/k9s_Linux_arm64.tar.gz

removed '/home/unop/.local/bin/k9s'
'./k9s' -> '/home/unop/.local/bin/k9s'

k9s successfully installed: /home/unop/.local/bin/k9s

$ k9s version
 ____  __.________
|    |/ _/   __   \______
|      < \____    /  ___/
|    |  \   /    /\___ \
|____|__ \ /____//____  >
        \/            \/

Version:    v0.26.7
Commit:     37569b8772eee3ae29c3a3a1eabb34f459f0b595
Date:       2022-10-18T15:02:30Z
```

## Finding repos

Let's face it, we remember the name of the tool and almost never the author/publisher.
Luckily Github's Search API returns items ranked by popularity.

```
./fetch-me -f bat
 - sharkdp/bat          A cat(1) clone with wings.
 - astaxie/bat          Go implement CLI, cURL-like tool for humans
 - sstephenson/bats     Bash Automated Testing System
 - Roomify/bat          A Booking and Availability Management Library for PHP
 - bat/bat              Bayesian analysis toolkit  http://mpp.mpg.de/bat
 - eth-p/bat-extras     Bash scripts that integrate bat with various command line tools.
 - angular/batarang     AngularJS WebInspector Extension for Chrome
 - beeware/batavia      A JavaScript implementation of the Python virtual machine.
 - batsh-dev-team/Batsh A language that compiles to Bash and Windows Batch
 - bats-core/bats-core  Bash Automated Testing System
 - tshakalekholoane/bat Battery management utility for Linux laptops.
 - shinima/battle-city  🎮 Battle city remake built with react.
```
And I, sometimes don't even remember the name of the tool I scrolled by 2 years ago.

```
./fetch-me -f find alternative rust
 - sharkdp/fd   A simple, fast and user-friendly alternative to 'find'
 - uutils/findutils     Rust implementation of findutils
 - chmln/sd     Intuitive find & replace CLI (sed alternative)
...
```

### Shortfalls

The approach is naive  but works well. The releases for  a repo are discovered
using  the  Github Releases  API  and  OS/Processor/Architecture filtering  is
applied over the  filenames in asset URLs to rule  in/out candidates. The last
standing candidate  is installed. If  multiple candidates remain, the  user is
prompted to choose one to proceed with.

Off course,  this is fallible  as there are  no standards for  naming releases
and/or the files and matching is only best-effort. Pull-requests welcome.

`fetch-me` works best in locating tools written in compiled languages
(`rust`, `go`, `c`, etc) where the releases are binaries. For tools written
and distributed in scripting/interpreted language, they tend to be released
to dedicated repositories and you will need to defer to their package managers.
