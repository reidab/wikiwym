/**
    A JS implementation of a Google Code Wiki to HTML converter.

    Usage:

    var p = new GoogleCodeWikiParser();
    print( p.parse( "... GoogleCode Wiki-syntax input ...") );

    Missing features vis-a-vis Google Code Wiki:

    - Nested lists.

    - Only [Bracketed] WikiWords, not unmarked WikiWords, are marked up.

    - ???


    Authors: Stephan Beal, based largely on code by Fabien Menager.

    License: MIT
*/
function GoogleCodeWikiParser()
{
    function backticks($0,$1,$2)
    {
        //print("$2=["+$2+"]");
        return '<tt>'
        +$2.replace(/<\/?[^>]+>([^<]*)<\/[^>]+>/g, "$1")
        +'</tt>';
    }
    function makelink(href,lbl)
    {
        return '<a href="'+href+'">'
            +lbl
            +'</a>';
    }
    var ps = this;
    this.inTable = 0;
    this.inUL = 0;
    this.inOL = 0;
    this.inCode = 0;
    this.rx =
    {
        /**
            Patterns for single-line elements. That is, wiki elements
            which only match within a single line.
        */
        line:
        [

            [/^#summary (.*)$/i, '<p class="summary">$1</p>'],
            [/^#labels (.*)$/i, '<p class="labels">$1</p>'],

            [/^-{4,}$/mg, '<hr />'],

            [/^\s*====== *([^<>=]+?) *======/, '<h6><a name="$1">$1</a></h6>'],
            [/^\s*===== *([^<>=]+?) *=====/, '<h5><a name="$1">$1</a></h5>'],
            [/^\s*==== *([^<>=]+?) *====/, '<h4><a name="$1">$1</a></h4>'],
            [/^\s*=== *([^<>=]+?) *===/, '<h3><a name="$1">$1</a></h3>'],
            [/^\s*== *([^<>=]+?) *==/, '<h2><a name="$1">$1</a></h2>'],
            [/^\s*= *([^<>=]+?) *=/, '<h1><a name="$1">$1</a></h1>'],

            [/~~([^`]+)~~/g, '<strike>$1</strike>'],
            [/,,([^`]+),,/g, '<sub>$1</sub>'],
            [/\^([^^`])+\^/g, '<sup>$1</sup>'],
            [/\*([^\*`]+)\*/g, '<strong>$1</strong>'],
            [/(\W?)_([^_`]+)_(\W?)/g, '$1<i>$2</i>$3'],

            // Links and images
            [/\[(https?:\/\/[^\]]+) (http:\/\/.*?\.(?:png|gif|jpe?g))\]/gi, '<a href="$1"><img src="$2" /></a>'],
            [/\[(https?:\/\/[^\]]+\.(?:png|gif|jpe?g))\]/gi, '<img src="$1" />'],

            [/\[(https?:\/\/\S*)\]/gi, '[$1 $1]'],
            [/\[(https?:\/\/[^\] ]+) +([^\]]+)\]/gi, function($0,$1,$2) { return makelink( $1, $2 ); }],

            //[/\[(https?:\/\/\S*)\]/gi, '<a href="$1">$1</a>'],
            //[/\[(https?:\/\/.*?) (https?:\/\/.*?\.(?:png|gif|jpe?g))\]/gi, '<a href="$1"><img src="$2" /></a>'],

            // Wiki words
            [/\[(\S+)\]/g, '<a href="$1">$1</a>'],
            [/\[([A-Z].*?)(?: (.+?))?\]/g, '<a href="$1">$2</a>'],
            //[/\[([A-Z][a-z0-9_]+)\]/g, '<a href="$1">$1</a>'],
            //[/\[([A-Z][a-z0-9_]+) ([^\]]*)\]/g, '<a href="$1">$2</a>'],
            //[/(?:^| +)!((?:[A-Z][a-z]+){2,})(?: +|$)/g, '$1'],

            [/(\{\{\{(.+)\}\}\})/g, backticks],
            [/(`([^`]+)`)/g, backticks],

            [/^PLACEHOLDER_FOR_END_OF_LIST$/,'']
        ],
        /**
            Patterns for block-level elements (lists, tables, code).
        */
        multi:
        {
            PLACEHOLDER:{
                    /**
                        The regex for the OPENING line of this block type.
                    */
                    rx:/^ONLY_FOR_DOCUMENTATION_PURPOSES$/,
                    /**
                        This is called when rx.test(currentInputLine) matches.
                        It is then called in a loop as long as it returns >0.

                        Params:

                        line = current inputline.

                        result = array. All translated results should be pushed
                        onto this array.

                        Return:

                        0 = The block element consumed the line and has been closed.

                        >0 = block element consumed the line and would like to try
                        the next line.

                        <0 = Block element did not consume the line. Block element
                        has been closed. The caller should re-try the same line
                        using other available handlers, if necessary.
                    */
                    doLine: function(line,result)
                    {
                        return -1;
                    }
            },
            table:{rx:/^\s*\|\|/,
                   doLine: function(line,result)
                   {
                        var cells = line ? ((''+line).split('||')) : null;
                        //print("doLine(["+line+"],["+(cells ? cells.join(',') : null)+"]");
                        if( cells ) cells.shift();
                        if( ! cells || !cells.length )
                        {
                            ps.inTable = 0;
                            result.push( '</table>\n' );
                            //result.push(line);
                            return -1;
                        }
                        else
                        {
                            --cells.length; // strip trailing empty element
                        }
                        var out = [];
                        ++ps.inTable
                        if( 1 == ps.inTable )
                        {
                            out.push('<table>\n');
                        }
                        out.push('<tr>');
                        var tag = 'td';//( 1 == ps.inTable ) ? 'th': 'td'
                        for( var i in cells ) {
                            out.push( '<'+tag+'>' +cells[i] +'</'+tag+'>' );
                        }
                        out.push('</tr>');
                        result.push( out.join('') );
                        return 1;
                   }
            }/*table*/,
            code:{rx:/^\s*\{\{\{(.*)/,
                    /**
                        Parses non-inlined {{{ ... }}} blocks.

                        bugs:

                        - Any text after the closing "}}}" will
                        be appended to the output without parsing
                        it. That will be fixed once the line-element
                        replacement is factored into its own function.
                    */
                   doLine: function(line,result)
                   {
                        //print("TRYING CODE:",line);
                        var m;
                        if( (m = /(.*)}}}(.*)/.exec(line)) )
                        {
                            ps.inCode = 0;
                            if( m[1] ) result.push(m[1]);
                            result.push('</pre>');
                            if( m[2] ) result.push(m[2]); // FIXME: parse m[2] inline elements.
                            //print("ENDING CODE:",line);
                            return 0;
                        }
                        ++ps.inCode;
                        if( (1 == ps.inCode) )
                        {
                            result.push('<pre>');
                            m = this.rx.exec(line);
                            if( m && m[1] ) result.push(m[1]);
                            //print("STARTING CODE:",line);
                        }
                        else
                        {
                            result.push( line.replace(/&/g,'&amp;').replace(/</g, '&lt;') );
                            //print("CONTINUING CODE:",line);
                        }
                        return 1;
                   }
            }/*code*/,
            listOL:{rx:/^(\s{2})+(\#)\s+(.*)/,
                    /**
                        Parses OL lists.

                        FIXME: consolidate listOL and listUL.
                        The only difference is one line of code,
                        but i need two handlers in order to tell
                        if two list types are immediately consecutive
                        in the input.

                        FIXME: doesn't support nested lists,
                        but the rx.match()[0] field is there to
                        eventually support that.
                    */
                   doLine: function(line,result)
                   {
                        var m;
                        if( ! (m=this.rx.exec( line )) )
                        {
                            ps.inCode = 0;
                            result.push('</'+this.tag+'>');
                            this.tag = null;
                            return -1;
                        }
                        ++ps.inCode;
                        if( (1 == ps.inCode) )
                        {
                            this.tag = 'ol';
                            result.push('<'+this.tag+'>');
                        }
                        result.push( '<li>'
                                    +(m[3] ? m[3] : '')
                                    +'</li>'
                                    );
                        return 1;
                   }
            }/*listOL*/,
            listUL:{rx:/^(\s{2})+(\*)\s+(.*)/,
                    /**
                        Parses OL lists.

                        FIXME: see listOL comments.
                    */
                   doLine: function(line,result)
                   {
                        var m;
                        if( ! (m=this.rx.exec( line )) )
                        {
                            ps.inCode = 0;
                            result.push('</'+this.tag+'>');
                            this.tag = null;
                            return -1;
                        }
                        ++ps.inCode;
                        if( (1 == ps.inCode) )
                        {
                            this.tag = 'ul';
                            result.push('<'+this.tag+'>');
                        }
                        result.push( '<li>'
                                    +(m[3] ? m[3] : '')
                                    +'</li>'
                                    );
                        return 1;
                   }
            }/*listUL*/
        }
    };
};

GoogleCodeWikiParser.prototype.parse = function(text)
{
    this.lines = text.split('\n');
    var i, ln;
    var k, r, p;
    var end = this.lines.length;
    var rc, res;
    var verbatim = [];
    for( i = 0; i < end; ++i )
    {
        /* pre-check the lines for non-inlined {{{...}}} blocks and mark them so we can skip parsing them.*/
        ln = this.lines[i];
        var code = this.rx.multi.code;
        if( ! code.rx.test(ln) ) continue;

        for( ; (rc = code.doLine(ln,['discarding_this'])) > 0; ++i )
        {
            verbatim[i] = true;
            ln = this.lines[i];
        }
    }

    for( i = 0; i < end; ++i )
    {
        ln = this.lines[i];
        //print("BEFORE:",ln);
        if( ! verbatim[i] )
        {
            for( k in this.rx.line ) {
                p = this.rx.line[k];
                //print("RULE:",p[0]);
                ln = ln.replace( p[0], p[1] );
                //print("AFTER RULE:",ln);
            }
        }
        //print("AFTER:",ln);
        this.lines[i] = ln;
    }
    var out = [];
    var didMulti = false;
    for( i = 0; i < end; ++i )
    {
        ln = this.lines[i];
        didMulti = false;
        for( k in this.rx.multi ) {
            var mu = this.rx.multi[k];
            if( mu.rx.test( ln ) )
            {
                didMulti = true;
                //print("TRYING",k,"ON LINE:",ln);
                res = [];
                for( ; (rc = mu.doLine(ln,res)) > 0; )
                {
                    ++i;
                    ln = this.lines[i];
                    //print("TRYING",k,"ON LINE:",ln);
                }
                //print( k,'ended with rc',rc);
                for( k in res ) out.push( res[k] );
                if( rc < 0 ) --i; // back up and try the line again.
                break;
                //continue;
            }
        }
        //if( undefined === ln ) continue;
        if( didMulti ) { continue; } // this might not be right when a block element has trailing crap on the closer line.
        //print("PUSHING LINE:",ln);

        out.push(ln);
    }
    this.lines = null;
    return out.join('\n');
};
GoogleCodeWikiParser.test = function()
{
    var inp =
    [
    '=h1=',
    '==h2== not part of the header *bold!*',
    '*bold*, _italics_, *_bold italics_*?',
    '(`void*`) this must not be bolded`*`.',
    '({{{void _ptr_ *}}}) this _must not be italics.',
    '',
    '|| *header 1* || *header 2* || *header 3* ||',
    '||cell1 || cell2 || cell 3 ||',
    '{{{',
        '  print("Hi, *oops - bolded!* world!");',
        '  if( (i < 10) && (i>1) ) ++a;',
    '}}}',
    '*ooops - this line gets removed*',
    '|| h1|| h2|| h3 ||',
    '  # Item 1',
    '  # Item 2',
    '  # Item 3',
    '  * Item 1',
    '  * Item 2',
    '  * Item 3',
    '',
    'This is a [WikiWord].',
    'And a link to [http://s11n.net s11n.net]. Now at EOL: [http://s11n.net s11n.net]',
    '[http://code.google.com/p/v8-juice/source/browse/trunk/src/client/sample/BoundNative/BoundNative.cpp BoundNative.cpp]',
    '[http://code.google.com/p/v8-juice/source/browse/trunk/src/lib/juice/PathFinder-cw.cc PathFinder-cw.cc] implements the [PathFinderClass] bindings.',
    '[http://code.google.com/p/v8-juice/source/browse/trunk/src/lib/juice/PathFinder-cw.cc]',
    '[http://s11n.net/img/logo/logo.lightblue.jpg]',
    '[http://s11n.net http://s11n.net/img/logo/logo.lightblue.jpg]',
    ''
    ];
    var gp = new GoogleCodeWikiParser();
    var rc = gp.parse( inp.join('\n') );
    print(rc);
};

if(
    //true
    false
    && ('v8JuiceVersion' in this)
    )
{ /* That's the ^^^^ v8-juice-shell, for my own testing. */
    GoogleCodeWikiParser.test();
}
