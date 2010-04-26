/* LICENSE

The JSONMessage framework's JavaScript source code, including accompanying
documentation and demonstration applications, are licensed under the following
conditions...

The author (Stephan G. Beal [http://wanderinghorse.net/home/stephan/]) explicitly
disclaims copyright in all jurisdictions which recognize such a disclaimer. In
such jurisdictions, this software is released into the Public Domain.

In jurisdictions which do not recognize Public Domain property (e.g. Germany as of
2010), this software is Copyright (c) 2009, 2010 by Stephan G. Beal, and is
released under the terms of the MIT License (see below).

In jurisdictions which recognize Public Domain property, the user of this software
may choose to accept it either as 1) Public Domain, 2) under the conditions of the MIT License
(see below), or 3) under the terms of dual Public Domain/MIT License conditions described
here, as they choose.

The MIT License is about as close to Public Domain as a license can get, and is
described in clear, concise terms at:

    http://en.wikipedia.org/wiki/MIT_License

The full text of the MIT License follows:

--
Copyright (c) 2009, 2010 Stephan G. Beal (http://wanderinghorse.net/home/stephan/)

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

--END OF MIT LICENSE--

For purposes of the above license, the term "Software" includes
documentation and demonstration source code which accompanies
this software. ("Accompanies" = is contained in the Software's
primary public source code repository.)

*/
/*!
    This file implements the JavaScript/client side of the JSONMessage
    messaging framework.

    External requirements:

    - PHP5, for the PHP5 side of the API. (Or a conventions-compatible
    substitute.)

    - A global JSON object compatible with Crockford's
    json2.js. Some JavaScript engines have this object
    pre-installed.

    - jQuery, but only for the AJAX posting. Mainly tested with 1.3,
    but also seems to work on 1.2.6 (maybe earlier 1.2's as well).
    i've found that by applying this one-line patch:
        http://dev.jquery.com/ticket/5024
    to 1.2.6, some mysterious crashes are avoided.

    - Optionally: a JS sprintf() implementation.
    e.g. http://www.webtoolkit.info/javascript-sprintf.html

    - Conventional JSON object (e.g. json2.js)

    - extendClass.js, for the subclassing mechanism.

    - JSONable.inc.js (JSONable class)

    TODOs:

    - Add a factory interface for Requests/Responses so we can
    preserve polymorphism in some contexts (e.g. returning a polymorphic
    response to the requester).
*/

/*
    Class: JSONMessage

    The JS-side counterpart of the JSONMessage PHP class, this is
    the base-most class of JSONMessage.Request and JSONMessage.Response.

    This class is not normally used directly: client code interacts
    via the JSONMessage.Request and JSONMessage.Response, both of which are
    JSONMessage subclasses.

    The first argument may be anything supported by the
    inherited JSONable.fromJSON() method. That basically means:
    a) no arguments, b) a JSON string containing JSONMessage-structured
    data, or c) a JSMessage-structured object (i.e., one which
    was constructed from (b)'s JSON data).

    As a special case, if an Object is passed to the ctor
    and the decoding of that object contains no id/timestamp fields (or they
    have null/false values) then the ctor re-sets them. That allows
    clients to use the ctor like, e.g.:

    @code
    var request = new JSONMessage.Request({type:'ping',payload:{...}});
    @endcode

    without supplying the id and timestamp fields. HOWEVER, it also
    means that bogus id/response values will be set if imported
    (via JSONMessage.Response) data is missing those fields. That said,
    the PHP side of the framework always sets those fields, so that
    condition "shouldn't happen."

    The (id,timestamp) properties are _amost_ always
    set, even if no arguments are passed to the ctor. Not doing so
    can lead to confusion about the origin of the message. The one
    time where id/timestamp might be removed is if the first argument is
    a JSON string containing a JSONMessage object but it is missing
    those fields. In practice that condition cannot happen unless
    the client constructs his own raw JSON message instead of using
    the OO APIs.

    Note that the public JSONMessage member API is comprised only
    of functions, not non-function properties. That was an early
    design decision in JSMessage's history, made for reasons of API
    consistency and (hopefully) clarity. Client could should never
    directly use any non-function properties of this class, nor
    of its subclasses unless they document otherwise.

    ACHTUNG #1:

    When creating custom messages and passing the message
    data to this ctor as an object, it is important that client code not
    set any of the following reserved fields: id, timestamp.
    Doing so will invoke undefined behaviour (long story).
    Additionally, they must respect the meaning of the 'type'
    property (it is the name of a server-side response handler).
    NO message-type-specific data should be a direct member
    of the passed-in object, but should instead by packaged inside
    the 'payload' member of that object. The payload member is
    reserved for holding an arbitrary value (object or otherwise),
    depending on the contract/API of the message specified by the
    'type' field. It is legal for a de-JSON'd data object passed
    to this ctor to contain such fields, provided that data was
    generated from the JSONMessage API (and therefore should be
    structured properly).

*/
function JSONMessage()
{
    this.$d =
    { /* we must overwrite these from the prototype to avoid
        cross-polination of message data between unrelated
        messages! */
        fields:
        {
        // Reserved fields:
        id:null,
        type:'unknown',
        timestamp:null,
        /**
            payload notes:

            i want this to default to unset/undefined
            because some messages don't need it, and therefore
            don't need to send it. However, having it
            default to null/undef is often inconvenient
            in downstream code. i tried setting it to {}
            by default, but the PHP side JSON code gets
            confused by that and when parsing it BACK
            to JSON it cannot distinguish between an
            empty array and an empty object, and it returns
            "[]" in the case of (payload==={}).

            So i've decided to default to undefined, to
            help avoid potential mis-interactions with the PHP
            layer's to/from JSON bits.
        */
        payload:undefined,
        options:undefined
        }
    };
    /** ^^^^ Do we need to do the same for this.$reimpl, because of
        how we might change this.$reimpl.jsonName? Might as well,
        just to be safe...
    */
    if(1)
    {
        this.$reimpl = {};
        for( var k in this.constructor.prototype.$reimpl ) this.$reimpl[k] = this.constructor.prototype.$reimpl[k];
    }
    /*
        For JSONMessage.Responses, we expect that ID and Timestamp will be re-set
        from the JSON data.
    */
    this.timestamp(null);
    this.id( JSONMessage.generateID() );
    if( arguments.length )
    {
        var myid = this.id();
        var myts = this.timestamp();
        this.fromJSON( arguments[0] );
        if( 'object' === typeof arguments[0] )
        { /* KLUDGE: allow the user to pass
            a ctor in the form {type:'foo',payload:{...}},
            and still get sensible id/timestamp values.

            When creating new JSONResponses from incoming
            JSON data, we later on make sure to pass a
            string, instead of JSON-like Object, to bypass
            this kludge.
            */
            if( ! this.timestamp() ) this.timestamp(myts);
            if( ! this.id() ) this.id(myid);
        }
    }
    else
    {
    }

};

/**
    Client-configurable options for JSONMessage
    and subclasses.
*/
JSONMessage.options = {
    /**
        Used as the 3rd argument to JSON.stringify() for
        JSONMessage objects. Set it to null to disable
        extra spacing.
    */
    toJSONSpacing:'  '
};
/*
    Returns the current GMT/UTC timestamp, with in miliseconds
    accuraccy.
*/
JSONMessage.timestamp = function()
{
    return (new Date()).getTime();
};

/*
    Generates a pseudorandom ID for use as a JSONMessage
    ID.
*/
JSONMessage.generateID = function()
{
    if( undefined === arguments.callee.sequence )
    {
        arguments.callee.sequence = 0;
    }
    var id;
    if( JSONMessage.hasSprintf )
    {
        id = JSONMessage.timestamp()
            +'/'+sprintf("%08x", (Math.round( Math.random() * 100000000) ))
            +':'+sprintf("%04x", (++arguments.callee.sequence));
        // Many Thanks to http://www.webtoolkit.info/javascript-sprintf.html for sprintf() :)
    }
    else
    {
        id = JSONMessage.timestamp()
            +'/'+(Math.round( Math.random() * 100000000) )
            +':'+(++arguments.callee.sequence);
    }
    return id;
};
/** Internal flag. */
JSONMessage.hasSprintf = ('sprintf' in this/*assuming 'this' is the global object!*/);

/**
    Returns a function which behaves like this:

    If called with no arguments, it returns: this.get(key)

    Else it returns this.set( key, arguments[0] ).

    It it intended to generate accessors for methods for
    common fields in JSONMessage objects.
*/
JSONMessage.generateAccessor = function(key)
{
    return function()
    {
        return arguments.length
            ? (this.set( key, arguments[0] ))
            : this.get(key);

    };
};

/*
    Similar to JSONMessage.generateAccessor(), but
    returns a function which operates on properties
    which are conventionally object literals.

    The returns function can be used like so:

        func(): returns this.get(PropKey).

        func(oneArg): returns this.set(PropKey,oneArg)
        (i.e. returns this object).

        func(k,v): Calls this.set(k,v).
        Returns this object.

        func(boolean replaceobj, Object obj):
        if replaceobj===true then the effect
        is the same as calling this.set(PropKey,obj).
        If replaceobj===false then
        each property of obj is deeply copied into
        the object returned by func() (the objectis created if
        needed).
        Returns this object.
*/
JSONMessage.generateObjAccessor = function(PropKey)
{
    var key = PropKey;
    return function()
    {
        if( 1 < arguments.length )
        {
            var p = this.get(key);
            if( ! p ) this.set(key, p = {} ) /* remember that JSONMessage.set() deeply copies! */;
            var a1 = arguments[0];
            if( (true===a1) || (false===a1) )
            {
                var obj = arguments[1];
                if( a1 === true ) this.set(key,obj);
                else
                {
                    for( var k in obj )
                    {
                        p[k] = obj[k];
                    }
                    this.set(key, p )
                        /* ^^^ i hate this - it's horribly inefficient
                        b/c of the to/from JSON of arbitrary other
                        properties, aside from those we just
                        updated.*/
                    ;
                }
            }
            else
            {
                p[ a1 ] = arguments[1];
                this.set(key, p ) /* see notes above. */;
            }
            return this;
        }
        else
        {
            return arguments.length
                ? (this.set( key, arguments[0] ))
                : this.get(key);
        }
    };
};


/*
    Returns true if v is-a Array.
*/
JSONMessage.isArray = function( v )
{
    return (v &&
            (v instanceof Array) || (toString.call(v) === "[object Array]")
            );
    /* Reminders to self:
        typeof [] == "object"
        toString.call([]) == "[object Array]"
        ([]).toString() == empty
    */
};
/**
    Subclass JSONMessage from JSONable
    and extend the prototype object.
*/
extendClass( JSONMessage, JSONable )
.extendPrototype({
    /*
        Internal data. It is here only for documentation purposes, as
        these data will be overridden by the ctor.
    */
    $d:
    {
        /* Message fields (key/value pairs).

            These fields refer to the generic request/response
            fields, and not to the payload.
        */
        fields:{
        /** Unique message ID. Must be unique only within
        the application's scope (normally local, unless the
        app shares messages between multiple clients).
        */
        id:undefined,
        /** Timestamp of the message, in "Unix + ms" format,
        GMT. That is the number format GGGGMMM, where GGGGMMM is the current
        number of seconds since the start of the Unix Epoch and MMM is the
        3-digit milliseconds part.

        i.e. it's the same format as Date.getTime().

        Calling timestamp(null) will update the timestamp to the current
        time.
        */
        timestamp:undefined,
        /** Message type ID (string). */
        type:undefined,
        /** Message-type-specific low-level options. */
        options:undefined,
        /** Message-type-specific payload data. */
        payload:undefined
        }
    },
    /*
        constructedFromJSON set to true by the ctor or fromJSON() if the object
        has been initialized via JSON input.

        i don't remember why this flag is even here - it's never
        needed (but must have been at one point or i wouldn't
        have added it). It might go away.
    */
    constructedFromJSON:false,
    /**
        Reconstructs this object from a JSON string or
        a JSON-like object, which is expected to contain
        data in a format compatible with JSONMessage
        conventions.

        The first argument may be any of:

        - a valid JSON string (will throw if it's not valid)

        - a JSON-like object from which to copy all properties.

        If json is a JSON string or JSON-like object AND it has
        only one child AND that child contains the fields (id,type,timestamp)
        then that child is assumed to be a JSONMessage-conventional
        outer wrapper element, it is discarded, and that object's children are
        used as the message content instead. In that particular case, the name of
        the outer element will be used as the the return value for future
        calls to this.jsonName().

        The contents of the json object are set as properties of
        this object (not direct properties, but available using get()).

        If passed an object, this implementation forces a conversion
        to JSON and back to (A) ensure that the source object can do it
        and (B) to deeply clone all properties, ensuring that we do
        not get references to objects we don't own, inadvertently
        cause cyclic references (which kills JSON emiters), or otherwise
        muck about with data which doesn't belong to us.

        If this routine works the property this.constructedFromJSON is
        set to true, otherwise it is unchanged from its original value
        (default is false).

        This function may propagate an exception from the JSON parse.

        Returns:

        - On success, returns this object.

        - On error it will throw.

        It is possible to crash due to too much recursion if the
        input object has cyclic references and the JSON stringifier
        does not bail out after too much recursion.
    */
    fromJSONable:function(json)
    {
        if( ! json )
        {
            throw new Error("JSONMessage.fromJSON() was asked to de-JSONize null :(.");
        }
        var didParse = false;
        if( 'string' === (typeof json) )
        {
            //alert("Parsing JSON: "+json);
            json = JSON.parse(json);
            didParse = true;
            //alert("Parsed JSON: "+json.toSource());
        }
        else if( json.toJSON instanceof Function )
        {
            return arguments.callee.call( this, json.toJSON() );
        }
        if( ! didParse )
        { // ensure that we have clean JSON and (nice side effect) deeply clone all values:
            json = JSON.parse( JSON.stringify(json) );
        }
        this.$d.fields = {};
        if(0) alert('isArray?='+JSONMessage.isArray(json)+', typeof json='+(typeof json)
            +', toString(json)='+toString.call(json)+', json.toSource = '+json.toSource());
        /*
            This next hackery is to follow the PHP-side convention of allowing the
            input to be in the form:

            { messageName:{message...}}

            or:

            {message...}

            In the former case, (which we check for next), the outer wrapper object
            is discarded.
        */
        var ar = [];
        var name = null;
        for( var k in json )
        {
            ar.push(json[k]);
            if( ar.length > 1 ) break;
            name = k;
        }
        if( (1 === ar.length) )
        { /**
            This MIGHT be an object in the form {JSONRequest_xxx:{requestObjectData...}},
            as opposed to {requestObjectData...}. The API provides the client the choice
            of both formats, as both are useful in certain contexts. In general, messaging
            the latter format is simpler, but the former format is also sometimes useful. 
            */
            var container = ar[0];
            if( (typeof {}) === (typeof container) )
            {
                if( ('id' in container) && ('type' in container) && ('timestamp' in container) )
                { /* Kludgy: this appears to be an outer wrapper for
                    a message package. Strip it out.

                    There is a bug here: if a client calls:

                    new JSONMessageOrSubclass({id:...,type:'...',timestamp:...})

                    then we will end up stripping out the wrong object.

                    i regret ever giving the API the option of having
                    or not having the wrapper object. i don't recall
                    the exact reasons for making it optional, and may
                    change to always require it.
                    */
                    // strip container element
                    json = ar.shift();
                    this.$reimpl.jsonName = name;
                }
            }
        }
        //alert("Setting json ("+typeof json+"): ["+json.toString()+']');
        if( json )
        {
            this.set(json);
            this.constructedFromJSON = true;
        }
        else
        {
            throw new Error("JSONMessage.Request::fromJSONable(): this should never happen: processed json is false!");
        }
        return this;
    },
    /**
        Returns the underlying key/value store object
        for the message's core properties. This is
        really only for use by subclasses, and then
        only in weird cases.
    */
    fields:function(){return this.$d.fields;},
    /**
        Sets a key/value pair in the message's core properties.

        If k is-a Array or Object then it is assumed to be a
        collection of key/val pairs and those pairs are
        _copied_ to this object (and v is ignored).

        All values set by this function are DEEPLY COPIED by
        first JSON-ing them and then un-JSON-ing them.
        This is done to ensure that a) there are no
        cycles which would break the message later on
        and b) to ensure that external changes to the
        data via its original reference do not change
        the values set in this object.

        Returns this object.

        ACHTUNG: k will be used as an object property
        key, and therefore should follow JavaScript identifier
        naming rules. That said, JSON allows us to use arbitrary
        key strings, e.g. "foo/bar", which aren't legal identifiers,
        so feel free to use such strings.
    */
    set:function(k,v)
    {
        if( ! k ) return this; // kludge to avoid a phantom '0' entry
        if( JSONMessage.isArray( k ) || ('object' === typeof k))
        {
            for( var i in k )
            {
                this.set( i, k[i] );
            }
        }
        else
        {
            this.$d.fields[k] = JSON.parse( JSON.stringify( v ) );
        }
        return this;
    },
    /** Returns the value of message core field k. */
    get:function(k)
    {
        return this.$d.fields[k];
    },
    /** Gets or sets the message 'id' field.
        If called as a setter it returns this object.
    */
    id:JSONMessage.generateAccessor('id'),
    /** Gets or sets the message 'type' field.
        If called as a setter it returns this object.
    */
    type:JSONMessage.generateAccessor('type'),
    /**
        Gets or sets payload data. The structure of the payload is
        message-type specific.

        See JSONMessage.generateObjAccessor() for the various behaviours.

        Be aware that messages may start off with a null/undefined
        payload, in which case the getter form of this method
        will not return an object.

        If called as a setter it returns this object.
    */
    payload:JSONMessage.generateObjAccessor('payload'),
    /*
        Used exactly like payload(), but affects the 'options' property.
    */
    options:JSONMessage.generateObjAccessor('options'),
    /** Gets/sets timestamp. 

        If passed no arguments it returns the object's current timestamp value.
        If passed arguments it acts as a setter and returns this object.
        If passed a false value then the current time is used.
    */
    timestamp:function()
    {
        return arguments.length
            ? this.set( 'timestamp', arguments[0] ? arguments[0] : JSONMessage.timestamp() )
            : this.get('timestamp');
    },
    /**
        Returns the name used for the toJSON() wrapper element. That is, the
        object name which is used as the message container when toJSON() is used.

        Subclasses may override this by redefining $reimpl.jsonName
        in their prototype. This name is, however, mainly only useful
        for debugging, and the overall framework ignores this property.

        The format of the timestamp is the same as Date.getTime(), which is:
        XXXXMMM, where XXX is the number of seconds since the start of the Unix
        Epoch and MMM is the number of miliseconds in the current second, in
        GMT (UTC?) time.

        When the JSONMessage constructor is called in the form
        JSONMessage( {"SomeKey":{...message properties...}} )
        then the string "SomeKey" is used as the return value
        for this function. That can be used to determine (to some
        degree) which JSONMessage subclass the deserialized data
        is intended for (or was created from).
    */
    jsonName:function()
    {
        return this.$reimpl.jsonName;
    },
    /**
        Constructs a JSON object from this object.
        If withWrapper is true then
        the JSON represents a single message object
        with the contents contained in a sub-element
        called this.jsonName(). If withWrapper
        is false then that wrapper is omitted.
        See the JSONMessage PHP docs for more details
        about the wrapper element.

        The default value of withWrapper is true,
        but only for symmetry with the PHP side of
        the API.

        Note that this JSONizes only the message-relevant
        data, and not arbitrary properties.
    */
    toJSON:function(withWrapper)
    {
        if( ! arguments.length ) withWrapper = true;
        var tgt = withWrapper ? {} : this.$d.fields;
        if( withWrapper )
        {
            tgt[this.jsonName()] = this.$d.fields;
        }
        return JSON.stringify( tgt, undefined, JSONMessage.options.toJSONSpacing );
    },
    /**
        Uses this.toJSON(withWrapper[default=true]) to JSONify
        this object, then parses that JSON text to create a new
        Object (not-a JSONMessage!) which contains a deep copy
        of this message's structure. i.e. it clones this object
        into a JSON-friendly data structure. It may propagate
        an exception on error.
    */
    toJSONable:function(withWrapper)
    {
        return JSON.parse( this.toJSON(arguments.length ? withWrapper : true) );
    },
    /**
        Stuff which *really* should be set by subclasses, but which
        are annoying to set each ctor, are defined here. Subclasses
        must reimplement the whole $reimpl member, not just individual
        fields. The data almost never changes for specific instances,
        so it should be set in the subclass' prototype object instead
        of per-instance.
    */
    $reimpl:
    {
        jsonName:'JSONMessage'
    }
    //toString:function() { return this.prototype.toJSON.call( this ); }
}/*JSONMessage prototype.*/);


/**
    Creates a new JSONMessage.Request. JSONMessage.Request is a JSONMessage
    subclass and the constructor takes the same arguments
    as JSONMessage. This class adds another method:

    JSONMessage.Request.post(url,callback) can be used to submit
    a JSONMessage.Request to its server-side dispatcher. See the
    member's documentation for more detail than you would
    care to know.

    Note that all of the public API is functions, not properties.
    Client could should never directly use any non-function properties
    of this class. See JSONMessage for more details.

*/
JSONMessage.Request = function()
{
    var av = Array.prototype.slice.apply(arguments,[0]);
    arguments.callee._superConstructor_.apply( this, av );
    return this;
};

/*
    Various configurable options used by the JSONMessage.Request class.
*/
JSONMessage.Request.options =
{
    /**
       MUST be the same value as the PHP-side
       JSONMessageDispatcher::RequestKey. If they
       differ then the PHP-side dispatcher will not
       recognize the incoming messages.
    */
    requestKey:'JSONRequest',
    /**
        Default AJAX-related options. Clients are free
        to modify these.

        This object acts as the reference for what
        connection properties are (in general) supported by
        the JSONMessage.Request API.
    */
    ajax:
    {
        /**
            Type of request (GET or POST). POST is *STRONGLY*
            preferred because of (A) size constraints in GET
            and (B) for GET requests the urlencoded JSON
            gets logged in the Apache request log, which only
            serves to muddle it up and cause it to grow much
            more quickly. That said, there are specific setups where
            POST cannot be used, so if you absolutely must then
            change this to 'GET'.

            For internal reasons, keep this value upper-cased!
            A non-upper-cased value might Cause Grief!
        */
        method:'POST',
        /** Path to the default sever-side JSONMessage.Request dispatcher. */
        url:'include/JSONRequest-dispatch.php',
        /** Defines whether AJAX should be synchronous or asynchronous.
            This setting must be explicitly honored by the underlying AJAX
            back-end or it will have no effect.
        */
        asynchronous:true,
        /**
            The user name to use for logging in to the remote server
            when making remote requests.

            NOT ALL AJAX BACK-ENDS SUPPORT THIS!
        */
        loginName:undefined,
        /**
            The password to use for logging in to the remote server.

            NOT ALL AJAX BACK-ENDS SUPPORT THIS!
        */
        loginPassword:undefined,
        /**
            A timeout value, in milliseconds, after which
            an AJAX request "should" be cancelled.

            NOT ALL AJAX BACK-ENDS SUPPORT THIS!

            The default value was arbitrarily chosen!
        */
        timeout:15000,
        /**
            The on-success callback. The default implementation
            does nothing. It is not called onSuccess() (it used to be!)
            because the response object it contains might contain
            error-related information.

            The conventions for onResponse() callbacks:

            request = the originating JSONMessage.Request object.

            response = the JSONMessage.Response object we received
            in response to the request.

            response.resultCode() == 0 if the response contains
            a "successful" message, otherwise the result code
            is non-0. An error code here specifies that the
            server responded, but that the result is an error
            object. response.resultText() "should" contain the
            error string in that case.

            Message-specific data is stored in response.payload(),
            but the payload should not be used (and is not guaranteed
            to be valid or consistent) if request.resultCode() is non-0.

            If onResponse() throws an exception, the onError()
            handler will be called, otherwise it will never
            happen that both the onResponse() _and_ onError()
            handlers get called for the same request.
        */
        onResponse:function(request, response){},
        /**
            On-error callback.

            This _almost_ always signifies that the AJAX
            request itself failed, and that the server
            either did not respond or responded with one of
            the HTTP error codes.

            The conventions for onError() callbacks:

            The request argument is the originating JSONMessage.Request
            object.

            The connectOpt argument is a properties object
            containing the connection data used by the failed call to
            JSONMessage.Request.prototype.post(). Its structure
            is as documented for JSONMessage.Request.options.ajax, but
            when passed to this function it will (or should)
            have a property 'errorMessage' which contains a
            description of the problem. The callback can use
            the other properties to elaborate on the error
            (e.g. by showing the destination URL).

            The connectOpt might or might not contain other raw
            information used by the post() request. e.g. it might
            or might not contain the encoded request data. This
            decision is up to the concrete post() implementations
            (each uses a different back-end), but they are discouraged
            from passing such data around this way because it can be
            arbitrarily large.

            It IS possible for both the onResponse() and onError() handlers
            to be called, but only if onResponse() throws an exception. In that case,
            the post() handler will pass the exception message to
            the onError() callback by assigning the error text to
            connectOpt.errorMessage before calling onError(). That is the
            only case where both the onResponse() and onError() callbacks
            will both be called for the same request.


            FIXME: consolidate this and JSONMessage.Request.reportAsyncError() and
            remove JSONMessage.Request.reportAsyncError() if it seems reasonable.
        */
        onError: function(request,connectOpt)
        {
            alert('JSONMessage.Request.post() failed:\n'
                +'JSONMessage.Request type: '+request.type()+', JSONized request data:\n'
                +JSON.stringify(connectOpt,undefined,4)
            );
        },
        /**
            JSONMessage.Request.post() calls this before the underlying
            message-sending is initiated.

            This function has several uses...

            The client can use this to start a "waiting on AJAX..."
            notification.

            The second parameter is the connection options which
            will be used for the subsequent call to JSONMessage.Request.postBackend().
            This function MAY modify the parameters, but should only do
            so if really necessary and if it knows what it's doing. Likewise,
            the request object may also be modified here. If this function
            modifies the connectOpt contents, those contents will be used
            for the up-coming connection.

            Special cases:

            - If this function throws then the post() is not made
            and afterPost() is not called.

            - If this function returns an instance of JSONMessage.Response
            then no message is sent and that response object is used
            in place of a server-side response. The onResponse() callback
            is then called. This gives the clients a place to intercept
            certain message types and possibly avoid a trip to the server.
            For purposes of the post() caller, it will appear as if this
            response came (very quickly) from the server.

            Other than those cases, the return value is ignored.

            In the context of this callback, 'this' refers to the
            properties object containing the connection options
            (i.e. it is the same as connectOpt).
        */
        beforePost: function(request, connectOpt)
        {
        },
        /**
            This should be called directly after a post returns,
            whether successful or not. As an exception, it is never
            called if beforePost() throws because beforePost()
            is handled before JSONMessage.Request.post(), and afterPost()
            is handled asynchronously later on.

            The response object is not passed to this function
            because the intent of this notification is not to handle
            the response, but to notify that client that a pending
            AJAX connection has ended.

            In the context of this callback, 'this' refers to the
            properties object containing the connection options
            (i.e. it is the same as connectOpt).

            Changes made to the connectOpt/this object will not
            affect future posts, and it is only passed here for
            symmetry with the beforePost() callback.
        */
        afterPost: function(request, connectOpt)
        {
        }
    }
};
JSONMessage.Request.extendClass = extendClass;

/** Utility to return true if obj is-a function. */
JSONMessage.isFunction = function(obj)
{
    return obj
    && (
    (obj instanceof Function)
    || ("[object Function]" === Object.prototype.toString.call(obj))
    )
        ;
}
JSONMessage.Request.postImpl = {
    /**
        A helper function for concrete implementations
        of JSONMessage.Request.prototype.postBackend(). This function
        does the generic processing needed for converting
        a JSON response to-a JSONMessage.Response.

        - request must be the JSONMessage.Request object which initiated
        request.

        - data must be the JSON-string result data from the request
        or a JSON object created from such a string, or a JSONMessage.Response
        object. Results are undefined if data is-a JSONMessage.Response and
        JSONMessage.Response was not constructed for/in response to the given request.

        - opt must be the options object used to construct the request,
        i.e. the return value from JSONMessage.Request.postImpl.normalizePostParameters().
        If opt.onResponse is-a function then it is called as
        opt.onResponse(JSONMessage.Request,JSONMessage.Response) it is called
        after the Response object is created.

        If opt.afterPost is a function then it is called with (request,opt)
        and any exceptions it throws are ignored.

        Since this function is run asynchronously, its return value
        is largely irrelevant. But... it returns a false value
        (not neccesarily a Boolean) on error, or it propagates an
        exception.

        This implementation does not require that this function
        be bound to a JSONMessage.Request object. That it, it can be
        called without a JSONMessage.Request 'this' object.

        Returns true on success, but its return value is normally
        illrelevant because it's called asynchronously.
    */
    onResponseSuccess:function(request,data,opt)
    {
        if( !(request instanceof JSONMessage.Request) )
        {
            throw new Error("JSONMessage.Request.postImpl.onResponseSuccess() requires that the first "
                            +"argument be-a JSONMessage.Request! Got: "+typeof request);
        }
        if( ! data )
        {
            opt.errorMessage = "JSONMessage.Request::post() succeeded but returned no data!";
            if( JSONMessage.isFunction(opt.onError) )
            {
                opt.onError( request, opt );
            }
            else
            {
                JSONMessage.Request.reportAsyncError( opt.errorMessage );
            }
            return false;
        }
        else
        {
            if( JSONMessage.isFunction(opt.afterPost) )
            {
                try
                {
                    opt.afterPost.apply( opt, [request,opt] );
                }
                catch(e){}
            }
            try
            {
                if( JSONMessage.isFunction( opt.onResponse  ) )
                {
                    //alert( typeof data+" "+status+" "+data );
                    var reqid = request.id();
                    var resp = (data instanceof JSONMessage.Response) ? data : new JSONMessage.Response(data,request);
                    if( resp.get('responseTo') != reqid ) /* don't use !== : it can be an arbitrary POD type */
                    { // can only happen if the server fails to set the responseTo
                        throw new Error("Unexpected JSONMessage.Request result: (Response.responseTo()="+resp.get('responseTo')
                            +")) != ("+reqid+")!");
                    }
                    opt.onResponse( resp, request );
                }
                return true;
            }
            catch(e)
            {
                opt.errorMessage = "JSONMessage.Request::post(): exception while handling inbound JSONMessage.Response:\n"
                    + e
                    +"\nOriginal data:\n"+(('object'===typeof data) ? JSON.stringify(data) : data);
                ;
                if( JSONMessage.isFunction(opt.onError) )
                {
                    opt.onError( request, opt );
                }
                else
                {
                    JSONMessage.Request.reportAsyncError( opt.errorMessage );
                }
                return false;
            }
        }
    },
    /**
        The counterpart of JSONMessage.Request.postImpl.onResponseSuccess(), this
        is a general purpose on-error helper for concrete
        JSONMessage.Request.prototype.postBackend() implementations.

        The arguments:

        - request should be the JSONMessage.Request object which triggered the
        error.

        - opt must be the options object used to construct the request
        (e.g. the return value from JSONMessage.Request.postImpl.normalizePostParameters()).
        The property opt.errorMessage should be set (by the caller) to
        a descriptive error message or an Error object describing the error.

        - If opt.afterPost is a function then it is called with (request,opt)
        and any exceptions it throws are ignored.

        - If opt.onError is-a Function then it is called as
        opt.onError(request,opt), and opt.errorMessage will contain
        a string or Error object describing why the onError() handler
        was called. (It is up to the caller of this function to set
        opt.errorMessage!)

        Note that this handler does not have anything to do with valid
        responses which themselves contain a non-zero error code. It only
        has to do with the AJAX call itself, and should be used only
        to report such failures. This is, if the server actually responds
        with a Message result, even if that Message represents an error,
        this function should not be called. The exception is if the
        onResponse() call throws an exception - if it does, the onError()
        handler will be called and passed the error (as a string) via
        opt.errorMessage.

        This implementation does not require that this function
        be bound to a JSONMessage.Request object. That it, it can be
        called without a JSONMessage.Request 'this' object.

        If the opt.onError() callback throws/propagates an exception,
        that exception is silently ignored.

        TODO: consider propagating exceptions when posting in
        synchronous mode, but not all AJAX backends currently
        support synchronous mode (or do not document it).
    */
    onResponseError: function(request,opt)
    {
        if( JSONMessage.isFunction(opt.afterPost) )
        {
            try
            {
                opt.afterPost.apply( opt, [request,opt] );
            }
            catch(e){}
        }
        try
        {
            if( JSONMessage.isFunction( opt.onError ) )
            {
                opt.onError( request, opt );
            }
            else
            {
                JSONMessage.Request.reportAsyncError(opt.errorMessage);
            }
        } catch(e) {/*ignore*/}
    },
    /**
    An internal helper function for concrete JSONMessage.Request.post()
    implementations. This function returns an object in the form:

    {
    url:XXX, // XXX==see below
    onResponse:YYY, // YYY=see below

    ... other properties defined in JSONMessage.Request.options.ajax ...
    }

    Where XXX and YYY depend on the arguments passed to this function...

    Conventionally it takes its arguments in the form (url,onResponse),
    but "going forward" it should be passed a properties object.

    Here are the support arguments:

    Assuming: var popt = this.postOptions();

    args = () = {superset of this.postOptions() and JSONMessage.Request.options.ajax)}

    // DEPRECATED: do not use:
    args = (function YYY) = {url:ZZZ, onResponse=YYY}

    // DEPRECATED: do not use:
    args = (XXX (not-a Object) ) = {url:XXX, onResponse=ZZZ}

    args = {...properties object: see below ...}

    A value of ZZZ means the value is inherited, as described below.

    If the argument is a properties object, all properties from that object
    are copied (shallowly) into the returned object.

    Any properties which are in this.postOptions() or in
    JSONMessage.Request.options.ajax but are not set by other arguments to
    this function will be set to the values from this.postOptions()
    or JSONMessage.Request.options.ajax (in that order, using the first
    one found). Thus the returned object will have all properties
    it needs for a post() to continue (unless of course the input objects
    are set up incorrectly).

    What all this means is: it supports the arguments conventions required
    by the JSONMessage.Request.post() interface, and returns the arguments in a
    normalized form which all API-conformant concrete implementations of
    JSONMessage.Request.prototype.post() can (and should) use for their arguments
    handling.

    ACHTUNG:

    This function must be called in the context of a JSONMessage.Request object.
    i.e. the 'this' pointer must be the JSONMessage.Request on whos behalf this
    function is operating. Because this function relies on arguments.length,
    when it is used for its intended purpose it should be called like:

    @code
    var av = Array.prototype.slice.apply( arguments, [0] );
    var args = JSONMessage.Request.postImpl.normalizePostParameters.apply( this, av );
    // (assuming 'this' is-a JSONMessage.Request object) ------->^^^^
    @endcode

    instead of passing arguments (possibly with undefined values) directly to
    this function.

    To avoid cross-message pollination, this function deeply copies any
    properties which are themselves non-function objects (by cloning them
    via JSON).
    */
    normalizePostParameters: function ()
    {
        if( ! (this instanceof JSONMessage.Request ) )
        {
            throw new Error("JSONMessage.Request.postImpl.normalizePostParameters() requires that it be "
                            +"called with a JSONMessage.Request object as its 'this' pointer!");
        }
        var rc = {};
        var i;
        if( (1 === arguments.length) && JSONMessage.isFunction( arguments[0] ) )
        { // DEPRECATED: will be removed!
            throw new Error("Call of deprecated normalizePostParameters(FUNCTION)!");
            rc.onResponse = arguments[0];
        }
        else if( (1===arguments.length) && (arguments[0] instanceof Object) )
        {
            var obj = arguments[0];
            for( i in obj )
            {
                rc[i] = obj[i];
            }
        }
        else if( 2 === arguments.length )
        { // DEPRECATED: will be removed!
            throw new Error("Call of deprecated normalizePostParameters(URL,FUNCTION)!");
            rc.url = arguments[0];
            rc.onResponse = arguments[1];
        }
        var combo = {};
        function append(k,v)
        {
            if( JSONMessage.isFunction(v) ) {}
            else if( 'object' === typeof v ) v = JSON.parse( JSON.stringify(v) );
            combo[k]=v;
        }
        for( i in JSONMessage.Request.options.ajax ) append(i,JSONMessage.Request.options.ajax[i]);
        var popt = this.postOptions();
        for( i in popt ) append(i,popt[i]);
        for( i in combo )
        {
            if( undefined === rc[i] ) rc[i] = combo[i];
        }
        return rc;
    },
    concrete:{
        /**
            This is a concrete implementation of JSONMessage.Request.prototype.postBackend()
            which uses a "raw" XMLHttpRequest request, rather than a higher-level
            API from a 3rd-party AJAX library.

            If window.firebug is set then window.firebug.watchXHR() is called
            to enable monitoring of the XMLHttpRequest object.

            The only argument must be a connection properties object, as constructed
            by JSONMessage.Request.normalizePostParameters().

            See JSONMessage.Request.prototype.post() for the documentation regarding
            the options object.

            Returns the XMLHttpRequest object.

            This implementations honors the loginName and loginPassword connection
            parameters.

            This implementation supports for the connection timeout option.

            This implementation requires that the 'this' object be-a JSONMessage.Request.
        */
        XMLHttpRequest: function(args)
        {
            //alert( 'popt='+JSON.stringify( args ));
            var json = this.toJSON(true);
            var request = this;
            //alert("JSONMessage.Request.post(): posting: "+opt.toSource());
            var xhr = new XMLHttpRequest();
            var popt = this.postOptions();
            var startTime = (new Date()).getTime();
            var timeout = args.timeout || 10000/*arbitrary!*/;
            var hitTimeout = false;
            var done = false;
            var tmid /* setTimeout() ID */;
            function handleTimeout()
            {
                hitTimeout = true;
                if( ! done )
                {
                    var now = (new Date()).getTime();
                    try { xhr.abort(); } catch(e) {/*ignore*/}
                    // see: http://www.w3.org/TR/XMLHttpRequest/#the-abort-method
                    args.errorMessage = "Timeout of "+timeout+"ms reached after "+(now-startTime)+"ms during AJAX request.";
                    JSONMessage.Request.postImpl.onResponseError( request, args );
                }
                return;
            }
            function onStateChange()
            { // reminder to self: apparently 'this' is-not-a XHR :/
                if( hitTimeout )
                { /* we're too late - the error was already triggered. */
                    return;
                }

                if( 4 == xhr.readyState )
                {
                    done = true;
                    if( tmid )
                    {
                        clearTimeout( tmid );
                        tmid = null;
                    }
                    if( (xhr.status >= 200) && (xhr.status < 300) )
                    {
                        JSONMessage.Request.postImpl.onResponseSuccess( request, xhr.responseText, args );
                        return;
                    }
                    else
                    {
                        if( undefined === args.errorMessage )
                        {
                            args.errorMessage = "Error sending a '"+args.method+"' AJAX request to "
                                    +"["+args.url+"]: "
                                    +"Status text=["+xhr.statusText+"]"
                                ;
                            JSONMessage.Request.postImpl.onResponseError( request, args );
                        }
                        else { /*maybe it was was set by the timeout handler. */ }
                        return;
                    }
                }
            };

            xhr.onreadystatechange = onStateChange;
            if( ('undefined'!==(typeof window)) && ('firebug' in window) && ('watchXHR' in window.firebug) )
            { /* plug in to firebug lite's XHR monitor... */
                window.firebug.watchXHR( xhr );
            }
            var enc = encodeURI( json ).replace(/%20/g,'+');
            json = undefined; // give it back to the garbage collector.
            try
            {
                //alert( JSON.stringify( args  ));
                //alert( JSON.stringify( request.postOptions()  ));
                function xhrOpen()
                {
                    if( 'loginName' in args )
                    {
                        xhr.open( args.method, args.url, args.asynchronous, args.loginName, args.loginPassword );
                    }
                    else
                    {
                        xhr.open( args.method, args.url, args.asynchronous  );
                    }
                }
                if( 'POST' ===  args.method.toUpperCase() )
                {
                    xhrOpen();
                    enc = JSONMessage.Request.options.requestKey+'='+enc;
                    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    xhr.setRequestHeader("Content-length", enc.length);
                    xhr.setRequestHeader("Connection", "close");
                    xhr.send( enc );
                }
                else /* assume GET */
                {
                    var key = JSONMessage.Request.options.requestKey;
                    var u = /\?/.test(args.url) // tag on '?' or '&' if needed...
                            ? (/\?$/.test(args.url) ? (args.url+key+'='+enc) : (args.url+'&'+key+'='+enc))
                            : (args.url+'?'+key+'='+enc)
                    ;
                    args.url = u;
                    xhrOpen();
                    xhr.send(null);
                }
                tmid = setTimeout( handleTimeout, timeout );
                return xhr;
            }
            catch(e)
            {
                args.errorMessage = e.toString();
                JSONMessage.Request.postImpl.onResponseError( request, args );
                return undefined;
            }
        }/*XMLHttpRequest*/,
        /**
            This is a concrete implementation of JSONMessage.Request.prototype.post()
            which uses the jQuery AJAX API to send a message request and fetch
            the response.

            The only argument must be a connection properties object, as constructed
            by JSONMessage.Request.normalizePostParameters().

            If window.firebug is set then window.firebug.watchXHR() is called
            to enable monitoring of the XMLHttpRequest object.

            This implementations honors the loginName and loginPassword connection
            parameters.

            Returns the XMLHttpRequest object.

            This implementation requires that the 'this' object be-a JSONMessage.Request.
        */
        jQuery:function(args)
        {
            var jsonable = {};
            jsonable[JSONMessage.Request.options.requestKey] = this.toJSON(false);
            var request = this;
            //alert("JSONMessage.Request.post(): posting: "+args.toSource());
            var popt = this.postOptions();
            var method = popt.method || JSONMessage.Request.options.ajax.method;
            var ajopt =
            {
                url: args.url,
                data: jsonable,
                type: args.method,
                async: args.asynchronous,
                password: (undefined !== args.loginPassword) ? args.loginPassword : undefined,
                username: (undefined !== args.loginName) ? args.loginName : undefined,
                error: function(xhr, textStatus, errorThrown)
                {
                    //this === the options for this ajax request
                    args.errorMessage = "Error sending a '"+ajopt.type+"' JSONMessage.Request to ["+ajopt.url+"]: "
                            +"Status text=["+textStatus+"]"
                            +(errorThrown ? ("Error=["+errorThrown+"]") : "")
                        ;
                    JSONMessage.Request.postImpl.onResponseError( request, args );
                },
                success: function(data)
                {
                    JSONMessage.Request.postImpl.onResponseSuccess( request, data, args );
                },
                /* Set dataType=text instead of json for deeply archaic reasons:

                    On ajax success we call new JSONMessage.Response(data), which calls JSONMessage(data).
                    We want the data which goes to that ctor to be a STRING, and
                    not an Object, because of the JSONMessage() ctor kludge involving
                    null id/timestamp flags. Passing it a string will bypass that kludge,
                    which means the resulting JSONMessage.Response object cannot get
                    id/timestamp values which differ from those in the string input.
                    That, in turn, makes it possible for us to detect if incoming data
                    is missing those fields.
                */
                dataType: 'text'
            };
            if( undefined !== args.timeout )
            {
                ajopt.timeout = args.timeout;
            }
            try
            {
                var xhr = jQuery.ajax(ajopt);
                if( xhr && ('undefined'!==(typeof window)) && ('firebug' in window) && ('watchXHR' in window.firebug) )
                { /* plug in to firebug lite's XHR monitor... */
                    window.firebug.watchXHR( xhr );
                }
                return xhr;
            }
            catch(e)
            {
                args.errorMessage = e.toString();
                JSONMessage.Request.postImpl.onResponseError( request, args );
                return undefined;
            }
        }/*jQuery*/,
        /**
            This function is _intended_ to be a JSONMessage.Request.post()
            implementation for the Prototype library, but...

            In my tests, the mere inclusion of Prototype into my
            project causes JSONMessage.Request.toJSON() to fail with
            completely broken quoting of empty arrays and objects.
            e.g. [] gets serialized to "[]" with extra quotes.
            Thus... this implementation is not fully tested.

            i had the same problem with Mojo, which is why there's
            also no implementation for that library.

            This implementations DOES NOT honor the (loginName,
            loginPassword, timeout) connection parameters.
            Those features are not a documented part of the underlying AJAX
            API.

            This implementation requires that the 'this' object be-a JSONMessage.Request.
        */
        Prototype:/*what a poor fucking name for a JS lib. Blatant naming conflict, anyone? */ function(args)
        {
            var jsonable = {};
            jsonable[JSONMessage.Request.options.requestKey] = this.toJSON(false);
            var request = this;
            //alert("JSONMessage.Request.post(): posting: "+args.toSource());
            var ajopt = {
                method:args.method,
                parameters: jsonable,
                asynchronous: args.asynchronous,
                onError:function(transport)
                {
                    //this === the options for this ajax request
                    args.errorMessage = "Error sending a '"+args.method+"' AJAX request to ["+args.url+"]: "
                            +"Status text =["+transport.statusText+"]"
                        ;
                    JSONMessage.Request.postImpl.onResponseError( request, args );
                },
                onSuccess:function(transport,json)
                {
                    /**
                        i'm having JSON mis-quoting problems with Prototype and Mojo...

                        e.g. an empty array gets incorrectly JSONized to "[]" (WITH the quotes!).
                    */
                    //alert(json ? Object.inspect(json) : "no JSON object");
                    //alert( "CHECK RESPONSE CAREFULLY FOR MIS-QUOTES:\n"+transport.responseText );
                    JSONMessage.Request.postImpl.onResponseSuccess( request, transport.responseText, args );
                }
            };
            try
            {
                return new Ajax.Request(args.url,ajopt);
            }
            catch(e)
            {
                args.errorMessage = e.toString();
                JSONMessage.Request.postImpl.onResponseError( request, args );
                return undefined;
            }
        },
        /**
            This function is intended to be a JSONMessage.Request.post()
            implementation for the Dojo library.

            If using Dojo, you can set this implementation by running:

            JSONMessage.Request.prototype.postBackend = JSONMessage.Request.postImpl.concrete.dojo;

            See postImpl.concrete.jQuery() for the full documentation regarding
            the parameter.

            This implementations DOES NOT honor the (loginName,
            loginPassword) connection parameters. Those features are not
            a documented part of the underlying AJAX API.

            This implementation requires that the 'this' object be-a JSONMessage.Request.
        */
        dojo: function(args)
        {
            var jsonable = {};
            jsonable[JSONMessage.Request.options.requestKey] = this.toJSON(false);
            var request = this;
            //alert("JSONMessage.Request.post(): posting: "+args..toSource());
            var func = function(opt) {
                return ('POST'===args.method.toUpperCase())
                    ? dojo.xhrPost(opt)
                    : dojo.xhrGet(opt)
                    ;
            };
            var ajopt = {
                content: jsonable,
                url:args.url,
                sync:!args.asynchronous,
                error:function(err)
                {
                    //this === the options for this ajax request
                    args.errorMessage = "Error sending a '"+args.method+"' AJAX request to ["+args.url+"]: "
                            +"Status text =["+err+"]"
                        ;
                    JSONMessage.Request.postImpl.onResponseError( request, args );
                },
                load:function(data)
                {
                    JSONMessage.Request.postImpl.onResponseSuccess( request, data, args );
                }
            };
            if( undefined !== args.timeout )
            {
                ajopt.timeout = args.timeout;
            }
            try
            {
                return func( ajopt );
            }
            catch(e)
            {
                args.errorMessage = e.toString();
                JSONMessage.Request.postImpl.onResponseError( request, args );
                return undefined;
            }
        }/*dojo*/
    }/*concrete*/
}/*JSONMessage.Request.postImpl*/;



/** Subclass JSONMessage.Request from JSONMessage and
    extend the JSONMessage.Request prototype. */
extendClass( JSONMessage.Request, JSONMessage )
.extendPrototype(
{
    $reimpl:
    {
        jsonName:'JSONMessage.Request'
    },
    /*
        Posts this request to a remote handler and routes
        the response through a callback.

        Implementations can be swapped out by setting this.postBackend
        to a compliant handler function. Implementations must conform
        to the overall description provided here...

        Usage:

        request.post({ ... any JSONMessage.Request AJAX options ...});

        Any options not set in the properties object are taken from
        request.postOptions() or (if no other value is found), JSONMessage.Request.optinos.ajax.

        The arguments passed to post() are normalized by post() before
        passing them on to postBackend() in the form of a single object
        containing all supported connection options. Thus the backends
        do not have to fuss with argument handling and checking for defaults.

        On success an options.onResponse() callback is called and passed a
        JSONMessage.Response object, from which the results of the request can be
        gleaned, and the original JSONMessage.Request object.

        The options supported by post():

        {
            url: string,
            method: string, // 'GET' or 'POST' (UPPER CASE!)
            onResponse: function(JSONMessage.Request,JSONMessage.Response), // on-success callback
            onError: function(JSONMessage.Request,  optionsObject ), // on-error callback
            asynchronous:boolean,

            // Some backends also support:
            timeout: int, //milliseconds
            loginName: string,
            loginPassword: string,

            // Planned for the future:
            onTimeout: function( JSONMessage.Request, optionsObject ),
            beforePost: function(JSONMessage.Request, optionsObject ), // to allow user to start "waiting..." animation
            afterPost: function(JSONMessage.Request, optionsObject ) // to turn off "waiting..." animation
        }

        Any properties "missing" from the object will have defaults taken from
        request.postOptions() or JSONMessage.Request.options.ajax.url (in that order, using
        the first one which is set). Thus per-instance options take precedence over
        class-wide defaults, and class-wide defaults will only be used if no other
        option is available.

        postBackend() implementations must (if possible) use the connection method
        specified in the 'method' property of the connections options.

        On error they should call the onError() callback and pass it the
        originating JSONMessage.Request and the options object used for constructing
        the request. In addition, the 'errorMessage' property of the options
        object should be set to an appropriate value (i.e. describing the
        error message) before passing the options object to the onError()
        callback. Error callbacks can then use that to report the error
        text.

        Implementations may assume that the 'this' pointer is-a JSONMessage.Request
        instance.

        Because the connection handling is asynchronous, the return value is largely
        irrelevant. That said, implementations should return the underlying
        XMLHttpRequest object (or something compatible) if possible. Client code
        cannot rely on the type of the return value - it is dependent on the
        specific implementation. If this.postBackend() does not throw then this
        function returns whatever that function returns. If that function throws
        then this function propagates the error.

        Implementations are free to perform internal plumbing, e.g. connecting
        an XMLHttpRequest object to firebug.watchXHR().

        Note that this interface does not allow the caller to pass arbitrary
        key/value pairs via this function. That is because the idea behind the
        messaging system is to encapsulate all message data inside request
        payloads rather than polluting the GET/POST fields. This also encourages
        cleaner design of event handlers, and not ones which use a bastard mixture
        of $_REQUEST and JSON.

        When using 3rd-party AJAX-enabled frameworks,
        the postBackend member can be replaced by a custom implementation.
        See JSONMessage.Request.postImpl.concrete.XMLHttpRequest(),
        JSONMessage.Request.postImpl.concrete.jQuery(), and
        JSONMessage.Request.postImpl.concrete.dojo() for reference implementations.
    */
    post:function()
    {
        if( !JSONMessage.isFunction(this.postBackend) )
        {
            throw new Error("This object has no postBackend() member function! I don't know how to send the request!");
        }
        var reqid = this.id();
        JSONMessage.Request.pending[ reqid ] = this;
        var ex;
        var rc;
        var av = Array.prototype.slice.apply( arguments, [0] );
        var norm = JSONMessage.Request.postImpl.normalizePostParameters.apply( this, av );
        try {
            var pre;
            if( JSONMessage.isFunction(norm.beforePost) )
            {
                pre = norm.beforePost.apply( norm, [this,norm] );
                ranBeforePost = true;
                if( pre instanceof JSONMessage.Response )
                {
                    if( ! pre.responseTo() )
                    {
                        pre.responseTo( this.id() );
                    }
                    JSONMessage.Request.postImpl.onResponseSuccess( this, pre );
                    return;
                }
            }
            // TODO: pre-send notification here.
            rc = this.postBackend( norm );
        }
        catch(e) {
            rc = undefined;
            ex = e;
        }
        finally{
            delete JSONMessage.Request.pending[ reqid ];
        }
        if(ex) throw ex;
        return rc;
    },
    /**
        postBackend() defines the implementation used by post(). The post() member
        is the interface into this function. post() normalizes the arguments it gets
        into a single connection options object and passes that to the postBackend()
        member. The implementation must transform that into backend-specific connection
        parameters before sending the request.

        post() also does some internal bookkeeping, so clients should call it
        instead of calling postBackend() directly.
    */
    postBackend:JSONMessage.Request.postImpl.concrete.XMLHttpRequest,
    //postBackend:JSONMessage.Request.postImpl.concrete.jQuery,
    //postBackend:JSONMessage.Request.postImpl.concrete.dojo, // seems to work, but only briefly tested.
    //postBackend:JSONMessage.Request.postImpl_Prototype, // ACHTUNG: i get broken JSON quoting on empty arrays/objects with Prototype!
    /*
        Gets or sets per-instance connection data in the form:

        {
          ... see the property list in the post() documentation ...
        }

        During post(), any options not set here and not passed to post()
        will be pulled from JSONMessage.Request.options.ajax.

        Concrete implementations of JSONMessage.Request.prototype.post()
        may allow or require that the properties object contain
        additional data, e.g. login credentials or some form of
        remote API login key.

        If called with no arguments it returns a reference to the current
        options object, which will not be null but may contain null/undefined
        values. When called with arguments (as a setter), this function returns
        _this_ object.

        If called with one argument, the argument is assumed to be
        an object as described above, and it completely replaces the
        contents of any existing options.

        If called like postOptions(false,obj), then any properties
        in obj are copied into the existing options, overwriting
        any pre-existing properties. Note that this form requires
        a literal false value, and not any old false boolean value.
        If called like postOptions(non-false,obj), the effect is the
        same as calling postOptions(obj).

        These options, if set, are used as defaults by JSONMessage.Request.post().
        Null/undefined values mean that the class-wide defaults
        will be used when post() is called (assuming the post() caller
        does not pass them to post(), in which case those values
        take precedence).

        Important notes:

        - If passing options to multiple request objects, be certain
        to give each request its own copy of the object/property, as
        opposed to giving them all a handle to the same properties object.
        If multiple requests get the same object, then changes to one
        will affect the other requests. Then again, maybe that's what
        you want. We do not deeply copy the options in this routine
        because the options object needs to be able to hold functions
        and we cannot JSON those (which is otherwise an easy method
        to deeply copy objects).
    */
    postOptions:function(obj)
    {
        /**
            i would REALLY rather create/return deep copies
            of the objects, mainly to avoid cross-polinization
            of props between unrelated messages, but...

            using JSON.parse( JSON.stringify(obj) ) to do the deep
            copy (i.e., the easy way) will fail for Function members,
            and we want to support obj.onResponse() and obj.onError().
        */
        if( undefined === this.$d.postOpt )
        {
            this.$d.postOpt = {};
        }
        if( ! arguments.length )
        {
            return this.$d.postOpt;
        }
        else {
            if( (false === arguments[0]) )
            {
                obj = arguments[1];
                var i;
                if(obj) for( i in obj )
                {
                    this.$d.postOpt[i] = obj[i];
                }
            }
            else
            {
                this.$d.postOpt = obj;
            }
            return this;
        }
    }
});

/*
    Deprecated: please prefer assinging a custom value to
    JSONMessage.Request.options.ajax.onError() instead of using this function.

    JSONMessage.Request.reportAsyncError() is used internally to report asynchrnous
    (AJAX-related) errors. The default implementation simply uses
    alert() to display the error.

    To tie in a different error reporting function, simply redefine
    JSONMessage.Request.reportAsyncError(). It should take an arbitrary number of arguments
    and format them in a print()-conventional manner (i.e. spaces between
    each one). The arguments need not be strings - they could be exception
    objects. The reporter function is expected to never throw: because it is
    called asynchronously, there's no logical place to catch an exception
    in client code.
*/
JSONMessage.Request.reportAsyncError = function()
{
    var av = Array.prototype.slice.apply(arguments,[0]);
    alert('JSONMessage.Request.reportAsyncError() (which is deprecated, by the way):\n'+av.join(' '));
};

/*
    A place to keep track of whether a request has been handled or not.
    When a JSONMessage.Request is post()ed, it is inserted into this list
    (request.id() is the key). After the post(), the request is
    removed from this list.
*/
JSONMessage.Request.pending = { count:0 };

/*
    Creates a request for a ping message.

    Request payload structure:

    {
    // optional JSONable client data
    }

    Request response structure:

    {
    timeDiffSeconds:double, // # of seconds the request took to get to the server
    requestTime:int, // timestamp (Date.getTime() format) from request
    pingPayload:any // contains the same (optional) payload passed to the request
    }

    Example:

    @code
    (new JSONMessage.Request.Ping()).post({
        onResponse:function(resp,request) {
            if( 0 == resp.resultCode() ) {
                var pay = resp.payload();
                var old = pay.requestTime;
                var now = (new Date()).getTime();
                var srv = resp.timestamp();
                alert("Ping time TO server:",(srv-old)+'ms'
                    +"\nPing time FROM server:",(now-srv)+'ms'
                    +"\nRound-trip time =",(now-old)+'ms'
                );
            }
    }});
    @endcode
*/
JSONMessage.Request.Ping = function JSONRequest_Ping()
{

    var av = Array.prototype.slice.apply(arguments,[0]);
    arguments.callee._superConstructor_.apply( this, av );
    this.type('ping');
    if(0) { // WTF was this for?
        this.payload(false,{
            clientJSDate:((new Date()).getTime())
        });
    }
    return this;
};
JSONMessage.Request.extendClass( JSONMessage.Request.Ping )
    .extendPrototype({
        $reimpl:
        {
            jsonName:'JSONMessage.Request.Ping'
        },
        /**
            post() re-implemented from JSONMessage.Request to update
            this.timestamp() to the current time each time the
            request is sent.
        */
        post:function()
        {
            this.timestamp(null);
            return this._superClass_.post.apply(this,
                        Array.prototype.slice.apply(arguments,[0]) );
        }
    });
/*
    Creates a request for a serverSession message.

    ServerSession subclasses JSONMessage.Request and has the following additional
    methods:

    - getSession(key) adds the given key to
    the this.payload().get array. Returns this object.

    - setSession(key,value) adds the given key/value to
    the this.payload().set object. Returns this object.

    Note that those methods only update the request object,
    and do not actually get/set any session variables themselves.

    Request payload structure:

    {
    OPTIONAL get:['session','variables','to','fetch'],  //empty array==fetch all
    OPTIONAL set:{key1:val1, ... keyN:valN},
    OPTIONAL clearSession:boolean // If true, the server-side session is cleared
    }

    The operations are performed in the order: (set, get, clear), so it is possible to
    set a variable and fetch it in the same request (e.g. to confirm that it was set).
    Likewise, it is possible to fetch values and then clear the session.

    Response payload structure:

    {
    get: {key1:val1, ... keyN:valN},
    set: {key1:val1, ... keyN:valN},
    cleared:bool // only if clearSession was specified.
    }

    This class requires that the main server-side application
    page has enabled a session for the user. e.g. by calling
    PHP's session_start(). If it doesn't, no changes made
    via that class will actually take effect, and fetching
    variables will always return null values. In addition,
    the request dispatcher handler must also enable the session
    (the default implementation does).

    Usage example:

    (new JSONMessage.Request.ServerSession())
      .setSession('my','value')
      .getSession('my')
      .post( { onResponse:function(resp) {
        if( 0 == resp.resultCode() ) {
            var p = resp.payload();
            alert( 'my = '+p.get['my'] );
        }
      });

*/
JSONMessage.Request.ServerSession = function JSONRequest_ServerSession()
{

    var av = Array.prototype.slice.apply(arguments,[0]);
    arguments.callee._superConstructor_.apply( this, av );
    this.type('serverSession');
    if( ! this.payload() )
    {
        this.payload({
            get:[],
            set:{},
            clearSession:false
        });
    }
    return this;
};
extendClass( JSONMessage.Request.ServerSession, JSONMessage.Request )
.extendPrototype({
        getSession: function(name) {
            var p = this.payload();
            if( ! p.get ) p.get = [];
            p.get.push( ''+name );
            return this;
        },
        setSession: function(name,value) {
            var p = this.payload();
            if( ! p.set ) p.set = {};
            p.set[''+name] = ''+value;
            return this;
        },
    $reimpl:
    {
        jsonName:'JSONMessage.Request.ServerSession'
    }
});

/*
    Creates a request for a cookie get/set message.

    It subclasses JSONMessage.Request and has the following additional
    methods:

    - getCookie(key) adds the given key to
    the this.payload().get array.

    - setCookie(key,value) adds the given key/value to
    the this.payload().set object.

    Note that those methods only update the request object,
    and do not actually get/set any cookies themselves.

    Request structure:

    {
    OPTIONAL get:['cookies','to','fetch'],  //empty array==fetch all
    OPTIONAL set:{key1:val1, ... keyN:valN},
    OPTIONAL clearCookies:boolean // If true, all cookies are cleared
    }

    Response payload structure:

    {
    get: {key1:val1, ... keyN:valN},
    set: {key1:val1, ... keyN:valN},
    cleared:bool // only if clearCookies was specified.
    log:[... unimportant debugging/logging message...]
    }

    The operations are performed in the order: (set, get, clear), so it is possible to
    set a variable and fetch it in the same request (e.g. to confirm that it was set).
    Likewise, it is possible to fetch values and then clear the session.


    If no GET is requested then no GET is returned in the
    response. Likewise for SET.

    Example:

    @code
    new JSONMessage.Request.Cookie()
      .getCookie('my')
      .post( function(resp) {
          if( 0 == resp.resultCode() ) {
              var p = resp.payload();
              alert( p.get.my );
          }
       })
     ;

    (new JSONMessage.Request.Cookie()).setCookie('my','value').post();
    @endcode

    Note that you can also use jQuery.cookie() for getting/setting
    cookies, without requiring the posting of a message.
*/
JSONMessage.Request.Cookie = function()
{

    var av = Array.prototype.slice.apply(arguments,[0]);
    arguments.callee._superConstructor_.apply( this, av );
    this.type('cookie');
    if( ! this.payload() ) this.payload({
            get:[],
            set:{},
            clearCookies:false
    });
    return this;
};
extendClass( JSONMessage.Request.Cookie, JSONMessage.Request )
.extendPrototype({
        getCookie: function(name) {
            var p = this.payload();
            if( ! p.get ) p.get = [];
            p.get.push( ''+name );
            return this;
        },
        setCookie: function(name,value) {
            var p = this.payload();
            if( ! p.set ) p.set = {};
            p.set[''+name] = ''+value;
            return this;
        },
        $reimpl:
        {
            jsonName:'JSONMessage.Request.Cookie'
        }
});

/*
    JSONMessage.Response is the JS-side counterpart of the PHP-side
    JSONMessage.Response class. The primary difference is that
    client-side JS code is not intended to be the ORIGIN
    of a response, and therefore it works a bit differently
    than its server-side counterpart. Instead of answering
    requests, this class represents the server-side response
    to a posted JSONMessage.Request object.

    The json argument may be of any type supported by
    the JSONMessage constructor. It is expected to
    hold JSON (as a string or JSON-compliant object)
    which came from the server-side JSONMessage.Response API.

    The constructor's request argument should be null
    or be the JSONMessage.Request for which the response is being
    generated. JSONMessage.Response objects are only generated in
    response to JSONMessage.Request objects (and are typically
    populated using only server-retrieved data).

    Client-side, the API which is most significant is:

    resultCode() returns the response's error code. Zero
    is success, non-zero is a message-type-dependent error code.

    resultText() is a descriptive string regarding the resultCode().
    e.g. on success it might say "success" (but this is
    not certain - a ping message answers with "pong"). On error
    it will (or should) contain a description of the error. Clients
    should never rely on any specific value, e.g. searching for "success".

    payload() returns the message-specific result data. Its structure
    is defined by the server-side responder for that specific
    message type. If resultCode() is not 0 then the contents of the
    payload are unspecified and the payload should not be used.

    Note that all of the public API is functions, not properties.
    Client could should never directly use any non-function properties
    of this class. See JSONMessage for more details.

    Some more obscure/less useful members:

    responseTo() returns the request ID (not the request object) for
    which this response object was created.

    id() returns the response's unique ID (a unique piece of POD
    data in an unspecified format).

    timestamp() == the server-side timestamp of the response,
    in the same format as Date.getTime().

    get(string key) returns a specific property of the request,
    e.g. get('timestamp') is equivalent to calling timestamp().
*/
JSONMessage.Response = function(json,request)
{
    arguments.callee._superConstructor_.apply( this, arguments.length ? [arguments[0]] : [] );
    if( request instanceof JSONMessage.Request )
    {
        if( ! this.responseTo() ) this.responseTo( request.id() );
        this.request = request;
    }
};
extendClass( JSONMessage.Response, JSONMessage )
.extendPrototype({
    $reimpl:
    {
        jsonName:'JSONMessage.Response'
    },
    resultCode:function() { return this.get('resultCode'); },
    resultText:function() { return this.get('resultText'); },
    responseTo:function() { return this.get('responseTo'); }
});

if(0)
{
    if( 'dojo' in this /*assume this===global object*/ )
    {
        JSONMessage.Request.prototype.postBackend = JSONMessage.Request.postImpl.concrete.dojo;
    }
    else if( ('jQuery' in this) )
    {
        JSONMessage.Request.prototype.postBackend = JSONMessage.Request.postImpl.concrete.jQuery;
    }
}
