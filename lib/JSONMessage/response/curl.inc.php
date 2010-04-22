<?php
/**
    INCOMPLETE!

    This JSONResponse subclass uses the PHP Curl
    extension to fetch data. It is intended as a partial
    workaround for the same-origin limitation in browsers:
    they can fetch remote data via this class if the
    server is configured to allow it.

    Input payload:

    {
        // -- Required: --

        url: string,

        // -- Optional: --

        // params to pass to the remote URL
        parameters: {key1:val1,...},

        // If true then the result is unJSON'd server-side.
        json:boolean,

        // If (timeout <= JSONResponse_Curl::TimeoutMSThreshold) then
        // evaluated as seconds, else milliseconds
        timeout: int,

        // Specify a non-default port.
        port: int,

        // Whether or not to follow redirects.
        followLocation: boolean,

        // Maximum number of redirects to follow.
        maxRedirs: int 

        // Default=true. If false, on error the content may contain raw error
        // string or, if json is true, an error about being able to de-JSON the data.
        // In general this should be set to true. As an example, if failOnError
        // is false and the remote is 404 then the result string will contain the
        // contents of that 404 page. If failOnError is true then we would get
        // a more useful (and shorter) error message from curl, saying that the
        // page is 404.
        failOnError: boolean,

        // -- Not yet implemented: --

        method: "GET" or "POST", // currently supports only GET
    }

    Output payload:

    {
        content: string // whatever came back
        // OR:
        content: object // if request.payload.json==true and de-JSON'ing succeeds.
    }

    The advantage of using the "json" flag is that the server
    decodes the content and returns it as an object, as opposed
    to returning a JSON string with another level of JSON escaping
    done on it (which the client must undo using JSON.parse()).
*/
class JSONResponse_Curl extends JSONResponse
{
    /**
        payload.curlopt.timeout values <= to this value
        are treated as seconds, else milliseconds.
    */
    const TimeoutMSThreshold = 180;
    /**
        See JSONMessage constructor.
    */
    public function __construct( JSONRequest $req )
    {
        parent::__construct( $req );
        //$this->setPayload();
        $pay = $req->getPayload();
        $mtype = $req->getType();
        if( ! $pay )
        {
            throw new Exception("'".$mtype."' requests require a payload "
                                ."describing the request!");
        }
        $url = @$pay['url'];
        if( ! $url )
        {
            throw new Exception("'".$mtype."' request payload must contain a 'url' property!");
        }
        $ch = null;
        $ex = null;
        $method = @$pay['method'];
        if(!$method) $method='GET';
        $opay = array();
        try
        {
            $ch = curl_init();
            if( ! $ch )
            {
                throw new Exception("curl_init() failed!");
            }
            $baseURL = $url;
            { // parameters property...
                if( ($param = @$pay['parameters'] ) )
                {
                    $x = array();
                    foreach( $param as $k => $v )
                    {
                        $x[] = urlencode($k).'='.urlencode($v);
                    }
                    if( count($x) )
                    {
                        $check = strpos( $url, '?' );
                        if( false === $check ) $url .= '?';
                        else
                        { // tag on '&' if the last character is not '?'
                            if( $check != (strlen($url)-1) )
                            {
                                $url .= '&';
                            }
                        }
                        // FIXME: this logic is for GET but not POST
                        $url .= implode('&',$x);
                    }
                }
            }
            curl_setopt_array( $ch, array(
                CURLOPT_URL => $url,
                CURLOPT_HEADER => 0, // FIXME: parse the header to see if the data is JSON or binary
                CURLOPT_FOLLOWLOCATION => 1,
                CURLOPT_MAXREDIRS => 4,
                CURLOPT_RETURNTRANSFER => true
            ));
            { // client-configurable CURLOPT parameters.
                if(1)
                { // force defaults of certain fields...
                    $defaults = array(
                        'failOnError' => true // without this we end up passing back error strings to json_decode()
                    );
                    foreach( $defaults as $k => $v )
                    {
                        if( ! @array_key_exists( $k, $pay ) )
                        {
                            $pay[$k] = $defaults[$k];
                        }
                    }
                }
                $optlist = array(
                        'port' => CURLOPT_PORT,
                        'followLocation' => CURLOPT_FOLLOWLOCATION,
                        'maxRedirs' => CURLOPT_MAXREDIRS,
                        'failOnError' => CURLOPT_FAILONERROR
                );
                foreach( $optlist as $k => $v )
                {
                    if( @array_key_exists( $k, $pay ) )
                    {
                        curl_setopt( $ch, $v, $pay[$k] );
                    }
                }
                { // Special case for timeout property...
                    $tm = @intval( @$pay['timeout'] );
                    if( $tm )
                    {
                        /** In my simple tests:

                            - CURLOPT_TIMEOUT isn't honored.

                            - CURLOPT_TIMEOUT_MS always _immediately_ times out for
                            any values under 1000 and is not honored for >=1000.
                        */
                        if( $tm <= self::TimeoutMSThreshold )
                        {
                            curl_setopt( $ch, CURLOPT_TIMEOUT, $tm );
                        }
                        else
                        {
                            curl_setopt( $ch, CURLOPT_TIMEOUT_MS, $tm );
                        }
                    }
                }
            }

            { // fetch the result...
                $c = @curl_exec( $ch );
                if( FALSE === $c )
                {
                    throw new Exception("curl_exec() failed: ".curl_error($ch));
                }
                if( @$pay['json'] )
                {
                    $c = @json_decode( $c, true );
                    if( null === $c )
                    {
                        $msg = "Decoding of JSON data failed";
                        if( function_exists('json_last_error'/*PHP 5.3.0+*/) )
                        {
                            $json_errors = array(
                                JSON_ERROR_NONE => 'WTF?!? json_last_error() says that error has occurred!',
                                JSON_ERROR_DEPTH => 'The maximum stack depth has been exceeded.',
                                JSON_ERROR_CTRL_CHAR => 'Control character error, possibly incorrectly encoded.',
                                JSON_ERROR_SYNTAX => 'Syntax error.'
                                // JSON_ERROR_UTF8 => 'Malformed UTF8!'// requires PHP 5.3.1+
                            );
                            $msg .= ': '.json_last_error();
                        }
                        else
                        {
                            $msg .= '!';
                        }
                        throw new Exception($msg);
                    }
                }
                $opay['content'] = $c;
            }

            curl_close($ch);
        }
        catch(Exception $e)
        {
            curl_close($ch);
            throw $e;
        }
        $this->setPayload( $opay );
    }
}
JSONMessageDispatcher::mapResponderFile( __FILE__, JSONResponse_Curl );
?>
