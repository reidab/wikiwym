<?php
do {
    try {
        $iscli = (@$_SERVER ? false : true);
        $dobuf = $iscli ? false : (ob_get_level() ? false : true);
        if( $dobuf ) ob_start('ob_gzhandler');

        $d = dirname(__FILE__);
        $flist = array(
            $d.'/extendClass.js',
            $d.'/json2.js',
            $d.'/JSONAble.inc.js',
            $d.'/JSONMessage.inc.js',
            $d.'/JSONMessage.localconfig.js'
        );

        $max = getlastmod();
        foreach( $flist as $js ) {
            $t = filemtime($js);
            if( $t > $max ) $max = $t;
            require( $js );
        }
        if( $dobuf )
        { // Try to return an HTTP 304 if possible (now that we've done all the real work :/)
        // FIXME: do two loops: one to check the time and one to output the scripts.
            $fmt = "%a, %d %b %Y %T %Z" /*e.g.: Mon, 05 Apr 2010 15:37:55 GMT*/;
            @header("Last-modified: ".gmstrftime($fmt,$max));
            @header("Content-Type: text/javascript");
            @header("Cache-Control: public");
            while( function_exists('getallheaders') )
            {
                $reqh = getallheaders();
                if( ! $reqh ) break;
                if( $ifmod = @$reqh['If-Modified-Since'] )
                {
                    $rtm = strptime( $ifmod, $fmt );
                    $mytm = strptime( gmstrftime($fmt,$max), $fmt );
                    $cmp = 0;
                    if( $rtm)
                    foreach( array( 'tm_year', 'tm_mon', 'tm_mday', 'tm_hour', 'tm_min', 'tm_sec')
                            as $k ) {
                        if( $rtm[$k] == $mytm[$k] ) continue;
                        else if( $rtm[$k] < $mytm[$k] ) $cmp = -1;
                        else $cmp = 1;
                        break;
                    }
                    //header("X-JSONMessage-TimeCheck: $rtm vs. $max, cmp=$cmp"/*debugging tag*/);
                    if($rtm &&
                        ($cmp>=0)
                    )
                    {
                        //echo "alert( 'ifmod=[$ifmod], rtm=".count($rtm).", max=$max');\n";
                        //header('X-JSONMessage-TimeCheckB: Not Modified'/*debugging tag*/);
                        //header('Status-Code: 304'/*not modified*/); // no workie
                        header('HTTP/1.0 304 Not Modified');
                        header("Transfer-Length: 0" );
                        ob_end_clean();
                        return;
                    }
                }
                break;
            }
            @header("Transfer-Length: ".ob_get_length() );
            //@header( "Content-Length: ".ob_get_length() );
            @ob_end_flush();
        }
    }
    catch(Exception $e) {
        echo "alert('"
            .str_replace("'","\\'", $e->getMessage() )
            ."');\n";
    }
}
while(false);
?>
