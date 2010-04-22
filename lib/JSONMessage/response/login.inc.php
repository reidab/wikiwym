<?php
/**
    A test/debug JSONResponse class which SIMULATES
    a login request/response. It doesn't actually
    perform any login.
*/
class JSONResponse_Login extends JSONResponse
{
    const SessionVar = 'clientCredentials';
    const ClassName = __CLASS__;
    private function updateEnv($li)
    {
        $ar = @$_SESSION[self::SessionVar];
        if( ! $ar ) $ar = array();
        foreach( $li as $k => $v )
        {
            $ar[$k] = $v;
        }
        @$_SESSION[self::SessionVar] = $ar;
    }
    /**
        See JSONMessage constructor.
    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        $p = $req->getPayload();
        if( ! @is_array($p) )
        {
            throw new Exception("Login handler requires that the event payload carrying name/token properties.");
        }
        $ar = array();
        $ar['name'] = @$p['name'];
        //$ar['token'] = @$p['token'];
        $ar['sessionID'] = session_id();
        $ar['sessionName'] = session_name();
        $this->updateEnv( $ar );
        $this->setPayload( $ar );
    }
}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_Login::ClassName );
?>
