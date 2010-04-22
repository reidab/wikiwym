<?php
/**
    A test/debug JSONResponse class.
*/
class JSONResponse_LocalEventCheck extends JSONResponse
{
    const ClassName = __CLASS__;
    /**
        See JSONMessage constructor.
    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        $ar = array();
        $ar['message'] = "Event type '".$this->getType()."' "
            ."is handled by file [".__FILE__."]."
        ;
        $ar['sub'] = array('test' => 'of sub-children in payload');
        $this->setPayload( $ar );
    }
}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_LocalEventCheck::ClassName );

?>
