<?php
/**
    Input payload:

    {
        project:"googleCodeProjectName",
        page:"WikiPageName"
    }

    The response payload:

    {
        url: url_the_page_was_pulled_from,
        project:"googleCodeProjectName",
        page:"WikiPageName",
        content: " wiki page content ..."
    }

*/
class JSONResponse_GoCo_GetWikiPage extends JSONResponse
{
    /**
        See JSONMessage constructor.

    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        $pay = $req->getPayload();
        if( ! @is_array($pay) )
        {
            throw new Exception($this->getType()." requires a payload object!",1);
        }
        $proj = @$pay['project'];
        if( ! $proj )
        {
            throw new Exception($this->getType()." requires a 'project' property in the payload!",2);
        }
        $page = @$pay['page'];
        if( ! $page )
        {
            throw new Exception($this->getType()." requires a 'page' property in the payload!",2);
        }
        $url = 'http://'.$proj.'.googlecode.com/svn/wiki/'.$page.'.wiki';
        $fh = @file_get_contents($url, 'r');
        if( false === $fh )
        {
            throw new Exception($this->getType()." could not open URL [$url]!",3);
        }
        $opay = array();
        $opay['url'] = $url;
        $opay['project'] = $proj;
        $opay['page'] = $page;
        $opay['content'] = $fh;
        $this->setPayload($opay);
    }

}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_GoCo_GetWikiPage );

?>
