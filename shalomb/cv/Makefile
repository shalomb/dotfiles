# Makefile to generate output formats of cv.html
#
# in_file  ?= cv.md

.DEFAULT_GOAL := all

ifeq (,$(in_file))
    $(warning in_file '$(in_file)' not set in $(origin in_file))
    ifneq (,$(wildcard cv.md))
        in_file := cv.md
    else ifneq (,$(wildcard cv.mkd))
        in_file := cv.mkd
    else ifneq (,$(wildcard cv.markdown))
        in_file := cv.markdown
    endif
endif

ifeq (,$(findstring md,$(in_file)))
    $(error in_file '$(in_file)' is not a markdown file?)
endif

$(warning in_file '$(in_file)' set in $(origin in_file))
# .PHONY: out_file = $(in_file)
out_file := $(in_file:.md=)
$(warning out_file base_name '$(out_file)' set in $(origin out_file))

check_defined = \
    $(foreach 1,$1,$(__check_defined))
__check_defined = \
    $(if $(value $1),, \
      $(error Variable/Flag '$1$(if $(value 2), ($(strip $2)))' is undefined.))

$(call check_defined, in_file)
$(call check_defined, out_file)

.PHONY: txt
txt: $(in_file)
	pandoc -s $(in_file) -f markdown -t plain -o $(out_file).txt \
		--tab-stop=2 --columns=78

.PHONY: odt
odt: $(in_file)
	pandoc -s $(in_file) -f markdown -t odt   -o $(out_file).odt

.PHONY: tex
tex: $(in_file)
	pandoc -s $(in_file) -f markdown -t tex   -o $(out_file).tex

.PHONY: docx
docx: $(in_file)
	pandoc -s $(in_file) -f markdown -t docx  -o $(out_file).docx

.PHONY: rtf
rtf: $(in_file)
	pandoc -s $(in_file) -f markdown -t rtf   -o $(out_file).rtf

.PHONY: html
html: $(in_file)
	pandoc -s $(in_file) -f markdown -t html5 -o $(out_file).html \
		--toc -c style.css --template=default.html5
	cp cv.html index.html

.PHONY: dev
dev: $(in_file)
	pandoc -s $(in_file) -f markdown -t html5 -o $(out_file).html \
		--toc -c style.css --template=default.html5 \
		--variable live-reload=true
	cp cv.html index.html

.PHONY: watch
watch:
	@echo "Starting development with LiveReload..."
	@echo "1. Building with live reload..."
	@$(MAKE) dev
	@echo "2. Starting HTTP server (background)..."
	@python3 -m http.server 8000 --bind 127.0.0.1 > /dev/null 2>&1 &
	@echo "3. Starting LiveReload server..."
	@echo "   📄 Open: http://localhost:8000/cv.html"
	@echo "   🔄 LiveReload active on port 35729"
	@echo "   Press Ctrl+C to stop"
	@npx livereload . --port 35729 --wait 200

# aptitude install texlive-xetex texlive-fonts-recommended lmodern
.PHONY: pdf
pdf: $(in_file)
	pandoc -s \
		--variable geometry:margin=1in        \
		--highlight-style=tango               \
		--variable fontsize=11pt              \
		--variable version=2.0                \
		--pdf-engine=xelatex                  \
		$(in_file) -o $(out_file).pdf
	ln -svf $(out_file).pdf shalom_bhooshi-cv.pdf

.PHONY: webpdf
webpdf: $(in_file)
	wkhtmltopdf --print-media-type --orientation portrait --page-size A4 \
		--encoding UTF-8 -L 20mm -R 20mm -T 20mm -B 20mm \
		$(out_file).html $(out_file).web.pdf

.PHONY: clean
clean:
	rm -f $(out_file).txt $(out_file).odt $(out_file).docx $(out_file).rtf \
		$(out_file).html $(out_file).pdf $(out_file).web.pdf

.PHONY: release
release: all
	git add cv.*
	git commit -m "Build binaries - $$(date)"
	git push --all
	git push --tags

.PHONY: all
all: html odt docx rtf txt pdf
