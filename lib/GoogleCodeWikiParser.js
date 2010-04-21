/**
 
    A JS implementation of a Google Code Wiki to HTML converter.

    Usage:

    var p = new GoogleCodeWikiParser();
    print( p.parse( "... GoogleCode Wiki-syntax input ...") );

    Missing features vis-a-vis Google Code Wiki:

    - Nested lists.

    - Only [Bracketed] WikiWords, not unmarked WikiWords, are marked up.

    - <wiki:toc/> is still TODO.

    - Automatic IMG tags are missing (i forgot those).

    Known problems/limitations:

    - Inline markup is only matched across a single line. Consecutive
    lines are not crossed.

    - Certain CSS styles are hard-coded because GoCo does it that way.

    - The spacing/line breaks are not quite right when it comes
    handling to blank lines.

    - Block-level elements are processed twice. We should cache/re-use
    the result for the second pass. (The first pass just figures out
    which lines to exclude from the inline-markup parsing phase.)

    - A {{{...}}} inside backticks will not render properly. Since those are an alias
    for backticks, i'm not going to worry about this.

    Authors: Stephan Beal, based largely on code by Fabien Menager.

    License: MIT
*/
function GoogleCodeWikiParser()
{
    var ps = this;
    this.inTable = 0;
    this.inUL = 0;
    this.inOL = 0;
    this.inCode = 0;
    function headerReplace(lvl,$1)
    {
        return '<h'+lvl+'><a name="'
            +(
                $1.replace(/\s+/g,'_')
                .replace(/["`]/g,'') // FIXME: confirm exactly which chars GoCoWi removes!
            )
            +'"></a>'
            +$1
            +'</h'+lvl+'>'
            ;
    }
    function headN(N) { var n = N; return function($0,$1) { return headerReplace(n,$1); }; };
    this.rx =
    {
        wikiWord: /\b([A-Z]\w+)\b/,
        headers: [
            [/^\s*======\s*([^<>=]+?)\s*======/, headN(6) ],
            [/^\s*=====\s*([^<>=]+?)\s*=====/, headN(5)],
            [/^\s*====\s*([^<>=]+?)\s*====/, headN(4)],
            [/^\s*===\s*([^<>=]+?)\s*===/, headN(3)],
            [/^\s*==\s*([^<>=]+?)\s*==/, headN(2)],
            [/^\s*=\s*([^<>=]+?)\s*=/,headN(1)],
            [/^#summary\s+(.*)$/i, '<p class="summary">$1</p>'],
            [/^#labels\s+(.*)$/i, '<p class="labels">$1</p>']
        ],
        /**
            Patterns for block-level elements (lists, tables, code).
        */
        block:
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
                        //print("TABLE ps.inTable =",ps.inTable);
                        if( ! cells || !cells.length )
                        {
                            ps.inTable = 0;
                            result.push( '</table>\n' );
                            return -1;
                        }
                        else
                        {
                            --cells.length; // strip trailing empty element
                        }
                        var out = [];
                        ++ps.inTable;
                        if( 1 == ps.inTable )
                        {
                            out.push('<table>\n');
                        }
                        out.push('<tr>');
                        var tag = 'td';//( 1 == ps.inTable ) ? 'th': 'td'
                        for( var i in cells ) {
                            out.push( '<'+tag
                            +' style="border: 1px solid #aaa; padding: 5px;"' // hard-coded values taken from Google Code
                            +'>'
                            //+cells[i]
                            +ps.parseInlined(cells[i])
                            +'</'+tag+'>' );
                        }
                        out.push('</tr>');
                        result.push( out.join('') );
                        return 1;
                   }
            }/*table*/,
            code:{rx:/^\s*\{\{\{(.*)/,
                    /**
                        Parses non-inlined {{{ ... }}} blocks.
                    */
                   doLine: function(line,result)
                   {
                        //print("TRYING CODE:",line);
                        var m;
                        if( (m = /(.*)}}}(.*)/.exec(line)) )
                        {
                            ps.inCode = 0;
                            if( m[1] ) result.push( m[1]);
                            result.push('</pre>');
                            if( m[2] ) result.push(ps.parseInlined(m[2]));
                            //print("ENDING CODE:",line);
                            return 0;
                        }
                        ++ps.inCode;
                        if( (1 == ps.inCode) )
                        {
                            result.push('<pre class="prettyprint">');
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
                    tag:'ol',
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
                        //print("listOL.doLine("+line+")");
                        var m;
                        if( ! (m=this.rx.exec( line )) )
                        {
                            ps.inOL = 0;
                            result.push('</'+this.tag+'>');
                            return -1;
                        }
                        ++ps.inOL;
                        if( (1 == ps.inOL) )
                        {
                            result.push('<'+this.tag+'>');
                        }
                        result.push( '<li>'
                                    +(ps.parseInlined(m[3]))
                                    +'</li>'
                                    );
                        return 1;
                   }
            }/*listOL*/,
            listUL:{rx:/^(\s{2})+(\*)\s+(.*)/,
                    tag:'ul',
                    /**
                        Parses OL lists.

                        FIXME: see listOL comments.
                    */
                   doLine: function(line,result)
                   {
                        //print("listUL.doLine("+line+")");
                        var m;
                        if( ! (m=this.rx.exec( line )) )
                        {
                            ps.inUL = 0;
                            result.push('</'+this.tag+'>');
                            return -1;
                        }
                        ++ps.inUL;
                        if( (1 == ps.inUL) )
                        {
                            result.push('<'+this.tag+'>');
                        }
                        result.push( '<li>'
                                    +(ps.parseInlined(m[3]))
                                    +'</li>'
                                    );
                        return 1;
                   }
            }/*listUL*/
        }
    };
}

GoogleCodeWikiParser.prototype.tagsFor = {
    '*': 'strong',
    '_': 'em',
    '^': 'sup',
    '~': 'strike',
    ',': 'sub'
};

/**
    Returns a visually-distinct HTML SPAN element containing
    the given text.
*/
GoogleCodeWikiParser.prototype.getWarning = function(text) {
    return '<span style="color:red; background-color:yellow;">WIKI PARSE WARNING: '+text+'</span>';
};


// GoogleCodeWikiParser.prototype.append = function(item)
// {
//     this.output.push(item);
// };

/** Some elements are easier to handle if we convert them to an
    equivalent form of another element...

    BUG: these break down when they are inside a backtick block :/
*/
GoogleCodeWikiParser.prototype.aliases = [
    [/(\{\{\{([^\}]+)\}\}\})/g, '`$2`'],// {{{...}}} === `...`
    //[/\[([A-Za-z][^\s\]]+)\]/g, '[$1 $1]'] // [SingeTokenWiki] === [SingeTokenWiki SingeTokenWiki]
];

GoogleCodeWikiParser.prototype.parseInlined = function(text)
{
    if( ! text )
    {
        return '';
    }
    var end,
        i,
        x,
        ch,
        buf = "",
        space,
        ma,
        marker,
        tag,
        out = [];
/*    if( (m = /^(\s+)/.exec(text) ) )
    { // strip leading spaces but keep them for later?
        space = m[1];
        text = text.substr( space.length );
    }
*/
    function append(val)
    {
        out.push(val);
    }
    function pushbuf()
    {
        if( buf.length )
        {
            append(buf);
            buf = "";
        }
    }

    for( i in this.rx.headers )
    {
        x = this.rx.headers[i];
        if( ! x[0].test(text) ) continue;
        text = text.replace( x[0], x[1] );
        break;
    }
    if( (ma = /^\s*(-{4,})([^-]?.*)/.exec(text)) )
    {
        text = '<hr/>'+(ma[2] || '');
    }
    for( i in this.aliases )
    { // ^^^ reminder: this breaks if the aliased elements are in backticks.
        var pair = this.aliases[i];
        text = text.replace( pair[0], pair[1] );
    }
    end = text.length;
    for( i = 0; i < end; ++i )
    {
        var ch = text.charAt(i);
        if( /\s/.test(ch) )
        {
            buf += ch;
            continue;
        }
        if( '`' === ch )
        { // BACKTICKS/inlined VERBATIM
            pushbuf();
            append('<tt>');
            for( x = i+1; x < end; ++x )
            {
                ch = text.charAt(x);
                if( '`' === ch ) break;
                buf += ch;
            }
            if( '`' !== ch )
            {
                buf += this.getWarning("unterminated backtick!");
            }
            pushbuf();
            append('</tt>');
            i = x;
            continue;
        }
        if( '<' === ch )
        { // treat all HTML markup as literal - do no parse it.
            if( ! /[a-zA-Z\/]/.test(text.charAt(i+1)) )
            { //allow standalone '<', where next character is not alpha. Transform to &lt;.
                buf += '&lt;';
                pushbuf();
                continue;
            }
            buf += ch;
            for( x = i+1; x < end; ++x )
            {
                ch = text.charAt(x);
                //print('ch =',ch);
                buf += ch;
                if( '>' === ch ) break;
            }
            if( '>' !== ch )
            {
                buf += this.getWarning("unterminated less-than!");
            }
            pushbuf();
            i = x;
            continue;
        }
        if( '[' === ch )
        { // [WikiWord(\s+description)?], [http://...(\s+description)?]
            if( ! /[a-zA-Z]/.test(text.charAt(i+1)) )
            {
                buf += '[';
                continue;
            }
            pushbuf();
            for( x = i+1; x < end; ++x )
            {
                ch = text.charAt(x);
                //print('ch =',ch);
                if( ']' === ch ) break;
                buf += ch;
            }
            if( ']' !== ch )
            {
                buf += this.getWarning("unterminated '['!");
            }
            else
            {
                var sp = buf.split(/\s+/,2);
                buf = '<a href="'+sp[0]+'">'
                    + buf.substr( sp[0].length )
                    + '</a>'
                    ;
            }
            pushbuf();
            i = x;
            continue;
        }
        if( '!' === ch )
        { // !UnlinkedWikiWord or a plain old '!'
            marker = i;
            pushbuf();
            for( x = i+1; /\w/.test( (ch = text.charAt(x)) ); ++x )
            {
                buf += ch;
            }
            if( (ma = this.rx.wikiWord.exec(buf)) )
            {
                buf = ma[1]+ch;
                pushbuf();
                i = x;
            }
            else
            {
                i = marker;
                buf = '!';
                pushbuf();
            }
            continue;
        }
        if( (m = /([\*_^])/.exec(ch)) )
        { // *BOLD*, _EMPHASIZE_, ^SUPERSCRIPT^
            pushbuf();
            tag = this.tagsFor[m[1]];
            append('<'+tag+'>');
            for( x = i+1; x < end; ++x )
            {
                ch = text.charAt(x);
                if( m[1] === ch ) break;
                buf += ch;
            }
            if( m[1] !== ch )
            {
                buf += this.getWarning("unterminated '"+m[1]+"'!");
            }
            buf = this.parseInlined(buf);
            //print("ENDING BACKTICK @ pos",x,'buf =['+buf+']','ch =',ch);
            pushbuf();
            append('</'+tag+'>');
            i = x;
            continue;
        }
        if(  (ma = /([~,])/.exec(ch))  )
        { // ~~strike~~ or ,,subscript,, ?
            pushbuf();
            if( text.charAt(i+1) != ma[1] )
            {
                buf += ma[1];
                continue;
            }
            x = i+2;
            ch = text.charAt(x);
            for( ; (x < end) ;)
            {
                if( ch == ma[1] )
                {
                    if( text.charAt(x+1) == ma[1] )
                    {
                        break;
                    }
                }
                buf += ch;
                ch = text.charAt(++x);
            }
            //print("BUFFER :",buf);
            if( ma[1] != ch )
            {
                buf = ma[1]+ma[1]+buf; // put the prefix back.
                buf += this.getWarning("mis-terminated '"+ma[1]+ma[1]+"'!");
            }
            else
            {
                x = this.tagsFor[ma[1]];
                buf = '<'+x+'>'+this.parseInlined(buf)+'</'+x+'>';
            }
            pushbuf();
            i = x;
            continue;
        }
        buf += ch;
    }
    pushbuf();
    return out.join('');
};

GoogleCodeWikiParser.prototype.parse = function(text)
{
    this.lines = text.split(/\r?\n/);
    this.lineNo = 0;
    this.blockLines = [];
    var out = [];
    var isblock = [];
    var i = 0,
        k,
        x,
        end = this.lines.length,
        ln
    ;

    for( i = 0; i < end; ++i )
    {
        /* pre-check the lines for block-level lines and mark them so we can skip parsing/hosing them.*/
        ln = this.lines[i];
        if( ! ln || !ln.length ) continue;
        var check;
        for( k in this.rx.block )
        {
            check = this.rx.block[k];
            //print("IS #"+i,"a",k,"BLOCK?:",ln);
            if( ! check.rx.test(ln) ) continue;
            //print("#"+i,"IS-A",k,"BLOCK:",ln);
            x = i;
            var rc;
            for( ; (rc = check.doLine(ln,['discarding_this'])) > 0; )
            {
                isblock[i] = true;
                //print("#"+i+" IS",k,"BLOCK:",ln);
                ln = this.lines[++i];
            }
            //if( rc < 0 ) --i; // back up and try the line again.
            if( undefined !== rc ) break;
        }
    }
    for( i = 0; i < end; ++i )
    {
        ln = this.lines[i];
        if( ! isblock[i] )
        {
            ln = this.parseInlined( ln );
            this.lines[i] = ln;
        }
    }
    var didMulti = false;
    var emptyCount = 0;
    var prevSkipsBR = false;
    for( i = 0; i < this.lines.length; ++i )
    {
        ln = this.lines[i];
        if( i && !ln.length )
        {
            ++emptyCount;
            continue;
        }
        if( emptyCount )
        {
            //for( k = 0; k < emptyCount; ++k )
            //out.push('<br>');
            if( ! prevSkipsBR )
            { // ^^^ HUGE KLUDGE!
                out.push('<br><br>');//<span style="color:red">NON_HEADER_BREAK</span>');
            }
            emptyCount = 0;
        }
        didMulti = false;
        prevSkipsBR = false;
        for( k in this.rx.block ) {
            var bl = this.rx.block[k];
            if( bl.rx.test( ln ) )
            {
                didMulti = true;
                //print("TRYING",k,"ON LINE:",ln);
                var res = [];
                for( ;  (rc = bl.doLine(ln,res)) > 0; )
                {
                    ln = this.lines[++i];
                    //print("TRYING",k,"ON LINE:",ln);
                }
                //print( k,'ended with rc',rc);
                for( k in res ) out.push( res[k] );
                //if( rc < 0 ) --i; // back up and try the line again.
                break;
                //continue;
            }
        }
        if( didMulti ) { continue; } // this might not be right when a block element has trailing crap on the closer line.
        else if( i >= end ) break;
        out.push(ln);
        if( /(<h\d)|(<\/table)|(<\/[uo]l)|(<\/pre)/.test(ln) )
        { // ^^^ HUGE KLUDGE!
            prevSkipsBR = true;
        }

        emptyCount = 0;
    }
    return out.join('\n');
};


GoogleCodeWikiParser.test = function()
{
    var inp = [
        '=hi, `world`!=',
        '----',
        'some <a href="">inlined HTML</a>.',
        'this should be *bolded* and this _emphasized_.',
        'and a *_bold emphasized_*.',
        'and a *_bold emphasized with {{{verbatim in it}}}_*.',
        '`*` `_` `,,`',
        'A !UnlinkedWikiWord and a ! by itself and !non-wikid and *{{{!InsideVerbatim}}}*.',
        'A _[EmphasizedMarkedUpWikiWord]_.',
        '{{{',
            '  print("Hi, *must not be bolded!* world!");',
            '  if( (i < 10) && (i>1) ) ++a;',
        '}}}',
        '',
        '==List 1==',
        '  # Item 1 *is bolded*.',
        '  # Item 2 _is emphasized_.',
        '  # Item 3 has a [WikiWordLink].',
        '',
        '==List 2==',
        '  * Item 1',
        '  * Item 2',
        '  * Item 3',
        '',
        '|| *header 1* || *header 2* || *header 3* ||',
            '||cell1,1 || cell2,1 || cell 3,1 ||',
            '||cell1,2 || cell2,2 || cell 3,2 ||',
        //'`no closing *backtick*',
        '==List 3==',
        'The source code and API documentation for this class is in:',
        '',
        '  * [http://code.google.com/p/v8-juice/source/browse/trunk/src/include/v8/juice/ClassWrap.h ClassWrap.h]',
        '',
        '~~hi, world!~~',
        ',,hi, world!,,',
        //',,hi, world!,', // should have a warning
        'bye, world!'
    ];
    var g = new GoogleCodeWikiParser();
    var wiki = inp.join('\n');
    var x = g.parse(wiki);
    print(x);

};
if(0)
{
    GoogleCodeWikiParser.test();
} // end test
