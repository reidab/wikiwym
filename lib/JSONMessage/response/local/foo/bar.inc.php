<?php
class JSONResponse_FooBar extends JSONResponse {
	public function __construct( JSONRequest $req ) {
     	parent::__construct( $req );
		$payload = $req->getPayload(array());
		// do something with the payload ...
		// On error, do:
		//   throw new Exception( "Arrrrgggh!" );
		//   or: $this->setResult( 13, "Arrrrgggh!" );
		// Any message-specific result data should be set
		// in this object's payload, like:
		$this->setPayload( "Hi, world!" );
		// The payload must contain only JSON-able values!
		// If we return without throwing then our results
		// are sent to the client.
    }
}
// This bit of voodoo tells maps the event key "foo/bar" to
// the JSONResponse_FooBar class:
JSONMessageDispatcher::mapResponderFile( __FILE__,
							JSONResponse_FooBar );

?>
