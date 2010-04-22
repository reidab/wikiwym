/**
 
    A JS implementation of a Google Code Wiki to HTML converter.

    Home page: http://code.google.com/p/wikiwym

    Authors: Stephan Beal, based largely on code by Fabien Menager.

    License: MIT

    Usage:

    var p = new GoogleCodeWikiParser();
    print( p.parse( "... GoogleCode Wiki-syntax input ...") );

    Missing features vis-a-vis Google Code Wiki:

    - Nested lists.

    - Only [Bracketed] WikiWords, not unmarked WikiWords, are marked up.
    The exception is !WikiWord, which is parsed to WikiWord.

    - <wiki:toc/> is very rudimentary (a flat list).

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
*/
function GoogleCodeWikiParser()
{
    var ps = this;
    this.inTable = 0;
    this.inUL = 0;
    this.inOL = 0;
    this.inCode = 0;
    this.inBQ = 0;
    this.hList = [];
    function headerReplace(lvl,$1)
    {
        var norm = $1.replace(/\s+/g,'_')
                .replace(/["`]/g,'') // FIXME: confirm exactly which chars GoCoWi removes!
        ps.hList.push({
            level:lvl,
            name:$1,
            href:'#'+norm
        });
        return '<h'+lvl+'><a name="'
            +norm
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
            [/^#labels\s+(.*)$/i, '<strong>Labels: </strong><span class="labels">$1</span>']
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
                            //--cells.length; // strip trailing empty element
                            cells = cells.slice(0,cells.length-1);
                        }
                        var out = [];
                        ++ps.inTable;
                        if( 1 == ps.inTable )
                        {
                            out.push('<table>\n');
                        }
                        out.push('<tr>');
                        var tag = 'td';//( 1 == ps.inTable ) ? 'th': 'td'
                        var c;
                        for( var i in cells ) {
                            if( ! cells.hasOwnProperty(i) ) continue; // Prototype-specific kludge. The fuckers.
                            c = cells[i];
                            if( c instanceof Function ) continue; // Prototype assholes!
                            out.push( '<'+tag
                            +' style="border: 1px solid #aaa; padding: 5px;"' // hard-coded values taken from Google Code
                            +'>'
                            +ps.parseInlined(c)
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
                            if(line) result.push( line.replace(/&/g,'&amp;').replace(/</g, '&lt;') );
                            //print("CONTINUING CODE:",line);
                        }
                        return 1;
                   }
            }/*code*/,
            listOL:{rx:/^(\s)+(\#)\s+(.*)/, // reminder: Google docs say 2+ spaces, but it seems to tolerate 1 space and many pages use that.
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
            listUL:{rx:/^(\s)+(\*)\s+(.*)/,
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
            }/*listUL*/,
            blockquote:{rx:/^\s+(\S.*)/,
                    /**
                        Parses non-inlined {{{ ... }}} blocks.
                    */
                   doLine: function(line,result)
                   {
                        //print("TRYING CODE:",line);
                        var m;
                        if( !(m = this.rx.exec(line)) )
                        {
                            ps.inBQ = 0;
                            //if( m[1] ) result.push( m[1]);
                            result.push('</blockquote>');
                            return -1;
                        }
                        ++ps.inBQ;
                        if( (1 == ps.inBQ) )
                        {
                            result.push('<blockquote>');
                            //m = this.rx.exec(line);
                            if( m && m[1] ) result.push( ps.parseInlined(m[1]));
                            //print("STARTING CODE:",line);
                        }
                        else
                        {
                            result.push( ps.parseInlined( line ) );
                            // .replace(/&/g,'&amp;').replace(/</g, '&lt;')
                        }
                        return 1;
                   }
            }/*blockquote*/
        }
    };
}

/** For internal use. */
GoogleCodeWikiParser.prototype.tagsFor = {
    '*': 'strong',
    '_': 'em',
    '^': 'sup',
    '~': 'strike',
    ',': 'sub'
};

/** Configurable per-instance options. */
GoogleCodeWikiParser.prototype.options = {
    /**
        If true, certain warning messages
        are elided.
    */
    disableWarnings: false
};
/**
    Returns a visually-distinct HTML SPAN element containing
    the given text.

    If this.options.disableWarnings is true then this function
    returns an empty string.
*/
GoogleCodeWikiParser.prototype.getWarning = function(text) {
    return (this.options.disableWarnings)
        ? ''
        : '<span style="color:red; background-color:yellow;">WIKI PARSE WARNING: '+text+'</span>'
        ;
};

/** Some elements are easier to handle if we convert them to an
    equivalent form of another element...

    BUG: these break down when they are inside a backtick block :/.
    But since {{{...}}} and `...` are aliases, we don't expect one
    to be embedded within the other all that often.

    TODO: move the {{{ }}} handling into the char-by-char parsing bits.
*/
GoogleCodeWikiParser.prototype.aliases = [
    /* Converts INLINED {{{...}}} to `...`.

       Maintenance reminder: this pattern must not be global (//g) due to
       a bug in 2 out of 5 browsers i tested, which causes matches to
       be inconsistently overlooked. (My poor, poor Chrome was one of
       the two.) Instead we walk the pattern incrementally.
    */
    [/(\{{3}([^\}]+)\}{3})/, '`$2`']
];
GoogleCodeWikiParser.prototype.parseAliases = function(snippet)
{
    var x, pair;
    for( x = 0; x < this.aliases.length; ++x )
    { // ^^^ reminder: this breaks if the aliased elements are in backticks.
        pair = this.aliases[x];
        while( pair[0].test(snippet) )
        { // See comments in GoogleCodeWikiParser.prototype.aliases for why we loop this way.
            snippet = snippet.replace( pair[0], pair[1] );
        }
    }
    return snippet;
};
/**
    Parses text for the following markup types:

    - The special-case #summary and #labels markers.

    - inlined markup (bold, emphasis, etc.)

    - headers

    - HR elements

    Returns the HTML-ized string, or an empty string
    if !text.

    This can be used to parse snippets of code which one
    knows will not contain lists, tables, and such.
*/
GoogleCodeWikiParser.prototype.parseInlined = function(text)
{
    text = ''+text;
    if( ! text || !text.length )
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
    for( i = 0; i < this.rx.headers.length; ++i )
    {
        x = this.rx.headers[i];
        //if( ! x || !x[0] ) continue; // WTF is x[0] EVER undefined!?!?!?
        if( ! x[0].test(text) ) continue;
        //alert('typeof text == '+(typeof text));
        var old = text;
        text = text.replace( x[0], x[1] );
        if( /^#/.test( old ) )
        { // special case for #summary, #labels, #whatever: treat all content as unparseable. (fixes issue #10)
            buf += text;
            pushbuf();
            return out.join('');
        }
        old = null;
        break;
    }
    text = this.parseAliases(text);
    if( (ma = /^\s*(-{4,})([^-]?.*)/.exec(text)) )
    {
        text = '<hr/>' + (ma[2] || '');
        if( ! ma[2] )
        {
            buf += text;
            pushbuf();
            return out.join('');
        }
    }
    end = text.length;
    var prevChar;
    for( ch = 0, i = 0; i < end; ++i )
    {
        prevChar = ch;
        var ch = text.charAt(i);
        if( /\s/.test(ch) )
        {
            buf += ch;
            continue;
        }
        else if( '`' === ch )
        { // BACKTICKS/inlined VERBATIM
            pushbuf();
            append('<tt>');
            for( x = i+1; x < end; ++x )
            {
                ch = text.charAt(x);
                if( '`' === ch ) break;
                buf += ch;
            }
            buf = buf.replace(/</g,'&lt;');
            pushbuf();
            append('</tt>');
            if( '`' !== ch )
            {
                buf = this.getWarning("unterminated backtick!");
                pushbuf();
            }
            i = x;
            continue;
        }
        else if( '<' === ch )
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
        else if( '[' === ch )
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
                tag = (sp && (sp.length>1))
                    ? buf.substr( sp[0].length )
                    : (sp ? sp[0] : 'WIKI_PARSING_ERROR');
                buf = this.createLink( sp[0], tag );
                ;
            }
            pushbuf();
            i = x;
            continue;
        }
        else if( '!' === ch )
        { // !UnlinkedWikiWord or a plain old '!'
            marker = i;
            pushbuf();
            for( x = i+1; /\w/.test( (ch = text.charAt(x)) ); )
            {
                buf += ch;
                 ++x;
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
        else if( (ma = /([\*_^])/.exec(ch)) )
        { // *BOLD*, _EMPHASIZE_, ^SUPERSCRIPT^
            if( '_' == ma[1] )
            { // special/corner case
                if( prevChar && /\w/.test(prevChar) )
                { // do not start markup in the middle of a word
                    buf += ch;
                    continue;
                }
            }
            pushbuf();
            tag = this.tagsFor[ma[1]];
            append('<'+tag+'>');
            for( x = i+1; x < end; ++x )
            {
                ch = text.charAt(x);
                if( ma[1] === ch ) break;
                buf += ch;
            }
            if( (ma[1] !== ch) || (x==(i+1)) )
            {
                buf += this.getWarning("unterminated '"+ma[1]+"'!");
            }
            else if( buf )
            {
                buf = this.parseInlined(buf);
            }
            pushbuf();
            append('</'+tag+'>');
            i = x;
            continue;
        }
        else if(  (ma = /([~,])/.exec(ch))  )
        { // ~~strike~~ or ,,subscript,,
            pushbuf();
            if( text.charAt(i+1) != ma[1] )
            {
                buf += ma[1];
                continue;
            }
            x = i+2;
            ch = text.charAt(x);
            tag = this.tagsFor[ma[1]];
            append('<'+tag+'>');
            for( ; (x < end) ;)
            {
                if( ch == ma[1] )
                {
                    if( text.charAt(x+1) == ma[1] )
                    {
                        ++x;
                        break;
                    }
                }
                buf += ch;
                ch = text.charAt(++x);
            }
            i = x;
            if( ma[1] != ch )
            {
                buf = ma[1]+ma[1]+buf; // put the prefix back.
                buf += this.getWarning("mis-terminated '"+ma[1]+ma[1]+"'!");
            }
            else
            {
                buf = this.parseInlined(buf);
            }
            pushbuf();
            append('</'+tag+'>');
            continue;
        }
        else
        {
            buf += ch;
        }
    }
    pushbuf();
    return out.join('');
};

/**
    Renders the current state of the table of contents
    (up to the given maximum header level or some reasonable
    default).

    The TOC state is accumulated during (and reset by)
    parse().

    Bugs:

    - The output list is flat. It should be nested, but i've
    been awake for 24 hours, hacking on this code for 16, and
    and i can't see straight enough to implement a nested-list
    TOC.

    - Headers with certain markup (e.g. [WikiLinks]) in the
    header text do not always render properly.
*/
GoogleCodeWikiParser.prototype.renderTOC = function(maxDepth)
{
    maxDepth = maxDepth || 3;
    var hl = this.hList;
    var out = [];
    var h;
    var i;
    var ps = this;
    //var pos = 0;
    function render(h)
    {
        var a = "<a href='"+h.href+"'>"+ps.parseInlined(h.name)+"</a>";
        out.push('<li>'+a+'</li>');
    }
    out.push('<ul>');
    for( i in hl )
    {
        var h = hl[i];
        if( h.level > maxDepth ) continue;
        render( h );
        //++pos;
    }
    out.push('</ul>');
    return out.join('');
};
/**
    Returns HTML code for a link created from the given arguments:

    - where is the URL or WikiWord to link to.

    - label is an optional label to use for the link. Default=where.

    If lbl appears to be an image URL then the returned HTML contain
    an IMG element and possibly a wrapping ANCHOR element.
*/
GoogleCodeWikiParser.prototype.createLink = function(where,label)
{
    //label = label || where;
    var img, ma;
    var rximg = /(gif|jpe?g|bmp|png|tiff?)$/i;
    if( rximg.test(label) )
    {
        img = label;
    }
    if( img )
    {
        if( where === label )
        {
            return '<img src="'+img+'" />';
        }
        else
        {
            return '<a href="'+where+'">'
                +'<img src="'+img+'" /></a>';
        }
    }
    var a = '<a href="'+where+'">'
    + (label ? label : where)
    + '</a>'
    ;
    return a;
}
/**
    Treats text as Google Code wiki syntax and returns an
    HTML rendering of the document (without BODY/HEAD, etc).
*/
GoogleCodeWikiParser.prototype.parse = function(text)
{
    //if( 'string' !== typeof text ) return ''; // Prototype-specific kludge
    this.hList = [];
    this.lines = text ? text.split(/\r?\n/) : [];
    this.lineNo = 0;
    this.blockLines = [];
    var out = [];
    var isblock = [];
    var i = 0,
        k,
        x,
        bl,
        res,
        end = this.lines.length,
        ln
    ;
    for( i = 0; i < end; ++i )
    {
        ln = this.lines[i];
        if( ! ln || !ln.length ) continue;
        //ln = this.parseAliases(ln);
        /* pre-check the lines for block-level lines and mark them so we can skip parsing/hosing them.*/
        var check;
        for( k in this.rx.block )
        {
            if( ! this.rx.block.hasOwnProperty(k) ) continue; // i fucking hate the Prototype lib developers for this.
            check = this.rx.block[k];
            //print("IS #"+i,"a",k,"BLOCK?:",ln);
            if( ! check.rx.test(ln) ) continue;
            //print("#"+i,"IS-A",k,"BLOCK:",ln);
            x = i;
            var rc = undefined;
            res = [];
            for( ; (rc = check.doLine(ln,res)) > 0; )
            {
                isblock[i] = res.join('');//this.rx.block[k];
                //print("#"+i+" IS",k,"BLOCK:",ln);
                ln = this.lines[++i];
            }
            if( rc < 0 ) --i; // back up and try the line again.
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
        if(isblock[i]) for( k in this.rx.block ) {
            bl = this.rx.block[k];
            if( bl.rx.test( ln ) )
            {
                didMulti = true;
                prevSkipsBR = true;
                //print("TRYING",k,"ON LINE:",ln);
                res = [];
                for( ;  (rc = bl.doLine(ln,res)) > 0; )
                {
                    ln = this.lines[++i];
                    //print("TRYING",k,"ON LINE:",ln);
                }
                //print( k,'ended with rc',rc);
                for( k in res )
                {
                    if( ! res.hasOwnProperty(k) ) continue; // Protoype-specific kludge. Assholes!!!!
                    out.push( res[k] );
                }
                if( rc < 0 ) --i; // back up and try the line again.
                break;
                //continue;
            }
        }
        else if(0)//isblock[i])
        { // this is broken, broken, broken...
            ln = this.parseInlined(isblock[i]);
            didMulti = true;
            prevSkipsBR = true;
        }
        if( didMulti ) { continue; } // this might not be right when a block element has trailing crap on the closer line.
        else if( i >= end ) break;
        out.push(ln);
        if( (/(<\/h\d)|(<\/table)|(<\/[uo]l)|(<\/pre)|(<\/block)/).test(ln) )
        { // ^^^ HUGE KLUDGE!
            prevSkipsBR = true;
        }

        emptyCount = 0;
    }
    this.lines = null;
    if(1)
    { // one last time to check for <wiki:toc>
        var rxtoc = /<wiki:toc\s*(max_depth=["']?(\d+)["']?)?[^>]*>([^<]*<\/wiki[^>]+>)?/
        var ma;
        for( i = 0; i < out.length; ++i )
        {
            ln = out[i];
            if( ! (ma = rxtoc.exec( ln )) ) continue;
            var maxdepth = ma[2] || 3;
            var toc = this.renderTOC(maxdepth);
            out[i] = ln.replace( ma[0], toc  );
            break;
        }
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
