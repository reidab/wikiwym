<?php
/**
    This file is intended to be called via AJAX and passed
    a JSON-format object via a $_REQUEST variable whos
    name is defined in the constant string
    JSONMessageDispatcher::RequestKey.

    The $_REQUEST[JSONMessageDispatcher::RequestKey] object
    is assumed to be structured as specified by the JSONMessage
    interface specifies.

    It outputs JSON code in the JSONMessage-specified
    response structure.
*/
ob_start('ob_gzhandler');
session_start();
do
{
    $d = dirname(__FILE__);
    require_once( $d.'/JSONMessage.inc.php' );
    $custom = $d.'/JSONMessage.localconfig.php';
    if( @file_exists( $custom ) )
    {
        require_once( $d.'/JSONMessage.localconfig.php' );
    }
} while(false);

function dispatch_JSONRequest()
{
    $res = null;
    $req = null;
    try
    {
        $req = JSONMessageDispatcher::getRequestFromEnv();
        if( ! $req )
        {
            throw new Exception("No JSONMessage request data found!");
        }
        $res = JSONMessageDispatcher::getResponse( $req );
        if( ! $res )
        {
            throw new Exception("No JSONResponse found for JSONMessage type '".$req->getType()."'!");
        }
        echo $res->toJSON();
    }
    catch(Exception $e)
    {
        $res = new JSONResponse_Error( $req, $e );
        //$res->setResult( 12, "WTF?" );
        //$res->setResult( 17, $e->getMessage() );
        echo $res->toJSON();
    }
    echo "\n";
}
dispatch_JSONRequest();
header('Content-Type: application/json');
header('Transfer-Size: '.ob_get_length() );
ob_end_flush();
?>
