<?php
/**
    A test/debug JSONResponse class.
*/
class JSONResponse_LocalEventCheck extends JSONResponse
{
    /**
        The event key name which "should" be used
        for this class.
    */
    const EventKey = 'test/localEventCheck';
    const ClassName = __CLASS__;
    /**
        See JSONMessage constructor.
    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        $p = array(
                   'JSONMessageDispatcher::calculateResponderKey()' => JSONMessageDispatcher::calculateResponderKey(__FILE__),
                   );
        $this->setPayload($p);
        $this->setResult(0,"Event type '".$this->getType()."' "
                        ."is handled by class ".__CLASS__.".");
    }

    public static function registerDispatcher()
    {
        JSONMessageDispatcher::mapResponder( JSONMessageDispatcher::calculateResponderKey(__FILE__),
                                             self::ClassName
                                             );
    }
}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_LocalEventCheck::ClassName );

?>
