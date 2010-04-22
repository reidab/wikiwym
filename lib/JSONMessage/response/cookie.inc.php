<?php
/**
    A JSONResponse class for getting and setting cookies
    via ajax.

    Required message payload structure:

    {
        get:[list of vars to fetch],
        set:{key1:val1,...},
        clearCookies:boolean
    }

    All entries are optional, but if no action is specified then
    the response will have a non-0 result code.

    The response payload structure:

    {
        get:{key1:val1...},
        set:{key1:val1,...}
    }

    But the 'get' and 'set' entries will only be set if they were
    specified in the request. The 'set' result contains the keys/values
    which were just set.

    If 'get' is set to an empty array then all cookies are returned.

    When both get and set are specified, get is performed
    before set. In this case, the response data's "set" field
    contains the new values and the "get" field contains
    the old ones.

    If clearCookies is specified, it happens AFTER get but
    BEFORE set.
*/
class JSONResponse_Cookie extends JSONResponse
{
    /**
        The event key name which "should" be used
        for this class.
    */
    const EventKey = 'cookie';
    const ClassName = __CLASS__;
    private $opt = array(
        "expire" => 0,
        "path" => '/',
        "domain" => null,
        "secure" => false,
        "defaultExpireIncrement" => 604800/*7 days*/
    );
    private $log = array();
    private function setCookie($key,$val)
    {
        $exp = $this->opt['expire'] ? $this->opt['expire'] : 0;
        if( (false === $val) || (null === $val) ) $exp = time()-3600;
        else if( is_array($val) ) $val = JSONUtil::arrayToJSON($val);
        //else $val = json_encode($val);
        $this->log[] = "Set cookie: [$key]=[$val]";
        setcookie($key, $val,
            $exp,
            $this->opt['path'],
            $this->opt['domain'],
            $this->opt['secure']
        );
    }
    /**
        $li must be an array of session keys/vals.
        Returns an array of the set properties.

        e.g. array('mykey' => "foo");
    */
    private function setEnv($li)
    {
/*
        if( ! @is_array($li) ) $li = ''.$li;
        if( @is_string($li) )
        {
            $li = explode(' ',$li);
            if($li) foreach($li as $i => $x)
            {
                unset($li[$i]);
                $li[$x] = $x;
            }
        }
*/
        $ar = array();
        if($li) foreach( $li as $k => $v )
        {
            $ar[$k] = $v;
            $this->setCookie($k,$v);
        }
        return $ar;
    }
    private function valueOf($x)
    {
        return $x;
        /*
        if( ! $x ) return $x;
        return json_decode($x);
        */
        /*        
        else if( '[' == substr($x,0,1) )
        {
            return json_decode( $x, false );
        }
        else if( '{' == substr($x,0,1) )
        {
            return json_decode( $x, true );
        }
        else
        {
            return $x;
        }
        */
    }

    /**
        $li must be a space-delimited string or an array
        of session keys. Returns an array of the
        requested properties, or all session props if
        !$li or $li is empty.

        e.g. array('mykey','yourkey','donkey');

        Properties which are not set in the session
        will have null values in the returned array.
    */
    private function getEnv($li)
    {
        if( ! @is_array($li) ) $li = ''.$li;
        if( @is_string($li) ) $li = explode(' ',$li);
        $ar = array();
        if($li && count($li))
        {
            foreach( $li as $i => $k )
            {
                $ar[$k] = $this->valueOf( $_COOKIE[$k] );
            }
        }
        else foreach( $_COOKIE as $k => $v )
        {
            $ar[$k] = $this->valueOf( $_COOKIE[$k] );
        }
        return $ar;
    }
    /**
        See JSONMessage constructor.
    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );

        $ans = array();
        $errval = -42;
        $payload = $req->getPayload(array());

        $got = 0;

        $ar = $req->getOptions();
        if( $ar )
        {
            $this->opt = array_merge( $this->opt, $ar );
        }
        $ar = @$payload['get'];
        if( null !== $ar )
        {
            ++$got;
            $ans['get'] = $this->getEnv($ar);
        }
        $ar = @$payload['clearCookies'];
        if( $ar )
        {
                ++$got;
                $sessname = session_name();
                foreach( $_COOKIE as $k => $v )
                {
                    if( $sessname === $k ) continue;
                    $this->setCookie($k,false);
                    //$this->log[] = "Unset cookie [$k].";
                }
                $ans['cleared'] = true; // we do this to force the payload to be-a {object} instead of [array]
                $this->setResult(0, $this->log[] = "Cookies cleared.");
        }
        $ar = @$payload['set'];
        if( $ar )
        {
            ++$got;
            $ans['set'] = $this->setEnv($ar);
        }
        if( ! $got )
        {
            $this->setResult(1,"Usage error: no action specified.");
        }
        if( count($this->log) ) $ans['log'] = $this->log;
        $this->setPayload( $ans );
    }


}
JSONMessageDispatcher::mapResponderFile( __FILE__, 'JSONResponse_Cookie' );

?>
