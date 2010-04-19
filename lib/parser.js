var Wikiwym = Class.create({
  initialize: function(textarea, preview) {
    this.textarea = $(textarea);
    this.preview = $(preview);

    this.textarea.observe('keyup', this.update.bind(this))
                 .observe('change', this.update.bind(this));
    this.update();
  }, 
  
  update: function() {
    this.preview.innerHTML = this.parse(this.textarea.value);
    this.textarea.setStyle({
      height: this.preview.getHeight()+'px'
    });
  },
  
  parse: function(text) {
    text = "\n"+text;
    
    var getPrettyPrint = function($1, $2){
      return '<pre class="prettyprint">'+$2.replace('<', '&lt;').replace('>', '&gt;')+'</pre>';
    }
		
		var getTable = function($1, $2){
      var i, lines = $1.split('\uffff'),
			    table = '<table>';

      for (i = 0; i < lines.length; i++) {
				var cells = lines[i].split('||');
				
				cells = cells.slice(1, cells.length-1);
				table += '<tr><td>'+cells.join('</td><td>')+'</td></tr>';
			}
			
			return table+'</table>';
    }
    
    var getUrlOrImage = function($1){
      if ($1.match(/[gif|jpe?g|bmp|png|tiff?]+$/gi)) 
        return '<img src="'+$1+'" />';
      else 
        return '<a href="'+$1+'">'+$1+'</a>';
    }
    
    var replace = [
      [/^#summary (.*)$/mi, '<p class="summary">$1</p>'],
      [/^#labels (.*)$/mi, '<p class="labels">$1</p>'],
      
      [/^-{4,}$/mg, '<hr />'],
       
      [/\n====== *([^<>=]+?) *======/g, '<h6><a name="$1">$1</a></h6>'],
      [/\n===== *([^<>=]+?) *=====/g, '<h5><a name="$1">$1</a></h5>'],
      [/\n==== *([^<>=]+?) *====/g, '<h4><a name="$1">$1</a></h4>'],
      [/\n=== *([^<>=]+?) *===/g, '<h3><a name="$1">$1</a></h3>'],
      [/\n== *([^<>=]+?) *==/g, '<h2><a name="$1">$1</a></h2>'],
      [/\n= *([^<>=]+?) *=/g, '<h1><a name="$1">$1</a></h1>'],
      
      [/\s+~~(.*?)~~/gi, '<strike>$1</strike>'],
      [/\s+,,(.*?),,/gi, '<sub>$1</sub>'],
      [/\s+\^(.*?)\^/gi, '<sup>$1</sup>'],
      [/\s+\*(.*?)\*/gi, '<strong>$1</strong>'],
      [/\s+_(.*?)_/gi, '<i>$1</i>'],
      
      // Links and images
      /*[/(?:^| +)(http:\/\/.*?\.(?:png|gif|jpe?g))(?: +|$)/gi, '<img src="$1" />'],
      [/(?:^| +)((?:f|ht)tp:\/\/.*?)(?: +|$)/gi, '<a href="$1">$1</a>'],
      [/\[((?:f|ht)tp:\/\/.*?) (http:\/\/.*?\.(?:png|gif|jpe?g))\]/gi, '<a href="$1"><img src="$2" /></a>'],
      [/\[((?:f|ht)tp:\/\/.*?) (.*?)\]/gi, '<a href="$1">$2</a>'],
      
      // Wiki words
      [/\[(.*?)(?: (.+?))?\]/gi, '<a href="#$1">$2</a>'],
      [/(?:^| +)((?:[A-Z][a-z]+){2,})(?: +|$)/g, '<a href="#$1">$1</a>'],
      [/(?:^| +)!((?:[A-Z][a-z]+){2,})(?: +|$)/g, '$1'],*/
      
      // Links and images
      [/([ \n])(https?:\/\/.*?\.(?:png|gif|jpe?g))([ \n])/gi, '$1<img src="$2" />$3'],
      [/([ \n])(https?:\/\/\S*)/gi, '$1<a href="$2">$2</a>'],
      [/\[(https?:\/\/.*?) (http:\/\/.*?\.(?:png|gif|jpe?g))\]/gi, '<a href="$1"><img src="$2" /></a>'],
      [/\[(https?:\/\/.*?) (.*?)\]/gi, '<a href="$1">$2</a>'],
      [/\[(https?:\/\/[^ \]]+)\]/gi, '<a href="$1">$1</a>'],
     
      // Wiki words
      [/\[(\S+)\]/g, '<a href="$1">$1</a>'],
      [/\[(.*?)(?: (.+?))?\]/gi, '<a href="$1">$2</a>'],
      //[/(?:^| +)!((?:[A-Z][a-z]+){2,})(?: +|$)/g, '$1'],

      [/(?:`|\{\{\{)(.*?)(?:\}\}\}|`)/g, '<code>$1</code>'],
      
      [/\n +(.*?)\n/gi, '<blockquote>$1</blockquote>'],
      [/\n{2,}(.*?)/gi, '<p>$1</p>']
    ];
		
		var mReplace = [
      [/\|\|(.*?\|\|)+(\uffff\|\|(.*?\|\|)+)*/g, getTable],
      
      [/[\s|\uffff]+(?:`|\{\{\{)\uffff(.*?)\uffff(?:\}\}\}|`)/g, getPrettyPrint],
      [/<!/g, '&lt;!'],
      [/-->/g, '--&gt;'],
      [/<script/gi, '&lt;script'],
      [/<\/script\>/gi, '&lt;/script&gt;']
    ];
    
    // multiline replacements
    text = text.replace(/\n/g,'\uffff');
    mReplace.each(function(pair) {
      text = text.replace(new RegExp(pair[0]), pair[1]);
    });

		// list blocks
		var i, match, 
		    indent = 0, stack = [],
		    lines = text.split('\uffff'),
		    tokens = {"*": "ul", "#": "ol"};

    var depth = 0, lastType;
    
    for (i = 0; i < lines.length; i++) {
      if (match = new RegExp(/^( +)(\*|#)(.*)$/).exec(lines[i])) {
        var spaces = match[1].length,
            type = match[2],
            text = match[3], 
            newText = "";

        if (spaces < depth) {
          newText += "</"+tokens[type]+">";
        }
        
        if (lastType != type) {
          newText += "</"+tokens[lastType]+"><"+tokens[type]+">";
        }
        
        if (spaces > depth) {
          newText = "<"+tokens[type]+">";
        }
        
        newText += "<li>"+text+"</li>";
        
        lines[i] = newText;
        
        lastType = type;
        depth = spaces;
      }
      else if (depth) {
        lines[i] = "</"+tokens[lastType]+">";
        depth = 0;
      }
    }
		
		text = lines.join('\uffff').replace(/\uffff/g,'\n');
    
    replace.each(function(pair) {
      text = text.replace(pair[0], pair[1]);
    });
    
    return text;
  }
});