/**
    Test/demo app for GoogleCodeWikiParser. Requires
    the v8-juice (http://code.google.com/p/v8-juice) JS shell
    and the libcurl plugin for that shell.

    Usage:

    v8-juice-shell thisScript.js -- GoogleCodeProjectName WikiPageName

    Output:

    The wiki page is pulled from the GoogleCode SVN repo and rendered
    using GoogleCodeWikiParser. The output includes a wrapping
    HTML/BODY block so it can be tested more easily.
*/
loadPlugin('v8-juice-libcurl');
include("../GoogleCodeWikiParser.js");
//include("../GCWP.js");

var proj = arguments[0];
var page = arguments[1];

if( ! proj || !page )
{
    throw new Error("Requires two arguments: a Google Code project name and wiki page name from that project.");
}

var url = 'http://'+proj+'.googlecode.com/svn/wiki/'+page+'.wiki';

var curl = new Curl();
var wikiOutput = [];
curl.setOpt( Curl.OPT_FAILONERROR, true );
curl.setOpt({
    url:url,
    userAgent:"Google Chrome-ish, kind of.",
    writeFunction:function writeFunction(data,len,ud)
    {
        wikiOutput.push(data);
        return data.length;
    },
    writeData:null
});
//print("Fetching page",page,"from",url,"...");
var rc = curl.easyPerform();
curl.destroy();
if( rc )
{
    throw new Error("curl.easyPerform() returned error code "+rc+"!");
}


if(1)
{
    var gp = new GoogleCodeWikiParser();

    print('<html><head>');
    var css = {
        'body':{
            'font-family': 'Arial'
        },
        'pre.prettyprint':{
            'margin-left': '2em',
            'padding': '0.5em',
            'border-left': '3px solid #ccc',
            'background-color': '#eee'
        }
    };
    if( 1 )
    {
        print('<style type="text/css">');
        var k;
        for( k in css ) {
            print(k+' {');
            var obj = css[k];
            for( k in obj ) {
                print(k+': '+obj[k]+';');
            }
            print('}');
        }
        print('</style>');
    }
    else
    {
        print('<link type="text/css" rel="stylesheet" href="../../style.css" />');
    }
    print('<title>GoogleCodeWikiParser test: '+proj+'/'+page+'</title>');
    print( '</head><body>'+gp.parse( wikiOutput.join('') ) );
    print('</body></html>');
}
else
{
    print( wikiOutput.join('') );
}

//GoogleCodeWikiParser.test();
