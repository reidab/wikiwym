<?php
/**
    A test/debug JSONResponse class which returns $_ENV and co.
    as the response payload.
*/
class JSONResponse_ClearSession extends JSONResponse
{
    /**
        The event key name which "should" be used
        for this class.
    */
    const EventKey = 'clearSession';
    const SessionVar = 'clientCredentials';
    const ClassName = __CLASS__;
    private function updateEnv($li)
    {
        if( @$_SESSION )
        {
            $ar = $_SESSION[self::SessionVar];
            if( ! $ar ) $ar = array();
            foreach( $li as $k => $v )
            {
                $ar[$k] = $v;
            }
            $_SESSION[self::SessionVar] = $ar;
        }
    }
    /**
        See JSONMessage constructor.
    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        @$_SESSION = array();
        if(1)
        { // is this necessary?
            $sn = session_name();
            if (@isset($_COOKIE[$sn]))
            {
                    setcookie($sn, '', time()-42000, '/');
            }
        }
        session_destroy();
        $this->setResult(0,"Session data destroyed.");
        $this->setPayload( array(
            '$_SESSION' => @$_SESSION
        ) );
    }
    public static function factory( JSONRequest $req )
    {
        return new JSONResponse_ClearSession($req);
    }

}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_ClearSession::ClassName );
?>
