# Overview

This directory contains the source to build [https://shalomb.id/cv](https://shalomb.id/cv)

- Curriculum Vitae (not resume) managed entirely in git
- Managed as source in markdown (see [cv.md](./cv.md))
- Distributed in various output formats (pdf, docx, txt, etc) built using [pandoc](https://pandoc.ord)
- [HTML version](https://shalomb.id/cv/) styled with [css](./style.css)


The [Makefile](./Makefile) provides these targets for easy management
```
make clean     # Clean up artifacts
make all       # Build various formats using pandoc
make release   # Push to git origin
```

Please feel free to fork and/or make pull-requests for improvements
