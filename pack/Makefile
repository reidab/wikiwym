#!/usr/bin/make -f
########################################################################
# Creates minified/packed versions of $(JS_IN).
default: all

JS_IN := ../lib/GoogleCodeWikiParser.js
$(JS_IN):

BASENAME := GoogleCodeWikiParser

########################################################################
# PACK
JS_PACK := $(BASENAME).pack.js
PACKER_JS := packer.js
JS := $(shell which js)
ifneq (,$(JS))
$(JS_PACK): $(JS_IN) $(PACKER_JS)
	$(JS) $(PACKER_JS) $(JS_IN) $(JS_PACK)
all: $(JS_PACK)
else
$(warning 'js' binary not found in the PATH! Cannot create PACKed copy!)
endif

########################################################################
# MINify
JS_MIN := $(BASENAME).min.js
jsmin: jsmin.c
	$(CC) -o jsmin jsmin.c

$(JS_MIN): $(JS_IN) jsmin
	jsmin < $(JS_IN) > $@
all: $(JS_MIN)


########################################################################
# cleanup
clean:
	-rm -f $(JS_MIN) $(JS_PACK) jsmin $(wildcard *~)


