#!/do/not/make -f
# GNU Makefile for running some tests for the wikiwym code.
# Requires the v8-juice-shell: http://code.google.com/p/v8-juice
default: all

js := $(shell which v8-juice-shell)

ifeq (,$(js))
$(error Could not find v8-juice-shell in the PATH!)
endif

GC_PROJ := v8-juice
WIKI_LIST := ClassWrap PluginCurl PluginPosixFILE PluginNCurses

WIKI_OUT := $(WIKI_LIST)
#$(patsubst %,%.html,$(WIKI_LIST))

$(WIKI_OUT):
	@echo "Fetching $(GC_PROJ) --> $@.wiki..."
	$(js) v8-juice-GCWP.js -- $(GC_PROJ) $@ > $@
pull: $(WIKI_OUT)

all:
