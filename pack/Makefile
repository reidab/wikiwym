#!/usr/bin/make -f
########################################################################
# Creates minified/packed versions of $(JS_IN).
default: all

JS_IN := ../lib/GoogleCodeWikiParser.js
$(JS_IN):

BASENAME := GoogleCodeWikiParser

########################################################################
# gzip compress, to approximate reduction from Apache/PHP-compressed
# results...
JS_GZ := $(BASENAME).js.gz
$(JS_GZ): $(JS_IN)
	gzip -c < $(JS_IN) > $@
all: $(JS_GZ)

########################################################################
# PACK
JS_PACK := $(BASENAME).pack.js
PACKER_JS := packer.js
JS := $(shell which js)
ifneq (,$(JS))
$(JS_PACK): $(JS_IN) $(PACKER_JS)
	$(JS) $(PACKER_JS) $(JS_IN) $(JS_PACK)
JS_PACK_GZ := $(JS_PACK).gz
$(JS_PACK_GZ): $(JS_PACK)
	gzip -c $(JS_PACK) > $(JS_PACK_GZ)
all: $(JS_PACK_GZ)
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
JS_MIN_GZ := $(JS_MIN).gz
$(JS_MIN_GZ): $(JS_MIN)
	gzip -c $(JS_MIN) > $(JS_MIN_GZ)
all: $(JS_MIN_GZ)

ls:
	ls -la $(JS_IN) $(JS_GZ) $(JS_MIN)* $(JS_PACK)*
all: ls


########################################################################
# cleanup
clean:
	-rm -f jsmin $(JS_GZ) $(wildcard $(JS_MIN)* $(JS_PACK)* *~)

