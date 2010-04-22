<?php
/**
    Input payload:

    {
        project:"googleCodeProjectName"
    }

    The response payload:

    {
        pages:[ wiki page names ]
    }

*/
class JSONResponse_GoCo_GetWikiList extends JSONResponse
{
    /**
        See JSONMessage constructor.

    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        $pay = $req->getPayload(array());
        if( ! @is_array($pay) )
        {
            throw new Exception($this->getType()." requires a payload object!",1);
        }
        $proj = @$pay['project'];
        if( ! $proj )
        {
            throw new Exception($this->getType()." requires a 'project' property in the payload!",2);
        }
        $url = 'http://'.$proj.'.googlecode.com/svn/wiki/';
        $fh = @file_get_contents($url, 'r');
        if( false === $fh )
        {
            throw new Exception($this->getType()." could not open URL [$url]!",3);
        }
        $opay = array();
        $opay['project'] = $proj;
        $opay['url'] = $url;
        $m = array();
        preg_match_all( "/>([a-zA-Z]\w+)\.wiki</", $fh, $m );
/*
        $li = array();
        if($m) for( $i = 0; $i < count($m[1]); ++$i )
        {
            $x = $m[1];
            array_push( $li, $x[$i] );
        }*/
        //$opay['matches'] = $m;
        $opay['pages'] = @$m[1] ? $m[1] : null;
        $this->setPayload($opay);
    }


}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_GoCo_GetWikiList );

?>
