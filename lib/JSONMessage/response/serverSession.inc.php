<?php
/**
    A JSONResponse class for getting and setting server-side
    session variables.

    Required message payload structure:

    {
        get:[list of session vars to fetch],
        set:{key1:val1,...},
        clearSession:boolean
    }

    All entries are optional, but if no action is specified then
    the response will have a non-0 result code.


    The response payload structure:

    {
        get:{key1:val1...},
        set:{key1:val1,...},
        cleared:true // IFF clearSession was specified
    }

    But the 'get' and 'set' entries will only be set if they were
    specified in the request. The 'set' result contains the keys/values
    which were just set.

    If 'get' is set to an empty array then all session vars are
    returned.

    When both get and set are specified, get is performed
    before set. In this case, the response data's "set" field
    contains the new values and the "get" field contains
    the old ones.

    If clearSession is specified, it happens AFTER get but
    BEFORE set. BUT... the set operations will fail. Apparently
    PHP won't allow us to destroy and then immediately re-start
    the session (or at least it silently fails to update the
    session if i do so).

*/
class JSONResponse_ServerSession extends JSONResponse
{
    /**
        The event key name which "should" be used
        for this class.
    */
    const EventKey = 'serverSession';
    const ClassName = __CLASS__;
    /**
        $li must be an array of session keys/vals.
        Returns an array of the set properties.

        e.g. array('mykey' => "foo");
    */
    private function setEnv($li)
    {
        if( ! @is_array($li) ) $li = ''.$li;
        if( @is_string($li) ) $li = explode(' ',$li);
        $ar = array();
        if( @$_SESSION )
        {
            if($li) foreach( $li as $k => $v )
            {
                $ar[$k] = $_SESSION[$k] = $li[$k];
            }
        }
        return $ar;
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
                $ar[$k] = $_SESSION[$k];
            }
        }
        else if( @$_SESSION )
        {
            foreach( $_SESSION as $k => $v )
            {
                $ar[$k] = $_SESSION[$k];
            }
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

        $ar = @$payload['get'];
        $got = 0;
        if( null !== $ar )
        {
            ++$got;
            $ans['get'] = $this->getEnv($ar);
        }
        $ar = @$payload['clearSession'];
        $destroyed = false;
        if( $ar )
        {
                ++$got;
                session_destroy();
                $destroyed = true;
                $ans['cleared'] = true; // we do this to force the payload to be-a {object} instead of [array]
                $this->setResult(0,"Session data destroyed.");
        }
        $ar = @$payload['set'];
        if( $ar )
        {
            ++$got;
            if( $destroyed )
            {
                session_start();
            }
            $ans['set'] = $this->setEnv($ar);
        }
        if( ! $got )
        {
            $this->setResult(1,"Usage error: no action specified.");
        }
        $this->setPayload( $ans );
    }
    public static function factory( JSONRequest $req )
    {
        return new JSONResponse_ServerSession($req);
    }

}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_ServerSession::ClassName );

?>
