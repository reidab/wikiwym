if (document.forms.wiki_edit) {

var wikiCodeTimeout, scripts = [
  "http://ajax.googleapis.com/ajax/libs/prototype/1.6.1.0/prototype.js",
  "http://wikiwym.googlecode.com/svn/trunk/lib/parser.js"
],
head = document.getElementsByTagName("head")[0];

for(var i = 0; i < scripts.length; i++) {
  var s = document.createElement("script");
  s.src = scripts[i];
  head.appendChild(s);
}

function parseWikiCode(){
  if (window.Wikiwym && !window.parser) {
    var content = $("content"),
        row = $("maincol").select(".expand table tr")[0],
        preview = row.select("td.vt")[1];
        
    content.cols = $("svn_log").cols = 50;
    content.setStyle({width: "100%"});
    row.childElements().invoke("setStyle", {width: "50%"});
    
    parser = new Wikiwym(content, preview);
    parser.parse();
    clearTimeout(window.wikiCodeTimeout);
  }
  else {
    wikiCodeTimeout = setTimeout(parseWikiCode, 200);
  }
}

parseWikiCode();

}
else {
  throw new Error("This is not a Google Code Wiki edit page !");
}
