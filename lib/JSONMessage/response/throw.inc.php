<?php
/**
    A JSONResponse class which throws an exception, for testing
    dispatcher error handling.

    Optional input payload:

    {
        errorCode:resultCodeOfResponse,
        message:"Result text of the response."
    }

    If errorCode is a 0/false/null value then an
    unspecified non-zero value is used. Likewise
    for the message field.

    The response has no payload.

*/
class JSONResponse_Throw extends JSONResponse
{
    /**
        See JSONMessage constructor.

        This constructor always throws, for testing
        purposes.
    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        $payload = $req->getPayload(array());
        $code = null;
        $msg = null;
        if( @is_array($payload) )
        {
            $msg = @$payload['message'];
            $code = @$payload['errorCode'];
        }
        if( ! $code ) $code = 13;
        if( !$msg ) $msg = "throwing an exception!";
        throw new JSONError( $msg, $code );//,__CLASS__ );
    }


}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_Throw );

?>
