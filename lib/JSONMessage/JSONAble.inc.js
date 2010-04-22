
/**
    JSONable defines an interface for objects which
    can be converted to and from JSON. The intention
    is to use it as the basis for a JSON-centric
    data object model where we want to have fairly
    tight control over which properties get JSONized.

    Subclasses must re-implement the following
    members:

    - toJSON()
    - fromJSONable()

    The other members have reasonable default implementations
    based off of those two functions.
*/
function JSONable()
{
};

JSONable.prototype =
{
    /*
        Constructs a JSON string from this object
        and returns it.

        Must be overridden by subclasses, and the default
        implementation throws an exception reminding
        the caller of that.
    */
    toJSON:function()
    {
        throw new Error("JSONable.prototype.toJSON() must be re-implemented by subclasses!");
    },
    /*
        Uses toJSON() to JSONify this object,
        then creates a new Object
        which contains a copy of that JSON structure.
        May propagate an exception on error.
    */
    toJSONable:function()
    {
        return JSON.parse( this.toJSON() );
    },
    /*
        Populates this object from the given JSON-style object.

        Must be overridden by subclasses, and the default
        implementation throws an exception reminding
        the caller of that.

        Implementations may support accepting other argument
        types (e.g. another JSONable to clone from).
    */
    fromJSONable:function(json)
    {
        throw new Error("JSONable.prototype.fromJSONable() must be re-implemented by subclasses!");
    },
    /**
        json must be a valid JSON string, be-a JSONable, or otherwise be some
        Object type which is a legal argument to JSON.stringify().
        In the former case, the string is
        parsed JSON-style and the result of calling this.fromJSONable(thatObject)
        is returned. In the latter two cases the json object is first converted
        to JSON and then the return value from fromJSON(jsonizedString) is returned.
        The main implication of this is that it deeply copies all values, producing
        a clone which shares no references with the parent object.

        May throw or propagate on error. If !json then it returns null.
    */
    fromJSON:function(json)
    {
        if( ! json ) return null;
        if ( ('x'+json).match(/^x\[object /) )
        {
            return this.fromJSON(
                    (json instanceof JSONable )
                    ? json.toJSON()
                    : JSON.stringify(json)
            );
        }
        else
        {
            var  j = JSON.parse( json );
            return this.fromJSONable( j );
        }
    }
};

