<?php
/**
    A JSONResponse class which runs 'fortune'.

    Input payload: none

    Output payload: a string containing the
    result of calling 'fortune'.
*/
class JSONResponse_Fortune extends JSONResponse
{
    const ClassName = __CLASS__;
    /**
        See JSONMessage constructor.
    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        $bins = array('/usr/games', '/usr/bin', '/usr/local/bin');
        $bin = null;
        foreach( $bins as $b ) {
            $fn = $b.'/fortune';
            if( @file_exists($fn) )
            {
                $bin = $fn;
                break;
            }
        }
        if( ! $bin )
        {
            throw new Exception("Could not find 'fortune' program!");
        }
        $str = @trim( @shell_exec($bin) );
        if( ! $str )
        {
            $this->setResult( 127, "Binary '".$bin."' not found on server :(." );
        }
        else
        {
            $this->setPayload( $str );
        }
    }
}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_Fortune::ClassName );
?>
