/**
   Causes ChildClass to inherit from ParentClass, in the conventional
   OO sense of the word inherit.

   Unlike real-world inheritance, ParentClass must outlive ChildClass.

   Derived from code posted here:

   http://groups.google.com/group/v8-users/browse_thread/thread/adfc2978ee519b42

   Author: Stephan Beal (http://wanderinghorse.net/home/stephan/)
   License: Public Domain

    How to use this:

    function MyType(){...}

    function MySubType(){...}
    extendClass( MySubType, MyType );


    After that:

    var sub = new MySubType(...);
    print(sub instanceof MyType ); // true

    and sub will (mostly) have access to properties inherited from MyType.

    But there are a few catches...

    With this approach, for OVERRIDDEN member funcs to work properly, they
    must be defined AFTER calling extendClass(), because
    ChildClass.prototype is overwritten by extendClass().

    So, proper usage is (apparently):

    function MyClass()
    {
        var av = Array.prototype.slice.apply(arguments,[0]);
        arguments.callee._superConstructor_.apply( this, av );
        ...
    };
    extendClass( MyClass, MyInterface );//must go right after the ctor!

    MyClass.prototype.overriddenFunc = function(){...}; 


    Subclass ctors can call their superclass ctor with:

    var av = Array.prototype.slice.apply(arguments,[0]);
    arguments.callee._superConstructor_.apply( this, av );

    or:

    MyType._superConstructor_.apply( this, av );

    And they can reference superclass functions with:

    this._superClass_.funcName.apply(this,[args])

    Calling them like this:

    this._superClass_.funcName(args);

    does not work polymorphically (not sure why). That is,
    if the called function calls another overridden function,
    any overridden impl of that second function won't get
    picked up (the parent impl will be selected).

    For this all to work the functions must have been
    defined outside of the ctor, e.g.:

    BaseType.prototype.funcName = function(){...};

    rather than in the ctor. Not quite 100% sure why that is.

    RETURNS: ChildClass

    To help avoid some of the confusion which goes along
    with the limitations of this approach, ChildClass
    gets a new member called extendPrototype(), which
    is used like this:

    ChildClass.extendPrototype({
        func1:function(){...},
        prop1:....
    });

    Because extendClass() returns ChildClass, the two can
    be combined like:

    extendClass( Child, Parent ).extendPrototype({...});

    This function can also be bound to a constructor, like:

    ParentClass.extendClass = extendClass;

    ParentClass.extendClass( ChildClass );

    In that case, the only difference is how it is called. It has
    the same return value.
*/
function extendClass( ChildClass, ParentClass )
{
    if( 1 == arguments.length )
    { // assume we are being called as ClassName.extendClass( ChildClass )
        return arguments.callee.apply( this, [ChildClass,this] );
    }
    function TempClass() {};
    TempClass.prototype = ParentClass.prototype;
    ChildClass.prototype = new TempClass();
    ChildClass.prototype.constructor = ChildClass;
    ChildClass._superConstructor_ = ParentClass;
    ChildClass.prototype._superClass_ = ParentClass.prototype;
    function _extendPrototype( TheClass, obj )
    {
        for( var k in obj )
        {
            TheClass.prototype[k] = obj[k];
        }
    };

    ChildClass.extendPrototype = function( obj )
    {
        return _extendPrototype( ChildClass, obj );
    };
    return ChildClass;
};

if(0)
{ /* test/demo. Don't try this from a browser (where print() has very different behaviour)!
    */
    function MyType()
    {
        var av = Array.prototype.slice.apply(arguments,[0]);
        print("ctor MyType(",av.join(','),')');
        this.prop1 = 1;
        this.func = function(){
            for( var k in this )
            {
                var v = this[k];
                if( v instanceof Function ) print("this["+k+"] =function()");
                else print("this["+k+"] =",v);
            }
        };
    };
    MyType.prototype.str = function(){ return "part1";}
    function MySubType()
    {
        var av = Array.prototype.slice.apply(arguments,[0]);
        arguments.callee._superConstructor_.call( this, av );
        print("ctor MySubType(",av.join(','),')');
        this.prop2 = 2;
        var self = this;
        this.str = function() { return self._superClass_.str()+"part2";}
    };
    if(0)
    {
        MySubType.extendClass = extendClass;
        MySubType.extendClass( MyType );
    }
    else
    {
        extendClass( MySubType, MyType );
    }
    function assert(ex)
    {
        if( ! ex ) throw new Error("assertion failed!");
        return ex;
    }
    var x = new MySubType(7,3,11);
    x.func();
    print("x.str() =",x.str());
    print( "x.prop1:x.prop2 =",x.prop1 + ":" + x.prop2 );
    print( "x instanceof MyType ==",x instanceof MyType );
    var x2 = new MySubType(11,7,3);
    x2.prop2 = 32;
    print('x2.prop2='+x2.prop2,
        'x.prop2='+x.prop2,
            assert(!(x === x2)),
           assert(x === x),
           assert(x2 instanceof MyType)
           );
};
