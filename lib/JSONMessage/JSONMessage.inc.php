<?php
/**********************************************************************
The JSONMessage API implements a generic request/response handling
mechanism where messages are passed around as JSON strings.

It implements a basic request/response mechanism using a JSON
interface. The idea is that this layer acts as the message-passing
mechanism between arbitrary requestors (who send JSON data over HTTP
requests) and responders (classes which generate responses as
JSON). The overall structure of requests and responses is well
defined, but each can contain arbitrary payloads, with the caveat that
the payloads must be representable as JSON text.

This was written as part of the jqApp framework, but this particular
code does not have any direct dependencies on jqApp. 

External requirements:

- PHP5 with json_decode() and json_encode().
- JSONUtil.inc.php for general JSON utility code.

Author: Stephan Beal (http://wanderinghorse.net/home/stephan/)

License: Public Domain

Achtung: on 2010 April 26, the classes JSONRequest and JSONResponse were renamed
to JSONMessage.Request resp. JSONMessage.Response, to (A) cut down on global
namespace polution and (B) avoid any conflict/confusion with Doug Crockford's
JSONRequest API. If you prefer to save a bit of typing and don't mind a potential
naming collision with Crockford's API, then add the following to your
JSONMessage.localconfig.js (or somewhere equivalent):

@code
JSONRequest = JSONMessage.Request;
JSONResponse = JSONMessage.Response;
@endcode

TODOs:

  - Try to come up with an application-agnostic authentication interface,
  which can use a client-supplied function to authenticate that a given
  message is allowed to do what it asked to do. Without this, arbitrary
  clients can use arbitrary JSONMessage hosts to perform work, and
  most web admins probably don't want that. Authentication might simply
  check that a session is active (which requires that the message-using
  application page sets up the session), or that a message contains
  user/password information (or some authentication token returned by
  the server).
**********************************************************************/
if( ! class_exists('JSONUtil', false ) )
{
    $fn = dirname(__FILE__).'/../JSONUtil/JSONUtil.inc.php'; /* path for jqApp installation. */
    if( !@file_exists($fn ) )
    {
        $fn = dirname(__FILE__).'/JSONUtil.inc.php'; /* path for JSONMessage standalone install. */
    }
    if( @file_exists($fn ) )
    {
        require_once($fn);
    }
    else
    {
        throw new Exception("The JSONUtil class must be loaded before this file is included!");
    }
}

/**
    The base Exception class used by the JSONMessage API.
*/
class JSONError extends Exception
{
    /**
        Takes the same arguments as Exception, but if a third argument
        is passed it is assumed to be either the __METHOD__ or
        __FUNCTION__ constant, naming the place from where the
        exception is thrown, and it is prepended to $msg.
    */
    public function __construct( $msg = null, $code = 666 )
    {
        $av = func_get_args();
        $ac = @count($av);
        if( $ac >2 )
        { // assume __METHOD__
            $msg = $av[2]."(): ".$msg;
        }
        parent::__construct($msg, $code);
    }
};
/**
    A base class for JSON-based client requests and server responses.

    This type is not intended to be used by itself (though
    it can be). The subclasses JSONRequest and JSONResponse
    are specialized for the request/response roles.

    The overall structure of JSONMessages, including the conventional
    message properties, is as follows (pseudo-JS notation):

    {someMessageTypeMarker:
    {
        REQUIRED id : some_unique_identifier,
        REQUIRED timestamp : unix_epoch_in_milliseconds,
        REQUIRED type : 'eventTypeIdentifier',
        OPTIONAL payload : (message content, message-type dependent),
        OPTIONAL options : (event-type-dependent options),
        OPTIONAL client: RESERVED_SOLELY_FOR_CLIENT_USE
    }
    }

    Subclasses are free to add to this list, but should use the
    above-listed keys in a manner described by this class.

    The outer wrapper object is not needed for most cases, but can be
    used for sanity checking the input (e.g. by requiring a specific
    name for the wrapper). Most of the existing API will accept
    messages which do not have the outer-most container object.

    See JSONRequest and JSONResponse for more information.
*/
class JSONMessage
{
    private $wrapperName = 'JSONMessage';
    /** Default response resultCode used for marking Exception
     responses.
     */
    const ErrIDException = -666;
    /**
        Constructs and calls $this->decodeJSONableArray($json)
        if $json does not evaluate to false.

        Subclasses should call setWrapperName('wrapperName')
        in their ctors BEFORE calling the parent ctor.

        The only property which gets set automatically is
        the timestamp. Subclasses or clients may call
        setTimestamp() to change it.

        If $json is null then $this->setTimestamp() is called
        to set a default timestamp.
    */
    public function __construct( $json = null )
    {
        if( $json )
        {
            $this->decodeJSONableArray($json);
        }
        else
        {
            $this->setTimestamp();
            //$this->setID();
        }
    }

    /**
        Sets the "wrapper name", which is used as the
        name for the outermost wrapper object in JSON
        expressions of this object.
    */
    protected function setWrapperName($v)
    { return $this->wrapperName = $v; }

    /**
        Gets the "wrapper name", which is used as the
        name for the outermost wrapper object in JSON
        expressions of this object.
    */
    public function getWrapperName()
    { return $this->wrapperName; }

    /**
        Populates this oobject's state from the given JSON or
        JSON-like array.

        $json must be a JSON-encoded string containing message
        properties, or an array of such properties (e.g. the result of
        json_decode()).

        Input may be structed in one of these forms:

        {"key":value,...}

        {"wrapperName":{"key":value,...}}

        For JSONMessage purposes, messages always have at least two
        property entries (an ID and type, and probably a timestamp as
        well). Because of this, we have a special case: if the input
        contains exactly one element then it is assumed to be in the
        second format and the outer wrapper element is discarded
        before parsing.

        If $checkWrapperType is true and $json is structured like the
        second form then eventTypeName must match
        $this->getWrapperName() or an exception is thrown. In practice
        $checkWrapperType isn't needed, but i didn't realize that
        until later.

        Throws a JSONError on error.
    */
    public function decodeJSONableArray($json, $checkWrapperType = false)
    {
        if( ! $json ) return null;
        $errpre = __CLASS__."::decodeJSONableArray(): ";
        if( is_string($json) )
        {
            $x = json_decode( $json, true );
            if( !$x || ! @count($x) )
            {
                throw new JSONError("$errpre\$json string is invalid!");
            }
            $json = $x;
        }
        else if( ! is_array($json) )
        {
            throw new JSONError("$errpre\$json param must be a JSON string or an array!");
        }
        if( (1==@count($json)) )
        { /** assume that it's constructed like: {"wrapperName":{...}} */
            $wk = $this->getWrapperName();
            $int = null; /* discard the wrapper */
            foreach( $json as $k => $v )
            {
                if(  $checkWrapperType && ($k != $wk) )
                {
                    throw new JSONError("$errpre\$json param contains exactly one "
                        ."element but it is not named '".$this->getWrapperName()."'!");
                }
                $wk = $k;
                $int = $json[$k];
                break;
            }
            if( $int ) $json = $int;
            else
            {
                throw new JSONError("$errpre\$Could not extract data from json for "
                        ."message of type '".$this->getWrapperName()."'!");

            }
            if( ! @is_array($json) )
            {
                throw new JSONError("$errpre\$json contains exactly one "
                    ."element named '".$wk."', but it is not an array!");
            }
        }
        $this->clearState();
        foreach( $json as $k => $v )
        {
            $this->set( $k, $v );
        }
        return $this;
    }

    /**
        Clears all message state, including the message ID and timestamp.
    */
    public function clearState()
    {
        $this->fields = array();
    }
    /** Sets a property, which must be of a JSONable type. Returns $val. */
    public function set($key,$val)
    {
        return (@$this->fields[$key] = $val);
    }
    /**
        Unsets a property, removing it from this object. Returns the old
        value, if any. i'd like to call this "unset()", but that's a magic word
        in PHP.

        Returns the old value, if any.
    */
    public function remove($key)
    {
        $v = @$this->fields[$key];
        unset( $this->fields[$key] );
        return $v;
    }

    /** Gets a property, or returns $default if that
    property is not set. */
    public function get($key, $default = null)
    {
        return @isset($this->fields[$key])
            ? $this->fields[$key]
            : $default;
    }

    /** Gets the 'credentials' property. */
    public function getCredentials()
    { return $this->get('credentials'); }
    /** Sets the 'credentials' property. */
    public function setCredentials($v)
    { return $this->set('credentials', $v); }

    /** Gets the 'id' property. */
    public function getID()
    { return $this->get('id'); }
    /** Sets the 'id' property. If !$v then JSONMessage::generateID() is used. */
    public function setID($v)
    { return $this->set('id', $v ? $v : JSONMessage::generateID()); }

    /** Gets the 'payload' property. */
    public function getPayload($dflt=null)
    { return $this->get('payload',$dflt); }
    /** Sets the 'payload' property. */
    public function setPayload($v)
    { return $this->set('payload', $v); }

    /** Gets the 'timestamp' property. */
    public function getTimestamp()
    { return $this->get('timestamp'); }
    /** Sets timestamp property to $v, or to the current GMT timestamp if !$v. */
    public function setTimestamp($v = null)
    { return $this->set('timestamp', $v ? $v : JSONMessage::timestamp()); }

    /** Gets the 'type' property. */
    public function getType()
    { return $this->get('type'); }
    /** Sets the 'type' property. */
    public function setType($v)
    { return $this->set('type', $v); }

    /**
        Returns a JSON string containing the message
        data.

        The format of the contained JSON depends
        on the $withWrapper parameter. If it is true
        then the output will look a little something like
        (but quoted using JSON conventions):

        {$this->getWrapperName():
            {
                ... other properties ...
            }
        }

        if $withWrapper is false then the outermost container
        object is omitted.
    */
    public function toJSON( $withWrapper = true )
    {
        return JSONUtil::arrayToJSON( $withWrapper
                                ? array($this->getWrapperName() => $this->fields)
                                : $this->fields
                                );
    }
    /**
        Returns a Unix Epoch timestamp in milliseconds, formatted
        for compatibility with JavaScript Date::getTime()
        (the last 3 digits are the milliseconds).
    */
    public static function timestamp()
    {
        //$mt = microtime();
        list($mt, $tm) = explode(" ", microtime());
        return sprintf("%d%03d",$tm,(int)($mt*1000%1000));
    }


    /**
        Generates a UID string which is (almost) guaranteed to be
        unique within a given instance of a PHP interpreter.

        The returned value *will* be unique within the given PHP
        interpreter instance, but it is possible (though exceedingly
        unlikely) that two PHP instances (i.e. two HTTP requests) could
        return the same ID if this is called at the exact same moment
        AND the mt_rand() function returns the same number for both
        instances at that instant AND if this routine is called the
        exact same number of times in both requests. i'd say we can
        safely rule it out.
    */
    public static function generateID()
    {
        static $sequence = 0;
        list($mt, $tm) = explode(" ", microtime());
        return strftime('%Y%m%d@%H%M%S', $tm )
            .sprintf(".%03d",(int)($mt*1000))
            .'/'
            .sprintf("%08x",mt_rand())
            .':'
            .sprintf("%04x", ++$sequence );
    }

}; /* class JSONMessage */



/**
    Represents a JSON-based client request. In practice
    these are never generated on the server. Rather,
    they are intended to be used to capture JSON-encoded
    requests which come from clients.

    Conventional structure:

    {'JSONRequest': // <- arbitrary, but descriptive
        {
            REQUIRED id:"client-defined unique ID",
            REQUIRED timestamp:UnixEpochTimeMilliSeconds,
            REQUIRED type:"eventTypeName", // for mapping requests to handlers
            OPTIONAL payload: event-type-specific request data,
            OPTIONAL client: RESERVED_SOLELY_FOR_CLIENT_USE
            // THE FOLLOWING ARE RESERVED BUT NOT YET USED:
            OPTIONAL options:{ event-type-specific options },
            OPTIONAL credentials:
            {
                name:"login-name",
                token:"login-token"
            }
        }
    }

    The 'id' field may have an arbitrary (but unique-per-application-session) value.
    Responses only use it to set a 'respondedTo' property to that value,
    so that callers have a way of mapping responses back to
    specific requests.

    The PHP API has a utility function, JSONMessage::generateID(),
    which generates unqiue IDs for this purpose.


    Note: this API has NOTHING to do with Douglas Crockford's
    JSONRequest API proposal (http://www.json.org/JSONRequest.html),
    and the name collision was only seen after deploying this code
    in several projects. The JS-side parts of the API were renamed
    to avoid any confusion/conflict, but no such conflict is ever
    expected on the server side.
*/
class JSONRequest extends JSONMessage
{
    /**
        See JSONMessage constructor.
    */
    public function __construct( $json = null )
    {
        $this->setWrapperName( 'JSONRequest' );
        parent::__construct( $json );
    }

    /** Gets the 'options' property. */
    public function getOptions()
    { return $this->get('options'); }
    /** Sets the 'options' property. */
    public function setOptions($v)
    { return $this->set('options', $v); }
};


/**
    Represents a JSON-based server response.

    Conventional structure:

    (REQ[key] corresponds to a field in the Request
    object which this Response was generated in response
    to.)

    {'JSONResponse':
    {
        REQUIRED id:"server-defined unique ID",
        REQUIRED type:"REQ[type]",
        REQUIRED timestamp:UnixEpochTimeMilliSeconds,
        REQUIRED responseTo:REQ[id],
        REQUIRED resultCode:integer (0==success),
        OPTIONAL(?) resultText:"informative message text",
        OPTIONAL payload: event-type-specific response data
    }
    }

    Other conventions:

    Response objects are generated from "dispatcher"
    code (e.g. see JSONMessage-dispatch.php). They are constructed
    only in response to a JSONRequest object, and always receive
    a request object as their first constructor argument.
    The exact Response class which should be used for a given
    JSONRequest is determined by using JSONRequest::getType()
    and mapping that to a specific JSONResponse subclass.

    Responses perform arbitrary operations in their constructor,
    presumably reacting to the payload data of the request (if needed).
    They store any results in their payload member and then return from their
    constructor on success. On error they should throw an exception
    from their constructor. If the constructor returns without throwing
    then the dispatcher will send the response to the requesting client.
    If the response throws, the dispatcher will propogate the error
    to the client via a JSONResponse_Error() object.

    Each JSONResponse subclass must document the structure of
    its payload data, both for input and output purposes.

    For several examples of concrete JSONResponse subclasses, search
    this file for "extends JSONResponse" or look in the "response"
    directory which ships with the complete JSONMessage source code.
*/
class JSONResponse extends JSONMessage
{
    /** JSONRequest object. */
    private $req = null;

    /**
        Initializes a response object for the given
        request. If $req is null then a default,
        useless request object will be used in its place.

        Subclasses have two options for when to actually
        perform the action requested:

        - In the ctor.

        - Lazy, in toJSON(). Normally (that is,
        except in some testing cases), toJSON() will
        not be called more than once on any given
        response object, so it is reasonable to perform
        the action there, possibly caching the result
        in case it is called again.
    */
    public function __construct( JSONRequest $req )
    {
        $this->setWrapperName( 'JSONResponse' );
        parent::__construct();
        $this->req = $req;
        //$this->set('serverLocalTime',time(),false);
        $this->setID( JSONMessage::generateID() );
        if( $req )
        {
            $this->setType( $req->getType() );
            $this->set('responseTo', $req->getID() );
            $this->setResult(0);
        }
        else
        {
            $this->setType( 'unknown' );
            $this->set('responseTo', null );
        }
        if(false && !$this->getCredentials() && @$_SESSION )
        {
            $ar = $_SESSION["credentials"];
            if( $ar ) $this->setCredentials($ar);
        }
        //??? $this->setCredentials( $req->getCredentials() );
    }

    /**
        Returns the request which was passed to the ctor.
    */
    public function getRequest()
    {
        return $this->req;
    }

    /**
        Convenience function to set the resultCode
        and resultText properties. If !$num and
        !$msg then "Success" is used for the text.
        If $num is-a Exception then $msg is ignored
        and the exception text and error code are used.
        If the exception has an error code of 0 (for
        weird some reason) then JSONMessage::ErrIDException
        is used.

        Note that this does not set the return payload -
        use setPayload() for that.
    */
    public function setResult( $num, $msg = null)
    {
        if( $num instanceof Exception )
        {
            $c = $num->getCode();
            $msg = $num->getMessage();
            $num = $c ? $c : JSONMessage::ErrIDException;
        }
        else if( !$num && !$msg )
        {
            $num = 0;
            $msg = "Success";
        }
        $this->set( 'resultCode', $num );
        $this->set( 'resultText', $msg );
    }
};

/**
    An interface for generically doling out requests to
    mapped handlers.
*/
interface JSONResponder
{
    /**
        Must initialize from a JSONRequest object.

        Implementations are encouraged to not to require a second argument,
        but one is allowed for special-case core handlers. Generic
        handlers will never be passed a second argument via the
        normal/generic API, but clients are free to pass one if they
        instantiate such objects directly.

        Implementations should defer actual handling of the response
        until getResponse() is called.
    */
    public function __construct( JSONRequest $req, $mixed = null );
    /**
        Must "respond" to the request and return a JSONResponse
        object.

        Implementations should defer actual handling of the response
        until this is called.

        Responders may return errors in two ways:

        - Return a response which encapsulates the error.

        - Throw (or propagate) an exception, in which case
        the caller is expected to convert the exception into
        an error response. (JSONMessageDispatcher::getResponse()
        does this, to simplify error handling.)
    */
    public function getResponse();
};

/**
    A static manager for mapping JSON request-type keys to
    JSONResponse or JSONResponder types, and dispatching
    responders based off of those mappings.
*/
class JSONMessageDispatcher
{
    /**
        A list of directories which are searched for response
        handlers when no binding is found.
    */
    private static $DispatcherPath = array();
    /** Internal storage for request-to-responder mappings. */
    private static $handlers = array();
    /**
     The default key used for looking up JSON sent via $_REQUEST.

     This MUST coincide with the value of JSONRequest.options.requestKey
     in the JS-side code.
    */
    const RequestKey = 'JSONRequest';

    /**
        Registers a directory for use in autoloading
        event handlers. See getResponder() for more details.

        The bound directories are searched in reverse order,
        so that later bindings will take precedence over
        earlier ones, in terms of search order.

        Returns false if $dirname does not exist, else it returns
        true. It does not add non-existing directories to the
        search path.
    */
    public static function addAutoloadDir( $dirname )
    {
        if( ! @file_exists($dirname) ) return false;
        array_unshift( self::$DispatcherPath, $dirname );
        return true;
    }


    /**
        Maps the given message type (request type) to a given
        factory.

        $messageType must be one of:

        - a string identifier, which is expected to be used in
        conjunction with JSONMessage::getType().

        - a JSONMessage object, in which case its
        getType() member is used as the message type.

        $factory is used to construct new handlers, and must be one of:

        - A string containing the name of a JSONResponder class.

        - A string containing the name of a JSONResponse class.

        - A string containing the name of a function which takes one
        JSONRequest argument and returns a JSONResponse or
        JSONResponder object.

        Returns nothing.
    */
    public static function mapResponder( $messageType, $factory )
    {
        if( $messageType instanceof JSONMessage )
        { $messageType = $messageType->getType(); }

        self::$handlers[$messageType] = $factory;
    }

    /**
        Tries to find a response handler for $request->getType().

        $request must be one of:

        - A JSONRequest object. Its getType() value is used
        as the handler lookup key.

        - An array, in which case the JSONRequest($request)
        is called to construct a request.

        - A string containing '{', in which case it is assumed
        to be message JSON and is passed on to JSONRequest($request).

        - A string containing a lookup key. If it is found, the response
        handler is passed that key rather than a JSONRequest() object.

        If $f is a string and does not map to a current entry then
        paths which have been registered in addAutoloadDir() are searched
        for a file names EVENT_TYPE.inc.php. If one is found, it is
        include and the mapping is re-checked (because presumably the
        file will register a handler).

        Returns:

        If no handler is found, null is returned. If one is found,
        it is handled as described in mapResponder()
        and on success a JSONResponder is returned. If an error is encountered
        in the handling of the request, the contained response will
        be a wrapper for that error.
    */
    public static function getResponder( $request )
    {
        $key = null;
        function reportError($r,$msg)
        {
            return new JSONResponder_Error($r,
                __CLASS__.'::getResponder(): '.$msg);
        }

        if( is_string($request) )
        {
            if( false === strpos($request,'{') )
            {
                $key = $request;
            }
            else
            {
                try
                {
                    $request = new JSONRequest( $request );
                    $key = $request->getType();
                }
                catch(Exception $e)
                {
                    if(1)
                    {
                        throw $e;
                    }
                    else
                    {
                        return new JSONResponder_Error(null,
                                "EXCEPTION while creating JSONRequest from request data: "
                                .$e->getMessage());
                    }
                }
            }
        }
        else if( $request instanceof JSONRequest )
        { $key = $request->getType(); }
        else if( @is_array($request) )
        {
            $request = new JSONRequest( $request );
            $key = $request->getType();
        }
        else
        {
            // TODO: create an Exception response type to wrap this, and return it:
            return new JSONResponder_Error(new JSONRequest(),
                "Illegal arguments to ".__CLASS__."::getResponder([unknown])");
        }
        $f = @self::$handlers[$key];
        $request->set('arrivalTime', $request->get( 'arrivalTime', JSONMessage::timestamp() ) );

        while( ! $f )
        {
            foreach( self::$DispatcherPath as $dir )
            {
                $fn = $dir.'/'.$key.'.inc.php';
                if( @file_exists($fn) )
                {
                    require_once($fn);
                    $f = @self::$handlers[$key];
                    break;
                }
            }
            if( ! $f ) return null;//reportErr($request,"No Responder found for message type '".$key."'.");
            break;
        }
        if( is_string($f) )
        {
            if( class_exists($f) )
            {
                $x = new $f($request);
                if( $x instanceof JSONResponder ) return $x;
                else if( $x instanceof JSONResponse )
                {
                    return new JSONResponder_Generic( $request, $x );
                }
                else
                {
                    return reportError($r,"class mapped to [".$key."] is neither "
                            ."a JSONResponder nor a JSONResponse!");
                }
            }
            else if( function_exists($f) )
            {
                $x = $f($request);
                if( $x instanceof JSONResponder ) return $x;
                else if( $x instanceof JSONResponse )
                {
                    return new JSONResponder_Generic( $request, $x );
                }
                else
                {
                    return reportError($request,
                        "JSONMessageDispatcher mapped to [".$key."] returned an object of an unknown type!");
                }
            }
            else
            {
                return reportError($request,
                    "JSONResponder mapped to [".$key."] names neither a class nor a function!");
            }
        }
        else if( is_callable( $f ) )
        {
            $x = $f($request);
            if( $x instanceof JSONResponder ) return $x;
            else if( $x instanceof JSONResponse )
            {
                return new JSONResponder_Generic( $request, $x );
            }
            else
            {
                return reportError($request,
                    "JSONMessageDispatcher mapped to [".$key."] returned an object of an unknown typ!");
            }
        }
        else
        {
            return reportError($request,
                "JSONMessageDispatcher handler mapped to [".$key."] is not callable!");
        }
    }

    /**
        Looks for a mapped response handler for the given request.
        $request may be of any type supported by getResponder().
        On success the returned object is the result of calling
        $responder->getResponse(). If an exception is caught then
        the returned response is a wrapper for that exception,
        suitable for passing back to the client. If null is returned
        then no responder could be found (via getResponder($request))
        (but an exception might also be propagated in that case).
    */
    public static function getResponse( $request )
    {
        try
        {
            $r = self::getResponder( $request );
            return $r ? $r->getResponse() : null;
        }
        catch(Error $ex)
        {
            return new JSONResponse_Error( $request, $ex );
        }
    }

    /**
        Looks in $_REQUEST[$key] for JSON data and tries to construct a
        JSONRequest from it.

        If $key is not found then null is returned, otherwise it is assumed
        to be a valid argument to the JSONRequest ctor and it is used to construct
        a response.

        On any error aside from $key not being found, a JSONResponse_Error is thrown.
        That response object can be passed directly back to the client.

        To facilitate testing from the command-line, if $_REQUEST[$key] is not
        found then $_ENV[$key] is searched.
    */
    public static function getRequestFromEnv( $key = JSONMessageDispatcher::RequestKey )
    {
        try
        {
            $json = @$_REQUEST[$key];
            if( ! $json ) $json = @$_ENV[$key];
            if( ! $json ) return null;
            if( ! is_array($json) && get_magic_quotes_gpc() )
            {
                $json = stripslashes($json);
            }
            return new JSONRequest($json);
        }
        catch(JSONResponse_Error $ex)
        {
            throw $ex;
        }
        catch(Error $ex)
        {
            throw new JSONResponse_Error( null, $ex );
        }
    }
    /**
        Calls getRequestFromEnv() to fetch a JSONRequest object.
        On success it tries to find a mapped handler for the request.
        If one is found then it is processed and a JSONResponse is
        returned.

        On error:

        - If no request or no handler is found and $returnErrorObjIfNotFound
        is true then a response object wrapping an error message is returned.
        If $returnErrorObjIfNotFound is false then null is returned.

        - In all other error cases, a response object wrapping an
        error is returned.

        This function does not propagate exceptions: it returns a
        JSONResponse_Error object if it encounters an exception.
    */
    public static function getResponseFromEnv( $key = JSONMessageDispatcher::RequestKey, $returnErrorObjIfNotFound = true )
    {
        try
        {
            $req = self::getRequestFromEnv($key);
            if( ! $req )
            {
                if( ! $returnErrorObjIfNotFound ) return null;
                else throw new JSONError( "No JSONRequest data found in \$_REQUEST[$key]!" );
            }
            $res = self::getResponse( $req );
            if( !$res )
            {
                if( $returnErrorObjIfNotFound )
                {
                    return new JSONResponse_Error($req,
                        "JSONRequest of type '".$req->getType()."' was found in "
                        ."\$_REQUEST[$key], but no request handler was found for it!" );
                }
                else
                {
                    throw new JSONError( "JSON data was found in "
                        ."\$_REQUEST[$key], but no "
                        ."request handler was found for it! [INPUT=$json]" );
                }
            }
            return $res;
        }
        catch(JSONResponse_Error $ex)
        {
            return $ex;
        }
        catch(Error $ex)
        {
            return new JSONResponse_Error( null, $ex );
        }
    }

    /**
       To be (optionally) run one time before using this class.  It
       adds default request handler search paths. If it is called
       after another path has been set then it does nothing.  Returns
       true if it does (or tries to do) anything, else false.

       By default it adds these paths:

       - DIR/response/local
       - DIR/response

       DIR = dirname(__FILE__)
    */
    public static function setupDefaultAutoloadPaths()
    {
        if( count(self::$DispatcherPath) ) return false;
        $D = dirname(__FILE__);
        $rd = $D.'/response';
        foreach( array(
                       $rd,
                       $rd.'/local',
                       ) as $d )
        {
            if( @is_dir( $d ) )
            {
                JSONMessageDispatcher::addAutoloadDir( $d );
            }
        }
        return true;
    }

    /**
        For use with custom autoloaded responders, it generates a
        request type name based on the contents of $filename.

        All it does is strip '|^.+/response(/local)?/?|' and
        any extension from $filename. This of course relies on the
        convention that the responses live in a directory named
        "response" (or a subdirectory of that).

        e.g.:
        $filename = "/path/to/response/my/myapp/message.inc.php"

        Returns 'my/myapp/message'.

        It is intended to be passed the __FILE__ constant from
        the impl file of an autoloadable response class.

        The returned key is intended to be used as a JSONRequest type.
    */
    public static function calculateResponderKey($filename)
    {
        $fn = preg_replace('|^.+/response(/local)?/?|','',$filename);
        $fn = preg_replace('|\..*$|','',$fn);
        return $fn;
    }

    /**
     Intended for use in impl files for autoloadable response handlers, called
     one time (from global scope) directly after the response handler class is defined.
     It should be used exactly like this:

     JSONMessageDispatcher::mapResponderFile( __FILE__, 'MyResponseClassName' );

     See also: calculateResponderKey(), as that is used to calculate the
     event key name.
    */
    public static function mapResponderFile( $filename, $classname )
    {
        return self::mapResponder( self::calculateResponderKey($filename), $classname );
    }

}; /* class JSONMessageDispatcher */
JSONMessageDispatcher::setupDefaultAutoloadPaths();
//JSONMessageDispatcher::addAutoloadDir( dirname(__FILE__) );
//JSONMessageDispatcher::addAutoloadDir( '.' );

/**
    A JSONResponder intended for use as a base class for other
    JSONResponder types.

    This interface may go away, as it would appear to
    be an unnecessary level of indirection.
*/
class JSONResponder_Base implements JSONResponder
{
    private $req = null;
    private $mixed = null;
    /**
        See JSONMessage constructor. $this->setData($mixed)
        is called, but this class does nothing with it. $mixed
        can later be fetched with getData().
    */
    public function __construct( JSONRequest $req, $mixed = null )
    {
        if( ! $req )
        {
            throw new Exception(__CLASS__.'::__construct($req[,$mixed): $req must be non-null!');
        }
        $this->req = $req;
        $this->setData( $mixed );
    }

    /**
        Sets this object's subclass-specific data.
    */
    protected function setData( $mixed )
    {
        return $this->mixed = $mixed;
    }

    /**
        Gets this object's subclass-specific data.
    */
    protected function getData()
    {
        return $this->mixed;
    }

    /** Returns the request object which was set in the ctor. */
    protected function getRequest()
    {
        return $this->req;
    }

    /** Reimplemented from the JSONResponder interface.

        This implementation always returns an error response
        wrapper unless $this->getData() is-a JSONResponse,
        in which case it is returned, or an Exception, in which
        case an error response wrapper is returned. Subclasses will
        want to reimplement this or pass a JSONResponse object
        to setData() (or via this type's ctor) before getResponse()
        is called.
    */
    public function getResponse()
    {
        if( ! $this->mixed )
        {
            return new JSONResponse_Error( $this->getRequest(),
                    "JSONResponder_Base::getResponse() must be re-implemented by "
                    ."subclasses or they must call setData( a_JSONResponse )!");
        }
        if( $this->mixed instanceof JSONResponse ) return $this->mixed;
        else if( $this->mixed instanceof Exception )
        {
            return new JSONResponse_Error( $this->getRequest(), $this->mixed );
        }
        return new JSONResponse_Error( $this->getRequest(),
                    "JSONResponder_Base::getResponse() must be re-implemented by "
                    ."subclasses or they must call setData( a_JSONResponse_object )!");
    }

};
/**
    A JSONResponder which wraps an arbitrary JSONResponse.
*/
class JSONResponder_Generic extends JSONResponder_Base
{
    /**
        See JSONMessage constructor. Requires that $response
        be-a JSONResponse, or an exception is thrown.
        $response only defaults to null because of
        interface requirements.
    */
    public function __construct( JSONRequest $req, $response = null )
    {
        if( ! ($response instanceof JSONResponse ) )
        {
             throw new JSONResponse_Error($req,
                   "".__CLASS__."::__construct:: second arg must be-a JSONResponse!");
        }
        parent::__construct( $req, $response );
    }
};


/**
    A JSONResponse which wraps an an Exception or
    error string.
*/
class JSONResponse_Error extends JSONResponse
{
    /**
        See JSONMessage constructor. $ex must be-a Exception or a string
        describing an exception. If !$ex then a useless default message is used,
        reminding the caller to pass the second argument.
    */
    public function __construct( JSONRequest $req, $ex )
    {
        if( ! ($req instanceof JSONRequest) )
        {
            $req = new JSONRequest();
            $req->setType("error");
        }
        parent::__construct( $req );
        if( !($ex instanceof Exception) )
        {
            if( ! $ex) $ex = "No error text passed to ".__CLASS__."::__construct(request,error).";
            $ex = new JSONError(''.$ex, JSONMessage::ErrIDException);
        }
        $code = $ex->getCode();
        if( ! $code ) $code = JSONMessage::ErrIDException;
        $this->setResult($code,$ex->getMessage());
    }
}

/**
    A JSONResponder which wraps an an Exception or
    error string. This is not intended to be used as
    a client-callable response, but as an error
    response when the dispatching process catches
    and exception or detects some other serious error.
*/
class JSONResponder_Error extends JSONResponder_Base
{
    /**
        See JSONMessage constructor. This particular implementation
        requires that the second param be-a Exception object or a string
        describing the exception. $ex only defaults to null because of
        interface requirements. If it is null then some useless
        default will be used.
    */
    public function __construct( JSONRequest $req, $ex = null )
    {
        parent::__construct(
            $req,
            $ex ? $ex
                : (__CLASS__."::__construct(request,error): error arg should not be left empty!")
            );
    }
    public function getResponse()
    {
        return new JSONResponse_Error( $this->getRequest(), $this->getData() );
    }
};

/**
    A dummy/test JSONResponder.
*/
class JSONResponder_Dummy extends JSONResponder_Base
{
    /**
        The event key name which "should" be used
        for this class.
    */
    const EventKey = 'dummy';
    const ClassName = __CLASS__;
    /**
        See JSONMessage constructor.
    */
    public function __construct( JSONRequest $req, $ignored = null )
    {
        parent::__construct( $req );
    }
    public function getResponse()
    {
        $req = $this->getRequest();
        $r = new JSONResponse( $req );
        $r->setResult(0,'Dummy response.');
        $r->setPayload( $req->getPayload() );
        return $r;
    }
};

/**
    A response object which adds the following payload to the response:

    {
        timeDiffSeconds : double X,
        requestTime: $requst->getTimestamp(),
        pingPayload : $request->getPayload()
    }

    where X is the diff in type between $req->getTimestamp() and
    the current time, in seconds. (Don't ask me why i chose seconds
    over miliseconds... i don't remember.)

    Except for passing the request payload back via the response,
    this class ignores the actual content of the payload, applying
    no meaning to it.
*/
class JSONResponse_Ping extends JSONResponse
{
    /**
        The event key name which "should" be used
        for this class.
    */
    const EventKey = 'ping';
    const ClassName = __CLASS__;
    /**
        See JSONMessage constructor.

    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        $tr = $req->get('timestamp');
        $ts = $this->get('timestamp');
        $ar = array(
            'timeDiffSeconds' => ($ts-$tr)/1000,
            'requestTime' => $tr,
            'pingPayload' => $req->getPayload()
            // ^^^ Arguable: could assist in DOS attacks by sending arbitrarily large payloads back and forth.
        );
        $this->setResult(0,'Pong');
        $this->setPayload( $ar );
    }
}


JSONMessageDispatcher::mapResponder( JSONResponder_Dummy::EventKey, JSONResponder_Dummy );
JSONMessageDispatcher::mapResponder( JSONResponse_Ping::EventKey, JSONResponse_Ping );

?>
