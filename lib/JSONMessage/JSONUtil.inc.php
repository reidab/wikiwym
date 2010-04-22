<?php
/**********************************************************************
JSONUtil contains some utility code for dealing with JSON traffic
via PHP.

Requires:

- PHP 5 with json_encode()

Author: Stephan Beal (http://wanderinghorse.net/home/stephan/)
License: Public Domain
**********************************************************************/
if( class_exists('JSONUtil', false ) ) return true;

class JSONUtil
{
    /**
        Returns $v, possibly quoted and escaped for use with JSON. $v is
        expected to be a POD type, not an array or object.

        If $v === null then the string "null" (WITHOUT embedded quotes) is returned.

        If is_numeric($v) then $v is returned as-is.
        Otherwise $v is toString-ed and escaped/quoted using JSON conventions.

        If is_bool($v) then either 'true' or 'false' is returned (the default conversions
        change them to '1' and '0').
    */
    public static function quoteJSONVal($v)
    {
        if( null === $v ) return "null";
        else if( is_numeric($v) ) return $v;
        else if( is_bool($v) ) return $v ? 'true' : 'false';
        else
        {
            return json_encode($v);
            /* ^^^^ do this so that PHP can take care of non-ASCII data (if it indeed does that). */
            //static $from = array("\\", "\n", "\t", "\r", "\b", "\f", '"');
            //static $to   = array('\\', '\n', '\t', '\r', '\b', '\f', '\"');
            //return '"' . str_replace($from[0], $to[1], $v) . '"';
            static $meta = array(/* be careful with escaping the escaping rules here!*/
                "\b" => '\b',
                "\t" => '\t',
                "\n" => '\n',
                "\f" => '\f',
                "\r" => '\r',
                '"'  => '\"',
                "\\" => '\\'
                );
            $esc = ''.$v;
            if( $esc )
            {
                foreach( $meta as $k => $v )
                {
                    $esc = str_replace($k, $v, $esc );
                }
            }
            return '"'.$esc.'"';
        }
    }


    /**
    * Converts an associative or vector array of arbitrary depth and dimension
    * into a JSON representation.
    *
    * If $array is a mixed associative and vector array, it will expand
    * the non-associative array entries so that they have a key equal to
    * their index. For example array("foo", "bar" => "baz") will be
    * translated to {0: "foo", "bar": "baz"} but array("foo", "bar")
    * would be translated into [ "foo", "bar" ]. Note the different output
    * types for each case (the first is an object, the second an array).
    *
    * @param $array The array to convert.
    * @return mixed The resulting JSON string, or false if the argument was not an array.
    *         "Might" throw on error.
    * @author Andy Rusterholz, hacked considerably by Stephan Beal
    *
    * Source code originally gleaned from: http://us2.php.net/manual/en/function.json-encode.php
    *
    * Changes by Stephan Beal:
    *
    * - Now uses strictly JSON-compliant quotes and escaping (at least i think so).
    *
    * - Output null values as literal null instead of as "".
    *
    * - For a given embedded value $val, if is_object($val) and member_exists($val,'toJSON')
    * then $val->toJSON() is used for harvesting the output.
    *
    * - Mixed vector/assoc arrays no longer have an artificial key of "key_INDEX" for
    * the vector entries. Instead, the index itself is used as the key. e.g. instead
    * of ["key_1":"val1",...] we emit [1:"val1",...]. (i think the previous behaviour was
    * due to a misunderstanding of the JSON specs.)
    *
    */
    public static function arrayToJSON( $array )
    {
        if( !is_array( $array ) ){
            return false;
        }
        $result = null;
        $associative = count( array_diff( array_keys($array), array_keys( array_keys( $array )) ));
        if( $associative )
        {
            $construct = array();
            foreach( $array as $key => $value )
            {
                // We first copy each key/value pair into a staging array,
                // formatting each key and value properly as we go.
                $key = self::quoteJSONVal($key);

                // Format the value:
                if( is_array( $value )){
                    $value = self::arrayToJSON( $value );
                }
                else if( null === $value )
                {
                    $value = 'null';
                }
                else if( is_object($value) && method_exists($value,'toJSON') )
                {
                    $value = $value->toJSON();
                }
                else //if( !is_numeric( $value ) || is_string( $value ) ){
                {
                    $value = self::quoteJSONVal($value);
                }
                // Add to staging array:
                $construct[] = "$key: $value";
            }

            // Then we collapse the staging array into the JSON form:
            $result = "{ " . implode( ", ", $construct ) . " }";
        }
        else
        { // If the array is a vector (not associative):

            $construct = array();
            foreach( $array as $value )
            {

                // Format the value:
                if( is_array( $value ))
                {
                    $value = self::arrayToJSON( $value );
                }
                else if( !is_numeric( $value ) || is_string( $value ) )
                {
                    $value = self::quoteJSONVal($value);
                }
                // Add to staging array:
                $construct[] = $value;
            }

            // Then we collapse the staging array into the JSON form:
            $result = "[ " . implode( ", ", $construct ) . " ]";
        }

        return $result;
    }

}; /* class JSONUtil */

?>
