<?php
/**
    A test/debug JSONResponse class which returns $_ENV and co.
    as the response payload.

    Input payload is ignored.

    Output payload:

    {
        $_ENV:{...},
        $_SESSION:{...},
        $_COOKIE:{...}
    }

    where "..." represents key/value pairs from the PHP-side
    variables of the same names as the containing object.
*/
class JSONResponse_Env extends JSONResponse
{
    /**
        See JSONMessage constructor.
    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        $this->setPayload( array(
            '$_ENV' => @$_ENV,
            '$_COOKIE' => @$_COOKIE,
            '$_SESSION' => @$_SESSION
            //'$_SERVER' => @$_SERVER // a bit TOO revealing.
        ));
    }
}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_Env );
?>
