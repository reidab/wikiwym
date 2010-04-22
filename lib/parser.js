var Wikiwym = Class.create({
  initialize: function(textarea, preview) {
    this.textarea = $(textarea);
    this.preview = $(preview);
    this.gcwp = new GoogleCodeWikiParser();
    var self = this;
    
    function refreshEnter(event) {
      if ((event.keyCode == 13 /*\r*/ ) || (event.keyCode == 9 /*tab*/ )) {
        self.update();
      }
    }
    
    function refreshNow(event) {
      self.update();
    }
    
    this.textarea.observe('change', refreshNow )
                 .observe('keyup', refreshNow )
                 //.observe('keyup', refreshEnter )
                 ;
    this.update();
  }, 
  
  update: function() {
    this.preview.innerHTML = this.parse(this.textarea.value);
    this.textarea.setStyle({
      //height: this.preview.getHeight()+'px'
    });
  },

  parse: function(text) {
    return this.gcwp.parse(text);
  }
});
