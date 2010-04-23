#!/bin/bash

if [[ x = "x$WH" ]]; then
    cat <<EOF
$0:

The WH environment variable must be set to the USERNAME@HOST of the
remote account where the demo code should be uploaded. Login must be
possible via ssh. (WH is an env var i've had since 10 years, named
after the hoster, which is why it has that weird name.)

EOF
    exit 1
fi


login=${WH}

find . -type d -name .xvpics -print0 | xargs -0 rm -fr

#if test x = "x$1"; then
#    modeflags="--size-only"
#else
#    modeflags="--ignore-times"
#fi

rsync -Cvzr $modeflags --progress -e ssh \
    --exclude=send2site.sh \
    --exclude=.svn \
    --exclude '*~' \
    --exclude="php.ini" \
    GoCo*.* *.html *.css lib \
    $login:www.f/demos/wikiwym/.
