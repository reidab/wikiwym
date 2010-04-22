<?php
/**
    A JSONResponse class which sleeps, for simulating
    a slow connection to a local server.

    Required message payload structure:

    {
        seconds:N
    }

    The response has no payload.

*/
class JSONResponse_Sleep extends JSONResponse
{
    const MaxSleepTime = 10;
    /**
        See JSONMessage constructor.

        Expects one payload field:

        seconds = number of seconds to sleep
    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        $payload = $req->getPayload(array());
        $sec = $payload ? @$payload['seconds'] : null;
        if( null === $sec )
        {
            $this->setResult(1,"The ".$this->getType()." request requires a 'seconds' value in the payload!");
        }
        else if( $sec > self::MaxSleepTime )
        {
            $this->setResult(2,"The sleep time (".$sec.") is too long. Maximum value is ".self::MaxSleepTime.'.');
        }
        else
        {
            $rest = @sleep( $sec );
            $this->setResult(0, "Slept for ".($sec-$rest)." second(s).");
        }
    }


}
JSONMessageDispatcher::mapResponderFile( __FILE__, 'JSONResponse_Sleep' );

?>
